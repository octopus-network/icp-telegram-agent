export const idlFactory = ({ IDL }) => {
  const WhoAmI = IDL.Service({
    'argument' : IDL.Func([], [IDL.Principal], ['query']),
    'greet' : IDL.Func([IDL.Text], [IDL.Text], ['query']),
    'helloworld' : IDL.Func([IDL.Text, IDL.Text], [IDL.Text], ['query']),
    'id' : IDL.Func([], [IDL.Principal], []),
    'idQuick' : IDL.Func([], [IDL.Principal], []),
    'installer' : IDL.Func([], [IDL.Principal], ['query']),
    'whoami' : IDL.Func([], [IDL.Principal], []),
  });
  return WhoAmI;
};
export const init = ({ IDL }) => { return [IDL.Principal]; };
