import { createAgent } from "@dfinity/utils"
import { LedgerCanister, AccountIdentifier } from "@dfinity/ledger-icp"

import { getAgentIdentity, getUserIdentity, delegateIdentity } from '../../identity'

async function getLedgerActor(userid: number, delegation: boolean): Promise<LedgerCanister> {
  const identity = delegation ? await delegateIdentity(userid) : getUserIdentity(userid)
  const agent = await createAgent({ identity, host: 'https://icp-api.io' })
  return LedgerCanister.create({ agent })
}

export async function ledgerTransfer(userid: number, amount: bigint, to: AccountIdentifier) {
  const transferArg = {
    to, 
    amount
  }
  const actor = await getLedgerActor(userid, true)
  return actor.transfer(transferArg)
}

export async function ledgerAccountBalance(userid: number, account: string) {
  const balanceArg = {
    accountIdentifier: account, 
    certified: false
  }
  const actor = await getLedgerActor(userid, true)
  return actor.accountBalance(balanceArg)
}
