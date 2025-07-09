import { Identity, CallConfig } from '@dfinity/agent';
import { IDL } from '@dfinity/candid';
import { Principal } from '@dfinity/principal';
declare type BuildIdentity = Identity | null;
export declare const buildService: <T>(identity: BuildIdentity, IDL: IDL.InterfaceFactory, canisterId: string, host?: string) => T;
export declare function transform(_methodName: string, args: unknown[], _callConfig: CallConfig): {
    effectiveCanisterId: Principal;
};
export {};
