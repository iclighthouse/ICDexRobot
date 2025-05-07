import { OrderStatusResponse } from '@/ic/ICDex/model';
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
export interface RobotPairInfo {
  account: string;
  pairId: string;
  type: PairInfoType;
  decimals: number;
  setting: DexSetting;
  owner: string;
  name: string;
  version: string;
  token0: SwapTokenInfo;
  token1: SwapTokenInfo;
  paused: boolean;
  token0Info: TokenInfo;
  token1Info: TokenInfo;
  binanceSymbol: string;
  binanceBase: string;
  binanceQuote: string;
  unrelatedPair: number;
  invert: number;
}
export type TokenId = string;
export type TokenSymbol = string;
export type TokenStd =
  | { dft: null }
  | { icp: null }
  | { other: null }
  | { cycles: null }
  | { dip20: null }
  | { drc20: null }
  | { icrc1: null }
  | { icrc2: null };
export type SwapTokenInfo = [TokenId, TokenSymbol, TokenStd];
export interface DexSetting {
  MAX_TPS: string;
  ICTC_RUN_INTERVAL: string;
  MAKER_BONUS_RATE: string;
  MAX_PENDINGS: string;
  TRADING_FEE: string;
  UNIT_SIZE: string;
  STORAGE_INTERVAL: string;
  ICP_FEE: string;
}
export interface TokenInfo {
  name: string;
  symbol: string;
  decimals: number;
  fee: string;
  tokenStd: TokenStd;
  canisterId?: string;
  balance?: string;
}
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
  filters: Array<{
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
  }>;
  permissions: [];
  permissionSets: [[string]];
  defaultSelfTradePreventionMode: string;
  allowedSelfTradePreventionModes: [string];
};
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
export type OrderTypes =
  | 'LIMIT'
  | 'MARKET'
  | 'STOP_LOSS'
  | 'STOP_LOSS_LIMIT'
  | 'TAKE_PROFIT'
  | 'TAKE_PROFIT_LIMIT'
  | 'LIMIT_MAKER';
export interface Order {
  id: number;
  pairId: string;
  ICDexOrderId: string;
  binanceSymbol0: string;
  binanceSymbol0OrderId: string;
  binanceSymbol1: string;
  binanceSymbol1OrderId: string;
  orderTypeFailed: string;
  updateTime: string;
  invert: number;
}
export interface OrdersRes {
  page: number;
  size: number;
  total: number;
  orders: Array<Order>;
}
export interface BinanceResponseFULL {
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
  fills: Array<Fills>;
  time: number;
  updateTime: number;
}
export interface Fills {
  price: string;
  qty: string;
  commission: string;
  commissionAsset: string;
  tradeId: number;
}
export type Side = 'BUY' | 'SELL';
export type TimeInForce = 'GTC' | 'IOC' | 'FOK';
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
export interface OrderInfo {
  id: number;
  pairId: string;
  txid: string;
  binanceSymbol0: string;
  binanceSymbol1: string;
  ICDexInfo: OrderStatusResponse;
  BinanceInfo: [Array<BinanceOrderInfo>, Array<BinanceOrderInfo>];
  failedMessage: string;
  updateTime: string;
  invert: number;
  filled?: FilledBalance;
}
export interface FilledBalance {
  token0: number;
  token1: number;
}
export type SelfTradePreventionMode =
  | 'NONE'
  | 'EXPIRE_MAKER'
  | 'EXPIRE_TAKER'
  | 'EXPIRE_BOTH';
