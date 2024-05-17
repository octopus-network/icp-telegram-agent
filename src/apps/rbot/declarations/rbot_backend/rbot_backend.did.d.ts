import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export interface OldEnvelope {
  'num' : number,
  'status' : number,
  'participants' : Array<[Principal, bigint]>,
  'token_id' : Principal,
  'owner' : Principal,
  'memo' : string,
  'is_random' : boolean,
  'amount' : bigint,
  'expires_at' : [] | [bigint],
}
export interface RedEnvelope {
  'num' : number,
  'status' : number,
  'participants' : Array<[Principal, bigint]>,
  'token_id' : Principal,
  'owner' : Principal,
  'memo' : string,
  'is_random' : boolean,
  'amount' : bigint,
  'expires_at' : [] | [bigint],
}
export type Result = { 'Ok' : null } |
  { 'Err' : [bigint, string] };
export type Result_1 = { 'Ok' : bigint } |
  { 'Err' : [bigint, string] };
export interface _SERVICE {
  'add_agent_acc' : ActorMethod<[Principal], Result>,
  'add_token_to_white_list' : ActorMethod<[Principal, number], Result>,
  'create_red_envelope' : ActorMethod<[RedEnvelope], Result_1>,
  'get_admin_acc' : ActorMethod<[], Principal>,
  'get_caller_and_apiid' : ActorMethod<[], [Principal, Principal]>,
  'get_need_transfer_from_status' : ActorMethod<[], boolean>,
  'get_old_red_envelope' : ActorMethod<[bigint], [] | [OldEnvelope]>,
  'get_red_envelope' : ActorMethod<[bigint], [] | [RedEnvelope]>,
  'get_rids_by_owner' : ActorMethod<[Principal], Array<bigint>>,
  'get_rids_by_participant' : ActorMethod<[Principal], Array<bigint>>,
  'get_storage_version' : ActorMethod<[], bigint>,
  'is_admin_acc' : ActorMethod<[], boolean>,
  'is_agent_acc' : ActorMethod<[Principal], boolean>,
  'is_there_pre_allocated_random' : ActorMethod<[bigint], boolean>,
  'is_token_in_white_list' : ActorMethod<[Principal], boolean>,
  'open_red_envelope' : ActorMethod<[bigint, Principal], Result_1>,
  'remove_token_from_white_list' : ActorMethod<[Principal], Result>,
  'revoke_red_envelope' : ActorMethod<[bigint], Result_1>,
  'set_admin_acc' : ActorMethod<[Principal], Result>,
  'set_need_transfer_from_status' : ActorMethod<[boolean], Result>,
  'set_receive_max_number_of_each' : ActorMethod<[bigint], Result>,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
