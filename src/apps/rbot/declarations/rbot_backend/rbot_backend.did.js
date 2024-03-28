export const idlFactory = ({ IDL }) => {
  const Result = IDL.Variant({ 'Ok' : IDL.Null, 'Err' : IDL.Text });
  const RedEnvelope = IDL.Record({
    'num' : IDL.Nat8,
    'status' : IDL.Nat8,
    'participants' : IDL.Vec(IDL.Tuple(IDL.Principal, IDL.Nat)),
    'token_id' : IDL.Principal,
    'owner' : IDL.Principal,
    'memo' : IDL.Text,
    'is_random' : IDL.Bool,
    'amount' : IDL.Nat,
    'expires_at' : IDL.Opt(IDL.Nat64),
  });
  const Result_1 = IDL.Variant({ 'Ok' : IDL.Nat, 'Err' : IDL.Text });
  return IDL.Service({
    'add_agent_acc' : IDL.Func([IDL.Principal], [Result], []),
    'add_token_to_white_list' : IDL.Func(
        [IDL.Principal, IDL.Nat8],
        [Result],
        [],
      ),
    'create_red_envelope' : IDL.Func([RedEnvelope], [Result_1], []),
    'get_admin_acc' : IDL.Func([], [IDL.Principal], ['query']),
    'get_caller_and_apiid' : IDL.Func(
        [],
        [IDL.Principal, IDL.Principal],
        ['query'],
      ),
    'get_need_transfer_from_status' : IDL.Func([], [IDL.Bool], ['query']),
    'get_red_envelope' : IDL.Func([IDL.Nat], [IDL.Opt(RedEnvelope)], ['query']),
    'get_rids_by_owner' : IDL.Func(
        [IDL.Principal],
        [IDL.Vec(IDL.Nat)],
        ['query'],
      ),
    'get_rids_by_participant' : IDL.Func(
        [IDL.Principal],
        [IDL.Vec(IDL.Nat)],
        ['query'],
      ),
    'get_storage_version' : IDL.Func([], [IDL.Nat64], ['query']),
    'is_admin_acc' : IDL.Func([], [IDL.Bool], ['query']),
    'is_agent_acc' : IDL.Func([IDL.Principal], [IDL.Bool], ['query']),
    'is_token_in_white_list' : IDL.Func([IDL.Principal], [IDL.Bool], ['query']),
    'open_red_envelope' : IDL.Func([IDL.Nat, IDL.Principal], [Result_1], []),
    'remove_token_from_white_list' : IDL.Func([IDL.Principal], [Result], []),
    'revoke_red_envelope' : IDL.Func([IDL.Nat], [Result_1], []),
    'set_admin_acc' : IDL.Func([IDL.Principal], [Result], []),
    'set_need_transfer_from_status' : IDL.Func([IDL.Bool], [Result], []),
    'set_receive_max_number_of_each' : IDL.Func([IDL.Nat], [Result], []),
  });
};
export const init = ({ IDL }) => { return [IDL.Principal]; };
