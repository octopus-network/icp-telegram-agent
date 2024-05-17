import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export interface LiquidityPool {
  'k' : string,
  'y_supply' : string,
  'y_meta' : TokenMeta,
  'tx_fee' : string,
  'x_supply' : string,
  'x_meta' : TokenMeta,
}
export interface LiquidityProvider {
  'id' : Principal,
  'first' : [Principal, string],
  'second' : [Principal, string],
}
export type Result = { 'Ok' : null } |
  { 'Err' : SwapError };
export type Result_1 = { 'Ok' : [string, string] } |
  { 'Err' : SwapError };
export type Result_2 = { 'Ok' : string } |
  { 'Err' : SwapError };
export interface SwapArgs {
  'from' : Principal,
  'invoice' : [] | [bigint],
  'allowed_slippage' : [] | [string],
  'enable_partially_fill' : boolean,
  'amount' : string,
  'ref_price' : string,
}
export type SwapError = { 'Overflow' : null } |
  { 'IcLedger' : string } |
  { 'TooSmallFunds' : null } |
  { 'InvalidPool' : null } |
  { 'InvalidLiquidity' : null } |
  { 'InvalidInvoice' : null } |
  { 'InvalidRequirements' : null } |
  { 'TransferFrom' : TransferFromError } |
  { 'InsufficientFunds' : null };
export interface TokenMeta {
  'id' : Principal,
  'fee' : string,
  'decimals' : number,
  'logo' : string,
  'issuance' : string,
  'symbol' : string,
}
export type TransferFromError = {
    'GenericError' : { 'message' : string, 'error_code' : bigint }
  } |
  { 'TemporarilyUnavailable' : null } |
  { 'InsufficientAllowance' : { 'allowance' : bigint } } |
  { 'BadBurn' : { 'min_burn_amount' : bigint } } |
  { 'Duplicate' : { 'duplicate_of' : bigint } } |
  { 'BadFee' : { 'expected_fee' : bigint } } |
  { 'CreatedInFuture' : { 'ledger_time' : bigint } } |
  { 'TooOld' : null } |
  { 'InsufficientFunds' : { 'balance' : bigint } };
export interface _SERVICE {
  'add_liquidity' : ActorMethod<[], Result>,
  'avaliable_and_price' : ActorMethod<[Principal, string], Result_1>,
  'contribution' : ActorMethod<[Principal], LiquidityProvider>,
  'deposit' : ActorMethod<[Principal, string, [] | [bigint]], Result_2>,
  'pool' : ActorMethod<[], LiquidityPool>,
  'remove_liquidity' : ActorMethod<[], Result>,
  'setup' : ActorMethod<[Principal, Principal, string], Result>,
  'swap' : ActorMethod<[SwapArgs], Result_1>,
  'withdraw' : ActorMethod<[Principal, string], Result>,
  'withdrawable' : ActorMethod<[Principal], [string, string]>,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
