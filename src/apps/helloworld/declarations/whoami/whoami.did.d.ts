import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export interface WhoAmI {
  'argument' : ActorMethod<[], Principal>,
  'greet' : ActorMethod<[string], string>,
  'helloworld' : ActorMethod<[string, string], string>,
  'id' : ActorMethod<[], Principal>,
  'idQuick' : ActorMethod<[], Principal>,
  'installer' : ActorMethod<[], Principal>,
  'whoami' : ActorMethod<[], Principal>,
}
export interface _SERVICE extends WhoAmI {}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
