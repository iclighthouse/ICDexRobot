"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.withRetry = exports.getUser = exports.updateLoginTime = exports.insertUser = exports.archiveOrder = exports.updateOrderIdMaker = exports.getBalanceChangesByOrderId = exports.getBalanceChangesByMainExchangeOrderId = exports.getBalanceChanges = exports.updateBalanceChanges = exports.insertOrderIdOrUpdate = exports.setPairInfo = exports.insertOrUpdateICDexOrderInfo = exports.insertOrUpdateBinanceOrderInfo = exports.getPairInfo = exports.updateStrategyConfig = exports.addStrategy = exports.addExchangeAccount = exports.getAccount = exports.getAccounts = exports.getExchangeAccounts = exports.getRobotType = exports.getStrategiesError = exports.getStrategiesDB = exports.getStrategies = exports.updateStrategyStatus = exports.getAllPendingOrders = exports.deleteStrategyStatus = exports.deleteAccount = exports.updateAccountStatus = exports.getStrategy = exports.getExchanges = exports.getInfo = exports.getOrderInfo = exports.queryOrders = exports.getPendingOrders = exports.closeAllConnections = exports.closeConnection = exports.initDb = exports.createConnection = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const bignumber_js_1 = __importDefault(require("bignumber.js"));
const model_1 = require("./model");
const ICDexService_1 = require("./ic/ICDex/ICDexService");
const converter_1 = require("./ic/converter");
const trade_1 = require("./trade");
const bcrypt_1 = __importDefault(require("bcrypt"));
// const execDir = path.dirname(process.execPath);
const dbPath = path_1.default.resolve('../database.db');
const openConnections = new Set();
const createConnection = async () => {
    const db = await new better_sqlite3_1.default(dbPath);
    await db.pragma('journal_mode = WAL');
    await db.pragma('busy_timeout = 5000');
    await db.pragma('synchronous = NORMAL');
    await openConnections.add(db);
    return db;
};
exports.createConnection = createConnection;
const initDb = async () => {
    try {
        await fs_1.default.accessSync(dbPath, fs_1.default.constants.F_OK);
    }
    catch (e) {
        await fs_1.default.writeFileSync(dbPath, '');
    }
    try {
        const db = await exports.createConnection();
        // db.run('DROP TABLE IF EXISTS orders');
        // name: Timer Robot,Maker robot
        const stmtRobotType = db.prepare(`CREATE TABLE IF NOT EXISTS robotType (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        time INTEGER NOT NULL
      )`);
        await exports.withRetry(() => stmtRobotType.run());
        const stmtRobotTimer = db.prepare(`INSERT INTO robotType (name, time) SELECT 'Timer Robot', ? WHERE NOT EXISTS (SELECT 1 FROM robotType WHERE name = 'Timer Robot')`);
        await exports.withRetry(() => stmtRobotTimer.run(new Date().getTime()));
        const stmtRobotMaker = db.prepare(`INSERT INTO robotType (name, time) SELECT 'Maker Robot', ? WHERE NOT EXISTS (SELECT 1 FROM robotType WHERE name = 'Maker Robot')`);
        await exports.withRetry(() => stmtRobotMaker.run(new Date().getTime()));
        // type: DEX,CEX
        const exchanges = db.prepare(`CREATE TABLE IF NOT EXISTS exchanges (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        time INTEGER NOT NULL
      )`);
        await exports.withRetry(() => exchanges.run());
        const exchangesICDex = db.prepare(`INSERT INTO exchanges (name, type, time) SELECT 'ICDex', 'DEX', ? WHERE NOT EXISTS (SELECT 1 FROM exchanges WHERE name = 'ICDex' AND type = 'DEX')`);
        await exports.withRetry(() => exchangesICDex.run(new Date().getTime()));
        const exchangesBinance = db.prepare(`INSERT INTO exchanges (name, type, time) SELECT 'Binance', 'CEX', ? WHERE NOT EXISTS (SELECT 1 FROM exchanges WHERE name = 'Binance' AND type = 'CEX')`);
        await exports.withRetry(() => exchangesBinance.run(new Date().getTime()));
        // value: ICDex: pem; Binance: APIKey and RSA Private Key
        const accounts = db.prepare(`CREATE TABLE IF NOT EXISTS accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        exchangeId INTEGER NOT NULL,
        value TEXT NOT NULL,
        status TEXT NOT NULL,
        fee TEXT,
        minimumFee TEXT,
        time INTEGER,
        updateTime INTEGER
      )`);
        await exports.withRetry(() => accounts.run());
        // type: Timer Robot,Maker Robot
        // exchangePair: pair0, pair1
        const strategy = db.prepare(`CREATE TABLE IF NOT EXISTS strategy (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        typeId INTEGER NOT NULL,
        mainExchangeId INTEGER NOT NULL,
        mainExchangePair TEXT NOT NULL,
        mainExchangeAccountId INTEGER NOT NULL,
        mainExchangeFee TEXT NOT NULL,
        secondExchangeId INTEGER NOT NULL,
        secondExchangePair TEXT NOT NULL,
        secondExchangeAccountId INTEGER NOT NULL,
        secondExchangeFee TEXT NOT NULL,
        arguments TEXT NOT NULL,
        invert INTEGER NOT NULL,
        status TEXT NOT NULL,
        time INTEGER NOT NULL,
        updateTime INTEGER NOT NULL
      )`);
        await exports.withRetry(() => strategy.run());
        const ICDexPairInfo = db.prepare(`CREATE TABLE IF NOT EXISTS ICDexPairInfo (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pairId TEXT NOT NULL,
        token0 TEXT NOT NULL,
        token1 TEXT NOT NULL,
        token0Info TEXT NOT NULL,
        token1Info TEXT NOT NULL,
        setting TEXT NOT NULL,
        paused INTEGER NOT NULL,
        time INTEGER NOT NULL,
        updateTime INTEGER NOT NULL
      )`);
        await exports.withRetry(() => ICDexPairInfo.run());
        // filters: pair setting
        const binancePairInfo = db.prepare(`CREATE TABLE IF NOT EXISTS binancePairInfo (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        symbol TEXT NOT NULL,
        baseAsset TEXT NOT NULL,
        baseAssetPrecision INTEGER NOT NULL,
        quoteAsset TEXT NOT NULL,
        quoteAssetPrecision INTEGER NOT NULL,
        filters TEXT NOT NULL,
        status TEXT NOT NULL,
        time INTEGER NOT NULL,
        updateTime INTEGER NOT NULL
      )`);
        await exports.withRetry(() => binancePairInfo.run());
        // exchangeOrderId: [{pair0: `orderId0,` pair1: `orderId0`},{pair0: `orderId1`, pair1: `orderId1`}]
        const orders = db.prepare(`CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        strategyId INTEGER NOT NULL,
        status TEXT NOT NULL,
        mainExchangeOrderId TEXT,
        secondExchangeOrderId TEXT,
        mainExchangeErrorMessage TEXT,
        secondExchangeErrorMessage TEXT,
        time INTEGER NOT NULL,
        updateTime INTEGER NOT NULL
      )`);
        await exports.withRetry(() => orders.run());
        const idx_orders_time = db.prepare(`CREATE INDEX IF NOT EXISTS idx_orders_time 
        ON orders(time)`);
        await exports.withRetry(() => idx_orders_time.run());
        const archives = db.prepare(`CREATE TABLE IF NOT EXISTS archives (
        id INTEGER PRIMARY KEY,
        strategyId INTEGER NOT NULL,
        status TEXT NOT NULL,
        mainExchangeOrderId TEXT,
        secondExchangeOrderId TEXT,
        mainExchangeErrorMessage TEXT,
        secondExchangeErrorMessage TEXT,
        time INTEGER NOT NULL,
        updateTime INTEGER NOT NULL
      )`);
        await exports.withRetry(() => archives.run());
        const idx_archives_time = db.prepare(`CREATE INDEX IF NOT EXISTS idx_archives_time 
        ON archives(time)`);
        await exports.withRetry(() => idx_archives_time.run());
        const ICDexOrderInfo = db.prepare(`CREATE TABLE IF NOT EXISTS ICDexOrderInfo (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        strategyId INTEGER NOT NULL,
        pairId TEXT NOT NULL,
        orderId TEXT NOT NULL,
        status TEXT,
        tradingStatus TEXT,
        orderType TEXT,
        account TEXT,
        orderPrice TEXT,
        origOrder TEXT,
        filled TEXT,
        details TEXT,
        remaining TEXT,
        fee TEXT,
        time INTEGER,
        updateTime INTEGER
      )`);
        await exports.withRetry(() => ICDexOrderInfo.run());
        const binanceOrderInfo = db.prepare(`CREATE TABLE IF NOT EXISTS binanceOrderInfo (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        strategyId INTEGER NOT NULL,
        symbol TEXT NOT NULL,
        orderId TEXT NOT NULL,
        status TEXT,
        side TEXT,
        orderType TEXT,
        price TEXT,
        origQty TEXT,
        executedQty TEXT,
        origQuoteOrderQty TEXT,
        cummulativeQuoteQty TEXT,
        fills TEXT,
        time INTEGER,
        updateTime INTEGER
      )`);
        await exports.withRetry(() => binanceOrderInfo.run());
        const balanceChanges = db.prepare(`CREATE TABLE IF NOT EXISTS balanceChanges (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        strategyId INTEGER NOT NULL,
        mainExchangeOrderId TEXT,
        secondExchangeOrderId TEXT,
        token0Balance INTEGER NOT NULL,
        token0Change INTEGER NOT NULL,
        token1Balance INTEGER NOT NULL,
        token1Change INTEGER NOT NULL,
        updateTime INTEGER NOT NULL
      )`);
        await exports.withRetry(() => balanceChanges.run());
        const user = db.prepare(`CREATE TABLE IF NOT EXISTS user (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userName TEXT NOT NULL,
        password TEXT NOT NULL,
        salt TEXT NOT NULL,
        saltRounds INTEGER NOT NULL,
        updateTime INTEGER NOT NULL,
        lastLoginTime INTEGER NOT NULL
      )`);
        await exports.withRetry(() => user.run());
        await exports.closeConnection(db);
    }
    catch (err) {
        console.error('Error initializing database:', err);
    }
};
exports.initDb = initDb;
const closeConnection = async (db) => {
    try {
        if (openConnections.has(db)) {
            await db.close();
            openConnections.delete(db);
        }
    }
    catch (e) { }
};
exports.closeConnection = closeConnection;
const closeAllConnections = async () => {
    const closePromises = Array.from(openConnections).map((db) => exports.closeConnection(db));
    await Promise.all(closePromises);
};
exports.closeAllConnections = closeAllConnections;
const getPendingOrders = async (strategyId) => {
    const db = await exports.createConnection();
    try {
        const stmt = db.prepare('SELECT * FROM orders WHERE strategyId = ? AND status = ?');
        return await exports.withRetry(() => stmt.all(strategyId, model_1.OrdersStatus.Pending));
    }
    catch (err) {
        if (err) {
            console.error(err);
        }
    }
    finally {
        await exports.closeConnection(db);
    }
    return [];
};
exports.getPendingOrders = getPendingOrders;
let totalIds = 0;
let totalIdsError = 0;
const totalStrategyIdError = {};
const queryOrders = async (pagination) => {
    const exchanges = await exports.getExchanges();
    const exchange = {};
    exchanges.forEach((item) => {
        exchange[item.id] = item.name;
    });
    const { page, pageSize, status, strategyId } = pagination;
    const offset = (Number(page) - 1) * Number(pageSize);
    let paramsTotal = {};
    if (strategyId) {
        paramsTotal = {
            status: 'Failed',
            strategyId: strategyId
        };
    }
    else {
        paramsTotal = {
            status: 'Failed'
        };
    }
    let sqlTotal = 'SELECT COUNT(*) as total FROM orders WHERE status = @status';
    let sqlTotalArchives = 'SELECT COUNT(*) as total FROM archives WHERE status = @status';
    if (status !== model_1.OrderStatus.Failed) {
        sqlTotal = 'SELECT COUNT(*) as total FROM orders WHERE status != @status';
        sqlTotalArchives =
            'SELECT COUNT(*) as total FROM archives WHERE status != @status';
    }
    if (strategyId) {
        sqlTotal += ` AND strategyId = @strategyId`;
        sqlTotalArchives += ` AND strategyId = @strategyId`;
    }
    const getDb = await exports.createConnection();
    const allDb = await exports.createConnection();
    try {
        if (page === 1) {
            const getTotalDb = getDb.prepare(sqlTotal);
            const countRow = await exports.withRetry(() => getTotalDb.get(paramsTotal));
            const getTotalArchives = getDb.prepare(sqlTotalArchives);
            const countArchives = await exports.withRetry(() => getTotalArchives.get(paramsTotal));
            if (strategyId) {
                totalStrategyIdError[strategyId] = countRow.total + countArchives.total;
            }
            else {
                if (status === 'Failed') {
                    totalIdsError = countRow.total + countArchives.total;
                }
                else {
                    totalIds = countRow.total + countArchives.total;
                }
            }
        }
        let params = {};
        if (strategyId) {
            params = {
                status: 'Failed',
                limit: pageSize,
                offset: offset,
                strategyId: strategyId
            };
        }
        else {
            params = {
                status: 'Failed',
                limit: pageSize,
                offset: offset
            };
        }
        let allSql = `SELECT * FROM (SELECT id, strategyId, status, mainExchangeOrderId, secondExchangeOrderId,  mainExchangeErrorMessage, secondExchangeErrorMessage, time, updateTime, 'orders' AS source FROM orders UNION ALL SELECT id, strategyId, status, mainExchangeOrderId, secondExchangeOrderId,  mainExchangeErrorMessage, secondExchangeErrorMessage, time, updateTime, 'archives' AS source FROM archives) AS combined WHERE status = @status`;
        if (status !== model_1.OrderStatus.Failed) {
            allSql = `SELECT * FROM (SELECT id, strategyId, status, mainExchangeOrderId, secondExchangeOrderId,  mainExchangeErrorMessage, secondExchangeErrorMessage, time, updateTime, 'orders' AS source FROM orders UNION ALL SELECT id, strategyId, status, mainExchangeOrderId, secondExchangeOrderId,  mainExchangeErrorMessage, secondExchangeErrorMessage, time, updateTime, 'archives' AS source FROM archives) AS combined WHERE status != @status`;
        }
        if (strategyId) {
            allSql += ' AND strategyId = @strategyId';
        }
        allSql += ' ORDER BY updateTime DESC LIMIT @limit OFFSET @offset';
        const ordersDb = allDb.prepare(allSql);
        const rows = await exports.withRetry(() => ordersDb.all(params));
        const promiseValue = [];
        rows.forEach((order) => {
            if (order) {
                promiseValue.push(exports.getOrderInfo(exchange, order));
            }
        });
        const results = await Promise.all(promiseValue);
        let total = totalIds;
        if (strategyId) {
            total = totalStrategyIdError[strategyId];
        }
        else {
            if (status === 'Failed') {
                total = totalIdsError;
            }
        }
        if (results) {
            return {
                total: total,
                orders: results,
                page: Number(page),
                pageSize: Number(pageSize),
                totalPages: Math.ceil(total / pageSize)
            };
        }
    }
    catch (err) {
        if (err) {
            console.error(err);
        }
    }
    finally {
        await exports.closeConnection(getDb);
        await exports.closeConnection(allDb);
    }
    return null;
};
exports.queryOrders = queryOrders;
const getOrderInfo = async (exchange, order) => {
    try {
        const strategy = await exports.getStrategy(order.strategyId);
        if (strategy) {
            const promiseValue = [];
            const mainExchangeOrderId = order.mainExchangeOrderId;
            const secondExchangeOrderId = JSON.parse(order.secondExchangeOrderId);
            promiseValue.push(exports.getInfo(strategy.id, exchange[strategy.mainExchangeId], strategy.mainExchangePair, mainExchangeOrderId));
            secondExchangeOrderId.forEach((item) => {
                const pairs = Object.keys(item);
                if (pairs && pairs.length) {
                    pairs.forEach((pairId) => {
                        if (pairId) {
                            promiseValue.push(exports.getInfo(strategy.id, exchange[strategy.secondExchangeId], pairId, item[pairId]));
                        }
                    });
                }
            });
            const res = await Promise.all(promiseValue);
            if (res) {
                const orderInfo = {
                    mainExchangeOrderInfo: null,
                    secondExchangeOrderInfo: []
                };
                res.forEach((info) => {
                    if (info) {
                        if (mainExchangeOrderId === info.orderId) {
                            orderInfo.mainExchangeOrderInfo = info;
                        }
                        else {
                            orderInfo.secondExchangeOrderInfo.push(info);
                        }
                    }
                });
                if (orderInfo) {
                    return { ...order, ...orderInfo, ...{ strategy: strategy } };
                }
            }
        }
    }
    catch (err) {
        if (err) {
            console.error(err);
        }
    }
    return null;
};
exports.getOrderInfo = getOrderInfo;
const getInfo = async (strategyId, exchangeName, pair, orderId, init = true) => {
    const db = await exports.createConnection();
    try {
        if (exchangeName === model_1.ExchangeName.ICDex) {
            const stmt = db.prepare('SELECT * FROM ICDexOrderInfo WHERE pairId = ? AND orderId = ?');
            const info = await exports.withRetry(() => stmt.get(pair, orderId));
            if (init && !info) {
                await exports.insertOrUpdateICDexOrderInfo(strategyId, pair, orderId);
            }
            return await exports.withRetry(() => stmt.get(pair, orderId));
        }
        else if (exchangeName === model_1.ExchangeName.Binance) {
            const stmt = db.prepare('SELECT * FROM binanceOrderInfo WHERE symbol = ? AND orderId = ?');
            return await exports.withRetry(() => stmt.get(pair, orderId));
        }
    }
    catch (err) {
        if (err) {
            console.error(err);
        }
    }
    finally {
        await exports.closeConnection(db);
    }
    return null;
};
exports.getInfo = getInfo;
const getExchanges = async () => {
    const db = await exports.createConnection();
    const stmt = db.prepare('SELECT * FROM exchanges');
    try {
        return await exports.withRetry(() => stmt.all());
    }
    catch (err) {
        if (err) {
            console.error(err);
        }
        return [];
    }
    finally {
        await exports.closeConnection(db);
    }
};
exports.getExchanges = getExchanges;
const getStrategy = async (id) => {
    const db = await exports.createConnection();
    const stmt = db.prepare('SELECT * FROM strategy WHERE id = ?');
    try {
        return await exports.withRetry(() => stmt.get(id));
    }
    catch (err) {
        if (err) {
            console.error(err);
        }
        return null;
    }
    finally {
        await exports.closeConnection(db);
    }
};
exports.getStrategy = getStrategy;
const updateAccountStatus = async (id, status) => {
    const db = await exports.createConnection();
    try {
        const time = new Date().getTime();
        const stmt = db.prepare(`UPDATE accounts SET status = ? , updateTime = ? WHERE id = ?`);
        return await exports.withRetry(() => stmt.run(status, time, id));
    }
    catch (err) {
        if (err) {
            console.error(err);
        }
        return null;
    }
    finally {
        await exports.closeConnection(db);
    }
};
exports.updateAccountStatus = updateAccountStatus;
const deleteAccount = async (id) => {
    const db = await exports.createConnection();
    try {
        const account = await exports.getAccount(id);
        const checkStrategyStmt = db.prepare(`
      SELECT 1 FROM strategy
        WHERE mainExchangeAccountId = ? OR secondExchangeAccountId = ?
      LIMIT 1
    `);
        const inStrategy = await exports.withRetry(() => checkStrategyStmt.get(id, id));
        if (account && !inStrategy) {
            const stmt = db.prepare('DELETE FROM accounts WHERE id = ?');
            return await exports.withRetry(() => stmt.run(id));
        }
        else {
            return null;
        }
    }
    catch (err) {
        if (err) {
            console.error(err);
        }
        return null;
    }
    finally {
        await exports.closeConnection(db);
    }
};
exports.deleteAccount = deleteAccount;
const deleteStrategyStatus = async (id) => {
    const strategy = await exports.getStrategy(id);
    if (strategy &&
        strategy.status &&
        strategy.status === model_1.StrategyStatus.Running) {
        throw new Error('The strategy is running.');
    }
    const db = await exports.createConnection();
    try {
        const strategy = db.prepare('DELETE FROM strategy WHERE id = ?');
        await exports.withRetry(() => strategy.run(id));
        const stmt = db.prepare('DELETE FROM orders WHERE strategyId = ?');
        await exports.withRetry(() => stmt.run(id));
        const stmtArchive = db.prepare('DELETE FROM archives WHERE strategyId = ?');
        return await exports.withRetry(() => stmtArchive.run(id));
    }
    catch (err) {
        if (err) {
            console.error(err);
        }
        return null;
    }
    finally {
        await exports.closeConnection(db);
    }
};
exports.deleteStrategyStatus = deleteStrategyStatus;
const getAllPendingOrders = async () => {
    const db = await exports.createConnection();
    try {
        const stmt = db.prepare('SELECT * FROM orders WHERE status = ?');
        return await exports.withRetry(() => stmt.all(model_1.OrdersStatus.Pending));
    }
    catch (err) {
        if (err) {
            console.error(err);
        }
    }
    finally {
        await exports.closeConnection(db);
    }
    return [];
};
exports.getAllPendingOrders = getAllPendingOrders;
const updateStrategyStatus = async (id, status, updateTime) => {
    const db = await exports.createConnection();
    let time = new Date().getTime();
    if (updateTime) {
        time = updateTime;
    }
    const stmt = db.prepare(`UPDATE strategy SET status = ? , updateTime = ? WHERE id = ?`);
    if (status === model_1.StrategyStatus.Running) {
        try {
            return await exports.withRetry(() => stmt.run(status, time, id));
        }
        catch (err) {
            if (err) {
                console.error(err);
            }
            return null;
        }
        finally {
            await exports.closeConnection(db);
        }
    }
    else if (status === model_1.StrategyStatus.Stopped) {
        try {
            await exports.withRetry(() => stmt.run(status, time, id));
            const strategy = await exports.getStrategy(id);
            const exchanges = await exports.getExchanges();
            const exchange = {};
            exchanges.forEach((item) => {
                exchange[item.id] = item.name;
            });
            if (strategy && exchange) {
                const mainExchangeAccount = await exports.getAccount(strategy.mainExchangeAccountId);
                if (mainExchangeAccount) {
                    const mainAccount = trade_1.getAccountValue(exchange[strategy.mainExchangeId], mainExchangeAccount.value);
                    if (mainAccount) {
                        await trade_1.cancelPending(id, exchange[strategy.mainExchangeId], strategy.mainExchangePair, mainAccount);
                    }
                }
            }
        }
        catch (err) {
            if (err) {
                console.error(err);
            }
        }
        finally {
            await exports.closeConnection(db);
        }
    }
    return null;
};
exports.updateStrategyStatus = updateStrategyStatus;
let totalStrategies = 0;
const getStrategies = async (page, pageSize) => {
    const db = await exports.createConnection();
    const stmt = db.prepare('SELECT COUNT(*) as total FROM strategy');
    try {
        if (page === 1) {
            const countRow = await exports.withRetry(() => stmt.get());
            totalStrategies = countRow.total;
        }
        const res = await exports.getStrategiesDB(page, pageSize);
        return {
            total: totalStrategies,
            data: res,
            page: Number(page),
            pageSize: Number(pageSize),
            totalPages: Math.ceil(totalStrategies / pageSize)
        };
    }
    catch (err) {
        if (err) {
            console.error(err);
        }
        return null;
    }
    finally {
        await exports.closeConnection(db);
    }
};
exports.getStrategies = getStrategies;
const getStrategiesDB = async (page, pageSize) => {
    const db = await exports.createConnection();
    const stmt = db.prepare(`SELECT 
      s.*,
      COUNT(CASE 
          WHEN (merged.mainExchangeErrorMessage IS NOT NULL AND TRIM(merged.mainExchangeErrorMessage) <> '')
            OR (merged.secondExchangeErrorMessage IS NOT NULL AND TRIM(merged.secondExchangeErrorMessage) <> '')
          THEN 1 
      END) AS errors,
      COUNT(CASE 
          WHEN (
              (merged.mainExchangeErrorMessage IS NOT NULL AND TRIM(merged.mainExchangeErrorMessage) <> '')
              OR (merged.secondExchangeErrorMessage IS NOT NULL AND TRIM(merged.secondExchangeErrorMessage) <> '')
          )
          AND s.updateTime < merged.updateTime 
          THEN 1 
      END) AS newErrors
  FROM strategy s
  LEFT JOIN (
      SELECT * FROM orders
      UNION ALL
      SELECT * FROM archives
  ) AS merged ON merged.strategyId = s.id
  GROUP BY s.id
  ORDER BY s.time DESC
  LIMIT ? OFFSET ?`);
    try {
        const offset = (Number(page) - 1) * Number(pageSize);
        return await exports.withRetry(() => stmt.all(pageSize, offset));
    }
    catch (err) {
        if (err) {
            console.error(err);
        }
        return [];
    }
    finally {
        await exports.closeConnection(db);
    }
};
exports.getStrategiesDB = getStrategiesDB;
const getStrategiesError = async (strategyId, time) => {
    const db = await exports.createConnection();
    const stmt = db.prepare(`SELECT * FROM (
      SELECT * FROM orders
      WHERE strategyId = ?
        AND updateTime >= ?
        AND (
          (mainExchangeErrorMessage IS NOT NULL AND mainExchangeErrorMessage != '')
          OR (secondExchangeErrorMessage IS NOT NULL AND secondExchangeErrorMessage != '')
        )
      UNION
      SELECT * FROM archives
      WHERE strategyId = ?
        AND updateTime >= ?
        AND (
          (mainExchangeErrorMessage IS NOT NULL AND mainExchangeErrorMessage != '')
          OR (secondExchangeErrorMessage IS NOT NULL AND secondExchangeErrorMessage != '')
        )
    ) AS combined_results;`);
    try {
        return await exports.withRetry(() => stmt.all(strategyId, time, strategyId, time));
    }
    catch (err) {
        if (err) {
            console.error(err);
        }
        return [];
    }
    finally {
        await exports.closeConnection(db);
    }
};
exports.getStrategiesError = getStrategiesError;
const getRobotType = async () => {
    const db = await exports.createConnection();
    const stmt = db.prepare('SELECT * FROM robotType');
    try {
        return await exports.withRetry(() => stmt.all());
    }
    catch (err) {
        if (err) {
            console.error(err);
        }
        return [];
    }
    finally {
        await exports.closeConnection(db);
    }
};
exports.getRobotType = getRobotType;
const getExchangeAccounts = async (exchangeId) => {
    const db = await exports.createConnection();
    const stmt = db.prepare(`SELECT * FROM accounts WHERE exchangeId = ?`);
    try {
        const accounts = await exports.withRetry(() => stmt.all(exchangeId));
        const checkStrategyStmt = db.prepare(`
      SELECT 1 FROM strategy
        WHERE mainExchangeAccountId = ? OR secondExchangeAccountId = ?
      LIMIT 1
    `);
        return accounts.map((account) => {
            const inStrategy = checkStrategyStmt.get(account.id, account.id);
            return {
                ...account,
                hasStrategy: !!inStrategy
            };
        });
    }
    catch (err) {
        if (err) {
            console.error(err);
        }
        return [];
    }
    finally {
        await exports.closeConnection(db);
    }
};
exports.getExchangeAccounts = getExchangeAccounts;
const getAccounts = async () => {
    const db = await exports.createConnection();
    const stmt = db.prepare(`SELECT * FROM accounts`);
    try {
        const accounts = await exports.withRetry(() => stmt.all());
        const checkStrategyStmt = db.prepare(`
      SELECT 1 FROM strategy
        WHERE mainExchangeAccountId = ? OR secondExchangeAccountId = ?
      LIMIT 1
    `);
        return accounts.map((account) => {
            const inStrategy = checkStrategyStmt.get(account.id, account.id);
            return {
                ...account,
                hasStrategy: !!inStrategy
            };
        });
    }
    catch (err) {
        if (err) {
            console.error(err);
        }
        return [];
    }
    finally {
        await exports.closeConnection(db);
    }
};
exports.getAccounts = getAccounts;
const getAccount = async (accountId) => {
    const db = await exports.createConnection();
    const stmt = db.prepare(`SELECT * FROM accounts WHERE id = ?`);
    try {
        return await exports.withRetry(() => stmt.get(accountId));
    }
    catch (err) {
        if (err) {
            console.error(err);
        }
        return null;
    }
    finally {
        await exports.closeConnection(db);
    }
};
exports.getAccount = getAccount;
const addExchangeAccount = async (exchangeId, name, value) => {
    const db = await exports.createConnection();
    const stmt = db.prepare(`INSERT INTO accounts (exchangeId, name, value, status, time) VALUES (?, ?, ?, ?, ?)`);
    try {
        const time = new Date().getTime();
        return await exports.withRetry(() => stmt.run(exchangeId, name, value, 'Available', time));
    }
    catch (err) {
        if (err) {
            console.error(err);
        }
        return null;
    }
    finally {
        await exports.closeConnection(db);
    }
};
exports.addExchangeAccount = addExchangeAccount;
// export const getStrategyAllInfo = async (
//   strategyId: number
// ): Promise<StrategyAll | null> => {
//   const db = await createConnection();
//   try {
//
//     const stmt = db.prepare(
//       `SELECT
//             s.*,
//             json_object(
//             'name', a.name,
//             'value', a.value,
//             'status', a.status,
//             'exchangeId', a.exchangeId,
//             'fee', a.fee
//             ) AS mainExchangeAccount,
//             json_object(
//             'name', a.name,
//             'value', a.value,
//             'status', a.status,
//             'exchangeId', a.exchangeId,
//             'fee', a.fee
//             ) AS secondExchangeAccount
//            FROM strategy s
//            INNER JOIN accounts a ON a.id = s.mainExchangeAccountId
//            INNER JOIN accounts a ON a.id = s.secondExchangeAccountId
//            WHERE s.id = ?`
//     );
//     return await withRetry(() => stmt.get(strategyId));
//   } catch (err) {
//     if (err) {
//       console.error(err);
//     }
//     return null;
//   } finally {
//     await closeConnection(db);
//   }
// };
const addStrategy = async (config, strategyParams) => {
    const db = await exports.createConnection();
    try {
        const time = new Date().getTime();
        const stmt = db.prepare(`INSERT INTO strategy (typeId, mainExchangeId, mainExchangePair, mainExchangeAccountId, mainExchangeFee, secondExchangeId, secondExchangePair, secondExchangeAccountId, secondExchangeFee, arguments, invert, status, time, updateTime) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
        let secondExchangePairDB = strategyParams.secondExchangePair;
        if (strategyParams.secondExchangePairTwo) {
            secondExchangePairDB = `${strategyParams.secondExchangePair},${strategyParams.secondExchangePairTwo}`;
        }
        const lastID = await exports.withRetry(() => stmt.run(strategyParams.typeId, strategyParams.mainExchangeId, strategyParams.mainExchangePair, strategyParams.mainExchangeAccountId, strategyParams.mainFee, strategyParams.secondExchangeId, secondExchangePairDB, strategyParams.secondExchangeAccountId, strategyParams.secondFee, config, strategyParams.invert, 'Stopped', time, time));
        const promiseValue = [];
        if (strategyParams.mainExchangeName && strategyParams.mainPairInfo) {
            promiseValue.push(exports.setPairInfo(strategyParams.mainExchangeName, strategyParams.mainPairInfo));
        }
        if (strategyParams.secondExchangeName && strategyParams.secondPairInfo) {
            promiseValue.push(exports.setPairInfo(strategyParams.secondExchangeName, strategyParams.secondPairInfo));
        }
        if (strategyParams.secondExchangeName && strategyParams.secondPairTwoInfo) {
            promiseValue.push(exports.setPairInfo(strategyParams.secondExchangeName, strategyParams.secondPairTwoInfo));
        }
        await Promise.all(promiseValue);
        return lastID;
    }
    catch (err) {
        if (err) {
            console.error(err);
        }
        return null;
    }
    finally {
        await exports.closeConnection(db);
    }
};
exports.addStrategy = addStrategy;
const updateStrategyConfig = async (id, config) => {
    const db = await exports.createConnection();
    try {
        const time = new Date().getTime();
        const stmt = db.prepare(`UPDATE strategy SET arguments = ? , updateTime = ? WHERE id = ?`);
        return await exports.withRetry(() => stmt.run(config, time, id));
    }
    catch (err) {
        if (err) {
            console.error(err);
        }
        return null;
    }
    finally {
        await exports.closeConnection(db);
    }
};
exports.updateStrategyConfig = updateStrategyConfig;
const getPairInfo = async (exchangeName, pairId) => {
    const db = await exports.createConnection();
    try {
        if (exchangeName === model_1.ExchangeName.ICDex) {
            const stmt = db.prepare('SELECT * FROM ICDexPairInfo WHERE pairId = ?');
            return await exports.withRetry(() => stmt.get(pairId));
        }
        else if (exchangeName === model_1.ExchangeName.Binance) {
            const stmt = db.prepare('SELECT * FROM binancePairInfo WHERE symbol = ?');
            return await exports.withRetry(() => stmt.get(pairId));
        }
        return null;
    }
    catch (err) {
        if (err) {
            console.error(err);
        }
        return null;
    }
    finally {
        await exports.closeConnection(db);
    }
};
exports.getPairInfo = getPairInfo;
const insertOrUpdateBinanceOrderInfo = async (strategyId, info) => {
    const db = await exports.createConnection();
    try {
        const row = await exports.withRetry(() => db
            .prepare('SELECT * FROM binanceOrderInfo WHERE orderId = ?')
            .get(info.orderId.toString(10)));
        const time = new Date().getTime();
        if (!row) {
            const setBinanceOrderInfo = db.prepare(`INSERT INTO binanceOrderInfo (strategyId, symbol, orderId, status, side, orderType, price, origQty, executedQty, origQuoteOrderQty, cummulativeQuoteQty, fills, time, updateTime) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
            return await exports.withRetry(() => setBinanceOrderInfo.run(strategyId, info.symbol, info.orderId.toString(10), info.status, info.side, info.type, info.price, info.origQty, info.executedQty, info.origQuoteOrderQty, info.cummulativeQuoteQty, JSON.stringify(info.fills), time, time));
        }
        else {
            const fills = JSON.parse(row.fills);
            if (fills && fills.length) {
                fills.unshift(...info.fills);
            }
            const stmt = db.prepare(`UPDATE binanceOrderInfo SET status = ? , price = ? , origQty = ? , executedQty = ? , origQuoteOrderQty = ? , cummulativeQuoteQty = ?, fills = ?, updateTime = ? WHERE orderId = ?`);
            return await exports.withRetry(() => stmt.run(strategyId, info.status, info.price, info.origQty, info.executedQty, info.origQuoteOrderQty, info.cummulativeQuoteQty, JSON.stringify(fills), time, info.orderId.toString(10)));
        }
    }
    catch (err) {
        if (err) {
            console.error(err);
        }
    }
    finally {
        await exports.closeConnection(db);
    }
};
exports.insertOrUpdateBinanceOrderInfo = insertOrUpdateBinanceOrderInfo;
const insertOrUpdateICDexOrderInfo = async (strategyId, pairId, txid) => {
    const db = await exports.createConnection();
    try {
        const service = new ICDexService_1.ICDexService();
        const row = await exports.withRetry(() => db.prepare('SELECT * FROM ICDexOrderInfo WHERE orderId = ?').get(txid));
        const time = new Date().getTime();
        const res = await service.statusByTxid(pairId, converter_1.hexToBytes(txid));
        if (!row) {
            const setICDexOrderInfo = db.prepare(`INSERT INTO ICDexOrderInfo (strategyId, pairId, orderId, status, tradingStatus, orderType, account, orderPrice, origOrder, filled, details, remaining, fee, time, updateTime) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
            if (res) {
                const status = Object.keys(res)[0];
                let orderType = '';
                if (status === 'Completed') {
                    const val = Object.values(res)[0];
                    const tradingStatus = Object.keys(val.status)[0];
                    if (val.orderType && val.orderType.length) {
                        orderType = Object.keys(val.orderType[0])[0];
                    }
                    return await exports.withRetry(() => setICDexOrderInfo.run(strategyId, pairId, txid, status, tradingStatus, orderType, converter_1.toHexString(new Uint8Array(val.account)), '', JSON.stringify(val.order, (key, value) => typeof value === 'bigint' ? value.toString(10) : value), JSON.stringify(val.filled, (key, value) => typeof value === 'bigint' ? value.toString(10) : value), JSON.stringify(val.details, (key, value) => typeof value === 'bigint' ? value.toString(10) : value), '', JSON.stringify(val.fee, (key, value) => typeof value === 'bigint' ? value.toString(10) : value), time, time));
                }
                else if (status === 'Pending') {
                    const val = Object.values(res)[0];
                    const tradingStatus = Object.keys(val.status)[0];
                    return await exports.withRetry(() => setICDexOrderInfo.run(strategyId, pairId, txid, status, tradingStatus, orderType, converter_1.toHexString(new Uint8Array(val.account)), JSON.stringify(val.orderPrice, (key, value) => typeof value === 'bigint' ? value.toString(10) : value), '', JSON.stringify(val.filled, (key, value) => typeof value === 'bigint' ? value.toString(10) : value), '', JSON.stringify(val.remaining, (key, value) => typeof value === 'bigint' ? value.toString(10) : value), JSON.stringify(val.fee, (key, value) => typeof value === 'bigint' ? value.toString(10) : value), time, time));
                }
            }
        }
        else {
            const stmt = db.prepare(`UPDATE ICDexOrderInfo SET status = ? , tradingStatus = ? , filled = ? , details = ? , remaining = ? , fee = ? , updateTime = ? WHERE orderId = ?`);
            if (res) {
                const status = Object.keys(res)[0];
                if (status === 'Completed') {
                    const val = Object.values(res)[0];
                    const tradingStatus = Object.keys(val.status)[0];
                    return await exports.withRetry(() => stmt.run(status, tradingStatus, JSON.stringify(val.filled, (key, value) => typeof value === 'bigint' ? value.toString(10) : value), JSON.stringify(val.details, (key, value) => typeof value === 'bigint' ? value.toString(10) : value), '', JSON.stringify(val.fee, (key, value) => typeof value === 'bigint' ? value.toString(10) : value), time, txid));
                }
                else if (status === 'Pending') {
                    const val = Object.values(res)[0];
                    const tradingStatus = Object.keys(val.status)[0];
                    return await exports.withRetry(() => stmt.run(status, tradingStatus, JSON.stringify(val.filled, (key, value) => typeof value === 'bigint' ? value.toString(10) : value), '', JSON.stringify(val.remaining, (key, value) => typeof value === 'bigint' ? value.toString(10) : value), JSON.stringify(val.fee, (key, value) => typeof value === 'bigint' ? value.toString(10) : value), time, txid));
                }
            }
        }
    }
    catch (err) {
        if (err) {
            console.error(err);
        }
    }
    finally {
        await exports.closeConnection(db);
    }
};
exports.insertOrUpdateICDexOrderInfo = insertOrUpdateICDexOrderInfo;
const setPairInfo = async (exchangeName, pairInfo) => {
    const db = await exports.createConnection();
    const time = new Date().getTime();
    try {
        const setICDexPairInfo = db.prepare(`INSERT INTO ICDexPairInfo (pairId, token0, token1, token0Info, token1Info, setting, paused, time, updateTime) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
        const setBinancePairInfo = db.prepare(`INSERT INTO binancePairInfo (symbol, baseAsset, baseAssetPrecision, quoteAsset, quoteAssetPrecision, filters, status, time, updateTime) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
        if (exchangeName === model_1.ExchangeName.ICDex) {
            const ICDexPainInfo = JSON.parse(pairInfo);
            const row = await exports.withRetry(() => db
                .prepare('SELECT * FROM ICDexPairInfo WHERE pairId = ?')
                .get(ICDexPainInfo.pairId));
            if (!row) {
                return await exports.withRetry(() => setICDexPairInfo.run(ICDexPainInfo.pairId, JSON.stringify(ICDexPainInfo.token0), JSON.stringify(ICDexPainInfo.token1), JSON.stringify(ICDexPainInfo.token0Info), JSON.stringify(ICDexPainInfo.token1Info), JSON.stringify(ICDexPainInfo.setting), ICDexPainInfo.paused ? 1 : 0, time, time));
            }
        }
        else if (exchangeName === model_1.ExchangeName.Binance) {
            const binancePairInfo = JSON.parse(pairInfo);
            const row = await exports.withRetry(() => db
                .prepare('SELECT * FROM binancePairInfo WHERE symbol = ?')
                .get(binancePairInfo.symbol));
            if (!row) {
                return await exports.withRetry(() => setBinancePairInfo.run(binancePairInfo.symbol, binancePairInfo.baseAsset, binancePairInfo.baseAssetPrecision, binancePairInfo.quoteAsset, binancePairInfo.quoteAssetPrecision, JSON.stringify(binancePairInfo.filters), binancePairInfo.status, time, time));
            }
        }
        return true;
    }
    catch (err) {
        if (err) {
            console.error(err);
        }
        return false;
    }
    finally {
        await exports.closeConnection(db);
    }
};
exports.setPairInfo = setPairInfo;
const insertOrderIdOrUpdate = async (strategyId, mainExchangeOrderId, secondExchangeOrderId, mainExchangeErrorMessage, secondExchangeErrorMessage, status) => {
    const db = await exports.createConnection();
    const time = new Date().getTime();
    try {
        if (mainExchangeErrorMessage || secondExchangeErrorMessage) {
            status = model_1.OrdersStatus.Failed;
        }
        let secondExchangeOrderIdDB = [];
        if (secondExchangeOrderId) {
            secondExchangeOrderIdDB = [secondExchangeOrderId];
        }
        const row = await exports.withRetry(() => db
            .prepare('SELECT * FROM orders WHERE mainExchangeOrderId = ?')
            .get(mainExchangeOrderId));
        if (!row) {
            const stmt = db.prepare(`INSERT INTO orders (strategyId, mainExchangeOrderId, secondExchangeOrderId, mainExchangeErrorMessage, secondExchangeErrorMessage, status, time, updateTime) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
            const res = await exports.withRetry(() => stmt.run(strategyId, mainExchangeOrderId, JSON.stringify(secondExchangeOrderIdDB), mainExchangeErrorMessage, secondExchangeErrorMessage, status, time, time));
            if (status === model_1.OrdersStatus.Completed || status === model_1.OrdersStatus.Failed) {
                await exports.archiveOrder(res.lastInsertRowid);
            }
        }
        else {
            if (secondExchangeOrderId && row.secondExchangeOrderId) {
                secondExchangeOrderIdDB = JSON.parse(row.secondExchangeOrderId);
                secondExchangeOrderIdDB.unshift(secondExchangeOrderId);
            }
            const stmt = db.prepare(`UPDATE orders SET secondExchangeOrderId = ? , mainExchangeErrorMessage = ? , secondExchangeErrorMessage = ? , status = ? , updateTime = ? WHERE mainExchangeOrderId = ?`);
            await exports.withRetry(() => stmt.run(JSON.stringify(secondExchangeOrderIdDB), mainExchangeErrorMessage, secondExchangeErrorMessage, status, time, mainExchangeOrderId));
            if (status === model_1.OrdersStatus.Completed || status === model_1.OrdersStatus.Failed) {
                await exports.archiveOrder(row.id);
            }
        }
    }
    catch (err) {
        if (err) {
            console.error(err);
        }
    }
    finally {
        await exports.closeConnection(db);
    }
};
exports.insertOrderIdOrUpdate = insertOrderIdOrUpdate;
const updateBalanceChanges = async (strategyId, token0Change, token1Change, mainExchangeOrderId, secondExchangeOrderId) => {
    let token0 = 0;
    let token1 = 0;
    let token0Balance = 0;
    let token1Balance = 0;
    if (!token0Change) {
        token0Change = '0';
    }
    if (!token1Change) {
        token1Change = '0';
    }
    const db = await exports.createConnection();
    try {
        const res = await exports.getBalanceChanges(strategyId);
        if (res && res.token0Balance) {
            token0 = res.token0Balance;
        }
        if (res && res.token1Balance) {
            token1 = res.token1Balance;
        }
        if (token0Change) {
            token0Balance = new bignumber_js_1.default(token0).plus(token0Change).toNumber();
        }
        if (token1Change) {
            token1Balance = new bignumber_js_1.default(token1).plus(token1Change).toNumber();
        }
        if (token0Change || token1Change) {
            const updateTime = new Date().getTime();
            const stmt = db.prepare(`INSERT INTO balanceChanges (strategyId, mainExchangeOrderId, secondExchangeOrderId, token0Balance, token0Change, token1Balance, token1Change, updateTime) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
            return await exports.withRetry(() => stmt.run(strategyId, mainExchangeOrderId, secondExchangeOrderId, token0Balance, token0Change, token1Balance, token1Change, updateTime));
        }
    }
    catch (err) {
        if (err) {
            console.error(err);
        }
    }
    finally {
        await exports.closeConnection(db);
    }
    return 0;
};
exports.updateBalanceChanges = updateBalanceChanges;
const getBalanceChanges = async (strategyId) => {
    const db = await exports.createConnection();
    const stmt = db.prepare('SELECT * FROM balanceChanges WHERE strategyId = ? ORDER BY id DESC LIMIT 1');
    try {
        const balanceChanges = await exports.withRetry(() => stmt.all(strategyId));
        return balanceChanges[0];
    }
    catch (err) {
        if (err) {
            console.error(err);
        }
        return null;
    }
    finally {
        await exports.closeConnection(db);
    }
};
exports.getBalanceChanges = getBalanceChanges;
const getBalanceChangesByMainExchangeOrderId = async (strategyId, mainExchangeOrderId, isToken0) => {
    const db = await exports.createConnection();
    const stmt = db.prepare('SELECT * FROM balanceChanges WHERE strategyId = ? And mainExchangeOrderId = ?');
    try {
        const res = await exports.withRetry(() => stmt.all(strategyId, mainExchangeOrderId));
        if (res && res.length) {
            let add = '0';
            let subtract = '0';
            res.forEach((item) => {
                if (isToken0) {
                    if (new bignumber_js_1.default(item.token0Change).lt(0)) {
                        subtract = new bignumber_js_1.default(-item.token0Change)
                            .plus(subtract)
                            .toString(10);
                    }
                    if (new bignumber_js_1.default(item.token0Change).gt(0)) {
                        add = new bignumber_js_1.default(item.token0Change).plus(add).toString(10);
                    }
                }
                else if (!isToken0) {
                    if (new bignumber_js_1.default(item.token1Change).lt(0)) {
                        subtract = new bignumber_js_1.default(-item.token1Change)
                            .plus(subtract)
                            .toString(10);
                    }
                    if (new bignumber_js_1.default(item.token1Change).gt(0)) {
                        add = new bignumber_js_1.default(item.token1Change).plus(add).toString(10);
                    }
                }
            });
            return { add: add, subtract: subtract };
        }
    }
    catch (err) {
        if (err) {
            console.error(err);
        }
    }
    finally {
        await exports.closeConnection(db);
    }
    return { add: '0', subtract: '0' };
};
exports.getBalanceChangesByMainExchangeOrderId = getBalanceChangesByMainExchangeOrderId;
const getBalanceChangesByOrderId = async (strategyId, mainExchangeOrderId, secondExchangeOrderId) => {
    const db = await exports.createConnection();
    const stmt = db.prepare('SELECT * FROM balanceChanges WHERE strategyId = ? And mainExchangeOrderId = ? And secondExchangeOrderId = ?');
    try {
        const res = await exports.withRetry(() => stmt.all(strategyId, mainExchangeOrderId, secondExchangeOrderId));
        if (res && res.length) {
            const data = res[0];
            return {
                token0: -data.token0Change,
                token1: -data.token1Change
            };
        }
    }
    catch (err) {
        if (err) {
            console.error(err);
        }
    }
    finally {
        await exports.closeConnection(db);
    }
    return {
        token0: 0,
        token1: 0
    };
};
exports.getBalanceChangesByOrderId = getBalanceChangesByOrderId;
const updateOrderIdMaker = async (id, status = model_1.OrdersStatus.Completed) => {
    const db = await exports.createConnection();
    const time = new Date().getTime();
    const stmt = db.prepare(`UPDATE orders SET status = ?, updateTime = ? WHERE id = ?`);
    try {
        const res = await exports.withRetry(() => stmt.run(status, time, id));
        if ((res.changes !== 0 && status === model_1.OrdersStatus.Completed) ||
            status === model_1.OrdersStatus.Failed) {
            await exports.archiveOrder(id);
        }
    }
    catch (err) {
        if (err) {
            console.error(err);
        }
    }
    finally {
        await exports.closeConnection(db);
    }
};
exports.updateOrderIdMaker = updateOrderIdMaker;
const archiveOrder = async (orderId) => {
    const db = await exports.createConnection();
    const stmt = db.prepare('SELECT * FROM orders WHERE id = ?');
    try {
        const res = await exports.withRetry(() => stmt.get(orderId));
        if (res) {
            const row = await exports.withRetry(() => db.prepare('SELECT * FROM archives WHERE id = ?').get(orderId));
            if (row) {
                const deleteStmt = db.prepare(`DELETE FROM orders WHERE id = ?`);
                await exports.withRetry(() => deleteStmt.run(orderId));
                return;
            }
            const archivesStmt = db.prepare(`INSERT INTO archives (
        strategyId,
        id,
        status,
        mainExchangeOrderId,
        secondExchangeOrderId,
        mainExchangeErrorMessage,
        secondExchangeErrorMessage,
        time,
        updateTime)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
            await exports.withRetry(() => archivesStmt.run(res.strategyId, orderId, res.status, res.mainExchangeOrderId, res.secondExchangeOrderId, res.mainExchangeErrorMessage, res.secondExchangeErrorMessage, res.time, res.updateTime));
            const deleteStmt = db.prepare(`DELETE FROM orders WHERE id = ?`);
            await exports.withRetry(() => deleteStmt.run(orderId));
        }
    }
    catch (err) {
        if (err) {
            console.error(err);
        }
    }
    finally {
        await exports.closeConnection(db);
    }
};
exports.archiveOrder = archiveOrder;
// export const archiveOldOrders = (): void => {
//   const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
//   db.all(
//     `SELECT * FROM orders WHERE status = 'completed' AND time < ?`,
//     [thirtyDaysAgo],
//     (err, rows: Array<Orders>) => {
//       if (err) {
//         db.run('ROLLBACK');
//         return;
//       }
//       if (rows.length === 0) {
//         db.run('COMMIT');
//
//         return;
//       }
//       const insertStmt = db.prepare(`INSERT INTO archives (
//         strategyId,
//         status,
//         mainExchangeOrderId,
//         secondExchangeOrderId,
//         mainExchangeErrorMessage,
//         secondExchangeErrorMessage,
//         time,
//         updateTime)
//         VALUES (?, ?, ?, ?,?, ?, ?, ?)`);
//       rows.forEach((row) => {
//         insertStmt.run(
//           row.strategyId,
//           row.status,
//           row.mainExchangeOrderId,
//           row.secondExchangeOrderId,
//           row.mainExchangeErrorMessage,
//           row.secondExchangeErrorMessage,
//           row.time,
//           row.updateTime
//         );
//       });
//       insertStmt.finalize((err) => {
//         if (err) {
//           db.run('ROLLBACK');
//           return;
//         }
//         const deleteStmt = db.prepare(`DELETE FROM orders WHERE id = ?`);
//         rows.forEach((row) => {
//           deleteStmt.run(row.id);
//         });
//         deleteStmt.finalize((err) => {
//           if (err) {
//             db.run('ROLLBACK');
//             return;
//           }
//           db.run('COMMIT');
//
//         });
//       });
//     }
//   );
// };
const insertUser = async (userName, password) => {
    const db = await exports.createConnection();
    try {
        const time = new Date().getTime();
        const saltRounds = 10;
        const salt = await bcrypt_1.default.genSaltSync(saltRounds);
        const hash = await bcrypt_1.default.hashSync(password, salt);
        const stmt = db.prepare(`INSERT INTO user (userName, password, salt, saltRounds, updateTime, lastLoginTime) VALUES (?, ?, ?, ?, ?, ?)`);
        await exports.withRetry(() => stmt.run(userName, hash, salt, saltRounds, time, time));
    }
    catch (err) {
        if (err) {
            console.error(err);
        }
    }
    finally {
        await exports.closeConnection(db);
    }
};
exports.insertUser = insertUser;
const updateLoginTime = async () => {
    const db = await exports.createConnection();
    try {
        const time = new Date().getTime();
        const stmt = db.prepare(`UPDATE user SET lastLoginTime = ?`);
        return await exports.withRetry(() => stmt.run(time));
    }
    catch (err) {
        if (err) {
            console.error(err);
        }
        return null;
    }
    finally {
        await exports.closeConnection(db);
    }
};
exports.updateLoginTime = updateLoginTime;
const getUser = async () => {
    const db = await exports.createConnection();
    const stmt = db.prepare('SELECT * FROM user');
    try {
        return await exports.withRetry(() => stmt.get());
    }
    catch (err) {
        if (err) {
            console.error(err);
        }
        return null;
    }
    finally {
        await exports.closeConnection(db);
    }
};
exports.getUser = getUser;
const withRetry = async (operation, maxRetries = 3, delayMs = 100) => {
    let retries = 0;
    let lastError;
    while (retries < maxRetries) {
        try {
            return await operation();
        }
        catch (error) {
            lastError = error;
            if (error.code === 'SQLITE_BUSY') {
                retries++;
                console.warn(`${retries} retries, Error: ${error.message}`);
                await new Promise((resolve) => setTimeout(resolve, delayMs * retries));
            }
            else {
                throw error;
            }
        }
    }
    throw new Error(`The operation failed and the maximum number of retries has been reached (${maxRetries})，Error: ${lastError.message}`);
};
exports.withRetry = withRetry;
