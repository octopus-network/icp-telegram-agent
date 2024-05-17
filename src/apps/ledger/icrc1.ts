import type { ActorSubclass } from "@dfinity/agent";
import { Principal } from '@dfinity/principal';
import { createActor } from './declarations/icrc1_ledger_canister';
import { _SERVICE } from "./declarations/icrc1_ledger_canister/icrc1_ledger_canister.did";
import type { Account, Tokens, TransferArg, TransferResult, ApproveArgs, ApproveResult, AllowanceArgs } from "./declarations/icrc1_ledger_canister/icrc1_ledger_canister.did";
// import type {  icrc1_ledger_canister } from "./declarations/icrc1_ledger_canister";

import { makeAgent } from '../../utils'
import { getAgentIdentity, getUserIdentity, delegateIdentity } from '../../identity'
import type { Token } from '../../tokens'

async function getTokenActor(token: Token, userid: number, delegation: boolean): Promise<ActorSubclass<_SERVICE>> {
  if (delegation) {
    const identity = await delegateIdentity(userid, token.canister);
    const agent = await makeAgent({ fetch, identity })
    return createActor(token.canister, { agent })
  } else {
    const identity = getAgentIdentity();
    const agent = await makeAgent({ fetch, identity })
    return createActor(token.canister, { agent })
  }
}

export async function icrc1BalanceOf(token: Token, userid: number): Promise<bigint> {
  const principal = getUserIdentity(userid).getPrincipal()
  const account: Account = { owner: principal, subaccount: [] }
  const actor = await getTokenActor(token, userid, true);
  return actor.icrc1_balance_of(account)
}

export async function icrc1Transfer(token: Token, userid: number, amount: Tokens, to: Principal): Promise<TransferResult> {
  const transferArg: TransferArg = {
    from_subaccount: [],
    to: { owner: to, subaccount: [] },
    amount,
    fee: [],
    memo: [],
    created_at_time: []
  }
  const actor = await getTokenActor(token, userid, true);
  return actor.icrc1_transfer(transferArg)
}

export async function icrc1Fee(token: Token, userid: number): Promise<bigint> {
  const actor = await getTokenActor(token, userid, true);
  return actor.icrc1_fee()
}

export async function icrc2Approve(token: Token, userid: number, amount: Tokens, spender: Principal): Promise<ApproveResult> {
  const actor = await getTokenActor(token, userid, true);

  const allowanceArgs: AllowanceArgs= {
    spender: {
      owner: spender,
      subaccount: [],
    },
    account: {
      owner: getUserIdentity(userid).getPrincipal(),
      subaccount: [],
    },
  }
  const allowance = await actor.icrc2_allowance(allowanceArgs)

  if (allowance.allowance < amount) { // ||expires_t 
    const approveArgs: ApproveArgs = {
      from_subaccount: [],
      spender: { 
        owner: spender, 
        subaccount: [] 
      },
      amount,
      expected_allowance: [],
      fee: [],
      memo: [],
      created_at_time: [],
      expires_at: []
    }
    return actor.icrc2_approve(approveArgs)
  } else {
    return { 'Ok' : 0n }
  }
}