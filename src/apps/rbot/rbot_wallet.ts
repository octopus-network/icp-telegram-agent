import { AccountIdentifier } from "@dfinity/ledger-icp"
import { Principal } from '@dfinity/principal'
import { table, getBorderCharacters } from "table"
import { TFunction } from "i18next"
import * as bitcoin from 'bitcoinjs-lib'

import { getUserIdentity } from '../../identity'
import { createPool, getTokenBySymbol } from '../../tokens'
import { icrc1BalanceOf, icrc1Transfer, icrc1Fee, icrc2Approve } from "../ledger/icrc1"
import { ledgerTransfer, ledgerAccountBalance } from "../ledger/ledger"
import { getFeeAndAccount, generateTicket, ChainID } from "../route/route"
import { GenerateTicketError } from "../route/declarations/icp_route/icp_route.did"
import { stringToBigint, bigintToString, convertTransferError } from './rbot_utils'


const TOKEN_SYMBOL = process.env.RBOT_TOKEN_SYMBOL || ""
const TOKEN_DECIMALS = process.env.RBOT_TOKEN_DECIMALS || "2"
const ICP_SYMBOL = 'ICP'
const ICP_DECIMALS = '8'
const OMNITY_ROUTE_CANISTER_ID = process.env.OMNITY_ROUTE_CANISTER_ID || ""

export async function showWallet(userId: number, i18n: TFunction) {
  const principal = getUserIdentity(userId).getPrincipal()
  const accountId = AccountIdentifier.fromPrincipal({ principal })
  const balance = await getBalance(userId)
  const balance_icp = await getBalanceICP(userId)
  const data = [
    [i18n('balance'), i18n('asset')],
    [balance, TOKEN_SYMBOL],
    [balance_icp, ICP_SYMBOL],
  ]
  const tableString = table(data, { border: getBorderCharacters('ramac'), })
  let htmlString = '<b>' + i18n('msg_wallet_title') + '</b>' + '\n'
  htmlString += `<pre>${tableString}</pre>`
  htmlString += 'Principal ID:\n' + `<code>${principal.toText()}</code>`
  htmlString += '\n\nAccount ID:\n' + `<code>${accountId.toHex()}</code>`
  htmlString += '\n\nTelegram ID: ' + `<code>${userId}</code>`
  htmlString += '\n\n' + i18n('msg_wallet_notice')
  return htmlString
}

async function getBalance(userId: number): Promise<string> {
  const token = await getTokenBySymbol(await createPool(), TOKEN_SYMBOL)
  let balance = '0'
  if (token) {
    const amount = await icrc1BalanceOf(token, userId)
    balance = bigintToString(amount, parseInt(TOKEN_DECIMALS))
  }
  return balance
}

async function getBalanceICP(userId: number): Promise<string> {
  const token = await getTokenBySymbol(await createPool(), ICP_SYMBOL)
  let balance = '0'
  if (token) {
    const amount = await icrc1BalanceOf(token, userId)
    balance = bigintToString(amount, parseInt(ICP_DECIMALS))
  }
  return balance
}

// async function getBalances(userId: number): Promise<string> {
//   const tokens = await getTokens(await createPool());
//   const balances = await Promise.all(tokens.map(async (token) => ([
//     token.symbol,
//     (await icrc1BalanceOf(token, userId)).toString()
//   ])));
//   balances.unshift(['Token', 'Amount']);
//   const tableString = table(balances, {
//     singleLine: true,
//     border: getBorderCharacters('ramac'),
//   })
//   return "<pre>" + tableString + "</pre>"
// }

/**
 * /transfer 100 bc1qa3f4cmcmhze5nqsuanltf759mm9cfqd4wmls0w
 * /transfer 100 kqwog-a4rvg-b7zzv-4skt7-fzosi-gtaub-xdkpi-4ywbu-mz23j-rfvoq-sqe
 * 
 * /transfer ICP 100 kqwog-a4rvg-b7zzv-4skt7-fzosi-gtaub-xdkpi-4ywbu-mz23j-rfvoq-sqe
 * /transfer ICP 100 96427a419d7608353f7a1d0c5529218dbf695b803ddc4ddb1f78b654b06a0b35
 */
