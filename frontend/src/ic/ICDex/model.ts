import { Principal } from '@dfinity/principal';
import {
  DexSetting,
  SwapTokenInfo,
  TokenInfo,
  TokenStd,
  TokenSymbol
} from '@/views/home/model';
import { Icrc1Account } from '@/ic/DRC20Token/model';
export interface KeepingBalance {
  token0: { locked: bigint; available: bigint };
  token1: { locked: bigint; available: bigint };
}
export interface PairInfo {
  pairId?: string;
  decimals: number;
  setting: DexSetting;
  owner: Principal;
  name: string;
  version: string;
  token0: [Principal, TokenSymbol, TokenStd];
  token1: [Principal, TokenSymbol, TokenStd];
  token0Info?: TokenInfo;
  token1Info?: TokenInfo;
  paused: boolean;
}
export type OrderStatusResponse =
  | { Failed: TradingOrder }
  | { None: null }
  | { Completed: TxnRecord }
  | { Pending: TradingOrder };
export interface TxnRecord {
  fee: { token0Fee: bigint; token1Fee: bigint };
  shares: ShareChange;
  msgCaller: Array<Principal> | [];
  data: Array<Array<number>> | [];
  time: bigint;
  txid: Array<number>;
  filled: ICDexCompletedFilled;
  order: ICDexOrder;
  status: TxnRecordStatus;
  orderMode: { AMM: null } | { OrderBook: null };
  orderType: [OrderType];
  token0: TokenType;
  token1: TokenType;
  nonce: bigint;
  operation: OperationType;
  account: Array<number>;
  details: Array<ICDexPendingFilled>;
  caller: Array<number>;
  index: bigint;
  cyclesWallet: Array<Principal> | [];
}
export interface ICDexCompletedFilled {
  token0Value: BalanceChange;
  token1Value: BalanceChange;
}
export interface ICDexOrder {
  token0Value: [BalanceChange];
  token1Value: [BalanceChange];
}
export type OperationType =
  | { AddLiquidity: null }
  | { Swap: null }
  | { Claim: null }
  | { RemoveLiquidity: null };
export type TokenType = { Icp: null } | { Token: Principal } | { Cycles: null };
export type TxnRecordStatus =
  | { Failed: null }
  | { Completed: null }
  | { Pending: null }
  | { Cancelled: null }
  | { PartiallyCompletedAndCancelled: null };
export type ShareChange =
  | {
      Burn: bigint;
    }
  | {
      Mint: bigint;
    }
  | {
      NoChange: null;
    };
export interface TradingOrder {
  fee: { fee0: bigint; fee1: bigint };
  gas: { gas0: bigint; gas1: bigint };
  status: TradingStatus;
  toids: Array<bigint>;
  data: Array<Array<number>>;
  time: bigint;
  txid: Array<number>;
  icrc1Account: Array<Icrc1Account>;
  orderType: OrderType;
  filled: Array<ICDexPendingFilled>;
  expiration: bigint;
  nonce: bigint;
  account: Array<number>;
  remaining: OrderPrice;
  index: bigint;
  orderPrice: OrderPrice;
  refund: [bigint, bigint, bigint];
}
export interface OrderPrice {
  quantity:
    | {
        Buy: [bigint, bigint];
      }
    | {
        Sell: bigint;
      };
  price: bigint;
}
export interface ICDexPendingFilled {
  token0Value: BalanceChange;
  counterparty: bigint;
  token1Value: BalanceChange;
  time: bigint;
}
export interface BalanceChange {
  DebitRecord: bigint;
  CreditRecord: bigint;
  NoChange: null;
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
export interface Stats {
  change24h: string;
  vol24h: Vol;
  totalVol: Vol;
  price: string;
}
export interface Vol {
  value0: bigint;
  value1: bigint;
}
export type Level = [
  bigint,
  { ask: Array<PriceResponse>; bid: Array<PriceResponse> }
];
export interface PriceResponse {
  quantity: bigint;
  price: bigint;
}
export default interface Service {
  accountBalance(address: string): Promise<KeepingBalance>;
  deposit(
    token: { token0: null } | { token1: null },
    amount: bigint,
    subaccount: Array<Array<number>>
  ): Promise<void>;
  withdraw(
    token0Amount: Array<bigint>,
    token1Amount: Array<bigint>,
    subaccount: Array<Array<number>>
  ): Promise<[bigint, bigint]>;
  info(): Promise<PairInfo>;
  statusByTxid(txid: Array<number>): Promise<OrderStatusResponse>;
  stats(): Promise<Stats>;
  level10(): Promise<Level>;
}
