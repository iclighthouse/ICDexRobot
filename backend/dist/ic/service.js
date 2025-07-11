"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transform = exports.buildService = void 0;
const agent_1 = require("@dfinity/agent");
const principal_1 = require("@dfinity/principal");
const IC_MANAGEMENT_CANISTER_ID = 'aaaaa-aa';
const buildService = (identity, IDL, canisterId, host = 'https://ic0.app/') => {
    let agent;
    if (identity) {
        agent = new agent_1.HttpAgent({
            host: host,
            identity: identity
        });
    }
    else {
        agent = new agent_1.HttpAgent({
            host: host
        });
    }
    if (process.env.NODE_ENV !== 'production') {
        agent.fetchRootKey().catch((err) => {
            console.warn('Unable to fetch root key. Check to ensure that your local replica is running');
        });
    }
    if (canisterId === IC_MANAGEMENT_CANISTER_ID) {
        return agent_1.Actor.createActor(IDL, {
            agent: agent,
            canisterId: canisterId,
            ...{
                callTransform: transform,
                queryTransform: transform
            }
        });
    }
    else {
        return agent_1.Actor.createActor(IDL, {
            agent: agent,
            canisterId: canisterId
        });
    }
};
exports.buildService = buildService;
function transform(_methodName, args, 
// eslint-disable-next-line
_callConfig) {
    // eslint-disable-next-line
    const first = args[0];
    let effectiveCanisterId = principal_1.Principal.fromText(IC_MANAGEMENT_CANISTER_ID);
    if (first && typeof first === 'object' && first.canister_id) {
        effectiveCanisterId = principal_1.Principal.from(first.canister_id);
    }
    return { effectiveCanisterId };
}
exports.transform = transform;
