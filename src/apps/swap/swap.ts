import type { ActorSubclass } from "@dfinity/agent"
import { Principal } from '@dfinity/principal'
import { createActor } from './declarations/swap'
import { _SERVICE } from "./declarations/swap/swap.did"
import type { SwapArgs, Result_1 as SwapResult, LiquidityPool } from './declarations/swap/swap.did.d.ts'

import { getAgentIdentity, getUserIdentity, delegateIdentity } from '../../identity'
import { makeAgent } from '../../utils'

const SWAP_CANISTER_ID = process.env.SWAP_CANISTER_ID || ""

async function getSwapActor(userid: number, delegation: boolean): Promise<ActorSubclass<_SERVICE>> {
  if (delegation) {
    const identity = await delegateIdentity(userid, SWAP_CANISTER_ID);
    const agent = await makeAgent({ fetch, identity })
    return createActor(SWAP_CANISTER_ID, { agent })
  } else {
    const identity = getAgentIdentity();
    const agent = await makeAgent({ fetch, identity })
    return createActor(SWAP_CANISTER_ID, { agent })
  }
}

export async function avaliableAndPrice(userid: number, from: Principal, amount: string): Promise<SwapResult> {
  const actor = await getSwapActor(userid, true)
  return await actor.avaliable_and_price(from, amount)
}

export async function swap(userid: number, from: Principal, invoice: [] | [bigint], amount: string): Promise<SwapResult> {
  const args: SwapArgs = {
    from,
    invoice,
    allowed_slippage: [],
    enable_partially_fill: true,
    amount: amount,
    ref_price: '0'
  }
  const actor = await getSwapActor(userid, true);
  return actor.swap(args)
}

export async function poolTxFee(userid: number): Promise<number> {
  const actor = await getSwapActor(userid, true)
  const pool = await actor.pool()
  return parseFloat(pool.tx_fee)
}
