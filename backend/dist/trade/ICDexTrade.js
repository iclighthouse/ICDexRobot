"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateICDexTradeData = exports.filterSide = exports.getICDexSellResponse = exports.getICDexBuyResponse = exports.getMKTToken1 = exports.filterQuantity = exports.filterLevelPrice = exports.getMktToken0 = exports.getMktToken1Buy = exports.getICDexToken1AndToken0 = exports.getICDexMktToken0 = exports.getICDexMktToken1 = exports.getICDexToken0AndToken1 = exports.getICDexToken0Sell = exports.getICDexMktToken0Sell = exports.getICDexToken0BuyMarket = exports.getICDexToken0SellMarket = exports.ICDexCanBuy = exports.ICDexCanSell = exports.onICDexSell = exports.onICDexBuy = void 0;
const sha256_1 = require("@noble/hashes/sha256");
const bignumber_js_1 = __importDefault(require("bignumber.js"));
const ICDexService_1 = require("../ic/ICDex/ICDexService");
const converter_1 = require("../ic/converter");
const db_1 = require("../db");
const routes_1 = require("../routes");
const principal_1 = require("@dfinity/principal");
const onICDexBuy = async (strategyId, pairInfo, orderPrice, token0decimals, token1decimals, identity, token1Amount, balance, type = 'MKT') => {
    if (new bignumber_js_1.default(token1Amount).gt(balance.token1)) {
        const token1Info = JSON.parse(pairInfo.token1Info);
        const message = JSON.stringify({
            message: `${pairInfo.pairId}: ICDex ${token1Info.symbol} insufficient balance`,
            type: 'ICDexInsufficientError'
        });
        // sendEventToClients(strategyId, message);
        return message;
    }
    const service = new ICDexService_1.ICDexService();
    const data = exports.generateICDexTradeData(pairInfo.pairId, identity.getPrincipal());
    let res;
    if (type === 'MKT') {
        res = await service.trade(pairInfo.pairId, identity, orderPrice, {
            MKT: null
        }, [], [], 0, [data]);
    }
    else {
        res = await service.trade(pairInfo.pairId, identity, orderPrice, {
            LMT: null
        }, [], [], 0, [data]);
    }
    if (res.ok) {
        const response = await exports.getICDexBuyResponse(pairInfo, converter_1.toHexString(new Uint8Array(res.ok.txid)), token0decimals, token1decimals);
        await db_1.insertOrUpdateICDexOrderInfo(strategyId, pairInfo.pairId, converter_1.toHexString(new Uint8Array(res.ok.txid)));
        routes_1.sendEventToClients(strategyId, '', 'Trade');
        return response;
    }
    else {
        return JSON.stringify({
            type: 'ICDexTradeError',
            message: `${pairInfo.pairId}: ${res.err.message}`
        });
    }
};
exports.onICDexBuy = onICDexBuy;
const onICDexSell = async (strategyId, pairInfo, orderPrice, token0decimals, token1decimals, identity, token0Amount, balance, type = 'MKT') => {
    if (new bignumber_js_1.default(token0Amount).gt(balance.token0)) {
        const token0Info = JSON.parse(pairInfo.token0Info);
        const message = JSON.stringify({
            message: `${pairInfo.pairId}: ICDex ${token0Info.symbol} insufficient balance`,
            type: 'ICDexInsufficientError'
        });
        // sendEventToClients(strategyId, message);
        return message;
    }
    const service = new ICDexService_1.ICDexService();
    const data = exports.generateICDexTradeData(pairInfo.pairId, identity.getPrincipal());
    let res;
    if (type === 'MKT') {
        res = await service.trade(pairInfo.pairId, identity, orderPrice, {
            MKT: null
        }, [], [], 0, [data]);
    }
    else {
        res = await service.trade(pairInfo.pairId, identity, orderPrice, {
            LMT: null
        }, [], [], 0, [data]);
    }
    if (res.ok) {
        const txid = converter_1.toHexString(new Uint8Array(res.ok.txid));
        const response = await exports.getICDexSellResponse(pairInfo, txid, token0decimals, token1decimals);
        await db_1.insertOrUpdateICDexOrderInfo(strategyId, pairInfo.pairId, converter_1.toHexString(new Uint8Array(res.ok.txid)));
        routes_1.sendEventToClients(strategyId, '', 'Trade');
        return response;
    }
    else {
        return JSON.stringify({
            type: 'ICDexTradeError',
            message: `${pairInfo.pairId}: ${res.err.message}`
        });
    }
};
exports.onICDexSell = onICDexSell;
const ICDexCanSell = (token1, pairInfo, level100, ICDexTradeFee, pairInfoTwo, level100Two) => {
    if (pairInfoTwo && level100Two) {
        return exports.ICDexCanSell(token1, pairInfoTwo, level100Two, ICDexTradeFee);
    }
    else {
        const token0Info = JSON.parse(pairInfo.token0Info);
        const token1Info = JSON.parse(pairInfo.token1Info);
        const token0Decimals = token0Info.decimals;
        const token1Decimals = token1Info.decimals;
        let tokenMinUnit = 0;
        const tokenUnitDecimals = level100[0].toString().length - 1; // Unit must 1+0000
        if (token0Decimals > tokenUnitDecimals) {
            // todo
            tokenMinUnit = token0Decimals - tokenUnitDecimals;
        }
        let flag = false;
        let total = '0';
        if (level100[1].bid && level100[1].bid.length) {
            const bid = level100[1].bid;
            for (let i = 0; i < bid.length; i++) {
                const price = exports.filterLevelPrice(bid[i].price, level100[0], token0Decimals, token1Decimals);
                const currentQuantity = exports.filterQuantity(bid[i].quantity, token0Decimals, tokenMinUnit);
                const currentTotal = new bignumber_js_1.default(price).times(currentQuantity);
                total = new bignumber_js_1.default(total).plus(currentTotal).toString(10);
                if (new bignumber_js_1.default(total).gte(token1)) {
                    flag = true;
                    break;
                }
            }
        }
        return flag;
    }
};
exports.ICDexCanSell = ICDexCanSell;
const ICDexCanBuy = (token1, pairInfo, level100, ICDexTradeFee, pairInfoTwo, level100Two) => {
    if (pairInfoTwo && level100Two) {
        return exports.ICDexCanSell(token1, pairInfo, level100, ICDexTradeFee);
    }
    else {
        const token0Info = JSON.parse(pairInfo.token0Info);
        const token1Info = JSON.parse(pairInfo.token1Info);
        const token0Decimals = token0Info.decimals;
        const token1Decimals = token1Info.decimals;
        let tokenMinUnit = 0;
        const tokenUnitDecimals = level100[0].toString().length - 1; // Unit must 1+0000
        if (token0Decimals > tokenUnitDecimals) {
            // todo
            tokenMinUnit = token0Decimals - tokenUnitDecimals;
        }
        let flag = false;
        let total = '0';
        if (level100[1].ask && level100[1].ask.length) {
            const ask = level100[1].ask;
            for (let i = 0; i < ask.length; i++) {
                const price = exports.filterLevelPrice(ask[i].price, level100[0], token0Decimals, token1Decimals);
                const currentQuantity = exports.filterQuantity(ask[i].quantity, token0Decimals, tokenMinUnit);
                const currentTotal = new bignumber_js_1.default(price).times(currentQuantity);
                total = new bignumber_js_1.default(total).plus(currentTotal).toString(10);
                if (new bignumber_js_1.default(total).gte(token1)) {
                    flag = true;
                    break;
                }
            }
        }
        return flag;
    }
};
exports.ICDexCanBuy = ICDexCanBuy;
const getICDexToken0SellMarket = async (pairInfo, secondPairInfo, token1, ICDexTradeFee, invert) => {
    const service = new ICDexService_1.ICDexService();
    let token0Sell = '0';
    let level1001;
    const level100 = await service.level100(pairInfo.pairId);
    if (secondPairInfo) {
        level1001 = await service.level100(secondPairInfo.pairId);
    }
    if (level100) {
        const canBuy = exports.ICDexCanBuy(token1, pairInfo, level100, ICDexTradeFee, secondPairInfo, level1001);
        if (!canBuy) {
            return '';
        }
        if (invert) {
            token0Sell = exports.getICDexMktToken0(pairInfo, token1, level100, ICDexTradeFee, secondPairInfo, level1001);
        }
        else {
            token0Sell = exports.getICDexMktToken0Sell(pairInfo, token1, level100, ICDexTradeFee, secondPairInfo, level1001);
        }
    }
    return token0Sell;
};
exports.getICDexToken0SellMarket = getICDexToken0SellMarket;
const getICDexToken0BuyMarket = async (pairInfo, secondPairInfo, token1, ICDexTradeFee, invert) => {
    const service = new ICDexService_1.ICDexService();
    let token0 = '0';
    let level1001;
    const level100 = await service.level100(pairInfo.pairId);
    if (secondPairInfo) {
        level1001 = await service.level100(secondPairInfo.pairId);
    }
    if (level100) {
        const canSell = exports.ICDexCanSell(token1, pairInfo, level100, ICDexTradeFee, secondPairInfo, level1001);
        if (!canSell) {
            return '';
        }
        if (invert) {
            token0 = exports.getICDexMktToken1(pairInfo, token1, level100, ICDexTradeFee, secondPairInfo, level1001);
        }
        else {
            token0 = exports.getICDexMktToken0(pairInfo, token1, level100, ICDexTradeFee, secondPairInfo, level1001);
        }
    }
    return token0;
};
exports.getICDexToken0BuyMarket = getICDexToken0BuyMarket;
const getICDexMktToken0Sell = (pairInfo, token1, level100, ICDexTradeFee, pairInfoTwo, level100Two) => {
    if (!level100Two) {
        return exports.getICDexToken0Sell(pairInfo, token1, level100);
    }
    else if (pairInfoTwo && level100Two) {
        // Quote(depthQuote Asset) -> USDT
        const resToken1 = exports.getMKTToken1(pairInfoTwo, token1, level100Two);
        const totalRemaining = new bignumber_js_1.default(1)
            .minus(ICDexTradeFee)
            .times(resToken1)
            .toString(10);
        return exports.getMktToken0(pairInfo, totalRemaining, level100);
    }
    return '0';
};
exports.getICDexMktToken0Sell = getICDexMktToken0Sell;
const getICDexToken0Sell = (pairInfo, token1, level100) => {
    const token0Info = JSON.parse(pairInfo.token0Info);
    const token1Info = JSON.parse(pairInfo.token1Info);
    const token0Decimals = token0Info.decimals;
    const token1Decimals = token1Info.decimals;
    let quantity = '0';
    let total = '0';
    let tokenMinUnit = 0;
    const tokenUnitDecimals = level100[0].toString().length - 1; // Unit must 1+0000
    if (token0Decimals > tokenUnitDecimals) {
        // todo
        tokenMinUnit = token0Decimals - tokenUnitDecimals;
    }
    if (level100[1].bid && level100[1].bid.length) {
        const bid = level100[1].bid;
        for (let i = 0; i < bid.length; i++) {
            const price = exports.filterLevelPrice(bid[i].price, level100[0], token0Decimals, token1Decimals);
            const currentQuantity = exports.filterQuantity(bid[i].quantity, token0Decimals, tokenMinUnit);
            const currentTotal = new bignumber_js_1.default(price).times(currentQuantity);
            if (new bignumber_js_1.default(total).plus(currentTotal).lt(token1)) {
                total = new bignumber_js_1.default(total).plus(currentTotal).toString(10);
                quantity = new bignumber_js_1.default(currentQuantity).plus(quantity).toString(10);
            }
            else {
                const lastQuantity = new bignumber_js_1.default(token1)
                    .minus(total)
                    .div(price)
                    .decimalPlaces(tokenMinUnit, 1);
                quantity = new bignumber_js_1.default(quantity)
                    .plus(lastQuantity.toString(10))
                    .toString(10);
                break;
            }
        }
    }
    return quantity;
};
exports.getICDexToken0Sell = getICDexToken0Sell;
const getICDexToken0AndToken1 = async (pairInfo, secondPairInfo, token, ICDexTradeFee, invert) => {
    const service = new ICDexService_1.ICDexService();
    let token0 = '0';
    let token1 = '0';
    if (!secondPairInfo) {
        const res = await service.level100(pairInfo.pairId);
        if (res) {
            if (invert) {
                token1 = await exports.getMktToken0(pairInfo, token.token0, res);
                token0 = await exports.getMKTToken1(pairInfo, token.token1, res);
            }
            else {
                token0 = await exports.getMktToken0(pairInfo, token.token1, res);
                token1 = await exports.getMKTToken1(pairInfo, token.token0, res);
            }
        }
    }
    else {
        const res = await service.level100(pairInfo.pairId);
        const res1 = await service.level100(secondPairInfo.pairId);
        token1 = exports.getICDexMktToken1(pairInfo, token.token1, res, ICDexTradeFee, secondPairInfo, res1);
        token0 = exports.getICDexMktToken0(pairInfo, token.token1, res, ICDexTradeFee, secondPairInfo, res1);
    }
    if (new bignumber_js_1.default(token0).gt(0)) {
        token0 = new bignumber_js_1.default(1).minus(ICDexTradeFee).times(token0).toString(10);
    }
    if (new bignumber_js_1.default(token1).gt(0)) {
        if (invert) {
            token1 = new bignumber_js_1.default(1).plus(ICDexTradeFee).times(token1).toString(10);
        }
        else {
            token1 = new bignumber_js_1.default(1).minus(ICDexTradeFee).times(token1).toString(10);
        }
    }
    return {
        token0: token0,
        token1: token1
    };
};
exports.getICDexToken0AndToken1 = getICDexToken0AndToken1;
const getICDexMktToken1 = (pairInfo, token0, level100, ICDexTradeFee, pairInfoTwo, level100Two) => {
    if (!level100Two) {
        return exports.getMKTToken1(pairInfo, token0, level100);
    }
    else if (pairInfoTwo && level100Two) {
        // Quote(depthQuote Asset) -> USDT
        const resToken1 = exports.getMKTToken1(pairInfo, token0, level100); // Asset -> USDT
        const totalRemaining = new bignumber_js_1.default(1)
            .minus(ICDexTradeFee)
            .times(resToken1)
            .toString(10);
        return exports.getMktToken0(pairInfoTwo, totalRemaining, level100Two);
    }
    return '0';
};
exports.getICDexMktToken1 = getICDexMktToken1;
const getICDexMktToken0 = (pairInfo, token1, level100, ICDexTradeFee, pairInfoTwo, level100Two) => {
    if (!level100Two) {
        return exports.getMktToken0(pairInfo, token1, level100);
    }
    else if (pairInfoTwo && level100Two) {
        // Quote(depthQuote Asset) -> USDT
        const resToken1 = exports.getMKTToken1(pairInfoTwo, token1, level100Two);
        const totalRemaining = new bignumber_js_1.default(1)
            .minus(ICDexTradeFee)
            .times(resToken1)
            .toString(10);
        return exports.getMktToken0(pairInfo, totalRemaining, level100);
    }
    return '0';
};
exports.getICDexMktToken0 = getICDexMktToken0;
const getICDexToken1AndToken0 = async (pairId, pairInfo, config, ICDexTradeFee) => {
    const service = new ICDexService_1.ICDexService();
    const res = await service.level100(pairId);
    const mktToken1Buy = exports.getMktToken1Buy(pairInfo, config.orderAmount, res);
    const mktToken1Sell = exports.getMKTToken1(pairInfo, config.orderAmount, res);
    const token1Sell = new bignumber_js_1.default(1)
        .minus(ICDexTradeFee)
        .times(mktToken1Sell)
        .toString(10);
    return {
        buyToken0NeedToken1: mktToken1Buy,
        sellToken0GetToken1: token1Sell
    };
};
exports.getICDexToken1AndToken0 = getICDexToken1AndToken0;
const getMktToken1Buy = (pairInfo, token0, level100) => {
    const token0Info = JSON.parse(pairInfo.token0Info);
    const token1Info = JSON.parse(pairInfo.token1Info);
    const token0Decimals = token0Info.decimals;
    const token1Decimals = token1Info.decimals;
    const buyTotalMKT = token0;
    let quantity = '0';
    let total = '0';
    let tokenMinUnit = 0;
    const tokenUnitDecimals = level100[0].toString().length - 1; // Unit must 1+0000
    if (token0Decimals > tokenUnitDecimals) {
        tokenMinUnit = token0Decimals - tokenUnitDecimals;
    }
    if (level100[1].ask && level100[1].ask.length) {
        const ask = level100[1].ask;
        for (let i = 0; i < ask.length; i++) {
            const price = exports.filterLevelPrice(ask[i].price, level100[0], token0Decimals, token1Decimals);
            const currentQuantity = exports.filterQuantity(ask[i].quantity, token0Decimals, tokenMinUnit);
            const currentTotal = new bignumber_js_1.default(price).times(currentQuantity);
            if (new bignumber_js_1.default(quantity).plus(currentQuantity).lt(buyTotalMKT)) {
                total = new bignumber_js_1.default(total).plus(currentTotal).toString(10);
                quantity = new bignumber_js_1.default(currentQuantity).plus(quantity).toString(10);
            }
            else {
                const lastTotal = new bignumber_js_1.default(buyTotalMKT)
                    .minus(quantity)
                    .times(price);
                quantity = buyTotalMKT;
                total = new bignumber_js_1.default(total)
                    .plus(lastTotal.toString(10))
                    .decimalPlaces(token1Decimals, 1)
                    .toString(10);
                break;
            }
        }
    }
    if (new bignumber_js_1.default(quantity).lt(buyTotalMKT)) {
        return '0';
    }
    return total;
};
exports.getMktToken1Buy = getMktToken1Buy;
const getMktToken0 = (pairInfo, token1, level100) => {
    const token0Info = JSON.parse(pairInfo.token0Info);
    const token1Info = JSON.parse(pairInfo.token1Info);
    const token0Decimals = token0Info.decimals;
    const token1Decimals = token1Info.decimals;
    let tokenMinUnit = 0;
    const tokenUnitDecimals = level100[0].toString().length - 1; // Unit must 1+0000
    if (token0Decimals > tokenUnitDecimals) {
        // todo
        tokenMinUnit = token0Decimals - tokenUnitDecimals;
    }
    const buyTotalMKT = token1;
    let quantity = '0';
    let total = '0';
    if (level100[1].ask && level100[1].ask.length) {
        const ask = level100[1].ask;
        for (let i = 0; i < ask.length; i++) {
            const price = exports.filterLevelPrice(ask[i].price, level100[0], token0Decimals, token1Decimals);
            const currentQuantity = exports.filterQuantity(ask[i].quantity, token0Decimals, tokenMinUnit);
            const currentTotal = new bignumber_js_1.default(price).times(currentQuantity);
            if (new bignumber_js_1.default(total).plus(currentTotal).lte(buyTotalMKT)) {
                total = new bignumber_js_1.default(total).plus(currentTotal).toString(10);
                quantity = new bignumber_js_1.default(ask[i].quantity.toString(10))
                    .div(10 ** token0Decimals)
                    .plus(quantity)
                    .toString(10);
            }
            else {
                const lastQuantity = new bignumber_js_1.default(buyTotalMKT).minus(total).div(price);
                quantity = new bignumber_js_1.default(quantity)
                    .plus(lastQuantity.toString(10))
                    .decimalPlaces(tokenMinUnit, 1)
                    .toString(10);
                break;
            }
        }
    }
    return quantity;
};
exports.getMktToken0 = getMktToken0;
const filterLevelPrice = (price, unitSize, token0Decimals, token1Decimals) => {
    return new bignumber_js_1.default(price.toString(10))
        .div(10 ** token1Decimals)
        .div(new bignumber_js_1.default(unitSize.toString(10)).div(10 ** token0Decimals))
        .toNumber();
};
exports.filterLevelPrice = filterLevelPrice;
const filterQuantity = (quantity, token0Decimals, tokenAmountUnit) => {
    return new bignumber_js_1.default(quantity.toString(10))
        .div(10 ** token0Decimals)
        .toFixed(tokenAmountUnit);
};
exports.filterQuantity = filterQuantity;
const getMKTToken1 = (pairInfo, token0, level100) => {
    const token0Info = JSON.parse(pairInfo.token0Info);
    const token1Info = JSON.parse(pairInfo.token1Info);
    const token0Decimals = token0Info.decimals;
    const token1Decimals = token1Info.decimals;
    const sellTotalMKT = token0;
    let quantity = '0';
    let total = '0';
    let tokenMinUnit = 0;
    const tokenUnitDecimals = level100[0].toString().length - 1; // Unit must 1+0000
    if (token0Decimals > tokenUnitDecimals) {
        // todo
        tokenMinUnit = token0Decimals - tokenUnitDecimals;
    }
    if (level100[1].bid && level100[1].bid.length) {
        const bid = level100[1].bid;
        for (let i = 0; i < bid.length; i++) {
            const price = exports.filterLevelPrice(bid[i].price, level100[0], token0Decimals, token1Decimals);
            const currentQuantity = exports.filterQuantity(bid[i].quantity, token0Decimals, tokenMinUnit);
            const currentTotal = new bignumber_js_1.default(price).times(currentQuantity);
            if (new bignumber_js_1.default(quantity).plus(currentQuantity).lt(sellTotalMKT)) {
                total = new bignumber_js_1.default(total).plus(currentTotal).toString(10);
                quantity = new bignumber_js_1.default(currentQuantity).plus(quantity).toString(10);
            }
            else {
                const lastTotal = new bignumber_js_1.default(sellTotalMKT)
                    .minus(quantity)
                    .times(price);
                total = new bignumber_js_1.default(total)
                    .plus(lastTotal.toString(10))
                    .decimalPlaces(token1Decimals, 1)
                    .toString(10);
                break;
            }
        }
    }
    return total;
};
exports.getMKTToken1 = getMKTToken1;
const getICDexBuyResponse = async (pairInfo, txid, token0decimals, token1decimals) => {
    const service = new ICDexService_1.ICDexService();
    let token0Value = '0';
    let token1DebitRecord = '0';
    let token0ValueRemaining = '0';
    let token1ValueRemaining = '0';
    let price = 0;
    const statusByTxid = await service.statusByTxid(pairInfo.pairId, converter_1.hexToBytes(txid));
    const type = Object.keys(statusByTxid)[0];
    let status = 'Completed';
    if (type === 'Completed') {
        const tradeInfo = statusByTxid.Completed;
        if (new bignumber_js_1.default(tradeInfo.fee.token0Fee.toString(10)).lt(0)) {
            tradeInfo.fee.token0Fee = BigInt(0);
        }
        token0Value = new bignumber_js_1.default(tradeInfo.filled.token0Value.CreditRecord.toString(10))
            .minus(tradeInfo.fee.token0Fee.toString(10))
            .div(10 ** token0decimals)
            .toString(10);
        token1DebitRecord = new bignumber_js_1.default(tradeInfo.filled.token1Value.DebitRecord.toString(10))
            .div(10 ** token1decimals)
            .toString(10);
    }
    else if (type === 'Pending') {
        const tradeInfo = statusByTxid.Pending;
        tradeInfo.filled.forEach((item) => {
            token0Value = new bignumber_js_1.default(item.token0Value.CreditRecord.toString(10))
                .plus(token0Value)
                .toString(10);
            token1DebitRecord = new bignumber_js_1.default(item.token1Value.DebitRecord.toString(10))
                .div(10 ** token1decimals)
                .plus(token1DebitRecord)
                .toString(10);
        });
        if (new bignumber_js_1.default(tradeInfo.fee.fee0.toString(10)).lt(0)) {
            tradeInfo.fee.fee0 = BigInt(0);
        }
        token0Value = new bignumber_js_1.default(token0Value)
            .minus(tradeInfo.fee.fee0.toString(10))
            .div(10 ** token0decimals)
            .toString(10);
        token0ValueRemaining = new bignumber_js_1.default(tradeInfo.remaining.quantity.Buy[0].toString(10))
            .div(10 ** token0decimals)
            .toString(10);
        token1ValueRemaining = new bignumber_js_1.default(tradeInfo.remaining.quantity.Buy[1].toString(10))
            .div(10 ** token1decimals)
            .toString(10);
        const setting = JSON.parse(pairInfo.setting);
        const unitSize = setting.UNIT_SIZE;
        price = exports.filterLevelPrice(tradeInfo.remaining.price, BigInt(unitSize), token0decimals, token1decimals);
        if (Object.keys(tradeInfo.status)[0] === 'Pending') {
            status = 'Pending';
        }
    }
    else {
        return JSON.stringify({
            type: 'OrderError',
            message: `${pairInfo.pairId}: ${txid} statusByTxid error`
        });
    }
    return {
        token0Value: token0Value,
        token1DebitRecord: token1DebitRecord,
        token0ValueRemaining: token0ValueRemaining,
        token1ValueRemaining: token1ValueRemaining,
        price: price,
        txid: txid,
        status: status
    };
};
exports.getICDexBuyResponse = getICDexBuyResponse;
const getICDexSellResponse = async (pairInfo, txid, token0decimals, token1decimals) => {
    const service = new ICDexService_1.ICDexService();
    let token1Value = '0';
    let token0DebitRecord = '0';
    let token0ValueRemaining = '0';
    let token1ValueRemaining = '0';
    let price = 0;
    const statusByTxid = await service.statusByTxid(pairInfo.pairId, converter_1.hexToBytes(txid));
    const type = Object.keys(statusByTxid)[0];
    let status = 'Completed';
    if (type === 'Completed') {
        const tradeInfo = statusByTxid.Completed;
        if (new bignumber_js_1.default(tradeInfo.fee.token1Fee.toString(10)).lt(0)) {
            tradeInfo.fee.token1Fee = BigInt(0);
        }
        token1Value = new bignumber_js_1.default(tradeInfo.filled.token1Value.CreditRecord.toString(10))
            .minus(tradeInfo.fee.token1Fee.toString(10))
            .div(10 ** token1decimals)
            .toString(10);
        token0DebitRecord = new bignumber_js_1.default(tradeInfo.filled.token0Value.DebitRecord.toString(10))
            .div(10 ** token0decimals)
            .toString(10);
    }
    else if (type === 'Pending') {
        const tradeInfo = statusByTxid.Pending;
        tradeInfo.filled.forEach((item) => {
            token1Value = new bignumber_js_1.default(item.token1Value.CreditRecord.toString(10))
                .plus(token1Value)
                .toString(10);
            token0DebitRecord = new bignumber_js_1.default(item.token0Value.DebitRecord.toString(10))
                .div(10 ** token0decimals)
                .plus(token0DebitRecord)
                .toString(10);
        });
        if (new bignumber_js_1.default(tradeInfo.fee.fee1.toString(10)).lt(0)) {
            tradeInfo.fee.fee1 = BigInt(0);
        }
        token1Value = new bignumber_js_1.default(token1Value)
            .minus(tradeInfo.fee.fee1.toString(10))
            .div(10 ** token1decimals)
            .toString(10);
        token0ValueRemaining = new bignumber_js_1.default(tradeInfo.remaining.quantity.Sell.toString(10))
            .div(10 ** token0decimals)
            .toString(10);
        const setting = JSON.parse(pairInfo.setting);
        const unitSize = setting.UNIT_SIZE;
        price = exports.filterLevelPrice(tradeInfo.remaining.price, BigInt(unitSize), token0decimals, token1decimals);
        token1ValueRemaining = new bignumber_js_1.default(token0ValueRemaining)
            .times(price)
            .toString(10);
        if (Object.keys(tradeInfo.status)[0] === 'Pending') {
            status = 'Pending';
        }
    }
    else {
        return JSON.stringify({
            type: 'OrderError',
            message: `${pairInfo.pairId}: ${txid} statusByTxid error`
        });
    }
    return {
        token0DebitRecord: token0DebitRecord,
        token1Value: token1Value,
        token0ValueRemaining: token0ValueRemaining,
        token1ValueRemaining: token1ValueRemaining,
        price: price,
        txid: txid,
        status: status
    };
};
exports.getICDexSellResponse = getICDexSellResponse;
const filterSide = (orderPrice) => {
    const quantity = orderPrice.quantity;
    if (quantity.Buy) {
        return 'Buy';
    }
    else {
        return 'Sell';
    }
};
exports.filterSide = filterSide;
const generateICDexTradeData = (pairId, caller, subAccount) => {
    const padding = converter_1.asciiStringToByteArray('Robot');
    const shaObj = sha256_1.sha224.create();
    shaObj.update(new Uint8Array([
        ...padding,
        ...principal_1.Principal.fromText(pairId).toUint8Array(),
        ...new Uint8Array(converter_1.principalToAccount(caller, subAccount))
    ]));
    return Array.from(new Uint8Array(shaObj.digest()));
};
exports.generateICDexTradeData = generateICDexTradeData;
