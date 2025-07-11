"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.testConnectivity = exports.cancelOrder = exports.getOrderInfo = exports.openOrders = exports.getDepth = exports.getTickerPrice = exports.getAvgPrice = exports.getExchangeInfo = exports.tradeOfBinanceTest = exports.tradeOfBinance = exports.getAccountInfo = void 0;
const crypto_1 = __importDefault(require("crypto"));
const axiosApi_1 = __importDefault(require("./axiosApi"));
const db_1 = require("../db");
const trade_1 = require("../trade");
const model_1 = require("../model");
// const APIKey = 'Z3eEtEM1lprYr0I3io13fLW9bl8ixC1uXSPDdQ2bixAIcNnwjAbhlSr56rZjL4AT'; //testnet
const getAccountInfo = async (accountId) => {
    try {
        const accountInfo = await db_1.getAccount(accountId);
        if (accountInfo) {
            const mainAccount = trade_1.getAccountValue(accountId, model_1.ExchangeName.Binance, accountInfo.value);
            if (mainAccount) {
                const account = mainAccount;
                const { APIKey, privateKey } = account;
                const time = new Date().getTime();
                const data = `timestamp=${time}&omitZeroBalances=${true}`;
                const sign = crypto_1.default.createSign('RSA-SHA256');
                sign.update(data);
                sign.end();
                const signature = sign.sign(privateKey, 'base64');
                const response = await axiosApi_1.default.get(`/api/v3/account?timestamp=${time}&omitZeroBalances=${true}&signature=${encodeURIComponent(signature)}`, {
                    headers: {
                        'x-mbx-apikey': APIKey
                    }
                });
                return response.data;
            }
        }
        return null;
    }
    catch (error) {
        return filterError(error);
    }
};
exports.getAccountInfo = getAccountInfo;
const tradeOfBinance = async (APIKey, privateKey, symbol, side, type, quantity, timeInForce, price, quoteOrderQty) => {
    try {
        const time = new Date().getTime();
        let data = `symbol=${symbol}&side=${side}&type=${type}`;
        if (quantity) {
            data = data + `&quantity=${quantity}`;
        }
        if (timeInForce) {
            data = data + `&timeInForce=${timeInForce}`;
        }
        if (price) {
            data = data + `&price=${price}`;
        }
        if (quoteOrderQty) {
            data = data + `&quoteOrderQty=${quoteOrderQty}`;
        }
        data = data + `&timestamp=${time}`;
        const sign = crypto_1.default.createSign('RSA-SHA256');
        sign.update(data);
        sign.end();
        const signature = sign.sign(privateKey, 'base64');
        const response = await axiosApi_1.default.post(`/api/v3/order?${data}&signature=${encodeURIComponent(signature)}`, null, {
            headers: {
                'x-mbx-apikey': APIKey
            }
        });
        return response.data;
    }
    catch (error) {
        return filterError(error);
    }
};
exports.tradeOfBinance = tradeOfBinance;
const tradeOfBinanceTest = async (symbol, quantity, APIKey, privateKey) => {
    try {
        const time = new Date().getTime();
        let data = `symbol=${symbol}&side=BUY&type=MARKET&quantity=${quantity}`;
        data = data + `&timestamp=${time}`;
        const sign = crypto_1.default.createSign('RSA-SHA256');
        sign.update(data);
        sign.end();
        let signature;
        try {
            signature = sign.sign(privateKey, 'base64');
        }
        catch (e) {
            return {
                code: -2014,
                msg: 'Invalid Binance Account'
            };
        }
        const response = await axiosApi_1.default.post(`/api/v3/order/test?${data}&signature=${encodeURIComponent(signature)}`, null, {
            headers: {
                'x-mbx-apikey': APIKey
            }
        });
        return response.data;
    }
    catch (error) {
        return filterError(error);
    }
};
exports.tradeOfBinanceTest = tradeOfBinanceTest;
const getExchangeInfo = async (symbol) => {
    try {
        let url = `/api/v3/exchangeInfo?permissions=SPOT`;
        if (symbol) {
            const symbols = symbol.split('-');
            if (symbols.length === 2) {
                url = `/api/v3/exchangeInfo?symbols=${encodeURIComponent(JSON.stringify(symbols))}`;
            }
            else {
                url = `/api/v3/exchangeInfo?symbol=${symbol}`;
            }
        }
        const response = await axiosApi_1.default.get(url);
        return response.data;
    }
    catch (error) {
        return filterError(error);
    }
};
exports.getExchangeInfo = getExchangeInfo;
const getAvgPrice = async (symbol) => {
    try {
        const response = await axiosApi_1.default.get(`/api/v3/avgPrice?symbol=${symbol}`);
        return response.data;
    }
    catch (error) {
        return filterError(error);
    }
};
exports.getAvgPrice = getAvgPrice;
const getTickerPrice = async (symbol) => {
    try {
        const response = await axiosApi_1.default.get(`/api/v3/ticker/price?symbol=${symbol}`);
        return response.data;
    }
    catch (error) {
        return filterError(error);
    }
};
exports.getTickerPrice = getTickerPrice;
const getDepth = async (symbol) => {
    try {
        const response = await axiosApi_1.default.get(`/api/v3/depth?symbol=${symbol}`);
        return response.data;
    }
    catch (error) {
        return filterError(error);
    }
};
exports.getDepth = getDepth;
const openOrders = async (APIKey, privateKey, symbol) => {
    try {
        const time = new Date().getTime();
        const data = `timestamp=${time}&symbol=${symbol}`;
        const sign = crypto_1.default.createSign('RSA-SHA256');
        sign.update(data);
        sign.end();
        const signature = sign.sign(privateKey, 'base64');
        const response = await axiosApi_1.default.get(`/api/v3/openOrders?timestamp=${time}&symbol=${symbol}&signature=${encodeURIComponent(signature)}`, {
            headers: {
                'x-mbx-apikey': APIKey
            }
        });
        return response.data;
    }
    catch (error) {
        return filterError(error);
    }
};
exports.openOrders = openOrders;
const getOrderInfo = async (APIKey, privateKey, symbol, orderId) => {
    try {
        const time = new Date().getTime();
        const data = `timestamp=${time}&symbol=${symbol}&orderId=${orderId}`;
        const sign = crypto_1.default.createSign('RSA-SHA256');
        sign.update(data);
        sign.end();
        const signature = sign.sign(privateKey, 'base64');
        const response = await axiosApi_1.default.get(`/api/v3/order?timestamp=${time}&symbol=${symbol}&orderId=${orderId}&signature=${encodeURIComponent(signature)}`, {
            headers: {
                'x-mbx-apikey': APIKey
            }
        });
        return response.data;
    }
    catch (error) {
        return filterError(error);
    }
};
exports.getOrderInfo = getOrderInfo;
const cancelOrder = async (APIKey, privateKey, symbol, orderId) => {
    try {
        const time = new Date().getTime();
        const data = `timestamp=${time}&symbol=${symbol}&orderId=${orderId}`;
        const sign = crypto_1.default.createSign('RSA-SHA256');
        sign.update(data);
        sign.end();
        const signature = sign.sign(privateKey, 'base64');
        const response = await axiosApi_1.default.delete(`/api/v3/order?timestamp=${time}&symbol=${symbol}&orderId=${orderId}&signature=${encodeURIComponent(signature)}`, {
            headers: {
                'x-mbx-apikey': APIKey
            }
        });
        return response.data;
    }
    catch (error) {
        return filterError(error);
    }
};
exports.cancelOrder = cancelOrder;
const testConnectivity = async () => {
    try {
        await axiosApi_1.default.get(`/api/v3/ping`, {
            timeout: 5 * 1000
        });
        return true;
    }
    catch (error) {
        return false;
    }
};
exports.testConnectivity = testConnectivity;
const filterError = (error) => {
    if (error.response && error.response.data && error.response.data.msg) {
        if (error.response.status === 429 || error.response.status === 418) {
            let msg = error.response.data.msg;
            if (error.response.headers && error.response.headers['retry-after']) {
                msg = error.response.headers['retry-after'];
            }
            // todo stopAll
            return {
                code: error.response.status,
                msg: msg
            };
        }
        return error.response.data;
    }
    else if (error.request) {
        return {
            code: 9999,
            msg: 'request error'
        };
    }
    else {
        return {
            code: 9999,
            msg: error.message
        };
    }
};
