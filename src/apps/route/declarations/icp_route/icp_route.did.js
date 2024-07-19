export const idlFactory = ({ IDL }) => {
  const Account = IDL.Record({
    'owner' : IDL.Principal,
    'subaccount' : IDL.Opt(IDL.Vec(IDL.Nat8)),
  });
  const Result = IDL.Variant({ 'Ok' : IDL.Null, 'Err' : IDL.Text });
  const TxAction = IDL.Variant({
    'Burn' : IDL.Null,
    'Redeem' : IDL.Null,
    'Mint' : IDL.Null,
    'Transfer' : IDL.Null,
  });
  const GenerateTicketReq = IDL.Record({
    'action' : TxAction,
    'token_id' : IDL.Text,
    'from_subaccount' : IDL.Opt(IDL.Vec(IDL.Nat8)),
    'target_chain_id' : IDL.Text,
    'amount' : IDL.Nat,
    'receiver' : IDL.Text,
  });
  const GenerateTicketOk = IDL.Record({ 'ticket_id' : IDL.Text });
  const GenerateTicketError = IDL.Variant({
    'InsufficientRedeemFee' : IDL.Record({
      'provided' : IDL.Nat64,
      'required' : IDL.Nat64,
    }),
    'SendTicketErr' : IDL.Text,
    'TemporarilyUnavailable' : IDL.Text,
    'InsufficientAllowance' : IDL.Record({ 'allowance' : IDL.Nat64 }),
    'TransferFailure' : IDL.Text,
    'UnsupportedAction' : IDL.Text,
    'RedeemFeeNotSet' : IDL.Null,
    'UnsupportedChainId' : IDL.Text,
    'UnsupportedToken' : IDL.Text,
    'InsufficientFunds' : IDL.Record({ 'balance' : IDL.Nat64 }),
  });
  const Result_1 = IDL.Variant({
    'Ok' : GenerateTicketOk,
    'Err' : GenerateTicketError,
  });
  const ChainState = IDL.Variant({
    'Active' : IDL.Null,
    'Deactive' : IDL.Null,
  });
  const ChainType = IDL.Variant({
    'SettlementChain' : IDL.Null,
    'ExecutionChain' : IDL.Null,
  });
  const Chain = IDL.Record({
    'fee_token' : IDL.Opt(IDL.Text),
    'canister_id' : IDL.Text,
    'chain_id' : IDL.Text,
    'counterparties' : IDL.Opt(IDL.Vec(IDL.Text)),
    'chain_state' : ChainState,
    'chain_type' : ChainType,
    'contract_address' : IDL.Opt(IDL.Text),
  });
  const GetEventsArg = IDL.Record({
    'start' : IDL.Nat64,
    'length' : IDL.Nat64,
  });
  const FeeTokenFactor = IDL.Record({
    'fee_token' : IDL.Text,
    'fee_token_factor' : IDL.Nat,
  });
  const TargetChainFactor = IDL.Record({
    'target_chain_id' : IDL.Text,
    'target_chain_factor' : IDL.Nat,
  });
  const Factor = IDL.Variant({
    'UpdateFeeTokenFactor' : FeeTokenFactor,
    'UpdateTargetChainFactor' : TargetChainFactor,
  });
  const Token = IDL.Record({
    'decimals' : IDL.Nat8,
    'token_id' : IDL.Text,
    'metadata' : IDL.Vec(IDL.Tuple(IDL.Text, IDL.Text)),
    'icon' : IDL.Opt(IDL.Text),
    'name' : IDL.Text,
    'symbol' : IDL.Text,
  });
  const InitArgs = IDL.Record({
    'hub_principal' : IDL.Principal,
    'chain_id' : IDL.Text,
    'chain_state' : ChainState,
  });
  const UpgradeArgs = IDL.Record({
    'hub_principal' : IDL.Opt(IDL.Principal),
    'chain_id' : IDL.Opt(IDL.Text),
    'chain_state' : IDL.Opt(ChainState),
  });
  const ToggleAction = IDL.Variant({
    'Deactivate' : IDL.Null,
    'Activate' : IDL.Null,
  });
  const ToggleState = IDL.Record({
    'action' : ToggleAction,
    'chain_id' : IDL.Text,
  });
  const Event = IDL.Variant({
    'finalized_gen_ticket' : IDL.Record({
      'request' : GenerateTicketReq,
      'ticket_id' : IDL.Text,
    }),
    'updated_fee' : IDL.Record({ 'fee' : Factor }),
    'finalized_mint_token' : IDL.Record({
      'block_index' : IDL.Nat64,
      'ticket_id' : IDL.Text,
    }),
    'added_token' : IDL.Record({
      'token' : Token,
      'ledger_id' : IDL.Principal,
    }),
    'init' : InitArgs,
    'upgrade' : UpgradeArgs,
    'added_chain' : Chain,
    'toggle_chain_state' : ToggleState,
  });
  const Log = IDL.Record({ 'log' : IDL.Text, 'offset' : IDL.Nat64 });
  const Logs = IDL.Record({
    'logs' : IDL.Vec(Log),
    'all_logs_count' : IDL.Nat64,
  });
  const TokenResp = IDL.Record({
    'decimals' : IDL.Nat8,
    'token_id' : IDL.Text,
    'icon' : IDL.Opt(IDL.Text),
    'rune_id' : IDL.Opt(IDL.Text),
    'symbol' : IDL.Text,
  });
  const MintTokenStatus = IDL.Variant({
    'Finalized' : IDL.Record({ 'block_index' : IDL.Nat64 }),
    'Unknown' : IDL.Null,
  });
  const Result_2 = IDL.Variant({
    'Ok' : IDL.Null,
    'Err' : GenerateTicketError,
  });
  const MetadataValue = IDL.Variant({
    'Int' : IDL.Int,
    'Nat' : IDL.Nat,
    'Blob' : IDL.Vec(IDL.Nat8),
    'Text' : IDL.Text,
  });
  const ChangeFeeCollector = IDL.Variant({
    'SetTo' : Account,
    'Unset' : IDL.Null,
  });
  const FeatureFlags = IDL.Record({ 'icrc2' : IDL.Bool });
  const UpgradeArgs_1 = IDL.Record({
    'token_symbol' : IDL.Opt(IDL.Text),
    'transfer_fee' : IDL.Opt(IDL.Nat),
    'metadata' : IDL.Opt(IDL.Vec(IDL.Tuple(IDL.Text, MetadataValue))),
    'maximum_number_of_accounts' : IDL.Opt(IDL.Nat64),
    'accounts_overflow_trim_quantity' : IDL.Opt(IDL.Nat64),
    'change_fee_collector' : IDL.Opt(ChangeFeeCollector),
    'max_memo_length' : IDL.Opt(IDL.Nat16),
    'token_name' : IDL.Opt(IDL.Text),
    'feature_flags' : IDL.Opt(FeatureFlags),
  });
  return IDL.Service({
    'collect_ledger_fee' : IDL.Func(
        [IDL.Principal, IDL.Opt(IDL.Nat), Account],
        [Result],
        [],
      ),
    'generate_ticket' : IDL.Func([GenerateTicketReq], [Result_1], []),
    'get_chain_list' : IDL.Func([], [IDL.Vec(Chain)], ['query']),
    'get_events' : IDL.Func([GetEventsArg], [IDL.Vec(Event)], ['query']),
    'get_fee_account' : IDL.Func(
        [IDL.Opt(IDL.Principal)],
        [IDL.Vec(IDL.Nat8)],
        ['query'],
      ),
    'get_log_records' : IDL.Func([IDL.Nat64, IDL.Nat64], [Logs], ['query']),
    'get_redeem_fee' : IDL.Func([IDL.Text], [IDL.Opt(IDL.Nat64)], ['query']),
    'get_token_ledger' : IDL.Func(
        [IDL.Text],
        [IDL.Opt(IDL.Principal)],
        ['query'],
      ),
    'get_token_list' : IDL.Func([], [IDL.Vec(TokenResp)], ['query']),
    'mint_token_status' : IDL.Func([IDL.Text], [MintTokenStatus], ['query']),
    'remove_controller' : IDL.Func(
        [IDL.Principal, IDL.Principal],
        [Result],
        [],
      ),
    'resend_tickets' : IDL.Func([], [Result_2], []),
    'update_icrc_ledger' : IDL.Func(
        [IDL.Principal, UpgradeArgs_1],
        [Result],
        [],
      ),
  });
};
export const init = ({ IDL }) => { return []; };
