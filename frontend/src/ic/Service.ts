import { Actor, HttpAgent, Identity, CallConfig } from '@dfinity/agent';
import { IDL } from '@dfinity/candid';
import { Principal } from '@dfinity/principal';
export const buildService = <T>(
  identity: Identity,
  IDL: IDL.InterfaceFactory,
  canisterId: string,
  host = 'https://ic0.app/'
): T => {
  const agent = new HttpAgent({
    host: host,
    identity: identity
  });
  if (process.env.NODE_ENV !== 'production') {
    agent.fetchRootKey().catch(() => {
      console.warn(
        'Unable to fetch root key. Check to ensure that your local replica is running'
      );
    });
  }
  if (canisterId === 'aaaaa-aa') {
    return Actor.createActor(IDL, {
      agent: agent,
      canisterId: canisterId,
      ...{
        callTransform: transform,
        queryTransform: transform
      }
    });
  } else {
    return Actor.createActor(IDL, {
      agent: agent,
      canisterId: canisterId
    });
  }
};
export function transform(
  _methodName: string,
  args: unknown[],
  // eslint-disable-next-line
  _callConfig: CallConfig
): { effectiveCanisterId: Principal } {
  // eslint-disable-next-line
  const first = args[0] as any;
  let effectiveCanisterId = Principal.fromText('aaaaa-aa');
  if (first && typeof first === 'object' && first.canister_id) {
    effectiveCanisterId = Principal.from(first.canister_id as unknown);
  }
  return { effectiveCanisterId };
}
