import ICDexIDL from './ICDex.did';
import Service, {
  KeepingBalance,
  Level,
  OrderStatusResponse,
  PairInfo,
  Stats
} from '@/ic/ICDex/model';
import { buildService } from '@/ic/Service';
import { SerializableIC } from '@/ic/converter';
import { Identity } from '@dfinity/agent';
export class ICDexService {
  public accountBalance = async (
    canisterId: string,
    account: string
  ): Promise<KeepingBalance> => {
    const service = buildService<Service>(null, ICDexIDL, canisterId);
    try {
      return await service.accountBalance(account);
    } catch (e) {
      return null;
    }
  };
  public deposit = async (
    identity: Identity,
    canisterId: string,
    token: { token0: null } | { token1: null },
    amount: bigint
  ): Promise<void> => {
    const service = buildService<Service>(identity, ICDexIDL, canisterId);
    return await service.deposit(token, amount, []);
  };
  public withdraw = async (
    identity: Identity,
    canisterId: string,
    token0Amount: Array<bigint> = [],
    token1Amount: Array<bigint> = []
  ): Promise<[bigint, bigint]> => {
    const service = buildService<Service>(identity, ICDexIDL, canisterId);
    return await service.withdraw(token0Amount, token1Amount, []);
  };
  public info = async (canisterId: string): Promise<PairInfo> => {
    const service = buildService<Service>(null, ICDexIDL, canisterId);
    const res = await service.info();
    return SerializableIC(res);
  };
  public statusByTxid = async (
    canisterId: string,
    txid: Array<number>
  ): Promise<OrderStatusResponse> => {
    const service = buildService<Service>(null, ICDexIDL, canisterId);
    const res = await service.statusByTxid(txid);
    return SerializableIC(res);
  };
  public stats = async (canisterId: string): Promise<Stats> => {
    const service = buildService<Service>(null, ICDexIDL, canisterId);
    const res = await service.stats();
    return SerializableIC(res);
  };
  public level10 = async (canisterId: string): Promise<Level> => {
    const service = buildService<Service>(null, ICDexIDL, canisterId);
    const res = await service.level10();
    return SerializableIC(res);
  };
}
