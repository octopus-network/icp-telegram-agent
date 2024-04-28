import hdkey from 'hdkey';
import { mnemonicToSeedSync } from 'bip39';
import { Principal } from '@dfinity/principal';
import { DelegationChain, DelegationIdentity } from "@dfinity/identity";
import { Secp256k1KeyIdentity } from "@dfinity/identity-secp256k1";


function deriveKey(id: number, path?: string): hdkey {
  const seed = mnemonicToSeedSync(process.env.SOCIALFI_AGENT_MNEMONIC!)
  const root = hdkey.fromMasterSeed(seed)
  if (path) {
    return root.derive(path)
  } else {
    const quotient = Math.floor(id / 2147483647) // 0x7FFFFFFF
    const remainder = id % 2147483647 // 0x7FFFFFFF
    const path = `m/44'/223'/0'/${quotient}/${remainder}`
    return root.derive(path)
  }
}

export function getAgentIdentity(): Secp256k1KeyIdentity {
  const path = process.env.SOCIALFI_AGENT_DERIVE_PATH || "m/44'/223'/0'/2147483647/2147483647"
  const key = deriveKey(0, path)
  const identity = Secp256k1KeyIdentity.fromSecretKey(key.privateKey);
  return identity;
}

export function getUserIdentity(userId: number): Secp256k1KeyIdentity {
  const key = deriveKey(userId)
  const identity = Secp256k1KeyIdentity.fromSecretKey(key.privateKey);
  return identity;
}

export async function delegateIdentity(userId: number, canisterId: string) {
  const agentIdentity = getAgentIdentity();
  const userIdentity = getUserIdentity(userId)

  const delegationChain = await DelegationChain.create(
    userIdentity,
    agentIdentity.getPublicKey(),
    undefined,
    {
      targets: [Principal.fromText(canisterId)],
    },
  );
  const identity = DelegationIdentity.fromDelegation(agentIdentity, delegationChain);
  return identity;
}
