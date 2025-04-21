import { DexSetting, TokenInfo, TokenStd, TokenSymbol } from '../model';
import { Principal } from '@dfinity/principal';
export interface AccountInfo {
  makerCommission: number;
  takerCommission: number;
  buyerCommission: number;
  sellerCommission: number;
  commissionRates: {
    maker: string;
    taker: string;
    buyer: string;
    seller: string;
  };
  canTrade: boolean;
  canWithdraw: boolean;
  canDeposit: boolean;
  brokered: boolean;
  requireSelfTradePrevention: boolean;
  preventSor: boolean;
  updateTime: number;
  accountType: string;
  balances: Array<Assets>;
  permissions: [string];
  uid: number;
}
export interface Assets {
  asset: string;
  free: string;
  locked: string;
}
export type Side = 'BUY' | 'SELL';
export type OrderTypes =
  | 'LIMIT'
  | 'MARKET'
  | 'STOP_LOSS'
  | 'STOP_LOSS_LIMIT'
  | 'TAKE_PROFIT'
  | 'TAKE_PROFIT_LIMIT'
  | 'LIMIT_MAKER';
export type TimeInForce = 'GTC' | 'IOC' | 'FOK' | undefined;
export interface ExchangeInfo {
  timezone: string;
  serverTime: number;
  rateLimits: Array<{
    rateLimitType: RateLimitType;
    interval: Interval;
    intervalNum: number;
    limit: number;
  }>;
  exchangeFilters: [];
  symbols: Array<BinanceSymbol>;
  sors?: [
    {
      baseAsset: string;
      symbols: Array<string>;
    }
  ];
}
export type BinanceSymbol = {
  symbol: string;
  status: PairStatus;
  baseAsset: string;
  baseAssetPrecision: number;
  quoteAsset: string;
  quotePrecision: number;
  quoteAssetPrecision: number;
  orderTypes: Array<OrderTypes>;
  icebergAllowed: boolean;
  ocoAllowed: boolean;
  otoAllowed: boolean;
  quoteOrderQtyMarketAllowed: boolean;
  allowTrailingStop: boolean;
  cancelReplaceAllowed: boolean;
  filters: Array<BinanceFilter>;
  permissions: [];
  permissionSets: [[string]];
  defaultSelfTradePreventionMode: string;
  allowedSelfTradePreventionModes: [string];
};
export interface BinanceFilter {
  filterType: string;
  minPrice?: string;
  maxPrice?: string;
  minQty?: string;
  maxQty?: string;
  tickSize?: string;
  stepSize?: string;
  applyToMarket?: boolean;
  avgPriceMins?: number;
  minNotional?: string;
  applyMinToMarket?: boolean;
  maxNotional?: string;
  applyMaxToMarket?: boolean;
}
export type RateLimitType = 'REQUESTS_WEIGHT' | 'ORDERS' | 'RAW_REQUESTS';
export type Interval = 'SECOND' | 'MINUTE' | 'DAY';
export type PairStatus =
  | 'PRE_TRADING'
  | 'TRADING'
  | 'POST_TRADING'
  | 'END_OF_DAY'
  | 'HALT'
  | 'AUCTION_MATCH'
  | 'BREAK';
export interface ErrorData {
  code: number;
  msg: string;
}
export interface BinanceOrderInfoDB {
  id: number;
  symbol: string;
  orderId: string;
  status: string;
  side: string;
  orderType: string;
  price: string;
  origQty: string;
  executedQty: string;
  origQuoteOrderQty: string;
  cummulativeQuoteQty: string;
  fills: string;
  time: number;
  updateTime: number;
}
export interface BinanceOrderInfoFill {
  price: string;
  qty: string;
  commission: string;
  commissionAsset: string;
  tradeId: number;
}
export interface TradeResponseFULL {
  symbol: string;
  orderId: number;
  orderListId: number;
  clientOrderId: string;
  transactTime: number;
  price: string;
  origQty: string;
  executedQty: string;
  cummulativeQuoteQty: string;
  origQuoteOrderQty: string;
  status: OrderStatus;
  timeInForce: TimeInForce;
  type: OrderTypes;
  side: Side;
  workingTime: number;
  selfTradePreventionMode: string;
  fills: Array<BinanceOrderInfoFill>;
}
export type OrderStatus =
  | 'NEW'
  | 'PENDING_NEW'
  | 'PARTIALLY_FILLED'
  | 'FILLED'
  | 'CANCELED'
  | 'PENDING_CANCEL'
  | 'REJECTED'
  | 'EXPIRED'
  | 'EXPIRED_IN_MATCH';
export interface AvgPriceInfo {
  mins: number;
  price: string;
  closeTime: number;
}
export interface Depth {
  lastUpdateId: string;
  bids: Array<[string, string]>;
  asks: Array<[string, string]>;
}
export interface BinancePrice {
  symbol: string;
  price: string;
}
export type SelfTradePreventionMode =
  | 'NONE'
  | 'EXPIRE_MAKER'
  | 'EXPIRE_TAKER'
  | 'EXPIRE_BOTH';
export interface OrderInfo {
  symbol: string;
  orderId: number;
  orderListId: number;
  clientOrderId: string;
  price: string;
  origQty: string;
  executedQty: string;
  cummulativeQuoteQty: string;
  status: OrderStatus;
  timeInForce: TimeInForce;
  type: OrderTypes;
  side: Side;
  stopPrice: string;
  icebergQty: string;
  time: number;
  updateTime: number;
  isWorking: boolean;
  workingTime: number;
  origQuoteOrderQty: string;
  selfTradePreventionMode: SelfTradePreventionMode;
}
export interface BinanceOrder {
  executedQty: string;
  cummulativeQuoteQty: string;
  orderId: number;
}
export interface ICDexOrder {
  token0Value: string;
  token1Value: string;
  txid: string;
}
export interface ICDexBuyResponse {
  token0Value: string;
  token1DebitRecord: string;
  token0ValueRemaining: string;
  token1ValueRemaining: string;
  price: number;
  txid: string;
  status: 'Pending' | 'Completed';
}
export interface ICDexSellResponse {
  token0DebitRecord: string;
  token1Value: string;
  token0ValueRemaining: string;
  token1ValueRemaining: string;
  price: number;
  txid: string;
  status: 'Pending' | 'Completed';
}
export interface BinanceSellResponse {
  cummulativeQuoteQty: string;
  orderId: number;
}
export interface BinanceBuyResponse {
  executedQty: string;
  orderId: number;
}
export type BooleanType = 0 | 1;
export interface ICDexPairInfo {
  pairId: string;
  decimals: number;
  setting: DexSetting;
  owner: Principal;
  name: string;
  version: string;
  token0: [Principal, TokenSymbol, TokenStd];
  token1: [Principal, TokenSymbol, TokenStd];
  token0Info: TokenInfo;
  token1Info: TokenInfo;
  paused: boolean;
}
export interface ICDexPairInfoDB {
  pairId: string;
  decimals: number;
  setting: string;
  owner: string;
  name: string;
  version: string;
  token0: string;
  token1: string;
  token0Info: string;
  token1Info: string;
  paused: BooleanType;
}
export interface BinanceSymbolDB {
  symbol: string;
  status: PairStatus;
  baseAsset: string;
  baseAssetPrecision: number;
  quoteAsset: string;
  quoteAssetPrecision: number;
  filters: string;
}
