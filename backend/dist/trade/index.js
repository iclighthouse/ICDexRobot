"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.tradeCumulativeAmountBinance = exports.tradeCumulativeAmountICDex = exports.toBuyBinance = exports.toBuyICDex = exports.filterICDexSell = exports.filterICDexBuy = exports.toSellBinance = exports.toSellICDex = exports.ICDexSellThenBinanceTrade = exports.binanceSellThenICDexTrade = exports.ICDexBuyThenBinanceTrade = exports.binanceBuyThenICDexTrade = exports.getBinanceAccountInfoInterval = exports.filterBinanceBalance = exports.getBinanceAccountInfo = exports.getAccountValue = exports.getBalance = exports.toRunTimer = exports.hasPendingOrders = exports.getSellPrice = exports.getSellPriceBinance = exports.getBuyPriceBinance = exports.getBuyPrice = exports.ICDexBuyToBinanceTrade = exports.binanceBuyToICDexTrade = exports.ICDexSellToBinanceTrade = exports.binanceSellToICDexTrade = exports.pendingOrderBuyICDex = exports.pendingOrderBuyBinance = exports.pendingOrderSellBinance = exports.pendingOrderSellICDex = exports.tradeMarketPendingICDex = exports.tradeMarketPendingBinance = exports.cancelAll = exports.cancelPending = exports.cancelPendingOrder = exports.cancelMarketPendingAndUpdateICDex = exports.cancelMarketPendingAndUpdateBinance = exports.checkMarketPendingICDex = exports.checkMarketPendingBinance = exports.toRunMaker = exports.toRun = exports.runStrategy = void 0;
const bignumber_js_1 = __importDefault(require("bignumber.js"));
const db_1 = require("../db");
const model_1 = require("../model");
const converter_1 = require("../ic/converter");
const ICDexService_1 = require("../ic/ICDex/ICDexService");
const binance_1 = require("../ic/binance");
const timers_1 = require("timers");
const ICDexTrade_1 = require("./ICDexTrade");
const binanceTrade_1 = require("./binanceTrade");
const routes_1 = require("../routes");
const interval = 5 * 1000;
const binanceAccountInfo = {};
const intervalId = {};
const cancel = {};
const pendingMax = 5;
const errorMax = 3;
const runStrategy = async (strategyId, init = true) => {
    const strategy = await db_1.getStrategy(strategyId);
    if (strategy) {
        if (init && strategy.status === model_1.StrategyStatus.Running) {
            return `${strategyId} is running`;
        }
        if (!init && strategy.status === model_1.StrategyStatus.Stopped) {
            return `${strategyId} is stopped`;
        }
        if (intervalId[strategyId]) {
            timers_1.clearTimeout(intervalId[strategyId]);
            delete intervalId[strategyId];
        }
        const mainExchangeAccount = await db_1.getAccount(strategy.mainExchangeAccountId);
        const secondExchangeAccount = await db_1.getAccount(strategy.secondExchangeAccountId);
        const exchanges = await db_1.getExchanges();
        const exchange = {};
        exchanges.forEach((item) => {
            exchange[item.id] = item.name;
        });
        const robotTypes = await db_1.getRobotType();
        const robotType = {};
        robotTypes.forEach((item) => {
            robotType[item.id] = item.name;
        });
        if (mainExchangeAccount && secondExchangeAccount) {
            if (mainExchangeAccount.status === model_1.AccountStatus.Unavailable) {
                return `${exchange[strategy.mainExchangeId]} ${mainExchangeAccount.name} Account Unavailable.`;
            }
            if (secondExchangeAccount.status === model_1.AccountStatus.Unavailable) {
                return `${exchange[strategy.mainExchangeId]} ${secondExchangeAccount.name} Account Unavailable.`;
            }
            const updateTime = new Date().getTime();
            const res = await exports.toRun(strategy, exchange, robotType, mainExchangeAccount, secondExchangeAccount);
            // todo errs = 3 -> stop
            const orders = await db_1.getStrategiesError(strategy.id, strategy.updateTime);
            if (orders && orders.length >= errorMax) {
                await db_1.updateStrategyStatus(strategyId, model_1.StrategyStatus.Stopped);
                return '';
            }
            else if (strategy.status === model_1.StrategyStatus.Stopped) {
                await db_1.updateStrategyStatus(strategyId, model_1.StrategyStatus.Running, updateTime);
            }
            const config = JSON.parse(strategy.arguments);
            if (robotType[strategy.typeId] === model_1.RobotName.Timer) {
                if (res && res === 'runTimer') {
                    exports.runStrategy(strategy.id, false);
                }
                else {
                    const interval = Number(config.interval) * 1000 * 60;
                    const range = interval * 0.1;
                    const min = interval - range;
                    const max = interval + range;
                    const intervalTime = Math.floor(Math.random() * (max - min + 1)) + min;
                    intervalId[strategy.id] = timers_1.setTimeout(() => {
                        exports.runStrategy(strategy.id, false);
                    }, intervalTime);
                }
            }
            else {
                // 3S
                const interval = 3 * 1000;
                intervalId[strategy.id] = timers_1.setTimeout(() => {
                    exports.runStrategy(strategy.id, false);
                }, interval);
            }
        }
    }
    return '';
};
exports.runStrategy = runStrategy;
const toRun = async (strategy, exchange, robotType, mainExchangeAccount, secondExchangeAccount) => {
    const mainPairInfo = await db_1.getPairInfo(exchange[strategy.mainExchangeId], strategy.mainExchangePair);
    const secondExchangePair = strategy.secondExchangePair.split(',');
    const secondPairInfo = await db_1.getPairInfo(exchange[strategy.secondExchangeId], secondExchangePair[0]);
    let secondPairInfoTwo = null;
    if (secondExchangePair.length === 2) {
        secondPairInfoTwo = await db_1.getPairInfo(exchange[strategy.secondExchangeId], secondExchangePair[1]);
    }
    if (mainExchangeAccount &&
        secondExchangeAccount &&
        mainPairInfo &&
        secondPairInfo) {
        const mainAccount = exports.getAccountValue(exchange[strategy.mainExchangeId], mainExchangeAccount.value);
        const secondAccount = exports.getAccountValue(exchange[strategy.secondExchangeId], secondExchangeAccount.value);
        if (mainAccount && secondAccount) {
            const mainAccountBalance = await exports.getBalance(strategy.mainExchangeAccountId, exchange[strategy.mainExchangeId], mainPairInfo, mainAccount);
            const secondAccountBalance = await exports.getBalance(strategy.secondExchangeAccountId, exchange[strategy.secondExchangeId], secondPairInfo, secondAccount);
            let secondAccountTwoBalance = null;
            if (secondPairInfoTwo) {
                secondAccountTwoBalance = await exports.getBalance(strategy.secondExchangeAccountId, exchange[strategy.secondExchangeId], secondPairInfoTwo, secondAccount);
            }
            if (robotType[strategy.typeId] === model_1.RobotName.Timer) {
                return await exports.toRunTimer(strategy, exchange, mainPairInfo, mainAccount, mainAccountBalance, secondPairInfo, secondAccount, secondAccountBalance, secondPairInfoTwo, secondAccountTwoBalance);
            }
            else if (robotType[strategy.typeId] === model_1.RobotName.Maker) {
                return await exports.toRunMaker(strategy, exchange, mainPairInfo, mainAccount, mainAccountBalance, secondPairInfo, secondAccount, secondAccountBalance, secondPairInfoTwo, secondAccountTwoBalance);
            }
        }
    }
    return '';
};
exports.toRun = toRun;
const toRunMaker = async (strategy, exchange, mainPairInfo, mainAccount, mainAccountBalance, secondPairInfo, secondAccount, secondAccountBalance, secondPairInfoTwo, secondAccountBalanceTwo) => {
    try {
        const mainExchangeName = exchange[strategy.mainExchangeId];
        const secondExchangeName = exchange[strategy.secondExchangeId];
        const config = JSON.parse(strategy.arguments);
        const minimumProfit = Number(config.minimumProfit) / 100;
        const minimumPriceFluctuation = Number(config.minimumPriceFluctuation) / 100;
        const hasPending = await exports.hasPendingOrders(strategy.id, mainExchangeName, mainPairInfo, mainAccount);
        if (config && config.token1Amount && config.minimumProfit) {
            if (mainExchangeName === model_1.ExchangeName.ICDex) {
                mainAccount = mainAccount;
                mainPairInfo = mainPairInfo;
                const token0Info = JSON.parse(mainPairInfo.token0Info);
                const token1Info = JSON.parse(mainPairInfo.token1Info);
                const token0Decimals = token0Info.decimals;
                const token1Decimals = token1Info.decimals;
                const setting = JSON.parse(mainPairInfo.setting);
                const unitSize = setting.UNIT_SIZE;
                let tokenMinUnit = 0;
                const tokenUnitDecimals = unitSize.length - 1; // Unit must 1+0000
                if (token0Decimals > tokenUnitDecimals) {
                    // todo
                    tokenMinUnit = token0Decimals - tokenUnitDecimals;
                }
                if (secondExchangeName === model_1.ExchangeName.Binance) {
                    secondPairInfo = secondPairInfo;
                    secondPairInfoTwo = secondPairInfoTwo;
                    secondAccount = secondAccount;
                    if (!hasPending) {
                        await Promise.all([
                            exports.pendingOrderBuyICDex(strategy, minimumProfit, minimumPriceFluctuation, config, mainPairInfo, mainAccount, strategy.mainExchangeFee, mainAccountBalance, secondPairInfo, secondPairInfoTwo, secondAccount, secondAccountBalance, secondAccountBalanceTwo, strategy.secondExchangeFee, token0Decimals, token1Decimals, tokenMinUnit, unitSize, model_1.OrdersStatus.Pending),
                            exports.pendingOrderSellICDex(strategy, minimumProfit, minimumPriceFluctuation, config, mainPairInfo, mainAccount, strategy.mainExchangeFee, mainAccountBalance, secondPairInfo, secondPairInfoTwo, secondAccount, secondAccountBalance, secondAccountBalanceTwo, strategy.secondExchangeFee, token0Decimals, token1Decimals, tokenMinUnit, unitSize, model_1.OrdersStatus.Pending)
                        ]);
                    }
                    else {
                        const orders = await exports.tradeMarketPendingICDex(strategy, minimumProfit, mainPairInfo, secondPairInfo, secondPairInfoTwo, secondAccount, secondAccountBalance, secondAccountBalanceTwo, strategy.secondExchangeFee, token0Decimals, token1Decimals);
                        const tradePending = await exports.checkMarketPendingICDex(orders, strategy, minimumProfit, minimumPriceFluctuation, config, mainPairInfo, mainAccount, strategy.mainExchangeFee, mainAccountBalance, secondPairInfo, secondPairInfoTwo, secondAccount, secondAccountBalance, secondAccountBalanceTwo, strategy.secondExchangeFee, token0Decimals, token1Decimals, tokenMinUnit, unitSize);
                        await Promise.all([
                            exports.pendingOrderBuyICDex(strategy, minimumProfit, minimumPriceFluctuation, config, mainPairInfo, mainAccount, strategy.mainExchangeFee, mainAccountBalance, secondPairInfo, secondPairInfoTwo, secondAccount, secondAccountBalance, secondAccountBalanceTwo, strategy.secondExchangeFee, token0Decimals, token1Decimals, tokenMinUnit, unitSize, model_1.OrdersStatus.Pending, tradePending.buyPrice),
                            exports.pendingOrderSellICDex(strategy, minimumProfit, minimumPriceFluctuation, config, mainPairInfo, mainAccount, strategy.mainExchangeFee, mainAccountBalance, secondPairInfo, secondPairInfoTwo, secondAccount, secondAccountBalance, secondAccountBalanceTwo, strategy.secondExchangeFee, token0Decimals, token1Decimals, tokenMinUnit, unitSize, model_1.OrdersStatus.Pending, tradePending.sellPrice)
                        ]);
                    }
                    await exports.tradeCumulativeAmountICDex(strategy, minimumProfit, secondPairInfo, secondPairInfoTwo, secondAccount, secondAccountBalance, secondAccountBalanceTwo);
                }
            }
            else if (mainExchangeName === model_1.ExchangeName.Binance) {
                mainAccount = mainAccount;
                mainPairInfo = mainPairInfo;
                if (secondExchangeName === model_1.ExchangeName.ICDex) {
                    secondPairInfo = secondPairInfo;
                    secondPairInfoTwo = secondPairInfoTwo;
                    secondAccount = secondAccount;
                    if (!hasPending) {
                        await Promise.all([
                            exports.pendingOrderBuyBinance(strategy, minimumProfit, minimumPriceFluctuation, config, mainPairInfo, mainAccount, strategy.mainExchangeFee, mainAccountBalance, secondPairInfo, secondPairInfoTwo, secondAccount, strategy.secondExchangeFee, secondAccountBalance, secondAccountBalanceTwo, model_1.OrdersStatus.Pending),
                            exports.pendingOrderSellBinance(strategy, minimumProfit, minimumPriceFluctuation, config, mainPairInfo, mainAccount, strategy.mainExchangeFee, mainAccountBalance, secondPairInfo, secondPairInfoTwo, secondAccount, strategy.secondExchangeFee, secondAccountBalance, secondAccountBalanceTwo, model_1.OrdersStatus.Pending)
                        ]);
                    }
                    else {
                        const orders = await exports.tradeMarketPendingBinance(strategy, minimumProfit, mainPairInfo, mainAccount, secondPairInfo, secondPairInfoTwo, secondAccount, secondAccountBalance, secondAccountBalanceTwo);
                        const tradePending = await exports.checkMarketPendingBinance(orders, strategy, minimumProfit, minimumPriceFluctuation, config, mainPairInfo, mainAccount, strategy.mainExchangeFee, mainAccountBalance, secondPairInfo, secondPairInfoTwo, secondAccount, secondAccountBalance, secondAccountBalanceTwo, strategy.secondExchangeFee);
                        await Promise.all([
                            exports.pendingOrderBuyBinance(strategy, minimumProfit, minimumPriceFluctuation, config, mainPairInfo, mainAccount, strategy.mainExchangeFee, mainAccountBalance, secondPairInfo, secondPairInfoTwo, secondAccount, strategy.secondExchangeFee, secondAccountBalance, secondAccountBalanceTwo, model_1.OrdersStatus.Pending, tradePending.buyPrice),
                            exports.pendingOrderSellBinance(strategy, minimumProfit, minimumPriceFluctuation, config, mainPairInfo, mainAccount, strategy.mainExchangeFee, mainAccountBalance, secondPairInfo, secondPairInfoTwo, secondAccount, strategy.secondExchangeFee, secondAccountBalance, secondAccountBalanceTwo, model_1.OrdersStatus.Pending, tradePending.sellPrice)
                        ]);
                        await exports.tradeCumulativeAmountBinance(strategy, minimumProfit, secondPairInfo, secondPairInfoTwo, secondAccount, secondAccountBalance, secondAccountBalanceTwo);
                    }
                }
            }
        }
    }
    catch (e) { }
    return '';
};
exports.toRunMaker = toRunMaker;
const checkMarketPendingBinance = async (orders, strategy, minimumProfit, minimumPriceFluctuation, config, binancePairInfo, binanceConfig, binanceTradeFee, binanceBalance, ICDexPairInfo, secondICDexPairInfo, identity, ICDexBalance, ICDexBalanceTwo, ICDexTradeFee) => {
    const tradePending = {
        buyPrice: 0,
        sellPrice: 0
    };
    const promiseCancel = [];
    orders.bid.sort((a, b) => {
        if (new bignumber_js_1.default(a.binanceResponse.price).gte(b.binanceResponse.price)) {
            return 1;
        }
        return -1;
    });
    orders.ask.sort((a, b) => {
        if (new bignumber_js_1.default(a.binanceResponse.price).gte(b.binanceResponse.price)) {
            return -1;
        }
        return 1;
    });
    const filter = await binanceTrade_1.getBinanceFilter(binancePairInfo);
    const buyRes = await exports.getBuyPriceBinance(strategy, binancePairInfo, filter, ICDexPairInfo, secondICDexPairInfo, minimumProfit, binanceTradeFee, config, ICDexTradeFee);
    let bidCancel = false;
    for (let i = 0; i < orders.bid.length; i++) {
        const bid = orders.bid[i];
        const orderId = orders.bid[i].orders.id;
        const price = bid.binanceResponse.price;
        if (bidCancel || i >= pendingMax - 1) {
            promiseCancel.push(exports.cancelMarketPendingAndUpdateBinance(strategy.id, orderId, binancePairInfo.symbol, Number(bid.orders.mainExchangeOrderId), binanceConfig));
            break;
        }
        else {
            if (price &&
                new bignumber_js_1.default(1)
                    .plus(minimumPriceFluctuation)
                    .times(buyRes.binancePriceBuy)
                    .lt(price)) {
                promiseCancel.push(exports.cancelMarketPendingAndUpdateBinance(strategy.id, orderId, binancePairInfo.symbol, Number(bid.orders.mainExchangeOrderId), binanceConfig));
                bidCancel = true;
            }
            else {
                tradePending.buyPrice = Number(price);
            }
        }
    }
    const sellRes = await exports.getSellPriceBinance(strategy, binancePairInfo, filter, ICDexPairInfo, secondICDexPairInfo, minimumProfit, binanceTradeFee, config, ICDexTradeFee);
    let askCancel = false;
    for (let i = 0; i < orders.ask.length; i++) {
        const ask = orders.ask[i];
        const orderId = orders.ask[i].orders.id;
        const price = ask.binanceResponse.price;
        if (askCancel || i >= pendingMax - 1) {
            promiseCancel.push(exports.cancelMarketPendingAndUpdateBinance(strategy.id, orderId, binancePairInfo.symbol, Number(ask.orders.mainExchangeOrderId), binanceConfig));
            break;
        }
        else {
            if (price &&
                new bignumber_js_1.default(1)
                    .minus(minimumPriceFluctuation)
                    .times(sellRes.binancePriceSell)
                    .gt(price)) {
                promiseCancel.push(exports.cancelMarketPendingAndUpdateBinance(strategy.id, orderId, binancePairInfo.symbol, Number(ask.orders.mainExchangeOrderId), binanceConfig));
                askCancel = true;
            }
            else {
                tradePending.sellPrice = Number(price);
            }
        }
    }
    await Promise.all(promiseCancel);
    return tradePending;
};
exports.checkMarketPendingBinance = checkMarketPendingBinance;
const checkMarketPendingICDex = async (orders, strategy, minimumProfit, minimumPriceFluctuation, config, ICDePairInfo, identity, ICDexTradeFee, ICDexBalance, binancePairInfo, secondBinancePairInfo, binanceConfig, binanceBalance, binanceBalanceTwo, binanceTradeFee, token0Decimals, token1Decimals, tokenMinUnit, unitSize) => {
    const tradePending = {
        buyPrice: 0,
        sellPrice: 0
    };
    const promiseCancel = [];
    orders.bid.sort((a, b) => {
        if (new bignumber_js_1.default(a.ICDexBuyResponse.price).gte(b.ICDexBuyResponse.price)) {
            return 1;
        }
        return -1;
    });
    orders.ask.sort((a, b) => {
        if (new bignumber_js_1.default(a.ICDexSellResponse.price).gte(b.ICDexSellResponse.price)) {
            return -1;
        }
        return 1;
    });
    const buyRes = await exports.getBuyPrice(strategy, ICDePairInfo, binancePairInfo, secondBinancePairInfo, minimumProfit, ICDexTradeFee, config, binanceTradeFee, token0Decimals, token1Decimals, tokenMinUnit, unitSize);
    let bidCancel = false;
    for (let i = 0; i < orders.bid.length; i++) {
        const bid = orders.bid[i];
        const orderId = orders.bid[i].orders.id;
        const price = bid.ICDexBuyResponse.price;
        if (bidCancel || i >= pendingMax - 1) {
            promiseCancel.push(exports.cancelMarketPendingAndUpdateICDex(strategy.id, orderId, ICDePairInfo.pairId, identity.getPrincipal().toString(), bid.orders.mainExchangeOrderId, identity));
            break;
        }
        else {
            if (price &&
                new bignumber_js_1.default(1)
                    .plus(minimumPriceFluctuation)
                    .times(buyRes.priceBuy)
                    .lt(price)) {
                promiseCancel.push(exports.cancelMarketPendingAndUpdateICDex(strategy.id, orderId, ICDePairInfo.pairId, identity.getPrincipal().toString(), bid.orders.mainExchangeOrderId, identity));
                bidCancel = true;
            }
            else {
                tradePending.buyPrice = price;
            }
        }
    }
    const sellRes = await exports.getSellPrice(strategy, ICDePairInfo, binancePairInfo, secondBinancePairInfo, minimumProfit, ICDexTradeFee, config, binanceTradeFee, token0Decimals, token1Decimals, tokenMinUnit, unitSize);
    let askCancel = false;
    for (let i = 0; i < orders.ask.length; i++) {
        const ask = orders.ask[i];
        const orderId = orders.ask[i].orders.id;
        const price = ask.ICDexSellResponse.price;
        if (askCancel || i >= pendingMax - 1) {
            promiseCancel.push(exports.cancelMarketPendingAndUpdateICDex(strategy.id, orderId, ICDePairInfo.pairId, identity.getPrincipal().toString(), ask.orders.mainExchangeOrderId, identity));
            break;
        }
        else {
            if (price &&
                new bignumber_js_1.default(1)
                    .minus(minimumPriceFluctuation)
                    .times(sellRes.priceSell)
                    .gt(price)) {
                promiseCancel.push(exports.cancelMarketPendingAndUpdateICDex(strategy.id, orderId, ICDePairInfo.pairId, identity.getPrincipal().toString(), ask.orders.mainExchangeOrderId, identity));
                askCancel = true;
            }
            else {
                tradePending.sellPrice = price;
            }
        }
    }
    await Promise.all(promiseCancel);
    return tradePending;
};
exports.checkMarketPendingICDex = checkMarketPendingICDex;
const cancelMarketPendingAndUpdateBinance = async (strategyId, id, symbol, orderId, binanceConfig) => {
    const response = await binance_1.cancelOrder(binanceConfig.APIKey, binanceConfig.privateKey, symbol, orderId);
    if (response &&
        !(response.code || response.code === 0)) {
        const info = response;
        const orderInfo = {
            symbol: info.symbol,
            orderId: info.orderId,
            orderListId: info.orderListId,
            clientOrderId: info.clientOrderId,
            transactTime: info.updateTime,
            price: info.price,
            origQty: info.origQty,
            executedQty: info.executedQty,
            cummulativeQuoteQty: info.cummulativeQuoteQty,
            origQuoteOrderQty: info.origQuoteOrderQty,
            status: info.status,
            timeInForce: info.timeInForce,
            type: info.type,
            side: info.side,
            workingTime: info.workingTime,
            selfTradePreventionMode: info.selfTradePreventionMode,
            fills: []
        };
        await db_1.insertOrUpdateBinanceOrderInfo(strategyId, orderInfo);
        await db_1.updateOrderIdMaker(id);
    }
};
exports.cancelMarketPendingAndUpdateBinance = cancelMarketPendingAndUpdateBinance;
const cancelMarketPendingAndUpdateICDex = async (strategyId, id, pairId, address, txid, identity) => {
    try {
        if (!cancel[txid]) {
            cancel[txid] = 0;
        }
        else {
            ++cancel[txid];
        }
        if (cancel[txid] >= 2) {
            delete cancel[txid];
            return;
        }
        const service = new ICDexService_1.ICDexService();
        const flag = await service.cancelByTxid(pairId, identity, converter_1.hexToBytes(txid));
        if (flag) {
            await db_1.insertOrUpdateICDexOrderInfo(strategyId, pairId, txid);
            routes_1.sendEventToClients(strategyId, '', 'Trade');
            await db_1.updateOrderIdMaker(id);
        }
    }
    catch (e) {
        if (cancel[txid] && cancel[txid] < 2) {
            await exports.cancelMarketPendingAndUpdateICDex(strategyId, id, pairId, address, txid, identity);
        }
        console.error(e);
    }
};
exports.cancelMarketPendingAndUpdateICDex = cancelMarketPendingAndUpdateICDex;
const cancelPendingOrder = async (strategyId, id, orderId, mainExchangeName, mainPairId, mainAccount) => {
    if (mainExchangeName === model_1.ExchangeName.ICDex) {
        const service = new ICDexService_1.ICDexService();
        const account = mainAccount;
        const statusByTxid = await service.statusByTxid(mainPairId, converter_1.hexToBytes(orderId));
        const type = Object.keys(statusByTxid)[0];
        if (type === 'Pending') {
            await exports.cancelMarketPendingAndUpdateICDex(strategyId, id, mainPairId, account.getPrincipal().toString(), orderId, account);
        }
        else {
            await db_1.insertOrUpdateICDexOrderInfo(strategyId, mainPairId, orderId);
            await db_1.updateOrderIdMaker(id);
        }
    }
    else if (mainExchangeName === model_1.ExchangeName.Binance) {
        const account = mainAccount;
        const response = await binance_1.getOrderInfo(account.APIKey, account.privateKey, mainPairId, Number(orderId));
        if (response &&
            !(response.code || response.code === 0)) {
            const status = response.status;
            if (status === 'NEW' ||
                status === 'PENDING_NEW' ||
                status === 'PARTIALLY_FILLED') {
                await exports.cancelMarketPendingAndUpdateBinance(strategyId, id, mainPairId, Number(orderId), account);
            }
            else {
                const info = response;
                const orderInfo = {
                    symbol: info.symbol,
                    orderId: info.orderId,
                    orderListId: info.orderListId,
                    clientOrderId: info.clientOrderId,
                    transactTime: info.updateTime,
                    price: info.price,
                    origQty: info.origQty,
                    executedQty: info.executedQty,
                    cummulativeQuoteQty: info.cummulativeQuoteQty,
                    origQuoteOrderQty: info.origQuoteOrderQty,
                    status: info.status,
                    timeInForce: info.timeInForce,
                    type: info.type,
                    side: info.side,
                    workingTime: info.workingTime,
                    selfTradePreventionMode: info.selfTradePreventionMode,
                    fills: []
                };
                await db_1.insertOrUpdateBinanceOrderInfo(strategyId, orderInfo);
                await db_1.updateOrderIdMaker(id);
            }
        }
    }
};
exports.cancelPendingOrder = cancelPendingOrder;
const cancelPending = async (strategyId, mainExchangeName, mainPairId, mainAccount) => {
    if (intervalId[strategyId]) {
        timers_1.clearTimeout(intervalId[strategyId]);
        delete intervalId[strategyId];
    }
    const pendingOrder = await db_1.getPendingOrders(strategyId);
    const mainOrders = [];
    if (pendingOrder && pendingOrder.length) {
        pendingOrder.forEach((item) => {
            mainOrders.push(item.mainExchangeOrderId);
        });
    }
    const promiseValue = [];
    if (mainExchangeName === model_1.ExchangeName.ICDex) {
        const service = new ICDexService_1.ICDexService();
        const account = mainAccount;
        const pending = await service.pending(mainPairId, account.getPrincipal().toString());
        if (pending && pending.data && pending.data.length && pendingOrder.length) {
            pendingOrder.forEach((item) => {
                pending.data.forEach((pending) => {
                    const status = Object.keys(pending[1].status)[0];
                    const txid = converter_1.toHexString(new Uint8Array(pending[0]));
                    if (item.mainExchangeOrderId === txid) {
                        if (status === 'Pending') {
                            promiseValue.push(exports.cancelMarketPendingAndUpdateICDex(strategyId, item.id, mainPairId, account.getPrincipal().toString(), item.mainExchangeOrderId, account));
                        }
                        else {
                            promiseValue.push(db_1.updateOrderIdMaker(item.id));
                        }
                    }
                    if (status === 'Pending' && !mainOrders.includes(txid)) {
                        db_1.getInfo(strategyId, mainExchangeName, mainPairId, txid, false).then((info) => {
                            if (info) {
                                promiseValue.push(exports.cancelMarketPendingAndUpdateICDex(strategyId, item.id, mainPairId, account.getPrincipal().toString(), item.mainExchangeOrderId, account));
                            }
                        });
                    }
                });
            });
        }
    }
    else if (mainExchangeName === model_1.ExchangeName.Binance) {
        const account = mainAccount;
        const response = await binance_1.openOrders(account.APIKey, account.privateKey, mainPairId);
        if (response &&
            !(response.code || response.code === 0)) {
            const pending = response;
            if (pending && pending.length && pendingOrder.length) {
                pendingOrder.forEach((item) => {
                    pending.forEach((pendingInfo) => {
                        const orderId = pendingInfo.orderId.toString(10);
                        const status = pendingInfo.status;
                        if (item.mainExchangeOrderId === orderId) {
                            if (status === 'NEW' ||
                                status === 'PENDING_NEW' ||
                                status === 'PARTIALLY_FILLED') {
                                promiseValue.push(exports.cancelMarketPendingAndUpdateBinance(strategyId, item.id, mainPairId, Number(item.mainExchangeOrderId), account));
                            }
                            else {
                                promiseValue.push(db_1.updateOrderIdMaker(item.id));
                            }
                        }
                        if (status === 'NEW' ||
                            status === 'PENDING_NEW' ||
                            status === 'PARTIALLY_FILLED') {
                            if (!mainOrders.includes(orderId)) {
                                db_1.getInfo(strategyId, mainExchangeName, mainPairId, orderId, false).then((info) => {
                                    if (info) {
                                        promiseValue.push(exports.cancelMarketPendingAndUpdateBinance(strategyId, item.id, mainPairId, Number(item.mainExchangeOrderId), account));
                                    }
                                });
                            }
                        }
                    });
                });
            }
        }
    }
    await Promise.all(promiseValue);
};
exports.cancelPending = cancelPending;
const cancelAll = async () => {
    const allPendingOrders = await db_1.getAllPendingOrders();
    const exchanges = await db_1.getExchanges();
    const exchange = {};
    exchanges.forEach((item) => {
        exchange[item.id] = item.name;
    });
    const promiseValue = [];
    const strategyInfo = {};
    const accountInfo = {};
    if (allPendingOrders && allPendingOrders.length) {
        for (let i = 0; i < allPendingOrders.length; i++) {
            const pending = allPendingOrders[i];
            if (intervalId[pending.strategyId]) {
                timers_1.clearTimeout(intervalId[pending.strategyId]);
                delete intervalId[pending.strategyId];
            }
            if (!strategyInfo[pending.strategyId]) {
                const strategy = await db_1.getStrategy(pending.strategyId);
                if (strategy) {
                    strategyInfo[pending.strategyId] = strategy;
                }
            }
            if (!accountInfo[strategyInfo[pending.strategyId].mainExchangeAccountId]) {
                const account = await db_1.getAccount(strategyInfo[pending.strategyId].mainExchangeAccountId);
                if (account) {
                    const mainAccount = exports.getAccountValue(exchange[strategyInfo[pending.strategyId].mainExchangeId], account.value);
                    if (mainAccount) {
                        accountInfo[strategyInfo[pending.strategyId].mainExchangeAccountId] = mainAccount;
                    }
                }
            }
            promiseValue.push(exports.cancelPendingOrder(pending.strategyId, pending.id, pending.mainExchangeOrderId, exchange[strategyInfo[pending.strategyId].mainExchangeId], strategyInfo[pending.strategyId].mainExchangePair, accountInfo[strategyInfo[pending.strategyId].mainExchangeAccountId]));
        }
    }
    await Promise.all(promiseValue);
};
exports.cancelAll = cancelAll;
const tradeMarketPendingBinance = async (strategy, minimumProfit, binancePairInfo, binanceConfig, ICDexPairInfo, secondICDexPairInfo, identity, ICDexBalance, ICDexBalanceTwo) => {
    const orders = { ask: [], bid: [] };
    const pendingOrder = await db_1.getPendingOrders(strategy.id);
    if (pendingOrder && pendingOrder.length) {
        for (let i = 0; i < pendingOrder.length; i++) {
            const order = pendingOrder[i];
            const orderId = order.mainExchangeOrderId;
            let info = await db_1.getInfo(strategy.id, model_1.ExchangeName.Binance, strategy.mainExchangePair, orderId);
            info = info;
            let binanceOrderRes = await binance_1.getOrderInfo(binanceConfig.APIKey, binanceConfig.privateKey, binancePairInfo.symbol, Number(orderId));
            if (binanceOrderRes && !binanceOrderRes.code) {
                binanceOrderRes = binanceOrderRes;
                let status = model_1.OrdersStatus.Pending;
                if (binanceOrderRes.status !== 'NEW' &&
                    binanceOrderRes.status !== 'PENDING_NEW' &&
                    binanceOrderRes.status === 'PARTIALLY_FILLED') {
                    status = model_1.OrdersStatus.Completed;
                }
                else {
                    if (info.side === 'BUY') {
                        orders.bid.push({
                            orders: order,
                            binanceResponse: binanceOrderRes
                        });
                    }
                    else if (info.side === 'SELL') {
                        orders.ask.push({
                            orders: order,
                            binanceResponse: binanceOrderRes
                        });
                    }
                }
                if (info.side === 'BUY') {
                    // trade by user
                    // const token0Value = ICDexBuyRes.token0Value;
                    const token0 = await db_1.getBalanceChangesByMainExchangeOrderId(strategy.id, orderId, true);
                    const token0Value = new bignumber_js_1.default(binanceOrderRes.executedQty)
                        .minus(token0.subtract)
                        .toString(10);
                    const token0Remaining = new bignumber_js_1.default(binanceOrderRes.executedQty)
                        .minus(token0.add)
                        .toString(10);
                    const token1DebitRecord = new bignumber_js_1.default(token0Value)
                        .div(binanceOrderRes.executedQty)
                        .times(binanceOrderRes.cummulativeQuoteQty)
                        .toString();
                    await exports.binanceBuyToICDexTrade(strategy, minimumProfit, ICDexPairInfo, secondICDexPairInfo, ICDexBalance, ICDexBalanceTwo, identity, orderId, token0Value, token0Remaining, token1DebitRecord, 1, status, 'AddToken0');
                }
                else if (info.side === 'SELL') {
                    const token1 = await db_1.getBalanceChangesByMainExchangeOrderId(strategy.id, orderId, false);
                    const token1Value = new bignumber_js_1.default(binanceOrderRes.cummulativeQuoteQty)
                        .minus(token1.subtract)
                        .toString(10);
                    const token1Remaining = new bignumber_js_1.default(binanceOrderRes.cummulativeQuoteQty)
                        .minus(token1.add)
                        .toString(10);
                    const token0DebitRecord = new bignumber_js_1.default(token1Value)
                        .div(binanceOrderRes.cummulativeQuoteQty)
                        .times(binanceOrderRes.executedQty)
                        .toString();
                    await exports.binanceSellToICDexTrade(strategy, minimumProfit, ICDexPairInfo, secondICDexPairInfo, ICDexBalance, ICDexBalanceTwo, identity, orderId, token1Value, token1Remaining, token0DebitRecord, 1, status, 'AddToken1');
                }
                if (status === 'Completed') {
                    const orderInfo = {
                        symbol: binanceOrderRes.symbol,
                        orderId: binanceOrderRes.orderId,
                        orderListId: binanceOrderRes.orderListId,
                        clientOrderId: binanceOrderRes.clientOrderId,
                        transactTime: binanceOrderRes.updateTime,
                        price: binanceOrderRes.price,
                        origQty: binanceOrderRes.origQty,
                        executedQty: binanceOrderRes.executedQty,
                        cummulativeQuoteQty: binanceOrderRes.cummulativeQuoteQty,
                        origQuoteOrderQty: binanceOrderRes.origQuoteOrderQty,
                        status: binanceOrderRes.status,
                        timeInForce: binanceOrderRes.timeInForce,
                        type: binanceOrderRes.type,
                        side: binanceOrderRes.side,
                        workingTime: binanceOrderRes.workingTime,
                        selfTradePreventionMode: binanceOrderRes.selfTradePreventionMode,
                        fills: []
                    };
                    await db_1.insertOrUpdateBinanceOrderInfo(strategy.id, orderInfo);
                    await db_1.updateOrderIdMaker(order.id);
                }
            }
            else {
                // await updateOrderIdArbitrage(address, pairId, txid);
            }
        }
    }
    return orders;
};
exports.tradeMarketPendingBinance = tradeMarketPendingBinance;
const tradeMarketPendingICDex = async (strategy, minimumProfit, ICDePairInfo, binancePairInfo, secondBinancePairInfo, binanceConfig, binanceBalance, binanceBalanceTwo, binanceTradeFee, token0Decimals, token1Decimals) => {
    const orders = { ask: [], bid: [] };
    const pendingOrder = await db_1.getPendingOrders(strategy.id);
    if (pendingOrder && pendingOrder.length) {
        for (let i = 0; i < pendingOrder.length; i++) {
            const order = pendingOrder[i];
            const orderId = order.mainExchangeOrderId;
            let info = await db_1.getInfo(strategy.id, model_1.ExchangeName.ICDex, strategy.mainExchangePair, orderId);
            info = info;
            const side = ICDexTrade_1.filterSide(JSON.parse(info.orderPrice));
            if (side === 'Buy') {
                let ICDexBuyRes = await ICDexTrade_1.getICDexBuyResponse(ICDePairInfo, orderId, token0Decimals, token1Decimals);
                if (typeof ICDexBuyRes !== 'string') {
                    ICDexBuyRes = ICDexBuyRes;
                    let status = model_1.OrdersStatus.Pending;
                    if (ICDexBuyRes.status !== 'Pending') {
                        status = model_1.OrdersStatus.Completed;
                    }
                    else {
                        orders.bid.push({
                            orders: order,
                            ICDexBuyResponse: ICDexBuyRes
                        });
                    }
                    // trade by user
                    // const token0Value = ICDexBuyRes.token0Value;
                    const token0 = await db_1.getBalanceChangesByMainExchangeOrderId(strategy.id, orderId, true);
                    const token0Value = new bignumber_js_1.default(ICDexBuyRes.token0Value)
                        .minus(token0.subtract)
                        .toString(10);
                    const token0Remaining = new bignumber_js_1.default(ICDexBuyRes.token0Value)
                        .minus(token0.add)
                        .toString(10);
                    const token1DebitRecord = new bignumber_js_1.default(token0Value)
                        .div(ICDexBuyRes.token0Value)
                        .times(ICDexBuyRes.token1DebitRecord)
                        .toString();
                    if (Number(token0Value) > 0) {
                        await db_1.insertOrUpdateICDexOrderInfo(strategy.id, ICDePairInfo.pairId, orderId);
                    }
                    await exports.ICDexBuyToBinanceTrade(strategy, minimumProfit, binancePairInfo, secondBinancePairInfo, binanceBalance, binanceBalanceTwo, binanceConfig, orderId, token0Value, token0Remaining, token1DebitRecord, 1, status, 'AddToken0');
                    if (ICDexBuyRes.status !== 'Pending' || status === 'Completed') {
                        await db_1.insertOrUpdateICDexOrderInfo(strategy.id, ICDePairInfo.pairId, orderId);
                        await db_1.updateOrderIdMaker(order.id);
                    }
                }
                else {
                    // await updateOrderIdArbitrage(address, pairId, txid);
                }
            }
            else if (side === 'Sell') {
                let ICDexSellRes = await ICDexTrade_1.getICDexSellResponse(ICDePairInfo, orderId, token0Decimals, token1Decimals);
                if (typeof ICDexSellRes !== 'string') {
                    ICDexSellRes = ICDexSellRes;
                    let status = model_1.OrdersStatus.Pending;
                    if (ICDexSellRes.status === 'Pending') {
                        orders.ask.push({
                            orders: order,
                            ICDexSellResponse: ICDexSellRes
                        });
                    }
                    else {
                        status = model_1.OrdersStatus.Completed;
                    }
                    // traded by user
                    // const token1Value = ICDexSellRes.token1Value;
                    const token1 = await db_1.getBalanceChangesByMainExchangeOrderId(strategy.id, orderId, false);
                    const token1Value = new bignumber_js_1.default(ICDexSellRes.token1Value)
                        .minus(token1.subtract)
                        .toString(10);
                    const token1Remaining = new bignumber_js_1.default(ICDexSellRes.token1Value)
                        .minus(token1.add)
                        .toString(10);
                    const token0DebitRecord = new bignumber_js_1.default(token1Value)
                        .div(ICDexSellRes.token1Value)
                        .times(ICDexSellRes.token0DebitRecord)
                        .toString();
                    if (Number(token1Value) > 0) {
                        await db_1.insertOrUpdateICDexOrderInfo(strategy.id, ICDePairInfo.pairId, orderId);
                    }
                    await exports.ICDexSellToBinanceTrade(strategy, minimumProfit, binancePairInfo, secondBinancePairInfo, binanceBalance, binanceBalanceTwo, binanceConfig, orderId, token1Value, token1Remaining, token0DebitRecord, 1, status, 'AddToken1');
                    if (ICDexSellRes.status !== 'Pending' || status === 'Completed') {
                        await db_1.insertOrUpdateICDexOrderInfo(strategy.id, ICDePairInfo.pairId, orderId);
                        await db_1.updateOrderIdMaker(order.id);
                    }
                }
                else {
                    // await updateOrderIdArbitrage(address, pairId, txid);
                }
            }
        }
    }
    return orders;
};
exports.tradeMarketPendingICDex = tradeMarketPendingICDex;
const pendingOrderSellICDex = async (strategy, minimumProfit, minimumPriceFluctuation, config, ICDePairInfo, identity, ICDexTradeFee, ICDexBalance, binancePairInfo, secondBinancePairInfo, binanceConfig, binanceBalance, binanceBalanceTwo, binanceTradeFee, token0Decimals, token1Decimals, tokenMinUnit, unitSize, status, sellPrice = 0) => {
    try {
        const sellRes = await exports.getSellPrice(strategy, ICDePairInfo, binancePairInfo, secondBinancePairInfo, minimumProfit, ICDexTradeFee, config, binanceTradeFee, token0Decimals, token1Decimals, tokenMinUnit, unitSize);
        if (sellRes &&
            sellRes.token0Sell &&
            sellRes.priceSell &&
            Number(sellRes.token0Sell) &&
            Number(sellRes.priceSell)) {
            const token0SellAmount = BigInt(new bignumber_js_1.default(sellRes.token0Sell)
                .times(10 ** token0Decimals)
                .toString(10));
            if (sellPrice &&
                new bignumber_js_1.default(1)
                    .minus(minimumPriceFluctuation)
                    .times(sellPrice)
                    .lt(sellRes.priceSell)) {
                return '';
            }
            const orderPriceSell = {
                quantity: { Sell: token0SellAmount },
                price: BigInt(sellRes.ICDexPriceSell)
            };
            const strategyInfo = await db_1.getStrategy(strategy.id);
            if (strategyInfo?.status &&
                strategyInfo.status === model_1.StrategyStatus.Stopped) {
                return '';
            }
            const res = await ICDexTrade_1.onICDexSell(strategy.id, ICDePairInfo, orderPriceSell, token0Decimals, token1Decimals, identity, sellRes.token0Sell, ICDexBalance, 'LMT');
            if (res) {
                if (typeof res !== 'string') {
                    const ICDexSellRes = res;
                    const txid = ICDexSellRes.txid;
                    const token1Value = ICDexSellRes.token1Value;
                    const token0DebitRecord = ICDexSellRes.token0DebitRecord;
                    await db_1.insertOrderIdOrUpdate(strategy.id, txid, null, '', '', status);
                    if (new bignumber_js_1.default(token1Value).gt(0)) {
                        await exports.ICDexSellToBinanceTrade(strategy, minimumProfit, binancePairInfo, secondBinancePairInfo, binanceBalance, binanceBalanceTwo, binanceConfig, txid, token1Value, token1Value, token0DebitRecord, 1, status, 'AddToken1');
                    }
                }
                else {
                    console.error(res);
                }
            }
        }
    }
    catch (e) {
        console.error(e);
    }
    return '';
};
exports.pendingOrderSellICDex = pendingOrderSellICDex;
const pendingOrderSellBinance = async (strategy, minimumProfit, minimumPriceFluctuation, config, binancePairInfo, binanceConfig, binanceTradeFee, binanceBalance, ICDexPairInfo, secondICDexPairInfo, identity, ICDexTradeFee, ICDexBalance, ICDexBalanceTwo, status, sellPrice = 0) => {
    try {
        const filter = await binanceTrade_1.getBinanceFilter(binancePairInfo);
        const sellRes = await exports.getSellPriceBinance(strategy, binancePairInfo, filter, ICDexPairInfo, secondICDexPairInfo, minimumProfit, binanceTradeFee, config, ICDexTradeFee);
        if (sellRes && sellRes.token0Sell && Number(sellRes.token0Sell)) {
            if (sellPrice &&
                new bignumber_js_1.default(1)
                    .minus(minimumPriceFluctuation)
                    .times(sellPrice)
                    .lt(sellRes.binancePriceSell)) {
                return '';
            }
            const sellResponse = await binanceTrade_1.onBinanceSell(strategy.id, binancePairInfo, binanceConfig, sellRes.token0Sell, filter, binanceBalance, 'LIMIT', Number(sellRes.binancePriceSell));
            if (sellResponse) {
                if (typeof sellResponse !== 'string') {
                    const binanceSellRes = sellResponse;
                    const orderId = binanceSellRes.orderId.toString(10);
                    const token1Value = binanceSellRes.cummulativeQuoteQty;
                    const token0DebitRecord = binanceSellRes.executedQty;
                    await db_1.insertOrderIdOrUpdate(strategy.id, orderId, null, '', '', status);
                    if (new bignumber_js_1.default(token1Value).gt(0)) {
                        await exports.binanceSellToICDexTrade(strategy, minimumProfit, ICDexPairInfo, secondICDexPairInfo, ICDexBalance, ICDexBalanceTwo, identity, orderId, token1Value, token1Value, token0DebitRecord, 1, status, 'AddToken1');
                    }
                }
            }
        }
    }
    catch (e) {
        console.error(e);
    }
    return '';
};
exports.pendingOrderSellBinance = pendingOrderSellBinance;
const pendingOrderBuyBinance = async (strategy, minimumProfit, minimumPriceFluctuation, config, binancePairInfo, binanceConfig, binanceTradeFee, binanceBalance, ICDexPairInfo, secondICDexPairInfo, identity, ICDexTradeFee, ICDexBalance, ICDexBalanceTwo, status, buyPrice = 0) => {
    try {
        const filter = await binanceTrade_1.getBinanceFilter(binancePairInfo);
        const buyRes = await exports.getBuyPriceBinance(strategy, binancePairInfo, filter, ICDexPairInfo, secondICDexPairInfo, minimumProfit, binanceTradeFee, config, ICDexTradeFee);
        if (buyRes && buyRes.token0Buy && Number(buyRes.token0Buy)) {
            if (buyPrice &&
                new bignumber_js_1.default(1)
                    .plus(minimumPriceFluctuation)
                    .times(buyPrice)
                    .gt(buyRes.binancePriceBuy)) {
                return '';
            }
            const buyResponse = await binanceTrade_1.onBinanceBuy(strategy.id, binanceConfig, binancePairInfo, Number(config.token1Amount), filter, binanceBalance, 'LIMIT', buyRes.token0Buy, Number(buyRes.binancePriceBuy));
            if (buyResponse) {
                if (typeof buyResponse !== 'string') {
                    const binanceBuyRes = buyResponse;
                    const orderId = binanceBuyRes.orderId.toString(10);
                    const token0Value = binanceBuyRes.executedQty;
                    const token1DebitRecord = binanceBuyRes.cummulativeQuoteQty;
                    await db_1.insertOrderIdOrUpdate(strategy.id, orderId, null, '', '', status);
                    if (new bignumber_js_1.default(token0Value).gt(0)) {
                        return await exports.binanceBuyToICDexTrade(strategy, minimumProfit, ICDexPairInfo, secondICDexPairInfo, ICDexBalance, ICDexBalanceTwo, identity, orderId, token0Value, token0Value, token1DebitRecord, 1, status, 'AddToken0');
                    }
                }
            }
        }
    }
    catch (e) {
        console.error(e);
    }
    return '';
};
exports.pendingOrderBuyBinance = pendingOrderBuyBinance;
const pendingOrderBuyICDex = async (strategy, minimumProfit, minimumPriceFluctuation, config, ICDePairInfo, identity, ICDexTradeFee, ICDexBalance, binancePairInfo, secondBinancePairInfo, binanceConfig, binanceBalance, binanceBalanceTwo, binanceTradeFee, token0Decimals, token1Decimals, tokenMinUnit, unitSize, status, buyPrice = 0) => {
    try {
        const buyRes = await exports.getBuyPrice(strategy, ICDePairInfo, binancePairInfo, secondBinancePairInfo, minimumProfit, ICDexTradeFee, config, binanceTradeFee, token0Decimals, token1Decimals, tokenMinUnit, unitSize);
        if (buyRes &&
            buyRes.priceBuy &&
            buyRes.token0Buy &&
            Number(buyRes.priceBuy) &&
            Number(buyRes.token0Buy)) {
            if (buyPrice &&
                new bignumber_js_1.default(1)
                    .plus(minimumPriceFluctuation)
                    .times(buyPrice)
                    .gt(buyRes.priceBuy)) {
                return '';
            }
            const token0BuyAmount = BigInt(new bignumber_js_1.default(buyRes.token0Buy).times(10 ** token0Decimals).toString(10));
            const token1Amount = BigInt(new bignumber_js_1.default(buyRes.ICDexPriceBuy)
                .div(unitSize)
                .times(buyRes.token0Buy)
                .times(10 ** token0Decimals)
                .toString(10));
            const orderPriceBuy = {
                quantity: { Buy: [BigInt(token0BuyAmount), token1Amount] },
                price: BigInt(buyRes.ICDexPriceBuy)
            };
            const strategyInfo = await db_1.getStrategy(strategy.id);
            if (strategyInfo?.status &&
                strategyInfo.status === model_1.StrategyStatus.Stopped) {
                return '';
            }
            const res = await ICDexTrade_1.onICDexBuy(strategy.id, ICDePairInfo, orderPriceBuy, token0Decimals, token1Decimals, identity, new bignumber_js_1.default(buyRes.priceBuy).times(buyRes.token0Buy).toString(10), ICDexBalance, 'LMT');
            if (res) {
                if (typeof res !== 'string') {
                    const ICDexBuyRes = res;
                    const txid = ICDexBuyRes.txid;
                    const token0Value = ICDexBuyRes.token0Value;
                    const token1DebitRecord = ICDexBuyRes.token1DebitRecord;
                    await db_1.insertOrderIdOrUpdate(strategy.id, txid, null, '', '', status);
                    if (new bignumber_js_1.default(token0Value).gt(0)) {
                        return await exports.ICDexBuyToBinanceTrade(strategy, minimumProfit, binancePairInfo, secondBinancePairInfo, binanceBalance, binanceBalanceTwo, binanceConfig, txid, token0Value, token0Value, token1DebitRecord, 1, status, 'AddToken0');
                    }
                }
                else {
                    console.error(res);
                }
            }
        }
    }
    catch (e) {
        console.error(e);
    }
    return '';
};
exports.pendingOrderBuyICDex = pendingOrderBuyICDex;
const binanceSellToICDexTrade = async (strategy, minimumProfit, pairInfo, secondPairInfo, balance, secondBalance, identity, orderId, token1Value, token1Remaining, token0DebitRecord, arbitrage, status, balanceChangesType = null) => {
    let updateBalance = false;
    if (strategy.invert === 1) {
        if (Number(token1Value) > 0) {
            return await exports.toSellICDex(strategy, minimumProfit, pairInfo, secondPairInfo, balance, secondBalance, identity, orderId, token1Value, token1Value, token0DebitRecord, arbitrage, status, balanceChangesType);
        }
        else if (balanceChangesType === 'AddToken1' &&
            Number(token1Remaining) > 0) {
            updateBalance = true;
        }
    }
    else {
        if (Number(token1Value) > 0) {
            return await exports.toBuyICDex(strategy, minimumProfit, pairInfo, secondPairInfo, balance, secondBalance, identity, orderId, token1Value, token1Value, token0DebitRecord, arbitrage, status, balanceChangesType);
        }
        else if (balanceChangesType === 'AddToken1' &&
            Number(token1Remaining) > 0) {
            updateBalance = true;
        }
    }
    if (updateBalance) {
        await db_1.updateBalanceChanges(strategy.id, token1Remaining, '', orderId, '');
    }
    return '';
};
exports.binanceSellToICDexTrade = binanceSellToICDexTrade;
const ICDexSellToBinanceTrade = async (strategy, minimumProfit, pairInfo, secondPairInfo, balance, secondBalance, binanceConfig, txid, token1Value, token1Remaining, token0DebitRecord, arbitrage, status, balanceChangesType = null) => {
    const filter = await binanceTrade_1.getBinanceFilter(pairInfo);
    const secondFilter = await binanceTrade_1.getBinanceFilter(secondPairInfo);
    let updateBalance = false;
    if (strategy.invert === 1) {
        if (Number(token1Value) > 0 &&
            new bignumber_js_1.default(token1Value).gt(filter.token0.minQty)) {
            return await exports.toSellBinance(strategy, minimumProfit, pairInfo, filter, secondPairInfo, secondFilter, balance, secondBalance, binanceConfig, txid, token1Value, token1Remaining, token0DebitRecord, 1, status, balanceChangesType);
        }
        else if (balanceChangesType === 'AddToken1' &&
            Number(token1Remaining) > 0) {
            updateBalance = true;
        }
    }
    else {
        if (Number(token1Value) > 0) {
            if ((secondPairInfo &&
                new bignumber_js_1.default(token1Value).gt(secondFilter.token0.minQty)) ||
                (!secondPairInfo && new bignumber_js_1.default(token1Value).gt(filter.token1.minQty))) {
                return await exports.toBuyBinance(strategy, minimumProfit, pairInfo, filter, secondPairInfo, secondFilter, balance, secondBalance, binanceConfig, txid, token1Value, token1Remaining, token0DebitRecord, 1, status, balanceChangesType);
            }
            else if (balanceChangesType === 'AddToken1' &&
                Number(token1Remaining) > 0) {
                updateBalance = true;
            }
        }
    }
    if (updateBalance) {
        await db_1.updateBalanceChanges(strategy.id, '', token1Remaining, txid, '');
    }
    return '';
};
exports.ICDexSellToBinanceTrade = ICDexSellToBinanceTrade;
const binanceBuyToICDexTrade = async (strategy, minimumProfit, pairInfo, secondPairInfo, balance, secondBalance, identity, orderId, token0Value, token0Remaining, token1DebitRecord, arbitrage, status, balanceChangesType = null) => {
    let updateBalance = false;
    if (strategy.invert === 1) {
        if (Number(token0Value) > 0) {
            return await exports.toBuyICDex(strategy, minimumProfit, pairInfo, secondPairInfo, balance, secondBalance, identity, orderId, token0Value, token0Value, token1DebitRecord, arbitrage, status, balanceChangesType);
        }
        else if (balanceChangesType === 'AddToken0' &&
            Number(token0Remaining) > 0) {
            updateBalance = true;
        }
    }
    else {
        if (Number(token0Value) > 0) {
            return await exports.toSellICDex(strategy, minimumProfit, pairInfo, secondPairInfo, balance, secondBalance, identity, orderId, token0Value, token0Value, token1DebitRecord, arbitrage, status, balanceChangesType);
        }
        else if (balanceChangesType === 'AddToken0' &&
            Number(token0Remaining) > 0) {
            updateBalance = true;
        }
    }
    if (updateBalance) {
        await db_1.updateBalanceChanges(strategy.id, token0Remaining, '', orderId, '');
    }
    return '';
};
exports.binanceBuyToICDexTrade = binanceBuyToICDexTrade;
const ICDexBuyToBinanceTrade = async (strategy, minimumProfit, pairInfo, secondPairInfo, balance, secondBalance, binanceConfig, txid, token0Value, token0Remaining, token1DebitRecord, arbitrage, status, balanceChangesType = null) => {
    const filter = await binanceTrade_1.getBinanceFilter(pairInfo);
    const secondFilter = await binanceTrade_1.getBinanceFilter(secondPairInfo);
    let updateBalance = false;
    if (strategy.invert === 1) {
        if (Number(token0Value) > 0 &&
            new bignumber_js_1.default(token0Value).gt(filter.token1.minQty)) {
            return await exports.toBuyBinance(strategy, minimumProfit, pairInfo, filter, secondPairInfo, secondFilter, balance, secondBalance, binanceConfig, txid, token0Value, token0Remaining, token1DebitRecord, arbitrage, status, balanceChangesType);
        }
        else if (balanceChangesType === 'AddToken0' &&
            Number(token0Remaining) > 0) {
            updateBalance = true;
        }
    }
    else {
        if (Number(token0Value) > 0 &&
            new bignumber_js_1.default(token0Value).gt(filter.token0.minQty)) {
            return await exports.toSellBinance(strategy, minimumProfit, pairInfo, filter, secondPairInfo, secondFilter, balance, secondBalance, binanceConfig, txid, token0Value, token0Remaining, token1DebitRecord, arbitrage, status, balanceChangesType);
        }
        else if (balanceChangesType === 'AddToken0' &&
            Number(token0Remaining) > 0) {
            updateBalance = true;
        }
    }
    if (updateBalance) {
        await db_1.updateBalanceChanges(strategy.id, token0Remaining, '', txid, '');
    }
    return '';
};
exports.ICDexBuyToBinanceTrade = ICDexBuyToBinanceTrade;
const getBuyPrice = async (strategy, ICDexPairInfo, binancePairInfo, secondBinancePairInfo, minimumProfit, ICDexTradeFee, config, binanceTradeFee, token0Decimals, token1Decimals, tokenMinUnit, unitSize) => {
    try {
        let unit = 0;
        if (token1Decimals - tokenMinUnit > 0) {
            unit = token1Decimals - tokenMinUnit;
            if (unit > 8) {
                unit = 8;
            }
        }
        else {
            unit = 0;
        }
        const minSellToken1 = new bignumber_js_1.default(config.token1Amount)
            .times(new bignumber_js_1.default(1).plus(minimumProfit))
            .div(new bignumber_js_1.default(1).minus(binanceTradeFee))
            .toString(10);
        const sellToken0 = await binanceTrade_1.getBinanceToken0SellMarket(binancePairInfo, secondBinancePairInfo, minSellToken1, binanceTradeFee, strategy.invert);
        const token0Buy = new bignumber_js_1.default(sellToken0)
            .div(new bignumber_js_1.default(1).minus(ICDexTradeFee))
            .decimalPlaces(tokenMinUnit, 2)
            .toString(10);
        const ICDexPriceBuy = new bignumber_js_1.default(config.token1Amount)
            .div(token0Buy)
            .decimalPlaces(unit, 1)
            .times(10 ** token1Decimals)
            .times(new bignumber_js_1.default(unitSize).div(10 ** token0Decimals))
            .toString(10);
        const priceBuy = new bignumber_js_1.default(config.token1Amount)
            .div(token0Buy)
            .toString(10);
        return {
            token0Buy: token0Buy,
            ICDexPriceBuy: ICDexPriceBuy,
            priceBuy: priceBuy
        };
    }
    catch (e) {
        return { token0Buy: '', priceBuy: '', ICDexPriceBuy: '' };
    }
};
exports.getBuyPrice = getBuyPrice;
const getBuyPriceBinance = async (strategy, binancePairInfo, filter, ICDexPairInfo, secondICDexPairInfo, minimumProfit, binanceTradeFee, config, ICDexTradeFee) => {
    try {
        const minSellToken1 = new bignumber_js_1.default(config.token1Amount)
            .times(new bignumber_js_1.default(1).plus(minimumProfit))
            .div(new bignumber_js_1.default(1).minus(ICDexTradeFee))
            .toString(10);
        const sellToken0 = await ICDexTrade_1.getICDexToken0SellMarket(ICDexPairInfo, secondICDexPairInfo, minSellToken1, ICDexTradeFee, strategy.invert);
        if (!sellToken0) {
            return { token0Buy: '', binancePriceBuy: '' };
        }
        const token0Buy = new bignumber_js_1.default(sellToken0)
            .div(new bignumber_js_1.default(1).minus(binanceTradeFee))
            .decimalPlaces(filter.token0.decimals, 2)
            .toString(10);
        const binancePriceBuy = new bignumber_js_1.default(config.token1Amount)
            .div(token0Buy)
            .decimalPlaces(filter.price.decimals, 1)
            .toString(10);
        return {
            token0Buy: token0Buy,
            binancePriceBuy: binancePriceBuy
        };
    }
    catch (e) {
        return { token0Buy: '', binancePriceBuy: '' };
    }
};
exports.getBuyPriceBinance = getBuyPriceBinance;
const getSellPriceBinance = async (strategy, binancePairInfo, filter, ICDexPairInfo, secondICDexPairInfo, minimumProfit, binanceTradeFee, config, ICDexTradeFee) => {
    try {
        const minBuyToken1 = new bignumber_js_1.default(config.token1Amount)
            .times(new bignumber_js_1.default(1).minus(binanceTradeFee))
            .toString(10);
        const buyToken0 = await ICDexTrade_1.getICDexToken0BuyMarket(ICDexPairInfo, secondICDexPairInfo, minBuyToken1, ICDexTradeFee, strategy.invert);
        if (!buyToken0) {
            return { token0Sell: '', binancePriceSell: '' };
        }
        const token0Sell = new bignumber_js_1.default(buyToken0)
            .times(new bignumber_js_1.default(1).minus(ICDexTradeFee))
            .div(new bignumber_js_1.default(1).plus(minimumProfit))
            .decimalPlaces(filter.token0.decimals, 1)
            .toString(10);
        const binancePriceSell = new bignumber_js_1.default(config.token1Amount)
            .div(token0Sell)
            .decimalPlaces(filter.price.decimals, 1)
            .toString(10);
        return {
            token0Sell: token0Sell,
            binancePriceSell: binancePriceSell
        };
    }
    catch (e) {
        return { token0Sell: '', binancePriceSell: '' };
    }
};
exports.getSellPriceBinance = getSellPriceBinance;
const getSellPrice = async (strategy, ICDexPairInfo, binancePairInfo, secondBinancePairInfo, minimumProfit, ICDexTradeFee, config, binanceTradeFee, token0Decimals, token1Decimals, tokenMinUnit, unitSize) => {
    try {
        let unit = 0;
        if (token1Decimals - tokenMinUnit > 0) {
            unit = token1Decimals - tokenMinUnit;
            if (unit > 8) {
                unit = 8;
            }
        }
        else {
            unit = 0;
        }
        const minBuyToken1 = new bignumber_js_1.default(config.token1Amount)
            .times(new bignumber_js_1.default(1).minus(ICDexTradeFee))
            .toString(10);
        const buyToken0 = await binanceTrade_1.getBinanceToken0BuyMarket(binancePairInfo, secondBinancePairInfo, minBuyToken1, strategy.mainExchangeFee, strategy.invert);
        const token0Sell = new bignumber_js_1.default(buyToken0)
            .times(new bignumber_js_1.default(1).minus(binanceTradeFee))
            .div(new bignumber_js_1.default(1).plus(minimumProfit))
            .decimalPlaces(tokenMinUnit, 1)
            .toString(10);
        const ICDexPriceSell = new bignumber_js_1.default(config.token1Amount)
            .div(token0Sell)
            .decimalPlaces(unit, 1)
            .times(10 ** token1Decimals)
            .times(new bignumber_js_1.default(unitSize).div(10 ** token0Decimals))
            .toString(10);
        const priceSell = new bignumber_js_1.default(config.token1Amount)
            .div(token0Sell)
            .toString(10);
        return {
            token0Sell: token0Sell,
            ICDexPriceSell: ICDexPriceSell,
            priceSell: priceSell
        };
    }
    catch (e) {
        return { token0Sell: '', ICDexPriceSell: '', priceSell: '' };
    }
};
exports.getSellPrice = getSellPrice;
const hasPendingOrders = async (strategyId, mainExchangeName, mainPairInfo, mainAccount) => {
    let flag = false;
    const pendingOrder = await db_1.getPendingOrders(strategyId);
    const mainOrders = [];
    if (pendingOrder && pendingOrder.length) {
        pendingOrder.forEach((item) => {
            mainOrders.push(item.mainExchangeOrderId);
        });
    }
    if (mainExchangeName === model_1.ExchangeName.ICDex) {
        const service = new ICDexService_1.ICDexService();
        const pairInfo = mainPairInfo;
        const account = mainAccount;
        const pending = await service.pending(pairInfo.pairId, account.getPrincipal().toString());
        if (pending && pending.data && pending.data.length) {
            const promise = [];
            pending.data.forEach((item) => {
                const txid = converter_1.toHexString(new Uint8Array(item[0]));
                const status = Object.keys(item[1].status)[0];
                if (mainOrders.includes(txid) && status === 'Pending') {
                    flag = true;
                }
                if (!mainOrders.includes(txid) && status === 'Pending') {
                    // todo pending
                    if (item[1].data && item[1].data[0]) {
                        const data = converter_1.toHexString(new Uint8Array(item[1].data[0]));
                        const ICDexTradeData = converter_1.toHexString(new Uint8Array(ICDexTrade_1.generateICDexTradeData(pairInfo.pairId, account.getPrincipal())));
                        if (data === ICDexTradeData) {
                            promise.push(db_1.insertOrUpdateICDexOrderInfo(strategyId, pairInfo.pairId, txid));
                            promise.push(db_1.insertOrderIdOrUpdate(strategyId, txid, null, '', '', model_1.OrdersStatus.Pending));
                            flag = true;
                        }
                    }
                }
            });
            if (promise.length) {
                await Promise.all(promise);
            }
        }
    }
    else if (mainExchangeName === model_1.ExchangeName.Binance) {
        const pairInfo = mainPairInfo;
        const account = mainAccount;
        const response = await binance_1.openOrders(account.APIKey, account.privateKey, pairInfo.symbol);
        if (response &&
            !(response.code || response.code === 0)) {
            const pending = response;
            if (pending && pending.length) {
                for (let i = 0; i < pending.length; i++) {
                    const orderId = pending[i].orderId.toString(10);
                    const status = pending[i].status;
                    if (mainOrders.includes(orderId) &&
                        (status === 'NEW' ||
                            status === 'PENDING_NEW' ||
                            status === 'PARTIALLY_FILLED')) {
                        flag = true;
                        break;
                    }
                }
            }
        }
    }
    return flag;
};
exports.hasPendingOrders = hasPendingOrders;
const tradeType = {};
const toRunTimer = async (strategy, exchange, mainPairInfo, mainAccount, mainAccountBalance, secondPairInfo, secondAccount, secondAccountBalance, secondPairInfoTwo, secondAccountBalanceTwo) => {
    try {
        const mainExchangeName = exchange[strategy.mainExchangeId];
        const secondExchangeName = exchange[strategy.secondExchangeId];
        const config = JSON.parse(strategy.arguments);
        if (config && config.orderAmount) {
            if (mainExchangeName === model_1.ExchangeName.ICDex) {
                mainAccount = mainAccount;
                mainPairInfo = mainPairInfo;
                const token0Info = JSON.parse(mainPairInfo.token0Info);
                const token1Info = JSON.parse(mainPairInfo.token1Info);
                const token0Decimals = token0Info.decimals;
                const token1Decimals = token1Info.decimals;
                const setting = JSON.parse(mainPairInfo.setting);
                const unitSize = setting.UNIT_SIZE;
                let tokenMinUnit = 0;
                const tokenUnitDecimals = unitSize.length - 1; // Unit must 1+0000
                if (token0Decimals > tokenUnitDecimals) {
                    // todo
                    tokenMinUnit = token0Decimals - tokenUnitDecimals;
                }
                const ICDexRes = await ICDexTrade_1.getICDexToken1AndToken0(mainPairInfo.pairId, mainPairInfo, config, strategy.mainExchangeFee);
                const token0 = new bignumber_js_1.default(1)
                    .minus(strategy.mainExchangeFee)
                    .times(config.orderAmount)
                    .toString(10);
                const depthToken = {
                    token0: token0,
                    token1: ICDexRes.sellToken0GetToken1
                };
                if (secondExchangeName === model_1.ExchangeName.Binance) {
                    secondPairInfo = secondPairInfo;
                    secondPairInfoTwo = secondPairInfoTwo;
                    secondAccount = secondAccount;
                    const binanceRes = await binanceTrade_1.getBinanceToken1AndToken0(secondPairInfo, secondPairInfoTwo, depthToken, strategy.secondExchangeFee, strategy.invert);
                    if (!config.unilateral && config.arbitrage) {
                        if (new bignumber_js_1.default(binanceRes.token0).gt(config.orderAmount)) {
                            const res = await exports.ICDexSellThenBinanceTrade(strategy, 0, mainPairInfo, mainAccount, mainAccountBalance, secondPairInfo, secondPairInfoTwo, secondAccount, secondAccountBalance, secondAccountBalanceTwo, config.orderAmount, token0Decimals, token1Decimals, tokenMinUnit, config.arbitrage, config.unilateral, model_1.OrdersStatus.Completed);
                            if (typeof res === 'string') {
                                return res;
                            }
                            else {
                                return 'runTimer';
                            }
                        }
                        else if (new bignumber_js_1.default(ICDexRes.buyToken0NeedToken1).gt(0) &&
                            new bignumber_js_1.default(binanceRes.token1).gt(ICDexRes.buyToken0NeedToken1)) {
                            const res = await exports.ICDexBuyThenBinanceTrade(strategy, 0, mainPairInfo, mainAccount, mainAccountBalance, secondPairInfo, secondPairInfoTwo, secondAccount, secondAccountBalance, secondAccountBalanceTwo, ICDexRes.buyToken0NeedToken1, token0Decimals, token1Decimals, tokenMinUnit, config.arbitrage, config.unilateral, model_1.OrdersStatus.Completed);
                            if (typeof res === 'string') {
                                return res;
                            }
                            else {
                                return 'runTimer';
                            }
                        }
                    }
                    else {
                        const service = new ICDexService_1.ICDexService();
                        const res = await service.stats(mainPairInfo.pairId);
                        const tokenPrice = new bignumber_js_1.default(res.price)
                            .times(10 ** token0Decimals)
                            .div(10 ** token1Decimals)
                            .toString(10);
                        const token0Sell = new bignumber_js_1.default(mainAccountBalance.token0)
                            .times(tokenPrice)
                            .toString(10);
                        if (new bignumber_js_1.default(token0Sell).times(0.2).gt(mainAccountBalance.token1)) {
                            // 80%
                            tradeType[strategy.id] = 'SELL';
                            const token0Amount = new bignumber_js_1.default(config.orderAmount)
                                .times(2)
                                .toString(10);
                            const res = await exports.ICDexSellThenBinanceTrade(strategy, 0, mainPairInfo, mainAccount, mainAccountBalance, secondPairInfo, secondPairInfoTwo, secondAccount, secondAccountBalance, secondAccountBalanceTwo, token0Amount, token0Decimals, token1Decimals, tokenMinUnit, config.arbitrage, config.unilateral, model_1.OrdersStatus.Completed);
                            if (typeof res === 'string') {
                                return res;
                            }
                        }
                        else if (new bignumber_js_1.default(token0Sell)
                            .times(0.8)
                            .gt(mainAccountBalance.token1) ||
                            (!tradeType[strategy.id] &&
                                new bignumber_js_1.default(token0Sell).gte(mainAccountBalance.token1))) {
                            // 20%
                            tradeType[strategy.id] = 'SELL';
                            const res = await exports.ICDexSellThenBinanceTrade(strategy, 0, mainPairInfo, mainAccount, mainAccountBalance, secondPairInfo, secondPairInfoTwo, secondAccount, secondAccountBalance, secondAccountBalanceTwo, config.orderAmount, token0Decimals, token1Decimals, tokenMinUnit, config.arbitrage, config.unilateral, model_1.OrdersStatus.Completed);
                            if (typeof res === 'string') {
                                return res;
                            }
                        }
                        else if (new bignumber_js_1.default(mainAccountBalance.token1).times(0.2).gt(token0Sell)) {
                            // 80%
                            tradeType[strategy.id] = 'BUY';
                            const buyConfig = JSON.parse(JSON.stringify(config));
                            buyConfig.orderAmount = new bignumber_js_1.default(buyConfig.orderAmount)
                                .times(2)
                                .toString(10);
                            const ICDexToken1AndToken0 = await ICDexTrade_1.getICDexToken1AndToken0(mainPairInfo.pairId, mainPairInfo, buyConfig, strategy.mainExchangeFee);
                            const res = await exports.ICDexBuyThenBinanceTrade(strategy, 0, mainPairInfo, mainAccount, mainAccountBalance, secondPairInfo, secondPairInfoTwo, secondAccount, secondAccountBalance, secondAccountBalanceTwo, ICDexToken1AndToken0.buyToken0NeedToken1, token0Decimals, token1Decimals, tokenMinUnit, config.arbitrage, config.unilateral, model_1.OrdersStatus.Completed);
                            if (typeof res === 'string') {
                                return res;
                            }
                        }
                        else if (new bignumber_js_1.default(mainAccountBalance.token1)
                            .times(0.8)
                            .gt(token0Sell) ||
                            (tradeType[strategy.id] && tradeType[strategy.id] === 'SELL') ||
                            (!tradeType[strategy.id] &&
                                new bignumber_js_1.default(mainAccountBalance.token1).gt(token0Sell))) {
                            // 20%
                            tradeType[strategy.id] = 'BUY';
                            const res = await exports.ICDexBuyThenBinanceTrade(strategy, 0, mainPairInfo, mainAccount, mainAccountBalance, secondPairInfo, secondPairInfoTwo, secondAccount, secondAccountBalance, secondAccountBalanceTwo, ICDexRes.buyToken0NeedToken1, token0Decimals, token1Decimals, tokenMinUnit, config.arbitrage, config.unilateral, model_1.OrdersStatus.Completed);
                            if (typeof res === 'string') {
                                return res;
                            }
                        }
                        else if (tradeType[strategy.id] &&
                            tradeType[strategy.id] === 'BUY') {
                            tradeType[strategy.id] = 'SELL';
                            const res = await exports.ICDexSellThenBinanceTrade(strategy, 0, mainPairInfo, mainAccount, mainAccountBalance, secondPairInfo, secondPairInfoTwo, secondAccount, secondAccountBalance, secondAccountBalanceTwo, config.orderAmount, token0Decimals, token1Decimals, tokenMinUnit, config.arbitrage, config.unilateral, model_1.OrdersStatus.Completed);
                            if (typeof res === 'string') {
                                return res;
                            }
                            return '';
                        }
                    }
                }
            }
            else if (mainExchangeName === model_1.ExchangeName.Binance) {
                mainAccount = mainAccount;
                mainPairInfo = mainPairInfo;
                const binanceRes = await binanceTrade_1.getBinanceToken1AndToken0ByOrderAmount(mainPairInfo, config, strategy.mainExchangeFee);
                const token0 = new bignumber_js_1.default(1)
                    .minus(strategy.mainExchangeFee)
                    .times(config.orderAmount)
                    .toString(10);
                const depthToken = {
                    token0: token0,
                    token1: binanceRes.sellToken0GetToken1
                };
                if (secondExchangeName === model_1.ExchangeName.ICDex) {
                    secondPairInfo = secondPairInfo;
                    secondPairInfoTwo = secondPairInfoTwo;
                    secondAccount = secondAccount;
                    const ICDexRes = await ICDexTrade_1.getICDexToken0AndToken1(secondPairInfo, secondPairInfoTwo, depthToken, strategy.secondExchangeFee, strategy.invert);
                    if (!config.unilateral && config.arbitrage) {
                        if (new bignumber_js_1.default(ICDexRes.token0).gt(config.orderAmount)) {
                            const res = await exports.binanceSellThenICDexTrade(strategy, 0, mainPairInfo, mainAccount, mainAccountBalance, secondPairInfo, secondPairInfoTwo, secondAccount, secondAccountBalance, secondAccountBalanceTwo, config.orderAmount, config.arbitrage, config.unilateral, model_1.OrdersStatus.Completed);
                            if (typeof res === 'string') {
                                return res;
                            }
                        }
                        else if (new bignumber_js_1.default(ICDexRes.token1).gt(binanceRes.buyToken0NeedToken1)) {
                            const res = await exports.binanceBuyThenICDexTrade(strategy, 0, mainPairInfo, mainAccount, mainAccountBalance, secondPairInfo, secondPairInfoTwo, secondAccount, secondAccountBalance, secondAccountBalanceTwo, binanceRes.buyToken0NeedToken1, config.arbitrage, config.unilateral, model_1.OrdersStatus.Completed);
                            if (typeof res === 'string') {
                                return res;
                            }
                        }
                    }
                    else {
                        const res = await binance_1.getDepth(mainPairInfo.symbol);
                        let token0Sell = mainAccountBalance.token0;
                        if (!res.code) {
                            const depth = res;
                            token0Sell = new bignumber_js_1.default(mainAccountBalance.token0)
                                .times(depth.bids[0][0])
                                .toString(10);
                        }
                        if (new bignumber_js_1.default(token0Sell).times(0.2).gt(mainAccountBalance.token1)) {
                            // 80%
                            tradeType[strategy.id] = 'SELL';
                            const token0Amount = new bignumber_js_1.default(config.orderAmount)
                                .times(2)
                                .toString(10);
                            const res = await exports.binanceSellThenICDexTrade(strategy, 0, mainPairInfo, mainAccount, mainAccountBalance, secondPairInfo, secondPairInfoTwo, secondAccount, secondAccountBalance, secondAccountBalanceTwo, token0Amount, config.arbitrage, config.unilateral, model_1.OrdersStatus.Completed);
                            if (typeof res === 'string') {
                                return res;
                            }
                        }
                        else if (new bignumber_js_1.default(token0Sell)
                            .times(0.8)
                            .gt(mainAccountBalance.token1) ||
                            (!tradeType[strategy.id] &&
                                new bignumber_js_1.default(token0Sell).gte(mainAccountBalance.token1))) {
                            // 20%
                            tradeType[strategy.id] = 'SELL';
                            const res = await exports.binanceSellThenICDexTrade(strategy, 0, mainPairInfo, mainAccount, mainAccountBalance, secondPairInfo, secondPairInfoTwo, secondAccount, secondAccountBalance, secondAccountBalanceTwo, config.orderAmount, config.arbitrage, config.unilateral, model_1.OrdersStatus.Completed);
                            if (typeof res === 'string') {
                                return res;
                            }
                        }
                        else if (new bignumber_js_1.default(mainAccountBalance.token1).times(0.2).gt(token0Sell)) {
                            // 80%
                            tradeType[strategy.id] = 'BUY';
                            const buyConfig = JSON.parse(JSON.stringify(config));
                            buyConfig.orderAmount = new bignumber_js_1.default(buyConfig.orderAmount)
                                .times(2)
                                .toString(10);
                            const binanceRes = await binanceTrade_1.getBinanceToken1AndToken0ByOrderAmount(mainPairInfo, buyConfig, strategy.mainExchangeFee);
                            const res = await exports.binanceBuyThenICDexTrade(strategy, 0, mainPairInfo, mainAccount, mainAccountBalance, secondPairInfo, secondPairInfoTwo, secondAccount, secondAccountBalance, secondAccountBalanceTwo, binanceRes.buyToken0NeedToken1, config.arbitrage, config.unilateral, model_1.OrdersStatus.Completed);
                            if (typeof res === 'string') {
                                return res;
                            }
                        }
                        else if (new bignumber_js_1.default(mainAccountBalance.token1)
                            .times(0.8)
                            .gt(token0Sell) ||
                            (tradeType[strategy.id] && tradeType[strategy.id] === 'SELL') ||
                            (!tradeType[strategy.id] &&
                                new bignumber_js_1.default(mainAccountBalance.token1).gt(token0Sell))) {
                            // 20%
                            tradeType[strategy.id] = 'BUY';
                            const res = await exports.binanceBuyThenICDexTrade(strategy, 0, mainPairInfo, mainAccount, mainAccountBalance, secondPairInfo, secondPairInfoTwo, secondAccount, secondAccountBalance, secondAccountBalanceTwo, binanceRes.buyToken0NeedToken1, config.arbitrage, config.unilateral, model_1.OrdersStatus.Completed);
                            if (typeof res === 'string') {
                                return res;
                            }
                        }
                        else if (tradeType[strategy.id] &&
                            tradeType[strategy.id] === 'BUY') {
                            tradeType[strategy.id] = 'SELL';
                            const res = await exports.binanceSellThenICDexTrade(strategy, 0, mainPairInfo, mainAccount, mainAccountBalance, secondPairInfo, secondPairInfoTwo, secondAccount, secondAccountBalance, secondAccountBalanceTwo, config.orderAmount, config.arbitrage, config.unilateral, model_1.OrdersStatus.Completed);
                            if (typeof res === 'string') {
                                return res;
                            }
                            return '';
                        }
                    }
                }
            }
        }
    }
    catch (e) { }
    return '';
};
exports.toRunTimer = toRunTimer;
const getBalance = async (accountId, exchangeName, pairInfo, accountValue) => {
    const balance = {
        token0: '0',
        token1: '0'
    };
    if (exchangeName === model_1.ExchangeName.ICDex) {
        const service = new ICDexService_1.ICDexService();
        pairInfo = pairInfo;
        accountValue = accountValue;
        const keepingBalance = await service.accountBalance(pairInfo.pairId, accountValue.getPrincipal().toString());
        const token0Info = JSON.parse(pairInfo.token0Info);
        const token1Info = JSON.parse(pairInfo.token1Info);
        balance.token0 = new bignumber_js_1.default(keepingBalance.token0.available.toString(10))
            .div(10 ** token0Info.decimals)
            .toString(10);
        balance.token1 = new bignumber_js_1.default(keepingBalance.token1.available.toString(10))
            .div(10 ** token1Info.decimals)
            .toString(10);
    }
    else if (exchangeName === model_1.ExchangeName.Binance) {
        pairInfo = pairInfo;
        accountValue = accountValue;
        if (!binanceAccountInfo[accountValue.APIKey]) {
            await exports.getBinanceAccountInfoInterval(accountId, accountValue);
        }
        balance.token0 = exports.filterBinanceBalance(binanceAccountInfo[accountValue.APIKey].info, pairInfo.baseAsset);
        balance.token1 = exports.filterBinanceBalance(binanceAccountInfo[accountValue.APIKey].info, pairInfo.quoteAsset);
    }
    return balance;
};
exports.getBalance = getBalance;
const getAccountValue = (exchangeName, value) => {
    let account = null;
    if (exchangeName === model_1.ExchangeName.ICDex) {
        const mainAccountValue = JSON.parse(value);
        if (mainAccountValue && mainAccountValue.pem) {
            const identity = converter_1.identityFromPem(mainAccountValue.pem);
            if (identity) {
                account = identity;
            }
        }
    }
    else if (exchangeName === model_1.ExchangeName.Binance) {
        account = JSON.parse(value);
    }
    return account;
};
exports.getAccountValue = getAccountValue;
const getBinanceAccountInfo = async (accountId) => {
    const res = await binance_1.getAccountInfo(accountId);
    if (res.code) {
        //
    }
    else {
        return res;
    }
    return null;
};
exports.getBinanceAccountInfo = getBinanceAccountInfo;
const filterBinanceBalance = (accountInfo, symbol) => {
    const res = accountInfo.balances.find((item) => symbol === item.asset);
    if (res) {
        return res.free;
    }
    return '0';
};
exports.filterBinanceBalance = filterBinanceBalance;
const getBinanceAccountInfoInterval = async (accountId, val) => {
    const time = new Date().getTime();
    if (binanceAccountInfo[val.APIKey]) {
        if (binanceAccountInfo[val.APIKey].time + interval < time) {
            return;
        }
    }
    const res = await exports.getBinanceAccountInfo(accountId);
    if (res) {
        binanceAccountInfo[val.APIKey] = {
            time: time,
            info: res
        };
    }
    timers_1.setTimeout(() => {
        exports.getBinanceAccountInfoInterval(accountId, val);
    }, interval);
};
exports.getBinanceAccountInfoInterval = getBinanceAccountInfoInterval;
const binanceBuyThenICDexTrade = async (strategy, minimumProfit, binancePairInfo, binanceConfig, binanceBalance, ICDexPairInfo, secondICDexPairInfo, identity, ICDexBalance, ICDexBalanceTwo, token1Amount, arbitrage, unilateral, status) => {
    const filter = await binanceTrade_1.getBinanceFilter(binancePairInfo);
    const buyResponse = await binanceTrade_1.onBinanceBuy(strategy.id, binanceConfig, binancePairInfo, Number(token1Amount), filter, binanceBalance);
    if (typeof buyResponse === 'string') {
        await db_1.insertOrderIdOrUpdate(strategy.id, '', null, buyResponse, '', status);
        return buyResponse;
    }
    else {
        const token0Value = buyResponse.executedQty;
        const token1DebitRecord = buyResponse.cummulativeQuoteQty;
        const orderId = buyResponse.orderId;
        if (unilateral) {
            await db_1.insertOrderIdOrUpdate(strategy.id, orderId.toString(10), null, '', '', status);
            return '';
        }
        else {
            if (strategy.invert === 1) {
                return await exports.toBuyICDex(strategy, minimumProfit, ICDexPairInfo, secondICDexPairInfo, ICDexBalance, ICDexBalanceTwo, identity, orderId.toString(10), token0Value, token0Value, token1DebitRecord, arbitrage, status);
            }
            else {
                return await exports.toSellICDex(strategy, minimumProfit, ICDexPairInfo, secondICDexPairInfo, ICDexBalance, ICDexBalanceTwo, identity, orderId.toString(10), token0Value, token0Value, token1DebitRecord, arbitrage, status);
            }
        }
    }
};
exports.binanceBuyThenICDexTrade = binanceBuyThenICDexTrade;
const ICDexBuyThenBinanceTrade = async (strategy, minimumProfit, ICDePairInfo, identity, ICDexBalance, binancePairInfo, secondBinancePairInfo, binanceConfig, binanceBalance, binanceBalanceTwo, token1Amount, token0decimals, token1decimals, tokenMinUnit, arbitrage, unilateral, status) => {
    const price = BigInt(0);
    const amount = BigInt(new bignumber_js_1.default(token1Amount)
        .times(10 ** token1decimals)
        .decimalPlaces(token1decimals, 1)
        .toString(10));
    const orderPriceBuy = {
        quantity: { Buy: [BigInt(0), BigInt(amount)] },
        price: price
    };
    const ICDexBuyRes = await ICDexTrade_1.onICDexBuy(strategy.id, ICDePairInfo, orderPriceBuy, token0decimals, token1decimals, identity, token1Amount, ICDexBalance);
    if (typeof ICDexBuyRes === 'string') {
        await db_1.insertOrderIdOrUpdate(strategy.id, '', null, ICDexBuyRes, '', status);
        return ICDexBuyRes;
    }
    else {
        const filter = await binanceTrade_1.getBinanceFilter(binancePairInfo);
        const secondFilter = await binanceTrade_1.getBinanceFilter(secondBinancePairInfo);
        const token0Value = ICDexBuyRes.token0Value;
        const token1DebitRecord = ICDexBuyRes.token1DebitRecord;
        const txid = ICDexBuyRes.txid;
        if (unilateral) {
            await db_1.insertOrderIdOrUpdate(strategy.id, txid, null, '', '', status);
            return '';
        }
        else {
            if (strategy.invert === 1) {
                return await exports.toBuyBinance(strategy, minimumProfit, binancePairInfo, filter, secondBinancePairInfo, secondFilter, binanceBalance, binanceBalanceTwo, binanceConfig, txid, token0Value, token0Value, token1DebitRecord, arbitrage, status);
            }
            else {
                return await exports.toSellBinance(strategy, minimumProfit, binancePairInfo, filter, secondBinancePairInfo, secondFilter, binanceBalance, binanceBalanceTwo, binanceConfig, txid, token0Value, token0Value, token1DebitRecord, arbitrage, status);
            }
        }
    }
};
exports.ICDexBuyThenBinanceTrade = ICDexBuyThenBinanceTrade;
const binanceSellThenICDexTrade = async (strategy, minimumProfit, binancePairInfo, binanceConfig, binanceBalance, ICDexPairInfo, secondICDexPairInfo, identity, ICDexBalance, ICDexBalanceTwo, token0Amount, arbitrage, unilateral, status) => {
    const filter = await binanceTrade_1.getBinanceFilter(binancePairInfo);
    const sellResponse = await binanceTrade_1.onBinanceSell(strategy.id, binancePairInfo, binanceConfig, token0Amount, filter, binanceBalance);
    if (typeof sellResponse === 'string') {
        await db_1.insertOrderIdOrUpdate(strategy.id, '', null, sellResponse, '', status);
        return sellResponse;
    }
    else {
        const token1Value = sellResponse.cummulativeQuoteQty;
        const token0DebitRecord = sellResponse.executedQty;
        const orderId = sellResponse.orderId;
        if (unilateral) {
            await db_1.insertOrderIdOrUpdate(strategy.id, orderId.toString(10), null, '', '', status);
            return '';
        }
        else {
            if (strategy.invert === 1) {
                return await exports.toSellICDex(strategy, minimumProfit, ICDexPairInfo, secondICDexPairInfo, ICDexBalance, ICDexBalanceTwo, identity, orderId.toString(10), token1Value, token1Value, token0DebitRecord, arbitrage, status);
            }
            else {
                return await exports.toBuyICDex(strategy, minimumProfit, ICDexPairInfo, secondICDexPairInfo, ICDexBalance, ICDexBalanceTwo, identity, orderId.toString(10), token1Value, token1Value, token0DebitRecord, arbitrage, status);
            }
        }
    }
};
exports.binanceSellThenICDexTrade = binanceSellThenICDexTrade;
const ICDexSellThenBinanceTrade = async (strategy, minimumProfit, ICDePairInfo, identity, ICDexBalance, binancePairInfo, secondBinancePairInfo, binanceConfig, binanceBalance, binanceBalanceTwo, token0Amount, token0decimals, token1decimals, tokenMinUnit, arbitrage, unilateral, status) => {
    const price = BigInt(0);
    const amount = BigInt(new bignumber_js_1.default(token0Amount)
        .times(10 ** token0decimals)
        .decimalPlaces(tokenMinUnit, 1)
        .toString(10));
    const orderPriceSell = {
        quantity: { Sell: amount },
        price: price
    };
    const ICDexSellRes = await ICDexTrade_1.onICDexSell(strategy.id, ICDePairInfo, orderPriceSell, token0decimals, token1decimals, identity, token0Amount, ICDexBalance);
    if (typeof ICDexSellRes === 'string') {
        await db_1.insertOrderIdOrUpdate(strategy.id, '', null, ICDexSellRes, '', status);
        return ICDexSellRes;
    }
    else {
        const filter = await binanceTrade_1.getBinanceFilter(binancePairInfo);
        const secondFilter = await binanceTrade_1.getBinanceFilter(secondBinancePairInfo);
        const token1Value = ICDexSellRes.token1Value;
        const token0DebitRecord = ICDexSellRes.token0DebitRecord;
        const txid = ICDexSellRes.txid;
        if (unilateral) {
            await db_1.insertOrderIdOrUpdate(strategy.id, txid, null, '', '', status);
            return '';
        }
        else {
            if (strategy.invert === 1) {
                return await exports.toSellBinance(strategy, minimumProfit, binancePairInfo, filter, secondBinancePairInfo, secondFilter, binanceBalance, binanceBalanceTwo, binanceConfig, txid, token1Value, token1Value, token0DebitRecord, arbitrage, status);
            }
            else {
                return await exports.toBuyBinance(strategy, minimumProfit, binancePairInfo, filter, secondBinancePairInfo, secondFilter, binanceBalance, binanceBalanceTwo, binanceConfig, txid, token1Value, token1Value, token0DebitRecord, arbitrage, status);
            }
        }
    }
};
exports.ICDexSellThenBinanceTrade = ICDexSellThenBinanceTrade;
const toSellICDex = async (strategy, minimumProfit, pairInfo, secondPairInfo, balance, secondBalance, identity, orderId, token0Value, token0Remaining, token1DebitRecord, arbitrage, status, balanceChangesType = null) => {
    if (Number(token0Remaining) > 0 &&
        balanceChangesType &&
        balanceChangesType === 'AddToken0') {
        await db_1.updateBalanceChanges(strategy.id, token0Remaining, '', orderId, '');
    }
    if (Number(token0Remaining) > 0 &&
        balanceChangesType &&
        balanceChangesType === 'AddToken1') {
        await db_1.updateBalanceChanges(strategy.id, '', token0Remaining, orderId, '');
    }
    if (secondPairInfo && secondBalance) {
        // sell token0
        const filterSell = exports.filterICDexSell(pairInfo, token0Value);
        const sellResponse = await ICDexTrade_1.onICDexSell(strategy.id, pairInfo, filterSell.orderPrice, filterSell.token0Decimals, filterSell.token1Decimals, identity, token0Value, secondBalance);
        if (typeof sellResponse === 'string') {
            if (!balanceChangesType) {
                await db_1.insertOrderIdOrUpdate(strategy.id, orderId, null, '', sellResponse, status);
            }
            return sellResponse;
        }
        const sellRes = sellResponse;
        const txid = sellRes.txid;
        const secondExchangeOrderId = {};
        secondExchangeOrderId[pairInfo.pairId] = txid;
        if (balanceChangesType &&
            (balanceChangesType === 'SubtractToken0' ||
                balanceChangesType === 'AddToken0')) {
            const token0 = -token0Value;
            await db_1.updateBalanceChanges(strategy.id, token0.toString(10), '', orderId, txid);
        }
        if (balanceChangesType &&
            (balanceChangesType === 'SubtractToken1' ||
                balanceChangesType === 'AddToken1')) {
            const token0 = -token0Value;
            await db_1.updateBalanceChanges(strategy.id, '', token0.toString(10), orderId, txid);
        }
        // buy token1
        const filterBuy = exports.filterICDexBuy(secondPairInfo, sellRes.token1Value);
        const buyResponse = await ICDexTrade_1.onICDexBuy(strategy.id, secondPairInfo, filterBuy.orderPrice, filterBuy.token0Decimals, filterBuy.token1Decimals, identity, sellRes.token1Value, balance);
        if (typeof buyResponse === 'string') {
            if (!balanceChangesType) {
                await db_1.insertOrderIdOrUpdate(strategy.id, orderId, secondExchangeOrderId, '', buyResponse, status);
            }
            return buyResponse;
        }
        const buyRes = buyResponse;
        secondExchangeOrderId[secondPairInfo.pairId] = buyRes.txid;
        await db_1.insertOrderIdOrUpdate(strategy.id, orderId, secondExchangeOrderId, '', '', status);
        if (arbitrage) {
            const debitRecord = new bignumber_js_1.default(token1DebitRecord)
                .times(1 + minimumProfit)
                .toString();
            if (new bignumber_js_1.default(buyRes.token0Value).lt(debitRecord)) {
                return 'Arbitrage failure';
            }
        }
        return {
            token0Value: buyRes.token0Value,
            token1Value: buyRes.token1DebitRecord,
            txid: buyRes.txid
        };
    }
    else {
        const filterSell = exports.filterICDexSell(pairInfo, token0Value);
        const sellResponse = await ICDexTrade_1.onICDexSell(strategy.id, pairInfo, filterSell.orderPrice, filterSell.token0Decimals, filterSell.token1Decimals, identity, token0Value, balance);
        if (typeof sellResponse === 'string') {
            if (!balanceChangesType) {
                await db_1.insertOrderIdOrUpdate(strategy.id, orderId, null, '', sellResponse, status);
            }
            return sellResponse;
        }
        const sellRes = sellResponse;
        const txid = sellRes.txid;
        const secondExchangeOrderId = {};
        secondExchangeOrderId[pairInfo.pairId] = txid;
        if (balanceChangesType &&
            (balanceChangesType === 'SubtractToken0' ||
                balanceChangesType === 'AddToken0')) {
            const token0 = -token0Value;
            await db_1.updateBalanceChanges(strategy.id, token0.toString(10), '', orderId, txid);
        }
        if (balanceChangesType &&
            (balanceChangesType === 'SubtractToken1' ||
                balanceChangesType === 'AddToken1')) {
            const token0 = -token0Value;
            await db_1.updateBalanceChanges(strategy.id, '', token0.toString(10), orderId, txid);
        }
        await db_1.insertOrderIdOrUpdate(strategy.id, orderId, secondExchangeOrderId, '', '', status);
        if (arbitrage) {
            const debitRecord = new bignumber_js_1.default(token1DebitRecord)
                .times(1 + minimumProfit)
                .toString();
            if (new bignumber_js_1.default(sellRes.token1Value).lt(debitRecord)) {
                return 'Arbitrage failure';
            }
        }
        return {
            token0Value: sellRes.token0DebitRecord,
            token1Value: sellRes.token1Value,
            txid: sellRes.txid
        };
    }
};
exports.toSellICDex = toSellICDex;
const toSellBinance = async (strategy, minimumProfit, pairInfo, filter, secondPairInfo, secondFilter, balance, secondBalance, binanceConfig, txid, token0Value, token0Remaining, token1DebitRecord, arbitrage, status, balanceChangesType = null) => {
    if (Number(token0Remaining) > 0 &&
        balanceChangesType &&
        balanceChangesType === 'AddToken0') {
        await db_1.updateBalanceChanges(strategy.id, token0Remaining, '', txid, '');
    }
    if (Number(token0Remaining) > 0 &&
        balanceChangesType &&
        balanceChangesType === 'AddToken1') {
        await db_1.updateBalanceChanges(strategy.id, '', token0Remaining, txid, '');
    }
    if (secondPairInfo && secondBalance) {
        // sell token0
        const sellResponse = await binanceTrade_1.onBinanceSell(strategy.id, pairInfo, binanceConfig, token0Value, filter, balance);
        if (typeof sellResponse === 'string') {
            if (!balanceChangesType) {
                await db_1.insertOrderIdOrUpdate(strategy.id, txid, null, '', sellResponse, status);
            }
            return sellResponse;
        }
        const sellRes = sellResponse;
        const orderId = sellRes.orderId.toString();
        const secondExchangeOrderId = {};
        secondExchangeOrderId[pairInfo.symbol] = orderId;
        if (balanceChangesType &&
            (balanceChangesType === 'SubtractToken0' ||
                balanceChangesType === 'AddToken0')) {
            const token0 = -token0Value;
            await db_1.updateBalanceChanges(strategy.id, token0.toString(10), '', txid, orderId);
        }
        if (balanceChangesType &&
            (balanceChangesType === 'SubtractToken1' ||
                balanceChangesType === 'AddToken1')) {
            const token0 = -token0Value;
            await db_1.updateBalanceChanges(strategy.id, '', token0.toString(10), txid, orderId);
        }
        // buy token1
        const buyResponse = await binanceTrade_1.onBinanceBuy(strategy.id, binanceConfig, secondPairInfo, new bignumber_js_1.default(sellRes.cummulativeQuoteQty).toNumber(), secondFilter, secondBalance);
        if (typeof buyResponse === 'string') {
            if (!balanceChangesType) {
                await db_1.insertOrderIdOrUpdate(strategy.id, txid, secondExchangeOrderId, '', buyResponse, status);
            }
            return buyResponse;
        }
        const buyRes = buyResponse;
        secondExchangeOrderId[secondPairInfo.symbol] = buyRes.orderId.toString();
        await db_1.insertOrderIdOrUpdate(strategy.id, txid, secondExchangeOrderId, '', '', status);
        if (arbitrage) {
            const debitRecord = new bignumber_js_1.default(token1DebitRecord)
                .times(1 + minimumProfit)
                .toString();
            if (new bignumber_js_1.default(buyRes.executedQty).lt(debitRecord)) {
                return 'Arbitrage failure';
            }
        }
        return {
            executedQty: sellResponse.executedQty,
            cummulativeQuoteQty: buyResponse.cummulativeQuoteQty,
            orderId: buyResponse.orderId
        };
    }
    else {
        const sellResponse = await binanceTrade_1.onBinanceSell(strategy.id, pairInfo, binanceConfig, token0Value, filter, balance);
        if (typeof sellResponse === 'string') {
            if (!balanceChangesType) {
                await db_1.insertOrderIdOrUpdate(strategy.id, txid, null, '', sellResponse, status);
            }
            return sellResponse;
        }
        const sellRes = sellResponse;
        const orderId = sellRes.orderId.toString();
        const secondExchangeOrderId = {};
        secondExchangeOrderId[pairInfo.symbol] = orderId;
        if (balanceChangesType &&
            (balanceChangesType === 'SubtractToken0' ||
                balanceChangesType === 'AddToken0')) {
            const token0 = -token0Value;
            await db_1.updateBalanceChanges(strategy.id, token0.toString(10), '', txid, orderId);
        }
        if (balanceChangesType &&
            (balanceChangesType === 'SubtractToken1' ||
                balanceChangesType === 'AddToken1')) {
            const token0 = -token0Value;
            await db_1.updateBalanceChanges(strategy.id, '', token0.toString(10), txid, orderId);
        }
        await db_1.insertOrderIdOrUpdate(strategy.id, txid, secondExchangeOrderId, '', '', status);
        if (arbitrage) {
            const debitRecord = new bignumber_js_1.default(token1DebitRecord)
                .times(1 + minimumProfit)
                .toString();
            if (new bignumber_js_1.default(sellRes.cummulativeQuoteQty).lt(debitRecord)) {
                return 'Arbitrage failure';
            }
        }
        return {
            executedQty: sellResponse.executedQty,
            cummulativeQuoteQty: sellResponse.cummulativeQuoteQty,
            orderId: sellResponse.orderId
        };
    }
};
exports.toSellBinance = toSellBinance;
const filterICDexBuy = (pairInfo, token1Amount) => {
    const token0Info = JSON.parse(pairInfo.token0Info);
    const token1Info = JSON.parse(pairInfo.token1Info);
    const token0Decimals = token0Info.decimals;
    const token1Decimals = token1Info.decimals;
    const price = BigInt(0);
    const amount = BigInt(new bignumber_js_1.default(token1Amount)
        .times(10 ** token1Decimals)
        .decimalPlaces(token1Decimals, 1)
        .toString(10));
    return {
        orderPrice: {
            quantity: { Buy: [BigInt(0), BigInt(amount)] },
            price: price
        },
        token0Decimals: token0Decimals,
        token1Decimals: token1Decimals
    };
};
exports.filterICDexBuy = filterICDexBuy;
const filterICDexSell = (pairInfo, token0Amount) => {
    const price = BigInt(0);
    const token0Info = JSON.parse(pairInfo.token0Info);
    const token1Info = JSON.parse(pairInfo.token1Info);
    const token0Decimals = token0Info.decimals;
    const token1Decimals = token1Info.decimals;
    const setting = JSON.parse(pairInfo.setting);
    const unitSize = setting.UNIT_SIZE;
    let tokenMinUnit = 0;
    const tokenUnitDecimals = unitSize.length - 1; // Unit must 1+0000
    if (token0Decimals > tokenUnitDecimals) {
        // todo
        tokenMinUnit = token0Decimals - tokenUnitDecimals;
    }
    const amount = BigInt(new bignumber_js_1.default(token0Amount)
        .times(10 ** token0Decimals)
        .decimalPlaces(tokenMinUnit, 1)
        .toString(10));
    return {
        orderPrice: {
            quantity: { Sell: amount },
            price: price
        },
        token0Decimals: token0Decimals,
        token1Decimals: token1Decimals,
        tokenMinUnit: tokenMinUnit
    };
};
exports.filterICDexSell = filterICDexSell;
const toBuyICDex = async (strategy, minimumProfit, pairInfo, secondPairInfo, balance, secondBalance, identity, orderId, token1Value, token1Remaining, token0DebitRecord, arbitrage, status, balanceChangesType = null) => {
    if (Number(token1Remaining) > 0 &&
        balanceChangesType &&
        balanceChangesType === 'AddToken1') {
        await db_1.updateBalanceChanges(strategy.id, '', token1Remaining, orderId, '');
    }
    if (Number(token1Remaining) > 0 &&
        balanceChangesType &&
        balanceChangesType === 'AddToken0') {
        await db_1.updateBalanceChanges(strategy.id, token1Remaining, '', orderId, '');
    }
    if (secondPairInfo && secondBalance) {
        // sell token1
        const filterSell = exports.filterICDexSell(secondPairInfo, token1Value);
        const sellResponse = await ICDexTrade_1.onICDexSell(strategy.id, secondPairInfo, filterSell.orderPrice, filterSell.token0Decimals, filterSell.token1Decimals, identity, token1Value, secondBalance);
        if (typeof sellResponse === 'string') {
            if (!balanceChangesType) {
                await db_1.insertOrderIdOrUpdate(strategy.id, orderId, null, '', sellResponse, status);
            }
            return sellResponse;
        }
        const sellRes = sellResponse;
        const txid = sellRes.txid;
        const secondExchangeOrderId = {};
        secondExchangeOrderId[secondPairInfo.pairId] = txid;
        if (balanceChangesType &&
            (balanceChangesType === 'SubtractToken1' ||
                balanceChangesType === 'AddToken1')) {
            const token1 = -token1Value;
            await db_1.updateBalanceChanges(strategy.id, '', token1.toString(10), orderId, txid);
        }
        if (balanceChangesType &&
            (balanceChangesType === 'SubtractToken0' ||
                balanceChangesType === 'AddToken0')) {
            const token1 = -token1Value;
            await db_1.updateBalanceChanges(strategy.id, token1.toString(10), '', orderId, txid);
        }
        // buy token0
        const filterBuy = exports.filterICDexBuy(pairInfo, sellRes.token1Value);
        const buyResponse = await ICDexTrade_1.onICDexBuy(strategy.id, pairInfo, filterBuy.orderPrice, filterBuy.token0Decimals, filterBuy.token1Decimals, identity, sellRes.token1Value, balance);
        if (typeof buyResponse === 'string') {
            if (!balanceChangesType) {
                await db_1.insertOrderIdOrUpdate(strategy.id, orderId, null, '', buyResponse, status);
            }
            return buyResponse;
        }
        const buyRes = buyResponse;
        secondExchangeOrderId[pairInfo.pairId] = buyRes.txid;
        await db_1.insertOrderIdOrUpdate(strategy.id, orderId, secondExchangeOrderId, '', '', status);
        if (arbitrage) {
            const debitRecord = new bignumber_js_1.default(token0DebitRecord)
                .times(1 + minimumProfit)
                .toString();
            if (new bignumber_js_1.default(buyRes.token0Value).lt(debitRecord)) {
                return 'Arbitrage failure';
            }
        }
        return {
            token0Value: buyRes.token0Value,
            token1Value: buyRes.token1DebitRecord,
            txid: buyRes.txid
        };
    }
    else {
        const secondExchangeOrderId = {};
        const filterBuy = exports.filterICDexBuy(pairInfo, token1Value);
        const buyResponse = await ICDexTrade_1.onICDexBuy(strategy.id, pairInfo, filterBuy.orderPrice, filterBuy.token0Decimals, filterBuy.token1Decimals, identity, token1Value, balance);
        if (typeof buyResponse === 'string') {
            if (!balanceChangesType) {
                await db_1.insertOrderIdOrUpdate(strategy.id, orderId, null, '', buyResponse, status);
            }
            return buyResponse;
        }
        const buyRes = buyResponse;
        const txid = buyRes.txid;
        secondExchangeOrderId[pairInfo.pairId] = txid;
        if (balanceChangesType &&
            (balanceChangesType === 'SubtractToken1' ||
                balanceChangesType === 'AddToken1')) {
            const token1 = -token1Value;
            if (Number(token1) < 0) {
                await db_1.updateBalanceChanges(strategy.id, '', token1.toString(10), orderId, txid);
            }
        }
        if (balanceChangesType &&
            (balanceChangesType === 'SubtractToken0' ||
                balanceChangesType === 'AddToken0')) {
            const token1 = -token1Value;
            if (Number(token1) < 0) {
                await db_1.updateBalanceChanges(strategy.id, token1.toString(10), '', orderId, txid);
            }
        }
        await db_1.insertOrderIdOrUpdate(strategy.id, orderId, secondExchangeOrderId, '', '', status);
        if (arbitrage) {
            const debitRecord = new bignumber_js_1.default(token0DebitRecord)
                .times(1 + minimumProfit)
                .toString();
            if (new bignumber_js_1.default(buyRes.token0Value).lt(debitRecord)) {
                return 'Arbitrage failure';
            }
        }
        return {
            token0Value: buyRes.token0Value,
            token1Value: buyRes.token1DebitRecord,
            txid: buyRes.txid
        };
    }
};
exports.toBuyICDex = toBuyICDex;
const toBuyBinance = async (strategy, minimumProfit, pairInfo, filter, secondPairInfo, secondFilter, balance, secondBalance, binanceConfig, txid, token1Value, token1Remaining, token0DebitRecord, arbitrage, status, balanceChangesType = null) => {
    if (Number(token1Remaining) > 0 &&
        balanceChangesType &&
        balanceChangesType === 'AddToken1') {
        await db_1.updateBalanceChanges(strategy.id, '', token1Remaining, txid, '');
    }
    if (Number(token1Remaining) > 0 &&
        balanceChangesType &&
        balanceChangesType === 'AddToken0') {
        await db_1.updateBalanceChanges(strategy.id, token1Remaining, '', txid, '');
    }
    if (secondPairInfo && secondBalance) {
        // sell token1
        const sellResponse = await binanceTrade_1.onBinanceSell(strategy.id, secondPairInfo, binanceConfig, token1Value, secondFilter, secondBalance);
        if (typeof sellResponse === 'string') {
            if (!balanceChangesType) {
                await db_1.insertOrderIdOrUpdate(strategy.id, txid, null, '', sellResponse, status);
            }
            return sellResponse;
        }
        const sellRes = sellResponse;
        const orderId = sellRes.orderId.toString();
        const secondExchangeOrderId = {};
        secondExchangeOrderId[secondPairInfo.symbol] = orderId;
        if (balanceChangesType &&
            (balanceChangesType === 'SubtractToken1' ||
                balanceChangesType === 'AddToken1')) {
            const token1 = -token1Value;
            await db_1.updateBalanceChanges(strategy.id, '', token1.toString(10), txid, orderId);
        }
        if (balanceChangesType &&
            (balanceChangesType === 'SubtractToken0' ||
                balanceChangesType === 'AddToken0')) {
            const token1 = -token1Value;
            await db_1.updateBalanceChanges(strategy.id, token1.toString(10), '', txid, orderId);
        }
        // buy token0
        const buyResponse = await binanceTrade_1.onBinanceBuy(strategy.id, binanceConfig, pairInfo, new bignumber_js_1.default(sellRes.cummulativeQuoteQty).toNumber(), filter, balance);
        if (typeof buyResponse === 'string') {
            if (!balanceChangesType) {
                await db_1.insertOrderIdOrUpdate(strategy.id, txid, null, '', buyResponse, status);
            }
            return buyResponse;
        }
        const buyRes = buyResponse;
        secondExchangeOrderId[pairInfo.symbol] = buyRes.orderId.toString();
        await db_1.insertOrderIdOrUpdate(strategy.id, txid, secondExchangeOrderId, '', '', status);
        if (arbitrage) {
            const debitRecord = new bignumber_js_1.default(token0DebitRecord)
                .times(1 + minimumProfit)
                .toString();
            if (new bignumber_js_1.default(buyRes.executedQty).lt(debitRecord)) {
                return 'Arbitrage failure';
            }
        }
        return {
            executedQty: buyResponse.executedQty,
            cummulativeQuoteQty: sellResponse.cummulativeQuoteQty,
            orderId: buyResponse.orderId
        };
    }
    else {
        const secondExchangeOrderId = {};
        const buyResponse = await binanceTrade_1.onBinanceBuy(strategy.id, binanceConfig, pairInfo, new bignumber_js_1.default(token1Value).toNumber(), filter, balance);
        if (typeof buyResponse === 'string') {
            if (!balanceChangesType) {
                await db_1.insertOrderIdOrUpdate(strategy.id, txid, null, '', buyResponse, status);
            }
            return buyResponse;
        }
        const buyRes = buyResponse;
        const orderId = buyRes.orderId.toString();
        secondExchangeOrderId[pairInfo.symbol] = orderId;
        if (balanceChangesType &&
            (balanceChangesType === 'SubtractToken1' ||
                balanceChangesType === 'AddToken1')) {
            const token1 = -token1Value;
            if (Number(token1) < 0) {
                await db_1.updateBalanceChanges(strategy.id, '', token1.toString(10), txid, orderId);
            }
        }
        if (balanceChangesType &&
            (balanceChangesType === 'SubtractToken0' ||
                balanceChangesType === 'AddToken0')) {
            const token1 = -token1Value;
            if (Number(token1) < 0) {
                await db_1.updateBalanceChanges(strategy.id, token1.toString(10), '', txid, orderId);
            }
        }
        await db_1.insertOrderIdOrUpdate(strategy.id, txid, secondExchangeOrderId, '', '', status);
        if (arbitrage) {
            const debitRecord = new bignumber_js_1.default(token0DebitRecord)
                .times(1 + minimumProfit)
                .toString();
            if (new bignumber_js_1.default(buyRes.executedQty).lt(debitRecord)) {
                return 'Arbitrage failure';
            }
        }
        return {
            executedQty: buyResponse.executedQty,
            cummulativeQuoteQty: buyResponse.cummulativeQuoteQty,
            orderId: buyResponse.orderId
        };
    }
};
exports.toBuyBinance = toBuyBinance;
const tradeCumulativeAmountICDex = async (strategy, minimumProfit, binancePairInfo, secondBinancePairInfo, binanceConfig, binanceBalance, binanceBalanceTwo) => {
    const pendingOrder = await db_1.getPendingOrders(strategy.id);
    const promiseValue = [];
    const promiseValueToken1 = [];
    pendingOrder.forEach((item) => {
        const orderId = item.mainExchangeOrderId;
        promiseValue.push(db_1.getBalanceChangesByMainExchangeOrderId(strategy.id, orderId, true));
        promiseValueToken1.push(db_1.getBalanceChangesByMainExchangeOrderId(strategy.id, orderId, false));
    });
    let token0Pending = '0';
    const token0 = await Promise.all(promiseValue);
    if (token0 && token0.length) {
        token0.forEach((item) => {
            token0Pending = new bignumber_js_1.default(item.add)
                .minus(item.subtract)
                .plus(token0Pending)
                .toString(10);
        });
    }
    let token1Pending = '0';
    const token1 = await Promise.all(promiseValueToken1);
    if (token1 && token1.length) {
        token1.forEach((item) => {
            token1Pending = new bignumber_js_1.default(item.add)
                .minus(item.subtract)
                .plus(token1Pending)
                .toString(10);
        });
    }
    const res = await db_1.getBalanceChanges(strategy.id);
    if (res && res.token0Balance) {
        const token0Balance = new bignumber_js_1.default(res.token0Balance)
            .minus(token0Pending)
            .toString(10);
        await exports.ICDexBuyToBinanceTrade(strategy, minimumProfit, binancePairInfo, secondBinancePairInfo, binanceBalance, binanceBalanceTwo, binanceConfig, '', token0Balance, token0Balance, '0', 0, model_1.OrdersStatus.Completed, 'SubtractToken0');
    }
    if (res && res.token1Balance) {
        const token1Balance = new bignumber_js_1.default(res.token1Balance)
            .minus(token1Pending)
            .toString(10);
        await exports.ICDexSellToBinanceTrade(strategy, minimumProfit, binancePairInfo, secondBinancePairInfo, binanceBalance, binanceBalanceTwo, binanceConfig, '', token1Balance, token1Balance, '0', 0, model_1.OrdersStatus.Completed, 'SubtractToken1');
    }
};
exports.tradeCumulativeAmountICDex = tradeCumulativeAmountICDex;
const tradeCumulativeAmountBinance = async (strategy, minimumProfit, ICDexPairInfo, secondICDexPairInfo, identity, ICDexBalance, ICDexBalanceTwo) => {
    const pendingOrder = await db_1.getPendingOrders(strategy.id);
    const promiseValue = [];
    const promiseValueToken1 = [];
    pendingOrder.forEach((item) => {
        const orderId = item.mainExchangeOrderId;
        promiseValue.push(db_1.getBalanceChangesByMainExchangeOrderId(strategy.id, orderId, true));
        promiseValueToken1.push(db_1.getBalanceChangesByMainExchangeOrderId(strategy.id, orderId, false));
    });
    let token0Pending = '0';
    const token0 = await Promise.all(promiseValue);
    if (token0 && token0.length) {
        token0.forEach((item) => {
            token0Pending = new bignumber_js_1.default(item.add)
                .minus(item.subtract)
                .plus(token0Pending)
                .toString(10);
        });
    }
    let token1Pending = '0';
    const token1 = await Promise.all(promiseValueToken1);
    if (token1 && token1.length) {
        token1.forEach((item) => {
            token1Pending = new bignumber_js_1.default(item.add)
                .minus(item.subtract)
                .plus(token1Pending)
                .toString(10);
        });
    }
    const res = await db_1.getBalanceChanges(strategy.id);
    if (res && res.token0Balance) {
        const token0Balance = new bignumber_js_1.default(res.token0Balance)
            .minus(token0Pending)
            .toString(10);
        await exports.binanceBuyToICDexTrade(strategy, minimumProfit, ICDexPairInfo, secondICDexPairInfo, ICDexBalance, ICDexBalanceTwo, identity, '', token0Balance, token0Balance, '0', 0, model_1.OrdersStatus.Completed, 'SubtractToken0');
    }
    if (res && res.token1Balance) {
        const token1Balance = new bignumber_js_1.default(res.token1Balance)
            .minus(token1Pending)
            .toString(10);
        await exports.binanceSellToICDexTrade(strategy, minimumProfit, ICDexPairInfo, secondICDexPairInfo, ICDexBalance, ICDexBalanceTwo, identity, '', token1Balance, token1Balance, '0', 0, model_1.OrdersStatus.Completed, 'SubtractToken1');
    }
};
exports.tradeCumulativeAmountBinance = tradeCumulativeAmountBinance;
