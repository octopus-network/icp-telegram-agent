import type { ActorSubclass } from "@dfinity/agent"
import { createActor } from './declarations/icp_route'
import { _SERVICE } from "./declarations/icp_route/icp_route.did"
import type { GenerateTicketReq, Result_1 as GenerateTicketResp } from './declarations/icp_route/icp_route.did.d.ts'

import { getAgentIdentity, getUserIdentity, delegateIdentity } from '../../identity'
import { makeAgent } from '../../utils'

const OMNITY_ROUTE_CANISTER_ID = process.env.OMNITY_ROUTE_CANISTER_ID || ""
const OMNITY_TOKEN_ID = process.env.OMNITY_TOKEN_ID || ""

export enum ChainID {
  ICP = "eICP",
  Bitcoin = "Bitcoin",
}

async function getRouteActor(userid: number, delegation: boolean): Promise<ActorSubclass<_SERVICE>> {
  if (delegation) {
    const identity = await delegateIdentity(userid, OMNITY_ROUTE_CANISTER_ID);
    const agent = await makeAgent({ fetch, identity })
    return createActor(OMNITY_ROUTE_CANISTER_ID, { agent })
  } else {
    const identity = getAgentIdentity();
    const agent = await makeAgent({ fetch, identity })
    return createActor(OMNITY_ROUTE_CANISTER_ID, { agent })
  }
}

export async function getFeeAndAccount(userid: number, chain: ChainID): Promise<[string, bigint?]> {
  const actor = await getRouteActor(userid, true);
  const [redeemFee] = await actor.get_redeem_fee(chain)
  const feeAccount = await actor.get_fee_account([])
  const feeAccountId = Array.from(feeAccount).map((i) => ("0" + i.toString(16)).slice(-2)).join("");
  if (redeemFee) {
    return [feeAccountId, redeemFee]
  } else {
    return [feeAccountId]
  }
}

export async function generateTicket(userid: number, chain: ChainID, amount: bigint, receiver: string): Promise<GenerateTicketResp> {
  const req: GenerateTicketReq = {
    action: { Redeem: null },
    token_id: OMNITY_TOKEN_ID,
    from_subaccount: [],
    target_chain_id: chain,
    amount: amount,
    receiver: receiver,
  }
  const actor = await getRouteActor(userid, true);
  return actor.generate_ticket(req)
}