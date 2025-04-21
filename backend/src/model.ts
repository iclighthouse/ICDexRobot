import { Side } from './ic/model';
import { Database } from 'better-sqlite3';
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
}
export enum OrdersStatus {
  Pending = 'Pending',
  Completed = 'Completed',
  Failed = 'Failed'
}
export interface ConfigArbitrage {
  account: string;
  pairId: string;
  token1: string;
  gridSpread: string;
  minimumProfit: string;
  minimumPriceFluctuation: string;
}
export interface BalanceChanges {
  id: number;
  mainExchangeOrderId: string;
  secondExchangeOrderId: string;
  token0Balance: number;
  token0Change: number;
  token1Balance: number;
  token1Change: number;
  updateTime: number;
}
export interface RunningStatus {
  account: string;
  pairId: string;
  startTime: number;
  stopTime: number;
}
export interface StrategyAll extends Strategy {
  mainExchangeAccount: string;
  secondExchangeAccount: string;
}
// new
export interface Strategy {
  id: number;
  typeId: number;
  mainExchangeId: number;
  mainExchangePair: string;
  mainExchangeAccountId: number;
  secondExchangeId: number;
  secondExchangePair: string;
  secondExchangeAccountId: number;
  arguments: string;
  invert: number;
  time: number;
  mainExchangeFee: string;
  secondExchangeFee: string;
  updateTime: number;
  status: StrategyStatus;
}
export enum StrategyStatus {
  Stopped = 'Stopped',
  Running = 'Running'
}
export interface StrategyParams {
  typeId: string;
  mainExchangeId: number;
  mainExchangeName: ExchangeName;
  mainExchangePair: string;
  mainPairInfo: string;
  mainExchangeAccountId: number;
  secondExchangeId: number;
  secondExchangeName: ExchangeName;
  secondExchangePair: string;
  secondPairInfo: string;
  secondExchangeAccountId: number;
  secondExchangePairTwo: string;
  secondPairTwoInfo: string;
  mainFee: string;
  secondFee: string;
  invert: number;
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
export enum OrderStatus {
  Pending = 'Pending',
  Completed = 'Completed',
  Failed = 'Failed'
}
export interface Pagination {
  status: OrderStatus;
  page: number;
  pageSize: number;
  strategyId?: number;
}
export interface OrdersTable {
  total: number;
  orders: Array<Orders>;
  page: number;
  pageSize: number;
  totalPages: number;
}
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
export interface OrdersRow {
  total: number;
  orders: Array<orderRow | null>;
  page: number;
  pageSize: number;
  totalPages: number;
}
export interface SecondExchangeOrderId {
  [symbol: string]: string;
}
export interface Strategies {
  total: number;
  data: Array<Strategy>;
  page: number;
  pageSize: number;
  totalPages: number;
}
export type OrderInfo = ICDexOrderInfo | BinanceOrderInfo;
export interface orderRow extends Orders {
  strategy: Strategy;
  mainExchangeOrderInfo: OrderInfo | null;
  secondExchangeOrderInfo: Array<OrderInfo>;
}
export interface ICDexOrderInfo {
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
export interface BinanceOrderInfo {
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
  fills: Array<{
    price: string;
    qty: string;
    commission: string;
    commissionAsset: string;
    tradeId: number;
  }>;
  time: number;
  updateTime: number;
}
export interface RobotType {
  id: number;
  name: RobotName;
  time: number;
}
export enum RobotName {
  Timer = 'Timer Robot',
  Maker = 'Maker Robot'
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
export interface OrderDB {
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
