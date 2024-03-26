import { Principal } from '@dfinity/principal';
import { Ed25519KeyIdentity, DelegationChain, DelegationIdentity } from "@dfinity/identity";
import { sha256 } from '@noble/hashes/sha256'

export function getAgentIdentity(): Ed25519KeyIdentity {
  const seed = sha256(new Uint8Array([0, 1, 2, 3])) // TODO: sha256
  const identity = Ed25519KeyIdentity.generate(seed);
  return identity;
}

export function getUserIdentity(userId: number): Ed25519KeyIdentity {
  const buffer = Buffer.alloc(4);
  const view = new DataView(buffer.buffer);
  view.setUint32(0, userId);
  const seed = sha256(new Uint8Array(buffer)) // TODO: sha256
  const identity =  Ed25519KeyIdentity.generate(seed);
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

export function hasUserIdentity(userId: number): boolean{
  return true
}
