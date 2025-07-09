"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEventToClients = exports.auth = void 0;
const express_1 = require("express");
const binance_1 = require("../ic/binance");
const db_1 = require("../db");
const model_1 = require("../model");
const trade_1 = require("../trade");
const bcrypt_1 = __importDefault(require("bcrypt"));
const router = express_1.Router();
const basicAuth = require('basic-auth');
const auth = async (req, res, next) => {
    if (req.originalUrl && req.originalUrl === '/getUser') {
        next();
        return;
    }
    const user = basicAuth(req);
    let verify = true;
    const userLocal = await db_1.getUser();
    if (userLocal && user && user.pass) {
        verify = user.pass === userLocal.password;
        if (!verify) {
            verify = await bcrypt_1.default.compareSync(user.pass, userLocal.password);
        }
    }
    if (!userLocal) {
        if (user && user.name && user.pass) {
            await db_1.insertUser(user.name, user.pass);
        }
        else {
            res.set('WWW-Authenticate', 'Basic realm="Secure Area"');
            return res.status(401).send('Access denied: Invalid credentials.');
        }
    }
    else {
        if (user &&
            user.name &&
            user.pass &&
            user.name === userLocal.userName &&
            verify) {
            //
        }
        else {
            res.set('WWW-Authenticate', 'Basic realm="Secure Area"');
            return res.status(401).send('Access denied: Invalid credentials.');
        }
    }
    next();
};
exports.auth = auth;
router.use(exports.auth);
let rateLimit = 0;
const clientsTrade = new Map();
router.get('/getAccountInfo', async (req, res) => {
    const { accountId } = req.query;
    if (rateLimit) {
        return res.status(400).json({
            code: 429,
            msg: rateLimit.toString(10)
        });
    }
    const response = await binance_1.getAccountInfo(accountId);
    if (response &&
        (response.code || response.code === 0)) {
        if (response.code === 429 ||
            response.code === 418) {
            // todo stop robot
            if (response.msg &&
                rateLimit < Number(response.msg)) {
                rateLimit = Number(response.msg);
            }
            if (!response.msg) {
                response.msg = rateLimit.toString(10);
            }
        }
        res.status(400).json(response);
    }
    else {
        res.status(200).json(response);
    }
});
router.get('/getExchangeInfo', async (req, res) => {
    if (rateLimit) {
        return res.status(400).json({
            code: 429,
            msg: rateLimit.toString(10)
        });
    }
    const response = await binance_1.getExchangeInfo(req.query.symbol);
    if (response &&
        (response.code || response.code === 0)) {
        if (response.code === 429 ||
            response.code === 418) {
            if (response.msg &&
                rateLimit < Number(response.msg)) {
                rateLimit = Number(response.msg);
            }
            if (!response.msg) {
                response.msg = rateLimit.toString(10);
            }
        }
        res.status(400).json(response);
    }
    else {
        res.status(200).json(response);
    }
});
router.get('/getAvgPrice', async (req, res) => {
    if (rateLimit) {
        return res.status(400).json({
            code: 429,
            msg: rateLimit.toString(10)
        });
    }
    const response = await binance_1.getAvgPrice(req.query.symbol);
    if (response &&
        (response.code || response.code === 0)) {
        if (response.code === 429 ||
            response.code === 418) {
            if (response.msg &&
                rateLimit < Number(response.msg)) {
                rateLimit = Number(response.msg);
            }
            if (!response.msg) {
                response.msg = rateLimit.toString(10);
            }
        }
        res.status(400).json(response);
    }
    else {
        res.status(200).json(response);
    }
});
router.post('/tradeOfBinanceTest', async (req, res) => {
    if (rateLimit) {
        return res.status(400).json({
            code: 429,
            msg: rateLimit.toString(10)
        });
    }
    const { APIKey, privateKey, symbol, quantity } = req.body;
    if (!APIKey) {
        return res.status(400).json({ error: 'The API Key is required.' });
    }
    if (!privateKey) {
        return res.status(400).json({ error: 'The privateKey is required.' });
    }
    const tradeTestResponse = await binance_1.tradeOfBinanceTest(symbol, quantity, APIKey, privateKey);
    if (tradeTestResponse && tradeTestResponse.code) {
        if (tradeTestResponse.code === 429 ||
            tradeTestResponse.code === 418) {
            rateLimit = Number(tradeTestResponse.msg);
        }
        res.status(200).json(tradeTestResponse);
    }
    else {
        res.status(200).json(tradeTestResponse);
    }
});
router.get('/testConnectivity', async (req, res) => {
    const response = await binance_1.testConnectivity();
    res.status(200).json(response);
});
router.get('/getDepth', async (req, res) => {
    const { symbol } = req.query;
    const response = await binance_1.getDepth(symbol);
    if (response &&
        (response.code || response.code === 0)) {
        res.status(400).json(response);
    }
    else {
        res.status(200).json(response);
    }
});
router.get('/getTickerPrice', async (req, res) => {
    const { symbol } = req.query;
    const response = await binance_1.getTickerPrice(symbol);
    if (response &&
        (response.code || response.code === 0)) {
        res.status(400).json(response);
    }
    else {
        res.status(200).json(response);
    }
});
router.get('/getStrategies', async (req, res) => {
    const { page, pageSize } = req.query;
    const response = await db_1.getStrategies(Number(page), Number(pageSize));
    if (response) {
        res.status(200).json(response);
    }
    else {
        res.status(400).json(response);
    }
});
router.get('/getStrategy', async (req, res) => {
    const { id } = req.query;
    const response = await db_1.getStrategy(Number(id));
    if (response) {
        res.status(200).json(response);
    }
    else {
        res.status(400).json(response);
    }
});
router.get('/getRobotType', async (req, res) => {
    const response = await db_1.getRobotType();
    res.status(200).json(response);
});
router.get('/getExchanges', async (req, res) => {
    const response = await db_1.getExchanges();
    res.status(200).json(response);
});
router.get('/getExchangeAccounts', async (req, res) => {
    const { exchangeId } = req.query;
    const response = await db_1.getExchangeAccounts(exchangeId);
    res.status(200).json(response);
});
router.get('/getAccounts', async (req, res) => {
    const response = await db_1.getAccounts();
    res.status(200).json(response);
});
router.post('/addExchangeAccount', (req, res) => {
    const { exchangeId, name, value } = req.body;
    db_1.addExchangeAccount(exchangeId, name, value)
        .then((response) => {
        res.status(200).json(response);
    })
        .catch((response) => {
        res.status(400).json(response);
    });
});
router.get('/getPairInfo', async (req, res) => {
    const { pairId, exchangeName } = req.query;
    const response = await db_1.getPairInfo(exchangeName, pairId);
    res.status(200).json(response);
});
router.post('/addStrategy', (req, res) => {
    const { config, strategyParams } = req.body;
    db_1.addStrategy(config, strategyParams)
        .then((response) => {
        res.status(200).json(response);
    })
        .catch((response) => {
        res.status(400).json(response);
    });
});
router.post('/runStrategy', (req, res) => {
    const { strategyId } = req.body;
    trade_1.runStrategy(strategyId)
        .then((response) => {
        if (response) {
            res.status(400).json(response);
        }
        else {
            res.status(200).json('Success');
            // updateStrategyStatus(strategyId, StrategyStatus.Running)
            //   .then((updateRes) => {
            //     res.status(200).json(updateRes);
            //   })
            //   .catch((e) => {
            //     res.status(400).json(e);
            //   });
        }
    })
        .catch((response) => {
        res.status(400).json(response);
    });
});
router.post('/stopStrategy', (req, res) => {
    const { strategyId } = req.body;
    db_1.updateStrategyStatus(strategyId, model_1.StrategyStatus.Stopped)
        .then((response) => {
        res.status(200).json(response);
    })
        .catch((e) => {
        res.status(400).json(e);
    });
});
router.post('/cancelAll', (req, res) => {
    trade_1.cancelAll()
        .then(() => {
        res.status(200).json('Success');
    })
        .catch(() => {
        res.status(400).json('Error');
    });
});
router.post('/deleteStrategy', (req, res) => {
    const { strategyId } = req.body;
    db_1.deleteStrategyStatus(strategyId)
        .then((response) => {
        res.status(200).json(response);
    })
        .catch((e) => {
        res.status(400).json(e);
    });
});
router.post('/deleteAccount', (req, res) => {
    const { accountId } = req.body;
    db_1.deleteAccount(accountId)
        .then((response) => {
        res.status(200).json(response);
    })
        .catch((e) => {
        res.status(400).json(e);
    });
});
router.post('/setAccountAvailable', (req, res) => {
    const { accountId } = req.body;
    db_1.updateAccountStatus(accountId, model_1.AccountStatus.Available)
        .then((response) => {
        res.status(200).json(response);
    })
        .catch((e) => {
        res.status(400).json(e);
    });
});
router.post('/updateStrategyConfig', (req, res) => {
    const { config, id } = req.body;
    db_1.updateStrategyConfig(id, config)
        .then((response) => {
        res.status(200).json(response);
    })
        .catch((response) => {
        res.status(400).json(response);
    });
});
router.get('/getOrders', async (req, res) => {
    const { page, pageSize, status, strategyId } = req.query;
    const response = await db_1.queryOrders({
        page: Number(page),
        pageSize: Number(pageSize),
        status: status,
        strategyId: strategyId === 'all' ? undefined : Number(strategyId)
    });
    if (response) {
        res.status(200).json(response);
    }
    else {
        res.status(400).json(response);
    }
});
router.get('/getBinanceOrderInfo', async (req, res) => {
    const { APIKey, privateKey, symbol, orderId } = req.query;
    const response = await binance_1.getOrderInfo(APIKey, privateKey, symbol, Number(orderId));
    if (response) {
        res.status(200).json(response);
    }
    else {
        res.status(400).json(response);
    }
});
router.get('/getUser', async (req, res) => {
    const response = await db_1.getUser();
    if (response) {
        res.status(200).json(response);
    }
    else {
        res.status(400).json(response);
    }
});
router.get('/getBalanceChangesByMainExchangeOrderId', async (req, res) => {
    try {
        const { strategyId, mainExchangeOrderId } = req.query;
        const token0 = await db_1.getBalanceChangesByMainExchangeOrderId(strategyId, mainExchangeOrderId, true);
        const token1 = await db_1.getBalanceChangesByMainExchangeOrderId(strategyId, mainExchangeOrderId, false);
        const filled = {
            token0: Number(token0.subtract),
            token1: Number(token1.subtract)
        };
        res.status(200).json(filled);
    }
    catch (e) {
        res.status(400).json(null);
    }
});
router.get('/getBalanceChanges', async (req, res) => {
    try {
        const { strategyId } = req.query;
        const balance = await db_1.getBalanceChanges(strategyId);
        const filled = {
            token0: balance?.token0Balance.toString(10) || '0',
            token1: balance?.token1Balance.toString(10) || '0'
        };
        res.status(200).json(filled);
    }
    catch (e) {
        res.status(200).json({ token0: '0', token1: '0' });
    }
});
router.get('/events', (req, res) => {
    const { type } = req.query;
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();
    if (type && type === 'Trade') {
        const key = `Trade`;
        clientsTrade.set(key, res);
        req.on('close', () => {
            const currentRes = clientsTrade.get(key);
            if (currentRes === res) {
                clientsTrade.delete(key);
            }
            res.end();
        });
    }
    else {
        const key = 'Events';
        clientsTrade.set(key, res);
        req.on('close', () => {
            const currentRes = clientsTrade.get(key);
            if (currentRes === res) {
                clientsTrade.delete(key);
            }
            res.end();
        });
    }
});
const sendEventToClients = (strategyId, message, type) => {
    if (type && type === 'Trade') {
        const client = clientsTrade.get('Trade');
        if (client) {
            client.write(`data: ${message}\n\n`);
        }
    }
    else {
        const client = clientsTrade.get('Events');
        if (client) {
            client.write(`data: ${message}\n\n`);
        }
    }
};
exports.sendEventToClients = sendEventToClients;
exports.default = router;
