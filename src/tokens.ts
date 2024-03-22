
export interface Token {
  symbol: string;
  canister: string;
}

// TODO: persistent storage
let tokenList: Token[] = [];

export function createToken(symbol: string, canister: string): Token {
  const newToken: Token = { symbol, canister };
  tokenList.push(newToken);
  return newToken;
}

export function getTokens(): Token[] {
  return tokenList;
}

export function getTokenBySymbol(symbol: string): Token | undefined {
  return tokenList.find(token => token.symbol === symbol);
}

export function updateToken(symbol: string, updatedToken: Token): boolean {
  const index = tokenList.findIndex(token => token.symbol === symbol);
  if (index !== -1) {
    tokenList[index] = updatedToken;
    return true;
  }
  return false;
}

export function deleteToken(symbol: string): boolean {
  const index = tokenList.findIndex(token => token.symbol === symbol);
  if (index !== -1) {
    tokenList.splice(index, 1);
    return true;
  }
  return false;
}

// createToken('ICP', 'ryjl3-tyaaa-aaaaa-aaaba-cai');
// createToken('XTC', 'qyjl3-tyaaa-aaaaa-aaaba-cai');
// createToken('DFX', 'efxjl-tyaaa-aaaaa-aaaba-cai');

// console.log('All tokens:', getTokens());

// const icpToken = getTokenBySymbol('ICP');
// if (icpToken) {
//   console.log('ICP token:', icpToken);
// }

// const updatedToken: Token = { symbol: 'XTC', canister: 'new-canister-id' };
// const updateSuccess = updateToken('XTC', updatedToken);
// console.log('Update success:', updateSuccess);

// const deleteSuccess = deleteToken('DFX');
// console.log('Delete success:', deleteSuccess);

// console.log('All tokens after update and delete:', getTokens());