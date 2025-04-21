import type { IDL } from '@dfinity/candid';
import { Principal } from '@dfinity/principal';
import { TokenId } from '../../model';
export type _data = Array<Array<number>>;
export interface OrderPrice {
  quantity:
    | {
        Buy: [tokenAmount, icpPrice];
      }
    | {
        Sell: bigint;
      };
  price: bigint;
}
export type OrderType =
  | {
      FAK: null;
    }
  | {
      FOK: null;
    }
  | {
      LMT: null;
    }
  | {
      MKT: null;
    };
export type icpPrice = bigint;
export type tokenAmount = bigint;
export type TradingResult = TradingResultOk | TradingResultErr;
export type TradingResultOk = {
  ok: {
    status: TradingStatus;
    txid: Txid;
    filled: Array<OrderFilled>;
  };
};
export type TradingStatus =
  | {
      Prepared: null;
    }
  | {
      Todo: null;
    }
  | {
      Closed: null;
    }
  | {
      Cancelled: null;
    }
  | {
      Pending: null;
    }
  | {
      Fail: null;
    }
  | { Completed: null }
  | {};
export interface OrderFilled {
  token0Value: BalanceChange;
  counterparty: Txid;
  token1Value: BalanceChange;
  time: Time;
}
export type Time = bigint;
export type Txid = Array<number>;
export interface BalanceChange {
  DebitRecord: bigint;
  CreditRecord: bigint;
  NoChange: null;
}
export type TradingResultErr = {
  err: {
    code:
      | {
          NonceError: null;
        }
      | {
          InvalidAmount: null;
        }
      | {
          UndefinedError: null;
        }
      | {
          UnacceptableVolatility: null;
        }
      | {
          TransactionBlocking: null;
        }
      | {
          InsufficientBalance: null;
        }
      | {
          TransferException: null;
        }
      | {};
    message: string;
  };
};
export type AccountId = Array<number>;
export type AccountIdentifier = string;
export interface Icrc1Account {
  owner: Principal;
  subaccount: Array<Array<number>>;
}
export interface AccountSetting {
  enPoolMode: boolean;
  modeSwitchHistory: Array<[bigint, bigint]>;
  start: Array<bigint>;
  enKeepingBalance: boolean;
}
export type ConfigMode = { PoolMode: null } | { TunnelMode: null };
export interface KeepingBalance {
  token0: { locked: bigint; available: bigint };
  token1: { locked: bigint; available: bigint };
}
export interface PairStats {
  change24h: string;
  vol24h: Vol;
  totalVol: Vol;
  price: string;
}
export interface Vol {
  value0: bigint;
  value1: bigint;
}
export type OrderStatusResponse =
  | { Failed: TradingOrder }
  | { None: null }
  | { Completed: TxnRecord }
  | { Pending: TradingOrder };
export interface TradingOrder {
  fee: { fee0: bigint; fee1: bigint };
  gas: { gas0: bigint; gas1: bigint };
  status: TradingStatus;
  toids: Array<bigint>;
  data: Array<Array<number>>;
  time: Time;
  txid: Txid;
  icrc1Account: Array<Icrc1Account>;
  orderType: OrderType;
  filled: Array<OrderFilled>;
  expiration: Time;
  nonce: bigint;
  account: Array<number>;
  remaining: OrderPrice;
  index: bigint;
  orderPrice: OrderPrice;
  refund: [bigint, bigint, bigint];
}
export type Shares = bigint;
export type ShareChange =
  | {
      Burn: Shares;
    }
  | {
      Mint: Shares;
    }
  | {
      NoChange: null;
    };
export type TxnRecordStatus =
  | { Failed: null }
  | { Completed: null }
  | { Pending: null }
  | { Cancelled: null }
  | { PartiallyCompletedAndCancelled: null };
export interface TxnRecord {
  fee: { token0Fee: bigint; token1Fee: bigint };
  shares: ShareChange;
  msgCaller: Array<Principal> | [];
  data: Array<Array<number>> | [];
  time: Time;
  txid: Txid;
  filled: {
    token0Value: BalanceChange;
    token1Value: BalanceChange;
  };
  order: {
    token0Value: [BalanceChange];
    token1Value: [BalanceChange];
  };
  status: TxnRecordStatus;
  orderMode: { AMM: null } | { OrderBook: null };
  orderType: [OrderType];
  token0: TokenType;
  token1: TokenType;
  nonce: bigint;
  operation: OperationType;
  account: Array<number>;
  details: Array<OrderFilled>;
  caller: Array<number>;
  index: bigint;
  cyclesWallet: Array<Principal> | [];
}
export type OperationType =
  | { AddLiquidity: null }
  | { Swap: null }
  | { Claim: null }
  | { RemoveLiquidity: null };
export type LevelResponse = [unitSize, OrderBook];
export type unitSize = bigint;
export interface OrderBook {
  ask: Array<PriceResponse>;
  bid: Array<PriceResponse>;
}
export interface PriceResponse {
  quantity: bigint;
  price: bigint;
}
export interface DexInfo {
  feeRate: string;
  mmType: { AMM: null } | { OrderBook: null };
  token0: [TokenType, TokenStd];
  token1: [TokenType, TokenStd];
  pairName: string;
  dexName: string;
  canisterId: Principal;
}
export type TokenType = { Icp: null } | { Cycles: null } | { Token: TokenId };
export type TokenStd =
  | { dft: null }
  | { dip20: null }
  | { drc20: null }
  | { other: null }
  | { cycles: null }
  | { icrc1: null }
  | { icp: null };
export interface TrieList {
  total: bigint;
  totalPage: bigint;
  data: Array<[Txid, TradingOrder]>;
}
declare const idlFactory: IDL.InterfaceFactory;
export default idlFactory;
export interface _SERVICE {
  trade(
    orderPrice: OrderPrice,
    orderType: OrderType,
    expiration: Array<bigint>,
    nonce: Array<bigint>,
    subaccount: Array<Array<number>>,
    data: Array<Array<number>>
  ): Promise<TradingResult>;
  accountSetting(address: string): Promise<AccountSetting>;
  accountConfig(
    mode: ConfigMode,
    keeping: boolean,
    subaccount: Array<Array<number>>
  ): Promise<void>;
  accountBalance(address: string): Promise<KeepingBalance>;
  stats(): Promise<PairStats>;
  statusByTxid(txid: Array<number>): Promise<OrderStatusResponse>;
  level100(): Promise<LevelResponse>;
  drc205_dexInfo(): Promise<DexInfo>;
  cancelByTxid(txid: Txid, subaccount: Array<Array<number>>): Promise<void>;
  pending(address: string[], page: bigint[], size: bigint[]): Promise<TrieList>;
}
