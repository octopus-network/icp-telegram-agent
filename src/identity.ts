import { Principal } from '@dfinity/principal';
import { Ed25519KeyIdentity, DelegationChain, DelegationIdentity } from "@dfinity/identity";
import { sha256 } from '@noble/hashes/sha256'
import exp from 'constants';

export function gatewayIdentity(): Ed25519KeyIdentity {
  const seed = sha256(new Uint8Array([0, 1, 2, 3])) // TODO: sha256
  const identity = Ed25519KeyIdentity.generate(seed);
  return identity;
}

export function userIdentity(userId: number): Ed25519KeyIdentity {
  const buffer = Buffer.alloc(4);
  const view = new DataView(buffer.buffer);
  view.setUint32(0, userId);
  const seed = sha256(new Uint8Array(buffer)) // TODO: sha256
  const identity =  Ed25519KeyIdentity.generate(seed);
  return identity;
}

export async function delegateIdentity(userId: number, canisterId: string) {
  const gate = gatewayIdentity();
  const user = userIdentity(userId)

  const delegationChain = await DelegationChain.create(
    user,
    gate.getPublicKey(),
    undefined,
    {
      targets: [Principal.fromText(canisterId)],
    },
  );
  const identity = DelegationIdentity.fromDelegation(gate, delegationChain);
  return identity;
}

export function hasUserIdentity(userId: number): boolean{
  return true
}
