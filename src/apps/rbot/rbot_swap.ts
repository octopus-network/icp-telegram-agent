import { AccountIdentifier } from "@dfinity/ledger-icp"
import { Principal } from '@dfinity/principal'
import { TFunction } from "i18next"

import { createPool, getTokenBySymbol } from '../../tokens'
import { ledgerTransfer } from "../ledger/ledger"
import { icrc1BalanceOf, icrc1Fee, icrc2Approve } from "../ledger/icrc1"
import { avaliableAndPrice, swap, poolTxFee } from "../swap/swap"
import { SwapError } from '../swap/declarations/swap/swap.did'
import { stringToBigint, bigintToString, convertTransferError } from './rbot_utils'


const SWAP_CANISTER_ID = process.env.SWAP_CANISTER_ID || ""
const TOKEN_SYMBOL = process.env.RBOT_TOKEN_SYMBOL || ""
const TOKEN_DECIMALS = process.env.RBOT_TOKEN_DECIMALS || "2"
const ICP_SYMBOL = 'ICP'
const ICP_DECIMALS = '8'

/**
 *  /preswap 88.88
 *  /preswap ICP 0.12345678
 */
export async function getSwapPrice(userId: number, args: string[], i18n: TFunction): Promise<string> {
  if (args.length !== 1 && args.length !== 2) {
    return i18n('msg_how_to_preswap')
  }
  if (args.length === 2 && args[0].toUpperCase() !== ICP_SYMBOL) {
    return i18n('msg_how_to_preswap')
  }

  const _x_token = args.length === 1 ? TOKEN_SYMBOL : ICP_SYMBOL
  const _y_token = args.length === 1 ? ICP_SYMBOL : TOKEN_SYMBOL
  const _amount = args.length === 1 ? args[0] : args[1]
  const _x_decimal = args.length === 1 ? TOKEN_DECIMALS : ICP_DECIMALS
  const _y_decimal = args.length === 1 ? ICP_DECIMALS : TOKEN_DECIMALS

  let pattern = new RegExp('^(\\d+(?:\\.\\d{1,' + _x_decimal + '})?)$')
  const matches = _amount.match(pattern)
  if (matches == null) {
    return i18n('msg_how_to_preswap')
  }

  const pool = await createPool()
  const [x_token, y_token] = await Promise.all([
    await getTokenBySymbol(pool, _x_token),
    await getTokenBySymbol(pool, _y_token)
  ])
  if (!x_token || !y_token) {
    return i18n('msg_how_to_preswap')
  }

  const x_amount = stringToBigint(_amount, parseInt(_x_decimal))
  const x_fee = await icrc1Fee(x_token, userId)
  if (x_amount <= x_fee) {
    const error = convertSwapError({ 'TooSmallFunds': null }, i18n)
    return i18n('msg_preswap_failed', { error })
  }

  const ret = await avaliableAndPrice(userId, Principal.fromText(x_token.canister), _amount)
  if ('Err' in ret) {
    const error = convertSwapError(ret.Err, i18n)
    return i18n('msg_preswap_failed', { error })
  } else {
    // fee
    const [x_fee, y_fee, swap_fee_rate] = await Promise.all([
      await icrc1Fee(x_token, userId),
      await icrc1Fee(y_token, userId),
      await poolTxFee(userId)
    ])
    const x_fee_str = bigintToString(x_fee, parseInt(_x_decimal))
    const y_fee_str = bigintToString(y_fee, parseInt(_y_decimal))

    // patch: swap amount > fee
    if (parseFloat(ret.Ok[0]) <= parseFloat(y_fee_str)) {
      let preview = `${_amount} ${_x_token} -> 0 ${_y_token}\n`
      if (args.length === 1) {
        const price = 1. / parseFloat(ret.Ok[1])
        const priceStr = price.toFixed(8) //.replace(/\.?0+$/, '')
        preview += i18n('price') + `${priceStr} RICH/ICP\n`
      } else {
        preview += i18n('price') + `${ret.Ok[1]} RICH/ICP\n`
      }
      preview += i18n('fee') + `${x_fee_str} ${_x_token}`
      return preview
    }
    
    // swap
    const y_amount = parseFloat(ret.Ok[0]) - parseFloat(y_fee_str)
    const y_amount_str = y_amount.toFixed(parseInt(_y_decimal)) //.replace(/\.?0+$/, '')
    let preview = `${_amount} ${_x_token} -> ${y_amount_str} ${_y_token}\n`
    // price
    if (args.length === 1) {
      const price = 1. / parseFloat(ret.Ok[1])
      const priceStr = price.toFixed(8) //.replace(/\.?0+$/, '')
      preview += i18n('price') + `${priceStr} RICH/ICP\n`
    } else {
      preview += i18n('price') + `${ret.Ok[1]} RICH/ICP\n`
    }
    // fee
    const s_fee = parseFloat(ret.Ok[0]) / (1 - swap_fee_rate) * swap_fee_rate
    const y_s_fee_str = (parseFloat(y_fee_str) + s_fee).toFixed(parseInt(_y_decimal)) //.replace(/\.?0+$/, '')
    preview += i18n('fee') + `${x_fee_str} ${_x_token} & ${y_s_fee_str} ${_y_token}`
    preview += '\n\n' + i18n('msg_preswap_notice')

    return preview
  }
}

/**
 *  /swap 88.88
 *  /swap ICP 1.12345678
 */
