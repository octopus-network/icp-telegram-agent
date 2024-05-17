export const idlFactory = ({ IDL }) => {
  const TransferFromError = IDL.Variant({
    'GenericError' : IDL.Record({
      'message' : IDL.Text,
      'error_code' : IDL.Nat,
    }),
    'TemporarilyUnavailable' : IDL.Null,
    'InsufficientAllowance' : IDL.Record({ 'allowance' : IDL.Nat }),
    'BadBurn' : IDL.Record({ 'min_burn_amount' : IDL.Nat }),
    'Duplicate' : IDL.Record({ 'duplicate_of' : IDL.Nat }),
    'BadFee' : IDL.Record({ 'expected_fee' : IDL.Nat }),
    'CreatedInFuture' : IDL.Record({ 'ledger_time' : IDL.Nat64 }),
    'TooOld' : IDL.Null,
    'InsufficientFunds' : IDL.Record({ 'balance' : IDL.Nat }),
  });
  const SwapError = IDL.Variant({
    'Overflow' : IDL.Null,
    'IcLedger' : IDL.Text,
    'TooSmallFunds' : IDL.Null,
    'InvalidPool' : IDL.Null,
    'InvalidLiquidity' : IDL.Null,
    'InvalidInvoice' : IDL.Null,
    'InvalidRequirements' : IDL.Null,
    'TransferFrom' : TransferFromError,
    'InsufficientFunds' : IDL.Null,
  });
  const Result = IDL.Variant({ 'Ok' : IDL.Null, 'Err' : SwapError });
  const Result_1 = IDL.Variant({
    'Ok' : IDL.Tuple(IDL.Text, IDL.Text),
    'Err' : SwapError,
  });
  const LiquidityProvider = IDL.Record({
    'id' : IDL.Principal,
    'first' : IDL.Tuple(IDL.Principal, IDL.Text),
    'second' : IDL.Tuple(IDL.Principal, IDL.Text),
  });
  const Result_2 = IDL.Variant({ 'Ok' : IDL.Text, 'Err' : SwapError });
  const TokenMeta = IDL.Record({
    'id' : IDL.Principal,
    'fee' : IDL.Text,
    'decimals' : IDL.Nat8,
    'logo' : IDL.Text,
    'issuance' : IDL.Text,
    'symbol' : IDL.Text,
  });
  const LiquidityPool = IDL.Record({
    'k' : IDL.Text,
    'y_supply' : IDL.Text,
    'y_meta' : TokenMeta,
    'tx_fee' : IDL.Text,
    'x_supply' : IDL.Text,
    'x_meta' : TokenMeta,
  });
  const SwapArgs = IDL.Record({
    'from' : IDL.Principal,
    'invoice' : IDL.Opt(IDL.Nat64),
    'allowed_slippage' : IDL.Opt(IDL.Text),
    'enable_partially_fill' : IDL.Bool,
    'amount' : IDL.Text,
    'ref_price' : IDL.Text,
  });
  return IDL.Service({
    'add_liquidity' : IDL.Func([], [Result], []),
    'avaliable_and_price' : IDL.Func(
        [IDL.Principal, IDL.Text],
        [Result_1],
        ['query'],
      ),
    'contribution' : IDL.Func([IDL.Principal], [LiquidityProvider], ['query']),
    'deposit' : IDL.Func(
        [IDL.Principal, IDL.Text, IDL.Opt(IDL.Nat64)],
        [Result_2],
        [],
      ),
    'pool' : IDL.Func([], [LiquidityPool], ['query']),
    'remove_liquidity' : IDL.Func([], [Result], []),
    'setup' : IDL.Func([IDL.Principal, IDL.Principal, IDL.Text], [Result], []),
    'swap' : IDL.Func([SwapArgs], [Result_1], []),
    'withdraw' : IDL.Func([IDL.Principal, IDL.Text], [Result], []),
    'withdrawable' : IDL.Func([IDL.Principal], [IDL.Text, IDL.Text], ['query']),
  });
};
export const init = ({ IDL }) => { return [IDL.Principal]; };
