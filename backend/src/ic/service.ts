import { Actor, HttpAgent, Identity, CallConfig } from '@dfinity/agent';
import { IDL } from '@dfinity/candid';
import { Principal } from '@dfinity/principal';
const IC_MANAGEMENT_CANISTER_ID = 'aaaaa-aa';
type BuildIdentity = Identity | null;
export const buildService = <T>(
  identity: BuildIdentity,
  IDL: IDL.InterfaceFactory,
  canisterId: string,
  host = 'https://ic0.app/'
): T => {
  let agent;
  if (identity) {
    agent = new HttpAgent({
      host: host,
      identity: identity
    });
  } else {
    agent = new HttpAgent({
      host: host
    });
  }
  if (process.env.NODE_ENV !== 'production') {
    agent.fetchRootKey().catch((err) => {
      console.warn(
        'Unable to fetch root key. Check to ensure that your local replica is running'
      );
    });
  }
  if (canisterId === IC_MANAGEMENT_CANISTER_ID) {
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
) {
  // eslint-disable-next-line
  const first = args[0] as any;
  let effectiveCanisterId = Principal.fromText(IC_MANAGEMENT_CANISTER_ID);
  if (first && typeof first === 'object' && first.canister_id) {
    effectiveCanisterId = Principal.from(first.canister_id as unknown);
  }
  return { effectiveCanisterId };
}
