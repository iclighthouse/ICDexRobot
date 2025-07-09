import { Account, ExchangeName, OrdersStatus, RobotName, Strategy } from '../model';
import { Balance, BalanceChangesType, BinanceConfig, Filters, MakerConfig, PendingOrdersBinance, PendingOrdersICDex } from './model';
import { Identity } from '@dfinity/agent';
import { AccountInfo, BinanceOrder, BinanceSymbolDB, BooleanType, ICDexOrder, ICDexPairInfoDB } from '../ic/model';
import { OrderPrice } from '../ic/ICDex/ICDex.idl';
export declare const runStrategy: (strategyId: number, init?: boolean) => Promise<string>;
export declare const toRun: (strategy: Strategy, exchange: {
    [key: number]: ExchangeName;
}, robotType: {
    [key: number]: RobotName;
}, mainExchangeAccount: Account, secondExchangeAccount: Account) => Promise<string>;
export declare const toRunMaker: (strategy: Strategy, exchange: {
    [key: number]: ExchangeName;
}, mainPairInfo: ICDexPairInfoDB | BinanceSymbolDB, mainAccount: Identity | BinanceConfig, mainAccountBalance: Balance, secondPairInfo: ICDexPairInfoDB | BinanceSymbolDB, secondAccount: Identity | BinanceConfig, secondAccountBalance: Balance, secondPairInfoTwo: ICDexPairInfoDB | BinanceSymbolDB | null, secondAccountBalanceTwo: Balance | null) => Promise<string>;
export declare const checkMarketPendingBinance: (orders: PendingOrdersBinance, strategy: Strategy, minimumProfit: number, minimumPriceFluctuation: number, config: MakerConfig, binancePairInfo: BinanceSymbolDB, binanceConfig: BinanceConfig, binanceTradeFee: string, binanceBalance: Balance, ICDexPairInfo: ICDexPairInfoDB, secondICDexPairInfo: ICDexPairInfoDB, identity: Identity, ICDexBalance: Balance, ICDexBalanceTwo: Balance | null, ICDexTradeFee: string) => Promise<{
    buyPrice: number;
    sellPrice: number;
}>;
export declare const checkMarketPendingICDex: (orders: PendingOrdersICDex, strategy: Strategy, minimumProfit: number, minimumPriceFluctuation: number, config: MakerConfig, ICDePairInfo: ICDexPairInfoDB, identity: Identity, ICDexTradeFee: string, ICDexBalance: Balance, binancePairInfo: BinanceSymbolDB, secondBinancePairInfo: BinanceSymbolDB, binanceConfig: BinanceConfig, binanceBalance: Balance, binanceBalanceTwo: Balance | null, binanceTradeFee: string, token0Decimals: number, token1Decimals: number, tokenMinUnit: number, unitSize: string) => Promise<{
    buyPrice: number;
    sellPrice: number;
}>;
export declare const cancelMarketPendingAndUpdateBinance: (strategyId: number, id: number, symbol: string, orderId: number, binanceConfig: BinanceConfig) => Promise<void>;
export declare const cancelMarketPendingAndUpdateICDex: (strategyId: number, id: number, pairId: string, address: string, txid: string, identity: Identity) => Promise<void>;
export declare const cancelPendingOrder: (strategyId: number, id: number, orderId: string, mainExchangeName: ExchangeName, mainPairId: string, mainAccount: Identity | BinanceConfig) => Promise<void>;
export declare const cancelPending: (strategyId: number, mainExchangeName: ExchangeName, mainPairId: string, mainAccount: Identity | BinanceConfig) => Promise<void>;
export declare const cancelAll: () => Promise<void>;
export declare const tradeMarketPendingBinance: (strategy: Strategy, minimumProfit: number, binancePairInfo: BinanceSymbolDB, binanceConfig: BinanceConfig, ICDexPairInfo: ICDexPairInfoDB, secondICDexPairInfo: ICDexPairInfoDB, identity: Identity, ICDexBalance: Balance, ICDexBalanceTwo: Balance | null) => Promise<PendingOrdersBinance>;
export declare const tradeMarketPendingICDex: (strategy: Strategy, minimumProfit: number, ICDePairInfo: ICDexPairInfoDB, binancePairInfo: BinanceSymbolDB, secondBinancePairInfo: BinanceSymbolDB, binanceConfig: BinanceConfig, binanceBalance: Balance, binanceBalanceTwo: Balance | null, binanceTradeFee: string, token0Decimals: number, token1Decimals: number) => Promise<PendingOrdersICDex>;
export declare const pendingOrderSellICDex: (strategy: Strategy, minimumProfit: number, minimumPriceFluctuation: number, config: MakerConfig, ICDePairInfo: ICDexPairInfoDB, identity: Identity, ICDexTradeFee: string, ICDexBalance: Balance, binancePairInfo: BinanceSymbolDB, secondBinancePairInfo: BinanceSymbolDB, binanceConfig: BinanceConfig, binanceBalance: Balance, binanceBalanceTwo: Balance | null, binanceTradeFee: string, token0Decimals: number, token1Decimals: number, tokenMinUnit: number, unitSize: string, status: OrdersStatus, sellPrice?: number) => Promise<BinanceOrder | string>;
export declare const pendingOrderSellBinance: (strategy: Strategy, minimumProfit: number, minimumPriceFluctuation: number, config: MakerConfig, binancePairInfo: BinanceSymbolDB, binanceConfig: BinanceConfig, binanceTradeFee: string, binanceBalance: Balance, ICDexPairInfo: ICDexPairInfoDB, secondICDexPairInfo: ICDexPairInfoDB, identity: Identity, ICDexTradeFee: string, ICDexBalance: Balance, ICDexBalanceTwo: Balance | null, status: OrdersStatus, sellPrice?: number) => Promise<ICDexOrder | string>;
export declare const pendingOrderBuyBinance: (strategy: Strategy, minimumProfit: number, minimumPriceFluctuation: number, config: MakerConfig, binancePairInfo: BinanceSymbolDB, binanceConfig: BinanceConfig, binanceTradeFee: string, binanceBalance: Balance, ICDexPairInfo: ICDexPairInfoDB, secondICDexPairInfo: ICDexPairInfoDB, identity: Identity, ICDexTradeFee: string, ICDexBalance: Balance, ICDexBalanceTwo: Balance | null, status: OrdersStatus, buyPrice?: number) => Promise<ICDexOrder | string>;
export declare const pendingOrderBuyICDex: (strategy: Strategy, minimumProfit: number, minimumPriceFluctuation: number, config: MakerConfig, ICDePairInfo: ICDexPairInfoDB, identity: Identity, ICDexTradeFee: string, ICDexBalance: Balance, binancePairInfo: BinanceSymbolDB, secondBinancePairInfo: BinanceSymbolDB, binanceConfig: BinanceConfig, binanceBalance: Balance, binanceBalanceTwo: Balance | null, binanceTradeFee: string, token0Decimals: number, token1Decimals: number, tokenMinUnit: number, unitSize: string, status: OrdersStatus, buyPrice?: number) => Promise<BinanceOrder | string>;
export declare const binanceSellToICDexTrade: (strategy: Strategy, minimumProfit: number, pairInfo: ICDexPairInfoDB, secondPairInfo: ICDexPairInfoDB, balance: Balance, secondBalance: Balance | null, identity: Identity, orderId: string, token1Value: string, token1Remaining: string, token0DebitRecord: string, arbitrage: BooleanType, status: OrdersStatus, balanceChangesType?: BalanceChangesType) => Promise<ICDexOrder | string>;
export declare const ICDexSellToBinanceTrade: (strategy: Strategy, minimumProfit: number, pairInfo: BinanceSymbolDB, secondPairInfo: BinanceSymbolDB, balance: Balance, secondBalance: Balance | null, binanceConfig: BinanceConfig, txid: string, token1Value: string, token1Remaining: string, token0DebitRecord: string, arbitrage: BooleanType, status: OrdersStatus, balanceChangesType?: BalanceChangesType) => Promise<BinanceOrder | string>;
export declare const binanceBuyToICDexTrade: (strategy: Strategy, minimumProfit: number, pairInfo: ICDexPairInfoDB, secondPairInfo: ICDexPairInfoDB, balance: Balance, secondBalance: Balance | null, identity: Identity, orderId: string, token0Value: string, token0Remaining: string, token1DebitRecord: string, arbitrage: BooleanType, status: OrdersStatus, balanceChangesType?: BalanceChangesType) => Promise<ICDexOrder | string>;
export declare const ICDexBuyToBinanceTrade: (strategy: Strategy, minimumProfit: number, pairInfo: BinanceSymbolDB, secondPairInfo: BinanceSymbolDB, balance: Balance, secondBalance: Balance | null, binanceConfig: BinanceConfig, txid: string, token0Value: string, token0Remaining: string, token1DebitRecord: string, arbitrage: BooleanType, status: OrdersStatus, balanceChangesType?: BalanceChangesType) => Promise<BinanceOrder | string>;
export declare const getBuyPrice: (strategy: Strategy, ICDexPairInfo: ICDexPairInfoDB, binancePairInfo: BinanceSymbolDB, secondBinancePairInfo: BinanceSymbolDB, minimumProfit: number, ICDexTradeFee: string, config: MakerConfig, binanceTradeFee: string, token0Decimals: number, token1Decimals: number, tokenMinUnit: number, unitSize: string) => Promise<{
    token0Buy: string;
    ICDexPriceBuy: string;
    priceBuy: string;
}>;
export declare const getBuyPriceBinance: (strategy: Strategy, binancePairInfo: BinanceSymbolDB, filter: Filters, ICDexPairInfo: ICDexPairInfoDB, secondICDexPairInfo: ICDexPairInfoDB, minimumProfit: number, binanceTradeFee: string, config: MakerConfig, ICDexTradeFee: string) => Promise<{
    token0Buy: string;
    binancePriceBuy: string;
}>;
export declare const getSellPriceBinance: (strategy: Strategy, binancePairInfo: BinanceSymbolDB, filter: Filters, ICDexPairInfo: ICDexPairInfoDB, secondICDexPairInfo: ICDexPairInfoDB, minimumProfit: number, binanceTradeFee: string, config: MakerConfig, ICDexTradeFee: string) => Promise<{
    token0Sell: string;
    binancePriceSell: string;
}>;
export declare const getSellPrice: (strategy: Strategy, ICDexPairInfo: ICDexPairInfoDB, binancePairInfo: BinanceSymbolDB, secondBinancePairInfo: BinanceSymbolDB, minimumProfit: number, ICDexTradeFee: string, config: MakerConfig, binanceTradeFee: string, token0Decimals: number, token1Decimals: number, tokenMinUnit: number, unitSize: string) => Promise<{
    token0Sell: string;
    ICDexPriceSell: string;
    priceSell: string;
}>;
export declare const hasPendingOrders: (strategyId: number, mainExchangeName: ExchangeName, mainPairInfo: ICDexPairInfoDB | BinanceSymbolDB, mainAccount: Identity | BinanceConfig) => Promise<boolean>;
export declare const toRunTimer: (strategy: Strategy, exchange: {
    [key: number]: ExchangeName;
}, mainPairInfo: ICDexPairInfoDB | BinanceSymbolDB, mainAccount: Identity | BinanceConfig, mainAccountBalance: Balance, secondPairInfo: ICDexPairInfoDB | BinanceSymbolDB, secondAccount: Identity | BinanceConfig, secondAccountBalance: Balance, secondPairInfoTwo: ICDexPairInfoDB | BinanceSymbolDB | null, secondAccountBalanceTwo: Balance | null) => Promise<string>;
export declare const getBalance: (accountId: number, exchangeName: ExchangeName, pairInfo: ICDexPairInfoDB | BinanceSymbolDB, accountValue: Identity | BinanceConfig) => Promise<Balance>;
export declare const getAccountValue: (exchangeName: ExchangeName, value: string) => Identity | BinanceConfig | null;
export declare const getBinanceAccountInfo: (accountId: number) => Promise<AccountInfo | null>;
export declare const filterBinanceBalance: (accountInfo: AccountInfo, symbol: string) => string;
export declare const getBinanceAccountInfoInterval: (accountId: number, val: BinanceConfig) => Promise<void>;
export declare const binanceBuyThenICDexTrade: (strategy: Strategy, minimumProfit: number, binancePairInfo: BinanceSymbolDB, binanceConfig: BinanceConfig, binanceBalance: Balance, ICDexPairInfo: ICDexPairInfoDB, secondICDexPairInfo: ICDexPairInfoDB, identity: Identity, ICDexBalance: Balance, ICDexBalanceTwo: Balance | null, token1Amount: string, arbitrage: BooleanType, unilateral: BooleanType, status: OrdersStatus) => Promise<ICDexOrder | string>;
export declare const ICDexBuyThenBinanceTrade: (strategy: Strategy, minimumProfit: number, ICDePairInfo: ICDexPairInfoDB, identity: Identity, ICDexBalance: Balance, binancePairInfo: BinanceSymbolDB, secondBinancePairInfo: BinanceSymbolDB, binanceConfig: BinanceConfig, binanceBalance: Balance, binanceBalanceTwo: Balance | null, token1Amount: string, token0decimals: number, token1decimals: number, tokenMinUnit: number, arbitrage: BooleanType, unilateral: BooleanType, status: OrdersStatus) => Promise<BinanceOrder | string>;
export declare const binanceSellThenICDexTrade: (strategy: Strategy, minimumProfit: number, binancePairInfo: BinanceSymbolDB, binanceConfig: BinanceConfig, binanceBalance: Balance, ICDexPairInfo: ICDexPairInfoDB, secondICDexPairInfo: ICDexPairInfoDB, identity: Identity, ICDexBalance: Balance, ICDexBalanceTwo: Balance | null, token0Amount: string, arbitrage: BooleanType, unilateral: BooleanType, status: OrdersStatus) => Promise<ICDexOrder | string>;
export declare const ICDexSellThenBinanceTrade: (strategy: Strategy, minimumProfit: number, ICDePairInfo: ICDexPairInfoDB, identity: Identity, ICDexBalance: Balance, binancePairInfo: BinanceSymbolDB, secondBinancePairInfo: BinanceSymbolDB, binanceConfig: BinanceConfig, binanceBalance: Balance, binanceBalanceTwo: Balance | null, token0Amount: string, token0decimals: number, token1decimals: number, tokenMinUnit: number, arbitrage: BooleanType, unilateral: BooleanType, status: OrdersStatus) => Promise<BinanceOrder | string>;
export declare const toSellICDex: (strategy: Strategy, minimumProfit: number, pairInfo: ICDexPairInfoDB, secondPairInfo: ICDexPairInfoDB, balance: Balance, secondBalance: Balance | null, identity: Identity, orderId: string, token0Value: string, token0Remaining: string, token1DebitRecord: string, arbitrage: BooleanType, status: OrdersStatus, balanceChangesType?: BalanceChangesType) => Promise<ICDexOrder | string>;
export declare const toSellBinance: (strategy: Strategy, minimumProfit: number, pairInfo: BinanceSymbolDB, filter: Filters, secondPairInfo: BinanceSymbolDB, secondFilter: Filters, balance: Balance, secondBalance: Balance | null, binanceConfig: BinanceConfig, txid: string, token0Value: string, token0Remaining: string, token1DebitRecord: string, arbitrage: BooleanType, status: OrdersStatus, balanceChangesType?: BalanceChangesType) => Promise<BinanceOrder | string>;
export declare const filterICDexBuy: (pairInfo: ICDexPairInfoDB, token1Amount: string) => {
    orderPrice: OrderPrice;
    token0Decimals: number;
    token1Decimals: number;
};
export declare const filterICDexSell: (pairInfo: ICDexPairInfoDB, token0Amount: string) => {
    orderPrice: OrderPrice;
    token0Decimals: number;
    token1Decimals: number;
    tokenMinUnit: number;
};
export declare const toBuyICDex: (strategy: Strategy, minimumProfit: number, pairInfo: ICDexPairInfoDB, secondPairInfo: ICDexPairInfoDB, balance: Balance, secondBalance: Balance | null, identity: Identity, orderId: string, token1Value: string, token1Remaining: string, token0DebitRecord: string, arbitrage: BooleanType, status: OrdersStatus, balanceChangesType?: BalanceChangesType) => Promise<ICDexOrder | string>;
export declare const toBuyBinance: (strategy: Strategy, minimumProfit: number, pairInfo: BinanceSymbolDB, filter: Filters, secondPairInfo: BinanceSymbolDB, secondFilter: Filters, balance: Balance, secondBalance: Balance | null, binanceConfig: BinanceConfig, txid: string, token1Value: string, token1Remaining: string, token0DebitRecord: string, arbitrage: BooleanType, status: OrdersStatus, balanceChangesType?: BalanceChangesType) => Promise<BinanceOrder | string>;
export declare const tradeCumulativeAmountICDex: (strategy: Strategy, minimumProfit: number, binancePairInfo: BinanceSymbolDB, secondBinancePairInfo: BinanceSymbolDB, binanceConfig: BinanceConfig, binanceBalance: Balance, binanceBalanceTwo: Balance | null) => Promise<void>;
export declare const tradeCumulativeAmountBinance: (strategy: Strategy, minimumProfit: number, ICDexPairInfo: ICDexPairInfoDB, secondICDexPairInfo: ICDexPairInfoDB, identity: Identity, ICDexBalance: Balance, ICDexBalanceTwo: Balance | null) => Promise<void>;