export interface BinanceOrderInfo {
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
export interface BinanceConfig {
  APIKey: string;
  privateKey: string;
}
export type PairInfoType = 'Robot' | 'Arbitrage';
export interface Depth {
  lastUpdateId: string;
  bids: Array<[string, string]>;
  asks: Array<[string, string]>;
}
export type TipType =
  | 'ICDexTradeError'
  | 'BinanceTradeError'
  | 'ICDexInsufficientError'
  | 'BinanceInsufficientError';
export interface Tip {
  type: TipType;
  code?: number;
  message: string;
}
export interface RunningStatus {
  account: string;
  pairId: string;
  startTime: number;
  stopTime: number;
}
export interface Robot {
  id: number;
  status: RobotStatus;
  typeId: string;
  mainExchangeId: number;
  mainExchangePair: string;
  mainExchangeAccountId: number;
  mainExchangeFee: string;
  secondExchangeId: number;
  secondExchangePair: string;
  secondExchangeAccountId: number;
  secondExchangePairTwo: string;
  secondExchangeFee: string;
  arguments: string;
  invert: number;
  time: number;
  updateTime: number;
  errors: number;
  newErrors: number;
}
export enum RobotStatus {
  Stopped = 'Stopped',
  Running = 'Running'
}
export interface RobotICDexInfo {
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
  paused: number;
}
export interface RobotBinanceBalance {
  [apikey: string]: string;
}
export interface RobotICDexBalance {
  [pairId: string]: {
    token0: string;
    token1: string;
  };
}
export interface RobotICDexConfig {
  fileName: string;
  pem: string;
}
export interface RobotBinanceConfig {
  fileName: string;
  APIKey: string;
  privateKey: string;
}
export enum RobotName {
  Timer = 'Timer Robot',
  Maker = 'Maker Robot'
}
export interface RobotType {
  id: number;
  name: RobotName;
  time: number;
}
export enum ExchangeName {
  ICDex = 'ICDex',
  Binance = 'Binance'
}
export interface Exchange {
  id: number;
  name: ExchangeName;
  type: string;
  time: number;
}
export enum AccountStatus {
  Available = 'Available',
  Unavailable = 'Unavailable'
}
export interface Account {
  id: number;
  name: string;
  exchangeId: number;
  value: string;
  status: AccountStatus;
  fee: string;
  minimumFee: string;
  time: number;
  updateTime: number;
}
export interface ExchangeTable extends Exchange {
  account: Account;
}
export interface AvgPrice {
  mins: number;
  price: string;
  closeTime: number;
}
export interface StrategyParams {
  typeId: string;
  mainExchangeId: number;
  mainExchangeName: string;
  mainExchangePair: string;
  mainPairInfo: string;
  mainExchangeAccountId: number;
  mainFee: string;
  secondExchangeId: number;
  secondExchangeName: string;
  secondExchangePair: string;
  secondPairInfo: string;
  secondExchangeAccountId: number;
  secondExchangePairTwo: string;
  secondPairTwoInfo: string;
  secondFee: string;
  invert: number;
}
export interface TimerConfig {
  orderAmount: string;
  interval: string;
  arbitrage: number;
  unilateral: number;
}
export interface MakerConfig {
  token1Amount: string;
  gridSpread: string;
  minimumProfit: string;
  minimumPriceFluctuation: string;
}
export interface OrdersTable {
  total: number;
  orders: Array<OrderRow | null>;
  page: number;
  pageSize: number;
  totalPages: number;
}
export interface OrderRow extends Orders {
  strategy: Robot;
  mainExchangeOrderInfo: OrderInfoDB;
  secondExchangeOrderInfo: Array<OrderInfoDB>;
  balanceChangesFilled: FilledBalance;
}
export type OrderInfoDB = ICDexOrderInfoDB | BinanceOrderInfoDB;
export interface Orders {
  id: number;
  strategyId: number;
  status: string;
  mainExchangeOrderId: string;
  secondExchangeOrderId: string;
  mainExchangeErrorMessage: string;
  secondExchangeErrorMessage: string;
  time: number;
  updateTime: number;
}
export interface ICDexOrderInfoDB {
  id: number;
  pairId: string;
  orderId: string;
  status: string;
  tradingStatus: string;
  orderType: string;
  account: string;
  orderPrice: string;
  origOrder: string;
  filled: string;
  details: string;
  remaining: string;
  fee: string;
  time: number;
  updateTime: number;
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
export interface SecondExchangeOrderId {
  [symbol: string]: string;
}
export interface OrdersInfo extends Orders {
  mainOrderInfo: OrderStatusResponse | BinanceOrderInfo;
  secondOrderInfo: Array<OrderStatusResponse | BinanceOrderInfo>;
}
export interface RobotPairInfoDB {
  [key: string]: RobotICDexInfo | BinanceSymbol;
}
export interface PairPrice {
  symbol: string;
  latestPrice: string;
  lastPrice: string;
}
export interface User {
  id: number;
  userName: string;
  password: string;
  salt: string;
  saltRounds: number;
  updateTime: number;
  lastLoginTime: number;
}
