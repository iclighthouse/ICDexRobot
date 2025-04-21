import { Identity } from '@dfinity/agent';
import idlFactory, {
  _SERVICE,
  OrderPrice,
  OrderType,
  TradingResult,
  _data,
  ConfigMode,
  KeepingBalance,
  PairStats,
  OrderStatusResponse,
  LevelResponse,
  DexInfo,
  Txid,
  TrieList
} from './ICDex.idl';
import { SerializableIC, fromSubAccountId } from '../converter';
import { buildService } from '../service';
export class ICDexService {
  public trade = async (
    canisterId: string,
    identity: Identity,
    orderPrice: OrderPrice,
    orderType: OrderType,
    nonce: Array<bigint> = [],
    expiration: Array<bigint> = [],
    subAccountId = 0,
    data: _data = [[]]
  ): Promise<TradingResult> => {
    const service = buildService<_SERVICE>(identity, idlFactory, canisterId);
    let subAccount: Array<Array<number>> = [[]];
    if (subAccountId || subAccountId === 0) {
      subAccount = [fromSubAccountId(subAccountId)];
    }
    const res = await service.trade(
      orderPrice,
      orderType,
      expiration,
      nonce,
      subAccount,
      data
    );
    return SerializableIC(res);
  };
  public accountSetting = async (canisterId: string, address: string) => {
    const service = buildService<_SERVICE>(null, idlFactory, canisterId);
    return service.accountSetting(address);
  };
  public accountConfig = async (
    canisterId: string,
    identity: Identity,
    mode: ConfigMode,
    keeping: boolean
  ): Promise<void> => {
    const service = buildService<_SERVICE>(identity, idlFactory, canisterId);
    try {
      return await service.accountConfig(mode, keeping, []);
    } catch (e) {
      return undefined;
    }
  };
  public accountBalance = async (
    canisterId: string,
    address: string
  ): Promise<KeepingBalance> => {
    const service = buildService<_SERVICE>(null, idlFactory, canisterId);
    return await service.accountBalance(address);
  };
  public stats = async (canisterId: string): Promise<PairStats> => {
    const service = buildService<_SERVICE>(null, idlFactory, canisterId);
    return await service.stats();
  };
  public statusByTxid = async (
    canisterId: string,
    txid: Array<number>
  ): Promise<OrderStatusResponse> => {
    const service = buildService<_SERVICE>(null, idlFactory, canisterId);
    const res = await service.statusByTxid(txid);
    return SerializableIC(res);
  };
  public level100 = async (canisterId: string): Promise<LevelResponse> => {
    const service = buildService<_SERVICE>(null, idlFactory, canisterId);
    const res = await service.level100();
    return SerializableIC(res);
  };
  public drc205_dexInfo = async (canisterId: string): Promise<DexInfo> => {
    const service = buildService<_SERVICE>(null, idlFactory, canisterId);
    const res = await service.drc205_dexInfo();
    return SerializableIC(res);
  };
  public cancelByTxid = async (
    canisterId: string,
    identity: Identity,
    txid: Txid,
    subaccount: Array<Array<number>> = []
  ): Promise<boolean> => {
    const service = buildService<_SERVICE>(identity, idlFactory, canisterId);
    try {
      await service.cancelByTxid(txid, subaccount);
      return true;
    } catch (e) {
      return false;
    }
  };
  public pending = async (
    canisterId: string,
    address: string,
    page = [],
    size = []
  ): Promise<TrieList> => {
    const service = buildService<_SERVICE>(null, idlFactory, canisterId);
    const res = await service.pending([address], page, size);
    return SerializableIC(res);
  };
}