export async function doSwap(userId: number, args: string[], i18n: TFunction): Promise<string> {
  if (args.length !== 1 && args.length !== 2) {
    return i18n('msg_how_to_swap')
  }
  if (args.length === 2 && args[0].toUpperCase() !== ICP_SYMBOL) {
    return i18n('msg_how_to_swap')
  }

  const _x_token = args.length === 1 ? TOKEN_SYMBOL : ICP_SYMBOL
  const _y_token = args.length === 1 ? ICP_SYMBOL : TOKEN_SYMBOL
  const _amount = args.length === 1 ? args[0] : args[1]
  const _x_decimal = args.length === 1 ? TOKEN_DECIMALS : ICP_DECIMALS
  const _y_decimal = args.length === 1 ? ICP_DECIMALS : TOKEN_DECIMALS

  let pattern = new RegExp('^(\\d+(?:\\.\\d{1,' + _x_decimal + '})?)$')
  const matches = _amount.match(pattern)
  if (matches == null) {
    return i18n('msg_how_to_swap')
  }

  const x_amount = stringToBigint(_amount, parseInt(_x_decimal))
  const pool = await createPool()
  const [x_token, y_token] = await Promise.all([
    await getTokenBySymbol(pool, _x_token),
    await getTokenBySymbol(pool, _y_token)
  ])
  if (!x_token || !y_token) {
    return i18n('msg_how_to_swap')
  }

  // check [icp/rich] balance >= x_amount + trans_fee
  const [x_balance, x_fee, y_fee, swap_fee_rate] = await Promise.all([
    await icrc1BalanceOf(x_token, userId),
    await icrc1Fee(x_token, userId),
    await icrc1Fee(y_token, userId),
    await poolTxFee(userId)
  ])
  const x_fee_str = bigintToString(x_fee, parseInt(_x_decimal))
  const y_fee_str = bigintToString(y_fee, parseInt(_y_decimal))
  // if (x_amount <= x_fee) {
  //   const error = convertSwapError({ 'TooSmallFunds': null }, i18n)
  //   return i18n('msg_swap_failed', { error })
  // }
  if (x_balance < x_amount + x_fee) {
    const error = convertTransferError({ 'InsufficientFunds': { 'balance': x_balance } }, i18n)
    return i18n('msg_swap_failed', { error })
  }

  let invoice: [] | [bigint] = []
  if (_x_token === TOKEN_SYMBOL) {
    // approve runes
    const approve = await icrc2Approve(x_token, userId, x_amount, Principal.fromText(SWAP_CANISTER_ID))
    if ('Err' in approve) {
      const error = convertTransferError(approve['Err'], i18n) // TODO support approve err
      return i18n('msg_swap_failed', { error })
    }
    // console.log(`approve: ${approve.Ok}`)
  } else {
    // tansfer icp
    const to = AccountIdentifier.fromPrincipal({ principal: Principal.fromText(SWAP_CANISTER_ID) })
    const block = await ledgerTransfer(userId, x_amount, to)
    invoice = [block]
    // console.log(`tansfer: ${block}`)
  }

  // swap
  const ret = await swap(userId, Principal.fromText(x_token.canister), invoice, _amount)
  if ('Err' in ret) {
    const error = convertSwapError(ret.Err, i18n)
    return i18n('msg_swap_failed', { error })
  } else {
    // patch: swap amount > fee
    if (parseFloat(ret.Ok[1]) <= parseFloat(y_fee_str)) {
      let swap = i18n('received') + `${0} ${_y_token}\n`
      swap += i18n('fee') + `${x_fee_str} ${_x_token}`
      return swap
    }

    // swap
    const y_amount = parseFloat(ret.Ok[1]) - parseFloat(y_fee_str)
    const y_amount_str = y_amount.toFixed(parseInt(_y_decimal)) //.replace(/\.?0+$/, '')
    let swap = i18n('received') + `${y_amount_str} ${_y_token}\n`
    if (ret.Ok[0] !== '0') {
      swap += i18n('remain') + `${ret.Ok[0]} ${_x_token}`
    }
    // fee
    const s_fee = parseFloat(ret.Ok[1]) / (1 - swap_fee_rate) * swap_fee_rate
    const y_s_fee_str = (parseFloat(y_fee_str) + s_fee).toFixed(parseInt(_y_decimal)) //.replace(/\.?0+$/, '')
    swap += i18n('fee') + `${x_fee_str} ${_x_token} & ${y_s_fee_str} ${_y_token}`
    return swap
  }
}

function convertSwapError(err: SwapError, i18n: TFunction): string {
  console.log(err)
  let error = i18n('ledger_error_Unknown')
  if ('Overflow' in err) {
    error = i18n('swap_error_Overflow')
  } else if ('IcLedger' in err) {
    error = i18n('swap_error_IcLedger', { error: err.IcLedger })
  } else if ('TooSmallFunds' in err) {
    error = i18n('swap_error_TooSmallFunds')
  } else if ('InvalidPool' in err) {
    error = i18n('swap_error_InvalidPool')
  } else if ('InvalidLiquidity' in err) {
    error = i18n('swap_error_InvalidLiquidity')
  } else if ('InvalidInvoice' in err) {
    error = i18n('swap_error_InvalidInvoice')
  } else if ('InvalidRequirements' in err) {
    error = i18n('swap_error_InvalidRequirements')
  } else if ('TransferFrom' in err) {
    error = i18n('swap_error_TransferFrom')
  } else if ('InsufficientFunds' in err) {
    // error = i18n('ledger_error_InsufficientFunds', { error: err.InsufficientFunds.balance.toString() })
    error = i18n('swap_error_InsufficientFunds')
  }
  return error
}