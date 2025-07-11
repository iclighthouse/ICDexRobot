import { Identity } from '@dfinity/agent';
import { OrderPrice, OrderType, TradingResult, _data, ConfigMode, KeepingBalance, PairStats, OrderStatusResponse, LevelResponse, DexInfo, Txid, TrieList } from './ICDex.idl';
export declare class ICDexService {
    trade: (canisterId: string, identity: Identity, orderPrice: OrderPrice, orderType: OrderType, nonce?: Array<bigint>, expiration?: Array<bigint>, subAccountId?: number, data?: _data) => Promise<TradingResult>;
    accountSetting: (canisterId: string, address: string) => Promise<import("./ICDex.idl").AccountSetting>;
    accountConfig: (canisterId: string, identity: Identity, mode: ConfigMode, keeping: boolean) => Promise<void>;
    accountBalance: (canisterId: string, address: string) => Promise<KeepingBalance>;
    stats: (canisterId: string) => Promise<PairStats>;
    statusByTxid: (canisterId: string, txid: Array<number>) => Promise<OrderStatusResponse>;
    level100: (canisterId: string) => Promise<LevelResponse>;
    drc205_dexInfo: (canisterId: string) => Promise<DexInfo>;
    cancelByTxid: (canisterId: string, identity: Identity, txid: Txid, subaccount?: Array<Array<number>>) => Promise<boolean>;
    pending: (canisterId: string, address: string, page?: never[], size?: never[]) => Promise<TrieList>;
}
