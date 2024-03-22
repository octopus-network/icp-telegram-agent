import { Telegraf } from "telegraf";
import { message } from 'telegraf/filters';
import type { ActorSubclass } from "@dfinity/agent";
import { Principal } from '@dfinity/principal';
import { createActor } from './declarations/icrc1_ledger_canister';
import { _SERVICE } from "./declarations/icrc1_ledger_canister/icrc1_ledger_canister.did";
import type { Account, Tokens, TransferArg, TransferResult, ApproveArgs, ApproveResult } from "./declarations/icrc1_ledger_canister/icrc1_ledger_canister.did.d.ts";
// import type {  icrc1_ledger_canister } from "./declarations/icrc1_ledger_canister";

import { makeAgent } from '../../utils'
import { gatewayIdentity, userIdentity, userPrincipal, delegateIdentity } from '../../identity'
import type { Token } from '../../tokens'

async function getTokenActor(token: Token, userid: number, delegation: boolean): Promise<ActorSubclass<_SERVICE>> {
  if (delegation) {
    const identity = await delegateIdentity(userid, token.canister);
    const agent = await makeAgent({ fetch, identity })
    return createActor(token.canister, { agent })
  } else {
    const identity = gatewayIdentity();
    const agent = await makeAgent({ fetch, identity })
    return createActor(token.canister, { agent })
  }
}

export async function icrc1BalanceOf(token: Token, userid: number): Promise<bigint> {
  const account: Account = { owner: userPrincipal(userid), subaccount: [] }
  const actor = await getTokenActor(token, userid, true);
  return actor.icrc1_balance_of(account)
}

export async function icrc1Transfer(token: Token, userid: number, amount: Tokens): Promise<TransferResult> {
  const transferArg: TransferArg = {
    from_subaccount: [],
    to: { owner: Principal.fromText(token.canister), subaccount: [] },
    amount,
    fee: [],
    memo: [],
    created_at_time: []
  }
  const actor = await getTokenActor(token, userid, true);
  return actor.icrc1_transfer(transferArg)
}

export async function icrc2Approve(token: Token, userid: number, amount: Tokens): Promise<ApproveResult> {
  const approveArgs: ApproveArgs = {
    from_subaccount: [],
    spender: { owner: Principal.fromText(token.canister), subaccount: [] },
    amount,
    expected_allowance: [],
    fee: [],
    memo: [],
    created_at_time: [],
    expires_at: []
  }
  const actor = await getTokenActor(token, userid, true);
  return actor.icrc2_approve(approveArgs)
}