export async function transferToken(userId: number, args: string[], i18n: TFunction): Promise<string> {
  if (args.length !== 3 && args.length !== 2) {
    return i18n('msg_how_to_transfer')
  }
  if (args.length === 3 && args[0].toUpperCase() !== ICP_SYMBOL) {
    return i18n('msg_how_to_transfer')
  }
  const _token = args.length === 2 ? TOKEN_SYMBOL : ICP_SYMBOL
  const _amount = args.length === 2 ? args[0] : args[1]
  const _to = args.length === 2 ? args[1] : args[2]
  const _decimal = args.length === 2 ? TOKEN_DECIMALS : ICP_DECIMALS

  let pattern = new RegExp('^(\\d+(?:\\.\\d{1,' + _decimal + '})?)$')
  const matches = _amount.match(pattern)
  if (matches == null) {
    return i18n('msg_how_to_transfer')
  }

  const amount = stringToBigint(_amount, parseInt(_decimal))
  const token = await getTokenBySymbol(await createPool(), _token)
  if (!token) {
    return i18n('msg_how_to_transfer')
  }

  // /transfer 100 kqwog-a4rvg-b7zzv-4skt7-fzosi-gtaub-xdkpi-4ywbu-mz23j-rfvoq-sqe
  // /transfer ICP 100 kqwog-a4rvg-b7zzv-4skt7-fzosi-gtaub-xdkpi-4ywbu-mz23j-rfvoq-sqe
  if (_to.includes("-")) {
    let to: Principal = Principal.anonymous()
    try {
      to = Principal.fromText(_to)
    } catch (error) {
      return i18n('msg_how_to_transfer')
    }
    if (!to._isPrincipal) {
      return i18n('msg_how_to_transfer')
    }

    const ret = await icrc1Transfer(token, userId, amount, to)
    if ('Err' in ret) {
      const error = convertTransferError(ret['Err'], i18n)
      return i18n('msg_transfer_failed', { error })
    } else {
      if (_token == ICP_SYMBOL) {
        return i18n('msg_transfer_icp', { amount: _amount })
      } else {
        return i18n('msg_transfer', { amount: _amount })
      }
    }
  } else {
    // /transfer 100 bc1qa3f4cmcmhze5nqsuanltf759mm9cfqd4wmls0w
    if (args.length === 2 && isValidBitcoinAddress(_to)) {
      // return i18n('msg_how_to_transfer')
      const icp = await getTokenBySymbol(await createPool(), ICP_SYMBOL)
      if (!icp) {
        return i18n('msg_transfer_failed', { error: "database icp" })
      }
      // 1.0 runes >= amount + trans_fee (approve + transfer_from)
      const runeBalance = await icrc1BalanceOf(token, userId)
      const runeFee = await icrc1Fee(token, userId)
      if (amount > runeBalance - runeFee * 2n) {
        const error = convertTransferError({ 'InsufficientFunds': { 'balance': runeBalance } }, i18n)
        return i18n('msg_transfer_failed', { error })
      }
      // 1.1 icp >= redeem_fee + trans_fee
      const [feeAccount, redeemFee] = await getFeeAndAccount(userId, ChainID.Bitcoin)
      if (redeemFee == undefined || redeemFee == null) {
        return i18n('msg_transfer_failed', { error: "redeemFee" })
      }
      const icpBalcance = await icrc1BalanceOf(icp, userId)
      const icpFee = await icrc1Fee(icp, userId)
      if (redeemFee > icpBalcance - icpFee) {
        const error = convertTransferError({ 'InsufficientFunds': { 'balance': icpBalcance } }, i18n)
        return i18n('msg_transfer_failed', { error })
      }
      console.log(`redeemFee: ${redeemFee}  icpBalcance: ${icpBalcance}`)
      // 2. approve runes
      const approve = await icrc2Approve(token, userId, amount, Principal.fromText(OMNITY_ROUTE_CANISTER_ID))
      if ('Err' in approve) {
        const error = convertTransferError(approve['Err'], i18n) // TODO support approve err
        return i18n('msg_transfer_failed', { error })
      }
      console.log(`approve: ${approve.Ok}`)
      // 3. tansfer icp
      const feeAccountBalance = await ledgerAccountBalance(userId, feeAccount)
      if (feeAccountBalance < redeemFee) {
        const block = await ledgerTransfer(userId, redeemFee - feeAccountBalance, AccountIdentifier.fromHex(feeAccount))
      }
      // const feeAccountBalance2 = await ledgerAccountBalance(userId, feeAccount)
      // console.log(`ledgerAccountBalance: ${feeAccountBalance2}`)
      // 4. generate ticket
      const ticket = await generateTicket(userId, ChainID.Bitcoin, amount, _to)
      if ("Err" in ticket) {
        console.log(ticket.Err)
        return i18n('msg_transfer_failed', { error: "generateTicket" })
      }
      const fee = bigintToString(redeemFee, parseInt(ICP_DECIMALS))
      const id = ticket['Ok'].ticket_id
      return i18n('msg_transfer_btc', { fee, id })

      // /transfer ICP 100 96427a419d7608353f7a1d0c5529218dbf695b803ddc4ddb1f78b654b06a0b35
    } else if (args.length === 3) { // isAccountIdentifier ???
      const accountId = AccountIdentifier.fromPrincipal({ principal: getUserIdentity(userId).getPrincipal() })
      const balance = await ledgerAccountBalance(userId, accountId.toHex())
      if (balance < amount) {
        const error = convertTransferError({ 'InsufficientFunds': { 'balance': balance } }, i18n)
        return i18n('msg_transfer_failed', { error })
      }
      try {
        const block = await ledgerTransfer(userId, amount, AccountIdentifier.fromHex(_to))
        return i18n('msg_transfer_icp', { amount: _amount })
      } catch (error) {
        return i18n('msg_how_to_transfer')
      }
    } else {
      return i18n('msg_how_to_transfer')
    }
  }
}

