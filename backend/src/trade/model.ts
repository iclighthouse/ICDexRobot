import { Orders } from '../model';
import { BooleanType, ICDexBuyResponse, ICDexSellResponse, OrderInfo } from '../ic/model';
export interface ArbitrageTokenAmount {
  token0Buy: string;
  token0Sell: string;
  canSell: boolean;
}
export interface PendingOrders {
  ask: Array<{
    orders: Orders;
    ICDexSellResponse: ICDexSellResponse;
  }>;
  bid: Array<{
    orders: Orders;
    ICDexBuyResponse: ICDexBuyResponse;
  }>;
}
export type BalanceChangesType =
  | 'AddToken0'
  | 'AddToken1'
  | 'SubtractToken0'
  | 'SubtractToken1'
  | null;
export interface ICDexConfig {
  fileName: string;
  pem: string;
}
export interface BinanceConfig {
  fileName: string;
  APIKey: string;
  privateKey: string;
}
export interface Balance {
  token0: string;
  token1: string;
}
export interface TimerConfig {
  orderAmount: string;
  interval: string;
  arbitrage: BooleanType;
  unilateral: BooleanType;
}
export interface DepthToken {
  token0: string;
  token1: string;
}
export interface Filters {
  token0: {
    minQty: string;
    maxQty: string;
    decimals: number;
  };
  token1: {
    minQty: string;
    maxQty: string;
    decimals: number;
  };
  price: {
    minPrice: string;
    maxPrice: string;
    decimals: number;
  };
}
export interface MakerConfig {
  token1Amount: string;
  gridSpread: string;
  minimumProfit: string;
  minimumPriceFluctuation: string;
}
export interface ExchangeOrderId {
  [key: string]: string;
}
export interface PendingOrdersICDex {
  ask: Array<{
    orders: Orders;
    ICDexSellResponse: ICDexSellResponse;
  }>;
  bid: Array<{
    orders: Orders;
    ICDexBuyResponse: ICDexBuyResponse;
  }>;
}
export interface PendingOrdersBinance {
  ask: Array<{
    orders: Orders;
    binanceResponse: OrderInfo;
  }>;
  bid: Array<{
    orders: Orders;
    binanceResponse: OrderInfo;
  }>;
}
