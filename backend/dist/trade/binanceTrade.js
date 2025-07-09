"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBinanceToken0BuyMarket = exports.getBinanceMktToken0 = exports.getBinanceToken1 = exports.getBinanceToken0 = exports.getBinanceMktToken1 = exports.getBinanceMktToken1Buy = exports.getBinanceFilter = exports.getBinanceToken1AndToken0 = exports.getBinanceToken1AndToken0ByOrderAmount = exports.getBinanceMktToken0Sell = exports.getBinanceToken0Sell = exports.getBinanceToken1AndToken0ByOrderToken1Amount = exports.getBinanceToken0SellMarket = exports.onBinanceSell = exports.onBinanceBuy = void 0;
const bignumber_js_1 = __importDefault(require("bignumber.js"));
const binance_1 = require("../ic/binance");
const db_1 = require("../db");
const routes_1 = require("../routes");
const onBinanceBuy = async (strategyId, binanceConfig, pairInfo, token1Value, filter, balance, type = 'MARKET', token0Value, price) => {
    let buyValue;
    if (type === 'LIMIT' && token0Value) {
        const token0Sell = new bignumber_js_1.default(Math.floor(new bignumber_js_1.default(token0Value)
            .times(10 ** filter.token0.decimals)
            .toNumber()))
            .div(10 ** filter.token0.decimals)
            .toNumber();
        if (new bignumber_js_1.default(token0Sell).lt(filter.token0.minQty)) {
            return JSON.stringify({
                message: 'Minimum notional value failed',
                type: 'BinanceMinimumNotionalError'
            });
        }
        else if (new bignumber_js_1.default(token0Sell).gt(balance.token0)) {
            const message = JSON.stringify({
                message: `${pairInfo.symbol}: Binance ${pairInfo.baseAsset} insufficient balance`,
                type: 'BinanceInsufficientError'
            });
            // sendEventToClients(strategyId, message);
            return message;
        }
        buyValue = await binance_1.tradeOfBinance(binanceConfig.APIKey, binanceConfig.privateKey, pairInfo.symbol, 'BUY', type, token0Sell, 'GTC', price);
    }
    else if (type === 'MARKET') {
        const token1Buy = new bignumber_js_1.default(Math.ceil(new bignumber_js_1.default(token1Value)
            .times(10 ** filter.token1.decimals)
            .toNumber()))
            .div(10 ** filter.token1.decimals)
            .toNumber();
        if (new bignumber_js_1.default(token1Buy).lt(filter.token1.minQty)) {
            return JSON.stringify({
                message: 'Minimum notional value failed',
                type: 'BinanceMinimumNotionalError'
            });
        }
        if (new bignumber_js_1.default(token1Buy).gt(balance.token1)) {
            const message = JSON.stringify({
                message: `${pairInfo.symbol}: Binance ${pairInfo.quoteAsset} insufficient balance`,
                type: 'BinanceInsufficientError'
            });
            // sendEventToClients(strategyId, message);
            return message;
        }
        buyValue = await binance_1.tradeOfBinance(binanceConfig.APIKey, binanceConfig.privateKey, pairInfo.symbol, 'BUY', type, undefined, undefined, price, token1Buy);
    }
    if (buyValue && buyValue.code) {
        return JSON.stringify({
            type: 'BinanceTradeError',
            message: `${pairInfo.symbol}: ${buyValue.msg}`
        });
    }
    else {
        const data = buyValue;
        await db_1.insertOrUpdateBinanceOrderInfo(strategyId, data);
        routes_1.sendEventToClients(strategyId, '', 'Trade');
        return {
            executedQty: data.executedQty,
            cummulativeQuoteQty: data.cummulativeQuoteQty,
            orderId: data.orderId
        };
    }
};
exports.onBinanceBuy = onBinanceBuy;
const onBinanceSell = async (strategyId, pairInfo, binanceConfig, token0Value, filter, balance, type = 'MARKET', price) => {
    const token0Sell = new bignumber_js_1.default(Math.floor(new bignumber_js_1.default(token0Value).times(10 ** filter.token0.decimals).toNumber()))
        .div(10 ** filter.token0.decimals)
        .toNumber();
    if (new bignumber_js_1.default(token0Sell).lt(filter.token0.minQty)) {
        return JSON.stringify({
            message: 'Minimum notional value failed',
            type: 'BinanceMinimumNotionalError'
        });
    }
    else if (new bignumber_js_1.default(token0Sell).gt(balance.token0)) {
        const message = JSON.stringify({
            message: `${pairInfo.symbol}: Binance ${pairInfo.baseAsset} insufficient balance`,
            type: 'BinanceInsufficientError'
        });
        // sendEventToClients(strategyId, message);
        return message;
    }
    else {
        let timeInForce = undefined;
        if (type === 'LIMIT') {
            timeInForce = 'GTC';
        }
        const sellValue = await binance_1.tradeOfBinance(binanceConfig.APIKey, binanceConfig.privateKey, pairInfo.symbol, 'SELL', type, token0Sell, timeInForce, price);
        if (sellValue && sellValue.code) {
            return JSON.stringify({
                type: 'BinanceTradeError',
                message: `${pairInfo.symbol}: ${sellValue.msg}`
            });
        }
        else {
            const data = sellValue;
            await db_1.insertOrUpdateBinanceOrderInfo(strategyId, data);
            routes_1.sendEventToClients(strategyId, '', 'Trade');
            return {
                cummulativeQuoteQty: data.cummulativeQuoteQty,
                executedQty: data.executedQty,
                orderId: data.orderId
            };
        }
    }
};
exports.onBinanceSell = onBinanceSell;
const getBinanceToken0SellMarket = async (pairInfo, secondPairInfo, token1Amount, binanceTradeFee, invert) => {
    const symbol = pairInfo.symbol;
    const filter = await exports.getBinanceFilter(pairInfo);
    let filter1;
    let symbol1 = '';
    if (secondPairInfo) {
        symbol1 = secondPairInfo.symbol;
        filter1 = await exports.getBinanceFilter(secondPairInfo);
    }
    let depth;
    let depthQuote;
    const res = await binance_1.getDepth(symbol);
    if (!res.code) {
        depth = res;
    }
    if (symbol1) {
        const res1 = await binance_1.getDepth(symbol1);
        if (!res1.code) {
            depthQuote = res1;
        }
    }
    let token0Sell = '0';
    if (depth) {
        const depth = res;
        if (invert === 1) {
            token0Sell = exports.getBinanceMktToken1Buy(depth, token1Amount, binanceTradeFee, filter);
        }
        else {
            token0Sell = exports.getBinanceMktToken0Sell(depth, token1Amount, binanceTradeFee, filter, filter1, depthQuote);
        }
    }
    return token0Sell;
};
exports.getBinanceToken0SellMarket = getBinanceToken0SellMarket;
const getBinanceToken1AndToken0ByOrderToken1Amount = async (pairInfo, secondPairInfo, token1Amount, binanceTradeFee, invert) => {
    const symbol = pairInfo.symbol;
    const filter = await exports.getBinanceFilter(pairInfo);
    let filter1;
    let symbol1 = '';
    if (secondPairInfo) {
        symbol1 = secondPairInfo.symbol;
        filter1 = await exports.getBinanceFilter(secondPairInfo);
    }
    let buyToken0 = '0';
    let sellToken0 = '0';
    let depth;
    let depthQuote;
    const res = await binance_1.getDepth(symbol);
    if (!res.code) {
        depth = res;
    }
    if (symbol1) {
        const res1 = await binance_1.getDepth(symbol1);
        if (!res1.code) {
            depthQuote = res1;
        }
    }
    if (depth) {
        if (invert) {
            sellToken0 = exports.getBinanceMktToken0Sell(depth, token1Amount, binanceTradeFee, filter);
            buyToken0 = exports.getBinanceMktToken0(depth, token1Amount, binanceTradeFee, filter);
        }
        else {
            buyToken0 = exports.getBinanceMktToken0(depth, token1Amount, binanceTradeFee, filter, filter1, depthQuote);
            sellToken0 = exports.getBinanceMktToken0Sell(depth, token1Amount, binanceTradeFee, filter, filter1, depthQuote);
        }
    }
    return {
        buyToken0: buyToken0,
        sellToken0: sellToken0
    };
};
exports.getBinanceToken1AndToken0ByOrderToken1Amount = getBinanceToken1AndToken0ByOrderToken1Amount;
const getBinanceToken0Sell = (depth, token1, token0Size, sellTotal) => {
    let sellTotalMKT = '0';
    if (sellTotal) {
        sellTotalMKT = sellTotal;
    }
    else {
        sellTotalMKT = token1;
    }
    let quantity = '0';
    let total = '0';
    for (let i = 0; i < depth.bids.length; i++) {
        const price = depth.bids[i][0];
        const currentQuantity = depth.bids[i][1];
        const currentTotal = new bignumber_js_1.default(price).times(currentQuantity);
        if (new bignumber_js_1.default(total).plus(currentTotal).lt(sellTotalMKT)) {
            total = new bignumber_js_1.default(total).plus(currentTotal).toString(10);
            quantity = new bignumber_js_1.default(currentQuantity).plus(quantity).toString(10);
        }
        else {
            const lastQuantity = new bignumber_js_1.default(sellTotalMKT)
                .minus(total)
                .div(price)
                .decimalPlaces(token0Size, 1);
            total = new bignumber_js_1.default(lastQuantity).times(price).plus(total).toString(10);
            quantity = new bignumber_js_1.default(quantity)
                .plus(lastQuantity.toString(10))
                .toString(10);
            break;
        }
    }
    return {
        quantity: quantity,
        total: total
    };
};
exports.getBinanceToken0Sell = getBinanceToken0Sell;
const getBinanceMktToken0Sell = (depth, configToken1, binanceTradeFee, filter, filter1, depthQuote) => {
    if (!depthQuote) {
        const res = exports.getBinanceToken0Sell(depth, configToken1, filter.token0.decimals, configToken1);
        return res.quantity;
    }
    else if (depthQuote && filter1) {
        const res = exports.getBinanceToken1(depthQuote, configToken1, filter1.token1.decimals, configToken1); // Quote -> USDT
        const totalNeed = new bignumber_js_1.default(res.total)
            .div(new bignumber_js_1.default(1).minus(binanceTradeFee))
            .decimalPlaces(filter1.token1.decimals, 1)
            .toString(10);
        const quantityAsset = exports.getBinanceToken0(depth, res.total, filter.token0.decimals, totalNeed); //  USDT -> Asset
        return quantityAsset.quantity;
    }
    return '';
};
exports.getBinanceMktToken0Sell = getBinanceMktToken0Sell;
const getBinanceToken1AndToken0ByOrderAmount = async (pairInfo, config, binanceTradeFee) => {
    const res = await binance_1.getDepth(pairInfo.symbol);
    if (!res.code) {
        const depth = res;
        const filter = await exports.getBinanceFilter(pairInfo);
        const mktToken1Sell = exports.getBinanceToken1(depth, config.orderAmount, filter.token0.decimals);
        const orderAmount = new bignumber_js_1.default(1)
            .plus(binanceTradeFee)
            .times(config.orderAmount)
            .toString(10);
        const mktToken1Buy = exports.getBinanceMktToken1Buy(depth, orderAmount, binanceTradeFee, filter);
        const token1Sell = new bignumber_js_1.default(1)
            .minus(binanceTradeFee)
            .times(mktToken1Sell.total)
            .toString(10);
        return {
            buyToken0NeedToken1: mktToken1Buy,
            sellToken0GetToken1: token1Sell
        };
    }
    return {
        buyToken0NeedToken1: '0',
        sellToken0GetToken1: '0'
    };
};
exports.getBinanceToken1AndToken0ByOrderAmount = getBinanceToken1AndToken0ByOrderAmount;
const getBinanceToken1AndToken0 = async (pairInfo, secondPairInfo, token, binanceTradeFee, invert) => {
    const symbol = pairInfo.symbol;
    const filter = await exports.getBinanceFilter(pairInfo);
    let filter1;
    let symbol1 = '';
    if (secondPairInfo) {
        symbol1 = secondPairInfo.symbol;
        filter1 = await exports.getBinanceFilter(secondPairInfo);
    }
    let token0 = '0';
    let token1 = '0;';
    if (!symbol1) {
        const res = await binance_1.getDepth(symbol);
        if (!res.code) {
            const depth = res;
            if (invert) {
                token0 = exports.getBinanceMktToken1(depth, { token0: token.token1, token1: token.token0 }, binanceTradeFee, filter, filter1);
                token1 = exports.getBinanceMktToken0(depth, token.token0, binanceTradeFee, filter, filter1);
            }
            else {
                token1 = exports.getBinanceMktToken1(depth, token, binanceTradeFee, filter, filter1);
                token0 = exports.getBinanceMktToken0(depth, token.token1, binanceTradeFee, filter, filter1);
            }
        }
    }
    else {
        const res = await binance_1.getDepth(symbol);
        const res1 = await binance_1.getDepth(symbol1);
        if (!res.code && !res1.code && filter1) {
            const depth = res;
            const depthQuote = res1;
            token1 = exports.getBinanceMktToken1(depth, token, binanceTradeFee, filter, filter1, depthQuote);
            token0 = exports.getBinanceMktToken0(depth, token.token1, binanceTradeFee, filter, filter1, depthQuote);
        }
    }
    return {
        token0: token0,
        token1: token1
    };
};
exports.getBinanceToken1AndToken0 = getBinanceToken1AndToken0;
const getBinanceFilter = async (pairInfo) => {
    const token0Decimals = pairInfo ? pairInfo.baseAssetPrecision : 8;
    const token1Decimals = pairInfo ? pairInfo.quoteAssetPrecision : 8;
    const token0 = {
        minQty: '0',
        maxQty: '0',
        decimals: token0Decimals
    };
    const token1 = {
        minQty: '0',
        maxQty: '0',
        decimals: token1Decimals
    };
    const price = {
        minPrice: '0',
        maxPrice: '0',
        decimals: token1Decimals
    };
    let token0MinStepSize = '0';
    try {
        if (pairInfo) {
            const filters = JSON.parse(pairInfo.filters);
            filters.forEach((filter) => {
                if (filter.filterType === 'LOT_SIZE') {
                    token0.minQty = filter.minQty;
                    token0.maxQty = filter.maxQty;
                    token0MinStepSize = filter.stepSize;
                }
                if (filter.filterType === 'NOTIONAL') {
                    token1.minQty = filter.minNotional;
                    token1.maxQty = filter.maxNotional;
                }
                if (filter.filterType === 'PRICE_FILTER') {
                    const tickSize = filter.tickSize;
                    if (tickSize.includes('.')) {
                        price.decimals = tickSize.replace(/0+$/, '').split('.')[1].length;
                    }
                    price.minPrice = filter.minPrice;
                    price.maxPrice = filter.maxPrice;
                }
            });
            const res = await binance_1.getAvgPrice(pairInfo.symbol);
            if (!res.code) {
                const avgPrice = res.price;
                if (token0MinStepSize.includes('.')) {
                    token0.decimals = token0MinStepSize
                        .replace(/0+$/, '')
                        .split('.')[1].length;
                }
                const minToken0Avg = new bignumber_js_1.default(token1.minQty)
                    .div(avgPrice)
                    .decimalPlaces(token0Decimals)
                    .toString(10);
                if (new bignumber_js_1.default(minToken0Avg).gt(token0.minQty)) {
                    token0.minQty = minToken0Avg;
                }
                return {
                    token0: token0,
                    token1: token1,
                    price: price
                };
            }
        }
    }
    catch (e) { }
    return {
        token0: token0,
        token1: token1,
        price: price
    };
};
exports.getBinanceFilter = getBinanceFilter;
const getBinanceMktToken1Buy = (depth, token0, binanceTradeFee, filter) => {
    token0 = new bignumber_js_1.default(token0)
        .decimalPlaces(filter.token0.decimals, 1)
        .toString(10);
    let quantity = '0';
    let total = '0';
    for (let i = 0; i < depth.asks.length; i++) {
        const price = depth.asks[i][0];
        const currentQuantity = depth.asks[i][1];
        const currentTotal = new bignumber_js_1.default(price).times(currentQuantity);
        if (new bignumber_js_1.default(quantity).plus(currentQuantity).lt(token0)) {
            total = new bignumber_js_1.default(total).plus(currentTotal).toString(10);
            quantity = new bignumber_js_1.default(currentQuantity).plus(quantity).toString(10);
        }
        else {
            const lastQuantity = new bignumber_js_1.default(token0)
                .minus(quantity)
                .decimalPlaces(filter.token0.decimals, 1);
            total = new bignumber_js_1.default(lastQuantity).times(price).plus(total).toString(10);
            quantity = new bignumber_js_1.default(quantity)
                .plus(lastQuantity.toString(10))
                .toString(10);
            break;
        }
    }
    return total;
};
exports.getBinanceMktToken1Buy = getBinanceMktToken1Buy;
const getBinanceMktToken1 = (depth, token, binanceTradeFee, filter, filter1, depthQuote) => {
    const token0 = new bignumber_js_1.default(token.token0)
        .decimalPlaces(filter.token0.decimals, 1)
        .toString(10);
    if (!depthQuote) {
        const res = exports.getBinanceToken1(depth, token.token0, filter.token0.decimals, token0);
        return new bignumber_js_1.default(1)
            .minus(binanceTradeFee)
            .times(res.total)
            .toString(10);
    }
    else if (depthQuote && filter1) {
        const resToken1 = exports.getBinanceToken1(depth, token.token0, filter.token0.decimals, token0); // Asset -> USDT
        const totalRemaining = new bignumber_js_1.default(1)
            .minus(binanceTradeFee)
            .times(resToken1.total)
            .toString(10);
        const res = exports.getBinanceToken0(depthQuote, token.token1, filter1.token0.decimals, totalRemaining); //  USDT -> Quote
        return new bignumber_js_1.default(1)
            .minus(binanceTradeFee)
            .times(res.quantity)
            .toString(10);
    }
    return '0';
};
exports.getBinanceMktToken1 = getBinanceMktToken1;
const getBinanceToken0 = (depth, token1, token0Size, sellTotal) => {
    let sellTotalMKT = '0';
    if (sellTotal) {
        sellTotalMKT = sellTotal;
    }
    else {
        sellTotalMKT = token1;
    }
    let quantity = '0';
    let total = '0';
    for (let i = 0; i < depth.asks.length; i++) {
        const price = depth.asks[i][0];
        const currentQuantity = depth.asks[i][1];
        const currentTotal = new bignumber_js_1.default(price).times(currentQuantity);
        if (new bignumber_js_1.default(total).plus(currentTotal).lt(sellTotalMKT)) {
            total = new bignumber_js_1.default(total).plus(currentTotal).toString(10);
            quantity = new bignumber_js_1.default(currentQuantity).plus(quantity).toString(10);
        }
        else {
            const lastQuantity = new bignumber_js_1.default(sellTotalMKT)
                .minus(total)
                .div(price)
                .decimalPlaces(token0Size, 1);
            total = new bignumber_js_1.default(lastQuantity).times(price).plus(total).toString(10);
            quantity = new bignumber_js_1.default(quantity)
                .plus(lastQuantity.toString(10))
                .toString(10);
            break;
        }
    }
    return {
        quantity: quantity,
        total: total
    };
};
exports.getBinanceToken0 = getBinanceToken0;
const getBinanceToken1 = (depth, token0, token0Size, buyTotal) => {
    let buyTotalMKT = '0';
    if (buyTotal) {
        buyTotalMKT = buyTotal;
    }
    else {
        buyTotalMKT = token0;
    }
    let quantity = '0';
    let total = '0';
    for (let i = 0; i < depth.bids.length; i++) {
        const price = depth.bids[i][0];
        const currentQuantity = depth.bids[i][1];
        const currentTotal = new bignumber_js_1.default(price).times(currentQuantity);
        if (new bignumber_js_1.default(quantity).plus(currentQuantity).lt(buyTotalMKT)) {
            total = new bignumber_js_1.default(total).plus(currentTotal).toString(10);
            quantity = new bignumber_js_1.default(currentQuantity).plus(quantity).toString(10);
        }
        else {
            const lastQuantity = new bignumber_js_1.default(buyTotalMKT)
                .minus(quantity)
                .decimalPlaces(token0Size, 1)
                .toString(10);
            quantity = new bignumber_js_1.default(lastQuantity).plus(quantity).toString(10);
            const lastTotal = new bignumber_js_1.default(lastQuantity).times(price);
            total = new bignumber_js_1.default(total).plus(lastTotal.toString(10)).toString(10);
            break;
        }
    }
    return {
        quantity: quantity,
        total: total
    };
};
exports.getBinanceToken1 = getBinanceToken1;
const getBinanceMktToken0 = (depth, configToken1, binanceTradeFee, filter, filter1, depthQuote) => {
    if (!depthQuote) {
        const token1 = new bignumber_js_1.default(configToken1)
            .decimalPlaces(filter.token1.decimals, 1)
            .toString(10);
        const res = exports.getBinanceToken0(depth, configToken1, filter.token0.decimals, token1);
        return new bignumber_js_1.default(1)
            .minus(binanceTradeFee)
            .times(res.quantity)
            .toString(10);
    }
    else if (depthQuote && filter1) {
        const token1 = new bignumber_js_1.default(configToken1)
            .decimalPlaces(filter1.token1.decimals, 1)
            .toString(10);
        const resToken1 = exports.getBinanceToken1(depthQuote, configToken1, filter1.token0.decimals, token1); // Quote(depthQuote Asset) -> USDT
        const totalRemaining = new bignumber_js_1.default(1)
            .minus(binanceTradeFee)
            .times(resToken1.total)
            .toString(10);
        const res = exports.getBinanceToken0(depth, configToken1, filter.token0.decimals, totalRemaining); //  USDT -> Asset
        return new bignumber_js_1.default(1)
            .minus(binanceTradeFee)
            .times(res.quantity)
            .toString(10);
    }
    return '0';
};
exports.getBinanceMktToken0 = getBinanceMktToken0;
const getBinanceToken0BuyMarket = async (pairInfo, secondPairInfo, token1Amount, binanceTradeFee, invert) => {
    const symbol = pairInfo.symbol;
    const filter = await exports.getBinanceFilter(pairInfo);
    let filter1;
    let symbol1 = '';
    if (secondPairInfo) {
        symbol1 = secondPairInfo.symbol;
        filter1 = await exports.getBinanceFilter(secondPairInfo);
    }
    let depth;
    let depthQuote;
    const res = await binance_1.getDepth(symbol);
    if (!res.code) {
        depth = res;
    }
    if (symbol1) {
        const res1 = await binance_1.getDepth(symbol1);
        if (!res1.code) {
            depthQuote = res1;
        }
    }
    let token0Buy = '0';
    if (depth) {
        const depth = res;
        if (invert === 1) {
            token0Buy = exports.getBinanceMktToken1(depth, { token0: token1Amount, token1: '0' }, binanceTradeFee, filter, filter1, depthQuote);
        }
        else {
            token0Buy = exports.getBinanceMktToken0(depth, token1Amount, binanceTradeFee, filter, filter1, depthQuote);
        }
    }
    return token0Buy;
};
exports.getBinanceToken0BuyMarket = getBinanceToken0BuyMarket;