// function isValidBitcoinAddress(address: string): boolean {
//   try {
//     bitcoin.address.toOutputScript(address)
//     return true
//   } catch (err) {
//     return false
//   }
// }

function isValidBitcoinAddress(address: string): boolean {
  const base58checkRegex = /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/
  const bech32Regex = /^(bc1)[a-zA-HJ-NP-Z0-9]{25,59}$/

  if (base58checkRegex.test(address)) {
      try {
          const base58checkResult = bitcoin.address.fromBase58Check(address)
          return true
      } catch (error) {
          return false
      }
  } else if (bech32Regex.test(address)) {
      try {
          const bech32Result = bitcoin.address.fromBech32(address)
          return true
      } catch (error) {
          return false
      }
  } else {
      return false
  }
}

function convertGenerateTicketError(err: GenerateTicketError, i18n: TFunction): string {
  console.log(err)
  let error = i18n('ledger_error_Unknown')
  if ('InsufficientRedeemFee' in err) {
    error = i18n('swap_error_InsufficientRedeemFee')
  } else if ('SendTicketErr' in err) {
    error = i18n('swap_error_SendTicketErr')
  } else if ('TemporarilyUnavailable' in err) {
    error = i18n('swap_error_TemporarilyUnavailable')
  } else if ('InsufficientAllowance' in err) {
    error = i18n('swap_error_InsufficientAllowance')
  } else if ('TransferFailure' in err) {
    error = i18n('swap_error_TransferFailure')
  } else if ('RedeemFeeNotSet' in err) {
    error = i18n('swap_error_RedeemFeeNotSet')
  } else if ('UnsupportedChainId' in err) {
    error = i18n('swap_error_UnsupportedChainId')
  } else if ('UnsupportedToken' in err) {
    error = i18n('swap_error_UnsupportedToken')
  } else if ('InsufficientFunds' in err) {
    // error = i18n('ledger_error_InsufficientFunds', { error: err.InsufficientFunds.balance.toString() })
    error = i18n('swap_error_InsufficientFunds')
  }
  return error
}