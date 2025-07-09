import { BinanceOrder, BinanceSymbolDB, Depth, OrderTypes } from '../ic/model';
import { Balance, BinanceConfig, DepthToken, Filters, TimerConfig } from './model';
export declare const onBinanceBuy: (strategyId: number, binanceConfig: BinanceConfig, pairInfo: BinanceSymbolDB, token1Value: number, filter: Filters, balance: Balance, type?: OrderTypes, token0Value?: string | undefined, price?: number | undefined) => Promise<BinanceOrder | string>;
export declare const onBinanceSell: (strategyId: number, pairInfo: BinanceSymbolDB, binanceConfig: BinanceConfig, token0Value: string, filter: Filters, balance: Balance, type?: OrderTypes, price?: number | undefined) => Promise<BinanceOrder | string>;
export declare const getBinanceToken0SellMarket: (pairInfo: BinanceSymbolDB, secondPairInfo: BinanceSymbolDB, token1Amount: string, binanceTradeFee: string, invert: number) => Promise<string>;
export declare const getBinanceToken1AndToken0ByOrderToken1Amount: (pairInfo: BinanceSymbolDB, secondPairInfo: BinanceSymbolDB, token1Amount: string, binanceTradeFee: string, invert: number) => Promise<{
    buyToken0: string;
    sellToken0: string;
}>;
export declare const getBinanceToken0Sell: (depth: Depth, token1: string, token0Size: number, sellTotal?: string | undefined) => {
    quantity: string;
    total: string;
};
export declare const getBinanceMktToken0Sell: (depth: Depth, configToken1: string, binanceTradeFee: string, filter: Filters, filter1?: Filters | undefined, depthQuote?: Depth | undefined) => string;
export declare const getBinanceToken1AndToken0ByOrderAmount: (pairInfo: BinanceSymbolDB, config: TimerConfig, binanceTradeFee: string) => Promise<{
    buyToken0NeedToken1: string;
    sellToken0GetToken1: string;
}>;
export declare const getBinanceToken1AndToken0: (pairInfo: BinanceSymbolDB, secondPairInfo: BinanceSymbolDB, token: DepthToken, binanceTradeFee: string, invert: number) => Promise<{
    token0: string;
    token1: string;
}>;
export declare const getBinanceFilter: (pairInfo: BinanceSymbolDB) => Promise<Filters>;
export declare const getBinanceMktToken1Buy: (depth: Depth, token0: string, binanceTradeFee: string, filter: Filters) => string;
export declare const getBinanceMktToken1: (depth: Depth, token: DepthToken, binanceTradeFee: string, filter: Filters, filter1?: Filters | undefined, depthQuote?: Depth | undefined) => string;
export declare const getBinanceToken0: (depth: Depth, token1: string, token0Size: number, sellTotal?: string | undefined) => {
    quantity: string;
    total: string;
};
export declare const getBinanceToken1: (depth: Depth, token0: string, token0Size: number, buyTotal?: string | undefined) => {
    quantity: string;
    total: string;
};
export declare const getBinanceMktToken0: (depth: Depth, configToken1: string, binanceTradeFee: string, filter: Filters, filter1?: Filters | undefined, depthQuote?: Depth | undefined) => string;
export declare const getBinanceToken0BuyMarket: (pairInfo: BinanceSymbolDB, secondPairInfo: BinanceSymbolDB, token1Amount: string, binanceTradeFee: string, invert: number) => Promise<string>;
