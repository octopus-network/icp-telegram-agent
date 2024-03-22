import { generateMnemonic } from 'bip39'
import { randomBytes } from '@noble/hashes/utils'
import { HttpAgent, HttpAgentOptions } from '@dfinity/agent';

export function generateUserMnemonic(userId: number): string {
  // TODO: https://cloud.google.com/kms/docs/generate-random#kms-generate-random-bytes-nodejs
  const rng = ((size: number) => Buffer.from(randomBytes(size)))
  const mnemonic = generateMnemonic(128, rng)
  // TODO: save ??? userid <--> mnemonic ???
  return mnemonic
}

export const makeAgent = async (options?: HttpAgentOptions) => {
  const host = process.env.DFX_NETWORK === 'local' ? 'http://127.0.0.1:4943' : 'https://icp-api.io';
  const agent = new HttpAgent({
    host,
    // TODO - remove this when the dfx replica supports it
    verifyQuerySignatures: false,
    ...options,
  });
  try {
    await agent.fetchRootKey();
  } catch (_) {
    //
  }
  return agent;
};
