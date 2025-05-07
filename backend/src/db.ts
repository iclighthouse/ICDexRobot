import fs from 'fs';
import path from 'path';
import betterSqlite3, { Database, RunResult } from 'better-sqlite3';
import BigNumber from 'bignumber.js';
import {
  BinanceOrderInfoDB,
  BinanceOrderInfoFill,
  BinanceSymbol,
  BinanceSymbolDB,
  ICDexPairInfo,
  ICDexPairInfoDB,
  TradeResponseFULL
} from './ic/model';
import {
  Account,
  BalanceChanges,
  Exchange,
  ExchangeName,
  OrderDB,
  OrderInfo,
  orderRow,
  Orders,
  OrdersRow,
  OrdersStatus,
  OrderStatus,
  Pagination,
  RobotType,
  SecondExchangeOrderId,
  Strategies,
  Strategy,
  StrategyParams,
  StrategyStatus,
  User
} from './model';
import { ExchangeOrderId } from './trade/model';
import { ICDexService } from './ic/ICDex/ICDexService';
import { hexToBytes, toHexString } from './ic/converter';
import { TradingOrder, TxnRecord } from './ic/ICDex/ICDex.idl';
import { cancelPending, getAccountValue } from './trade';
import bcrypt from 'bcrypt';
// const execDir = path.dirname(process.execPath);
const dbPath = path.resolve('../database.db');
const openConnections = new Set<Database>();
export const createConnection = async (): Promise<Database> => {
  const db = await new betterSqlite3(dbPath);
  await db.pragma('journal_mode = WAL');
  await db.pragma('busy_timeout = 5000');
  await db.pragma('synchronous = NORMAL');
  await openConnections.add(db);
  return db;
};
export const initDb = async (): Promise<void> => {
  try {
    await fs.accessSync(dbPath, fs.constants.F_OK);
  } catch (e) {
    await fs.writeFileSync(dbPath, '');
  }
  try {
    const db = await createConnection();
    // db.run('DROP TABLE IF EXISTS orders');
    // name: Timer Robot,Maker robot
    const stmtRobotType = db.prepare(`CREATE TABLE IF NOT EXISTS robotType (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        time INTEGER NOT NULL
      )`);
    await withRetry(() => stmtRobotType.run());
    const stmtRobotTimer = db.prepare(
      `INSERT INTO robotType (name, time) SELECT 'Timer Robot', ? WHERE NOT EXISTS (SELECT 1 FROM robotType WHERE name = 'Timer Robot')`
    );
    await withRetry(() => stmtRobotTimer.run(new Date().getTime()));
    const stmtRobotMaker = db.prepare(
      `INSERT INTO robotType (name, time) SELECT 'Maker Robot', ? WHERE NOT EXISTS (SELECT 1 FROM robotType WHERE name = 'Maker Robot')`
    );
    await withRetry(() => stmtRobotMaker.run(new Date().getTime()));
    // type: DEX,CEX
    const exchanges = db.prepare(`CREATE TABLE IF NOT EXISTS exchanges (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        time INTEGER NOT NULL
      )`);
    await withRetry(() => exchanges.run());
    const exchangesICDex = db.prepare(
      `INSERT INTO exchanges (name, type, time) SELECT 'ICDex', 'DEX', ? WHERE NOT EXISTS (SELECT 1 FROM exchanges WHERE name = 'ICDex' AND type = 'DEX')`
    );
    await withRetry(() => exchangesICDex.run(new Date().getTime()));
    const exchangesBinance = db.prepare(
      `INSERT INTO exchanges (name, type, time) SELECT 'Binance', 'DEX', ? WHERE NOT EXISTS (SELECT 1 FROM exchanges WHERE name = 'Binance' AND type = 'DEX')`
    );
    await withRetry(() => exchangesBinance.run(new Date().getTime()));
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
    await withRetry(() => accounts.run());
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
    await withRetry(() => strategy.run());
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
    await withRetry(() => ICDexPairInfo.run());
    // filters: pair setting
    const binancePairInfo =
      db.prepare(`CREATE TABLE IF NOT EXISTS binancePairInfo (
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
    await withRetry(() => binancePairInfo.run());
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
    await withRetry(() => orders.run());
    const idx_orders_time =
      db.prepare(`CREATE INDEX IF NOT EXISTS idx_orders_time 
        ON orders(time)`);
    await withRetry(() => idx_orders_time.run());
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
    await withRetry(() => archives.run());
    const idx_archives_time =
      db.prepare(`CREATE INDEX IF NOT EXISTS idx_archives_time 
        ON archives(time)`);
    await withRetry(() => idx_archives_time.run());
    const ICDexOrderInfo =
      db.prepare(`CREATE TABLE IF NOT EXISTS ICDexOrderInfo (
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
    await withRetry(() => ICDexOrderInfo.run());
    const binanceOrderInfo =
      db.prepare(`CREATE TABLE IF NOT EXISTS binanceOrderInfo (
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
    await withRetry(() => binanceOrderInfo.run());
    const balanceChanges =
      db.prepare(`CREATE TABLE IF NOT EXISTS balanceChanges (
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
    await withRetry(() => balanceChanges.run());
    const user = db.prepare(`CREATE TABLE IF NOT EXISTS user (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userName TEXT NOT NULL,
        password TEXT NOT NULL,
        salt TEXT NOT NULL,
        saltRounds INTEGER NOT NULL,
        updateTime INTEGER NOT NULL,
        lastLoginTime INTEGER NOT NULL
      )`);
    await withRetry(() => user.run());
    await closeConnection(db);
  } catch (err) {
    console.error('Error initializing database:', err);
  }
};
export const closeConnection = async (db: Database): Promise<void> => {
  try {
    if (openConnections.has(db)) {
      await db.close();
      openConnections.delete(db);
    }
  } catch (e) {}
};
export const closeAllConnections = async (): Promise<void> => {
  const closePromises = Array.from(openConnections).map((db) =>
    closeConnection(db)
  );
  await Promise.all(closePromises);
};
export const getPendingOrders = async (
  strategyId: number
): Promise<Array<Orders>> => {
  const db = await createConnection();
  try {
    const stmt = db.prepare(
      'SELECT * FROM orders WHERE strategyId = ? AND status = ?'
    );
    return await withRetry<Array<Orders>>(() =>
      stmt.all(strategyId, OrdersStatus.Pending)
    );
  } catch (err) {
    if (err) {
      console.error(err);
    }
  } finally {
    await closeConnection(db);
  }
  return [];
};
let totalIds = 0;
let totalIdsError = 0;
const totalStrategyIdError: { [key: number]: number } = {};
export const queryOrders = async (
  pagination: Pagination
): Promise<OrdersRow | null> => {
  const exchanges = await getExchanges();
  const exchange: { [key: number]: ExchangeName } = {};
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
  } else {
    paramsTotal = {
      status: 'Failed'
    };
  }
  let sqlTotal = 'SELECT COUNT(*) as total FROM orders WHERE status = @status';
  let sqlTotalArchives =
    'SELECT COUNT(*) as total FROM archives WHERE status = @status';
  if (status !== OrderStatus.Failed) {
    sqlTotal = 'SELECT COUNT(*) as total FROM orders WHERE status != @status';
    sqlTotalArchives =
      'SELECT COUNT(*) as total FROM archives WHERE status != @status';
  }
  if (strategyId) {
    sqlTotal += ` AND strategyId = @strategyId`;
    sqlTotalArchives += ` AND strategyId = @strategyId`;
  }
  const getDb = await createConnection();
  const allDb = await createConnection();
  try {
    if (page === 1) {
      const getTotalDb = getDb.prepare(sqlTotal);
      const countRow = await withRetry<{ total: number }>(() =>
        getTotalDb.get(paramsTotal)
      );
      const getTotalArchives = getDb.prepare(sqlTotalArchives);
      const countArchives = await withRetry<{ total: number }>(() =>
        getTotalArchives.get(paramsTotal)
      );
      if (strategyId) {
        totalStrategyIdError[strategyId] = countRow.total + countArchives.total;
      } else {
        if (status === 'Failed') {
          totalIdsError = countRow.total + countArchives.total;
        } else {
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
    } else {
      params = {
        status: 'Failed',
        limit: pageSize,
        offset: offset
      };
    }
    let allSql = `SELECT * FROM (SELECT id, strategyId, status, mainExchangeOrderId, secondExchangeOrderId,  mainExchangeErrorMessage, secondExchangeErrorMessage, time, updateTime, 'orders' AS source FROM orders UNION ALL SELECT id, strategyId, status, mainExchangeOrderId, secondExchangeOrderId,  mainExchangeErrorMessage, secondExchangeErrorMessage, time, updateTime, 'archives' AS source FROM archives) AS combined WHERE status = @status`;
    if (status !== OrderStatus.Failed) {
      allSql = `SELECT * FROM (SELECT id, strategyId, status, mainExchangeOrderId, secondExchangeOrderId,  mainExchangeErrorMessage, secondExchangeErrorMessage, time, updateTime, 'orders' AS source FROM orders UNION ALL SELECT id, strategyId, status, mainExchangeOrderId, secondExchangeOrderId,  mainExchangeErrorMessage, secondExchangeErrorMessage, time, updateTime, 'archives' AS source FROM archives) AS combined WHERE status != @status`;
    }
    if (strategyId) {
      allSql += ' AND strategyId = @strategyId';
    }
    allSql += ' ORDER BY updateTime DESC LIMIT @limit OFFSET @offset';
    const ordersDb = allDb.prepare(allSql);
    const rows = await withRetry<Array<orderRow | null>>(() =>
      ordersDb.all(params)
    );
    const promiseValue: Array<Promise<orderRow | null>> = [];
    rows.forEach((order) => {
      if (order) {
        promiseValue.push(getOrderInfo(exchange, order));
      }
    });
    const results = await Promise.all(promiseValue);
    let total = totalIds;
    if (strategyId) {
      total = totalStrategyIdError[strategyId];
    } else {
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
  } catch (err) {
    if (err) {
      console.error(err);
    }
  } finally {
    await closeConnection(getDb);
    await closeConnection(allDb);
  }
  return null;
};
export const getOrderInfo = async (
  exchange: { [key: number]: ExchangeName },
  order: Orders
): Promise<orderRow | null> => {
  try {
    const strategy = await getStrategy(order.strategyId);
    if (strategy) {
      const promiseValue: Array<Promise<OrderInfo | null>> = [];
      const mainExchangeOrderId = order.mainExchangeOrderId;
      const secondExchangeOrderId = JSON.parse(
        order.secondExchangeOrderId
      ) as Array<SecondExchangeOrderId>;
      promiseValue.push(
        getInfo(
          strategy.id,
          exchange[strategy.mainExchangeId],
          strategy.mainExchangePair,
          mainExchangeOrderId
        )
      );
      secondExchangeOrderId.forEach((item) => {
        const pairs = Object.keys(item);
        if (pairs && pairs.length) {
          pairs.forEach((pairId) => {
            if (pairId) {
              promiseValue.push(
                getInfo(
                  strategy.id,
                  exchange[strategy.secondExchangeId],
                  pairId,
                  item[pairId]
                )
              );
            }
          });
        }
      });
      const res = await Promise.all(promiseValue);
      if (res) {
        const orderInfo: {
          mainExchangeOrderInfo: OrderInfo | null;
          secondExchangeOrderInfo: Array<OrderInfo>;
        } = {
          mainExchangeOrderInfo: null,
          secondExchangeOrderInfo: []
        };
        res.forEach((info: OrderInfo | null) => {
          if (info) {
            if (mainExchangeOrderId === info.orderId) {
              orderInfo.mainExchangeOrderInfo = info;
            } else {
              orderInfo.secondExchangeOrderInfo.push(info);
            }
          }
        });
        if (orderInfo) {
          return { ...order, ...orderInfo, ...{ strategy: strategy } };
        }
      }
    }
  } catch (err) {
    if (err) {
      console.error(err);
    }
  }
  return null;
};
export const getInfo = async (
  strategyId: number,
  exchangeName: ExchangeName,
  pair: string,
  orderId: string,
  init = true
): Promise<OrderInfo | null> => {
  const db = await createConnection();
  try {
    if (exchangeName === ExchangeName.ICDex) {
      const stmt = db.prepare(
        'SELECT * FROM ICDexOrderInfo WHERE pairId = ? AND orderId = ?'
      );
      const info = await withRetry(() => stmt.get(pair, orderId));
      if (init && !info) {
        await insertOrUpdateICDexOrderInfo(strategyId, pair, orderId);
      }
      return await withRetry(() => stmt.get(pair, orderId));
    } else if (exchangeName === ExchangeName.Binance) {
      const stmt = db.prepare(
        'SELECT * FROM binanceOrderInfo WHERE symbol = ? AND orderId = ?'
      );
      return await withRetry(() => stmt.get(pair, orderId));
    }
  } catch (err) {
    if (err) {
      console.error(err);
    }
  } finally {
    await closeConnection(db);
  }
  return null;
};
export const getExchanges = async (): Promise<Array<Exchange>> => {
  const db = await createConnection();
  const stmt = db.prepare('SELECT * FROM exchanges');
  try {
    return await withRetry(() => stmt.all());
  } catch (err) {
    if (err) {
      console.error(err);
    }
    return [];
  } finally {
    await closeConnection(db);
  }
};
export const getStrategy = async (id: number): Promise<Strategy | null> => {
  const db = await createConnection();
  const stmt = db.prepare('SELECT * FROM strategy WHERE id = ?');
  try {
    return await withRetry(() => stmt.get(id));
  } catch (err) {
    if (err) {
      console.error(err);
    }
    return null;
  } finally {
    await closeConnection(db);
  }
};
export const deleteStrategyStatus = async (
  id: number
): Promise<RunResult | null> => {
  const strategy = await getStrategy(id);
  if (
    strategy &&
    strategy.status &&
    strategy.status === StrategyStatus.Running
  ) {
    throw new Error('The strategy is running.');
  }
  const db = await createConnection();
  try {
    const strategy = db.prepare('DELETE FROM strategy WHERE id = ?');
    await withRetry(() => strategy.run(id));
    const stmt = db.prepare('DELETE FROM orders WHERE strategyId = ?');
    await withRetry(() => stmt.run(id));
    const stmtArchive = db.prepare('DELETE FROM archives WHERE strategyId = ?');
    return await withRetry<RunResult>(() => stmtArchive.run(id));
  } catch (err) {
    if (err) {
      console.error(err);
    }
    return null;
  } finally {
    await closeConnection(db);
  }
};
export const getAllPendingOrders = async (): Promise<Array<Orders>> => {
  const db = await createConnection();
  try {
    const stmt = db.prepare('SELECT * FROM orders WHERE status = ?');
    return await withRetry<Array<Orders>>(() => stmt.all(OrdersStatus.Pending));
  } catch (err) {
    if (err) {
      console.error(err);
    }
  } finally {
    await closeConnection(db);
  }
  return [];
};
export const updateStrategyStatus = async (
  id: number,
  status: StrategyStatus
): Promise<Strategy | null> => {
  const db = await createConnection();
  const time = new Date().getTime();
  const stmt = db.prepare(
    `UPDATE strategy SET status = ? , updateTime = ? WHERE id = ?`
  );
  if (status === StrategyStatus.Running) {
    try {
      return await withRetry(() => stmt.run(status, time, id));
    } catch (err) {
      if (err) {
        console.error(err);
      }
      return null;
    } finally {
      await closeConnection(db);
    }
  } else if (status === StrategyStatus.Stopped) {
    try {
      await withRetry(() => stmt.run(status, time, id));
      const strategy = await getStrategy(id);
      const exchanges = await getExchanges();
      const exchange: { [key: number]: ExchangeName } = {};
      exchanges.forEach((item) => {
        exchange[item.id] = item.name;
      });
      if (strategy && exchange) {
        const mainExchangeAccount = await getAccount(
          strategy.mainExchangeAccountId
        );
        if (mainExchangeAccount) {
          const mainAccount = getAccountValue(
            exchange[strategy.mainExchangeId],
            mainExchangeAccount.value
          );
          if (mainAccount) {
            await cancelPending(
              id,
              exchange[strategy.mainExchangeId],
              strategy.mainExchangePair,
              mainAccount
            );
          }
        }
      }
    } catch (err) {
      if (err) {
        console.error(err);
      }
    } finally {
      await closeConnection(db);
    }
  }
  return null;
};
let totalStrategies = 0;
export const getStrategies = async (
  page: number,
  pageSize: number
): Promise<Strategies | null> => {
  const db = await createConnection();
  const stmt = db.prepare('SELECT COUNT(*) as total FROM strategy');
  try {
    if (page === 1) {
      const countRow = await withRetry<{ total: number }>(() => stmt.get());
      totalStrategies = countRow.total;
    }
    const res = await getStrategiesDB(page, pageSize);
    return {
      total: totalStrategies,
      data: res,
      page: Number(page),
      pageSize: Number(pageSize),
      totalPages: Math.ceil(totalStrategies / pageSize)
    };
  } catch (err) {
    if (err) {
      console.error(err);
    }
    return null;
  } finally {
    await closeConnection(db);
  }
};
export const getStrategiesDB = async (
  page: number,
  pageSize: number
): Promise<Array<Strategy>> => {
  const db = await createConnection();
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
    return await withRetry(() => stmt.all(pageSize, offset));
  } catch (err) {
    if (err) {
      console.error(err);
    }
    return [];
  } finally {
    await closeConnection(db);
  }
};
export const getStrategiesError = async (
  strategyId: number,
  time: number
): Promise<Array<Strategy>> => {
  const db = await createConnection();
  const stmt = db.prepare(
    `SELECT * FROM (
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
    ) AS combined_results;`
  );
  try {
    return await withRetry(() => stmt.all(strategyId, time, strategyId, time));
  } catch (err) {
    if (err) {
      console.error(err);
    }
    return [];
  } finally {
    await closeConnection(db);
  }
};
export const getRobotType = async (): Promise<Array<RobotType>> => {
  const db = await createConnection();
  const stmt = db.prepare('SELECT * FROM robotType');
  try {
    return await withRetry(() => stmt.all());
  } catch (err) {
    if (err) {
      console.error(err);
    }
    return [];
  } finally {
    await closeConnection(db);
  }
};
export const getExchangeAccounts = async (
  exchangeId: number
): Promise<Array<Account>> => {
  const db = await createConnection();
  const stmt = db.prepare(`SELECT * FROM accounts WHERE exchangeId = ?`);
  try {
    return await withRetry(() => stmt.all(exchangeId));
  } catch (err) {
    if (err) {
      console.error(err);
    }
    return [];
  } finally {
    await closeConnection(db);
  }
};
export const getAccounts = async (): Promise<Array<Account>> => {
  const db = await createConnection();
  const stmt = db.prepare(`SELECT * FROM accounts`);
  try {
    return await withRetry(() => stmt.all());
  } catch (err) {
    if (err) {
      console.error(err);
    }
    return [];
  } finally {
    await closeConnection(db);
  }
};
export const getAccount = async (
  accountId: number
): Promise<Account | null> => {
  const db = await createConnection();
  const stmt = db.prepare(`SELECT * FROM accounts WHERE id = ?`);
  try {
    return await withRetry(() => stmt.get(accountId));
  } catch (err) {
    if (err) {
      console.error(err);
    }
    return null;
  } finally {
    await closeConnection(db);
  }
};
export const addExchangeAccount = async (
  exchangeId: number,
  name: string,
  value: string
): Promise<number | null> => {
  const db = await createConnection();
  const stmt = db.prepare(
    `INSERT INTO accounts (exchangeId, name, value, status, time) VALUES (?, ?, ?, ?, ?)`
  );
  try {
    const time = new Date().getTime();
    return await withRetry(() =>
      stmt.run(exchangeId, name, value, 'Available', time)
    );
  } catch (err) {
    if (err) {
      console.error(err);
    }
    return null;
  } finally {
    await closeConnection(db);
  }
};
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
export const addStrategy = async (
  config: string,
  strategyParams: StrategyParams
): Promise<number | null> => {
  const db = await createConnection();
  try {
    const time = new Date().getTime();
    const stmt = db.prepare(
      `INSERT INTO strategy (typeId, mainExchangeId, mainExchangePair, mainExchangeAccountId, mainExchangeFee, secondExchangeId, secondExchangePair, secondExchangeAccountId, secondExchangeFee, arguments, invert, status, time, updateTime) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    let secondExchangePairDB = strategyParams.secondExchangePair;
    if (strategyParams.secondExchangePairTwo) {
      secondExchangePairDB = `${strategyParams.secondExchangePair},${strategyParams.secondExchangePairTwo}`;
    }
    const lastID = await withRetry<number>(() =>
      stmt.run(
        strategyParams.typeId,
        strategyParams.mainExchangeId,
        strategyParams.mainExchangePair,
        strategyParams.mainExchangeAccountId,
        strategyParams.mainFee,
        strategyParams.secondExchangeId,
        secondExchangePairDB,
        strategyParams.secondExchangeAccountId,
        strategyParams.secondFee,
        config,
        strategyParams.invert,
        'Stopped',
        time,
        time
      )
    );
    const promiseValue = [];
    if (strategyParams.mainExchangeName && strategyParams.mainPairInfo) {
      promiseValue.push(
        setPairInfo(
          strategyParams.mainExchangeName,
          strategyParams.mainPairInfo
        )
      );
    }
    if (strategyParams.secondExchangeName && strategyParams.secondPairInfo) {
      promiseValue.push(
        setPairInfo(
          strategyParams.secondExchangeName,
          strategyParams.secondPairInfo
        )
      );
    }
    if (strategyParams.secondExchangeName && strategyParams.secondPairTwoInfo) {
      promiseValue.push(
        setPairInfo(
          strategyParams.secondExchangeName,
          strategyParams.secondPairTwoInfo
        )
      );
    }
    await Promise.all(promiseValue);
    return lastID;
  } catch (err) {
    if (err) {
      console.error(err);
    }
    return null;
  } finally {
    await closeConnection(db);
  }
};
export const updateStrategyConfig = async (
  id: number,
  config: string
): Promise<number | null> => {
  const db = await createConnection();
  try {
    const time = new Date().getTime();
    const stmt = db.prepare(
      `UPDATE strategy SET arguments = ? , updateTime = ? WHERE id = ?`
    );
    return await withRetry<number>(() => stmt.run(config, time, id));
  } catch (err) {
    if (err) {
      console.error(err);
    }
    return null;
  } finally {
    await closeConnection(db);
  }
};
export const getPairInfo = async (
  exchangeName: ExchangeName,
  pairId: string
): Promise<ICDexPairInfoDB | BinanceSymbolDB | null> => {
  const db = await createConnection();
  try {
    if (exchangeName === ExchangeName.ICDex) {
      const stmt = db.prepare('SELECT * FROM ICDexPairInfo WHERE pairId = ?');
      return await withRetry<ICDexPairInfoDB>(() => stmt.get(pairId));
    } else if (exchangeName === ExchangeName.Binance) {
      const stmt = db.prepare('SELECT * FROM binancePairInfo WHERE symbol = ?');
      return await withRetry<BinanceSymbolDB>(() => stmt.get(pairId));
    }
    return null;
  } catch (err) {
    if (err) {
      console.error(err);
    }
    return null;
  } finally {
    await closeConnection(db);
  }
};
export const insertOrUpdateBinanceOrderInfo = async (
  strategyId: number,
  info: TradeResponseFULL
): Promise<void> => {
  const db = await createConnection();
  try {
    const row = await withRetry<BinanceOrderInfoDB>(() =>
      db
        .prepare('SELECT * FROM binanceOrderInfo WHERE orderId = ?')
        .get(info.orderId.toString(10))
    );
    const time = new Date().getTime();
    if (!row) {
      const setBinanceOrderInfo = db.prepare(
        `INSERT INTO binanceOrderInfo (strategyId, symbol, orderId, status, side, orderType, price, origQty, executedQty, origQuoteOrderQty, cummulativeQuoteQty, fills, time, updateTime) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );
      return await withRetry(() =>
        setBinanceOrderInfo.run(
          strategyId,
          info.symbol,
          info.orderId.toString(10),
          info.status,
          info.side,
          info.type,
          info.price,
          info.origQty,
          info.executedQty,
          info.origQuoteOrderQty,
          info.cummulativeQuoteQty,
          JSON.stringify(info.fills),
          time,
          time
        )
      );
    } else {
      const fills = JSON.parse(row.fills) as Array<BinanceOrderInfoFill>;
      if (fills && fills.length) {
        fills.unshift(...info.fills);
      }
      const stmt = db.prepare(
        `UPDATE binanceOrderInfo SET status = ? , price = ? , origQty = ? , executedQty = ? , origQuoteOrderQty = ? , cummulativeQuoteQty = ?, fills = ?, updateTime = ? WHERE orderId = ?`
      );
      return await withRetry(() =>
        stmt.run(
          strategyId,
          info.status,
          info.price,
          info.origQty,
          info.executedQty,
          info.origQuoteOrderQty,
          info.cummulativeQuoteQty,
          JSON.stringify(fills),
          time,
          info.orderId.toString(10)
        )
      );
    }
  } catch (err) {
    if (err) {
      console.error(err);
    }
  } finally {
    await closeConnection(db);
  }
};
export const insertOrUpdateICDexOrderInfo = async (
  strategyId: number,
  pairId: string,
  txid: string
): Promise<void> => {
  const db = await createConnection();
  try {
    const service = new ICDexService();
    const row = await withRetry(() =>
      db.prepare('SELECT * FROM ICDexOrderInfo WHERE orderId = ?').get(txid)
    );
    const time = new Date().getTime();
    const res = await service.statusByTxid(pairId, hexToBytes(txid));
    if (!row) {
      const setICDexOrderInfo = db.prepare(
        `INSERT INTO ICDexOrderInfo (strategyId, pairId, orderId, status, tradingStatus, orderType, account, orderPrice, origOrder, filled, details, remaining, fee, time, updateTime) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );
      if (res) {
        const status = Object.keys(res)[0];
        let orderType = '';
        if (status === 'Completed') {
          const val = Object.values(res)[0] as TxnRecord;
          const tradingStatus = Object.keys(val.status)[0];
          if (val.orderType && val.orderType.length) {
            orderType = Object.keys(val.orderType[0])[0];
          }
          return await withRetry(() =>
            setICDexOrderInfo.run(
              strategyId,
              pairId,
              txid,
              status,
              tradingStatus,
              orderType,
              toHexString(new Uint8Array(val.account)),
              '',
              JSON.stringify(val.order, (key, value) =>
                typeof value === 'bigint' ? value.toString(10) : value
              ),
              JSON.stringify(val.filled, (key, value) =>
                typeof value === 'bigint' ? value.toString(10) : value
              ),
              JSON.stringify(val.details, (key, value) =>
                typeof value === 'bigint' ? value.toString(10) : value
              ),
              '',
              JSON.stringify(val.fee, (key, value) =>
                typeof value === 'bigint' ? value.toString(10) : value
              ),
              time,
              time
            )
          );
        } else if (status === 'Pending') {
          const val = Object.values(res)[0] as TradingOrder;
          const tradingStatus = Object.keys(val.status)[0];
          return await withRetry(() =>
            setICDexOrderInfo.run(
              strategyId,
              pairId,
              txid,
              status,
              tradingStatus,
              orderType,
              toHexString(new Uint8Array(val.account)),
              JSON.stringify(val.orderPrice, (key, value) =>
                typeof value === 'bigint' ? value.toString(10) : value
              ),
              '',
              JSON.stringify(val.filled, (key, value) =>
                typeof value === 'bigint' ? value.toString(10) : value
              ),
              '',
              JSON.stringify(val.remaining, (key, value) =>
                typeof value === 'bigint' ? value.toString(10) : value
              ),
              JSON.stringify(val.fee, (key, value) =>
                typeof value === 'bigint' ? value.toString(10) : value
              ),
              time,
              time
            )
          );
        }
      }
    } else {
      const stmt = db.prepare(
        `UPDATE ICDexOrderInfo SET status = ? , tradingStatus = ? , filled = ? , details = ? , remaining = ? , fee = ? , updateTime = ? WHERE orderId = ?`
      );
      if (res) {
        const status = Object.keys(res)[0];
        if (status === 'Completed') {
          const val = Object.values(res)[0] as TxnRecord;
          const tradingStatus = Object.keys(val.status)[0];
          return await withRetry(() =>
            stmt.run(
              status,
              tradingStatus,
              JSON.stringify(val.filled, (key, value) =>
                typeof value === 'bigint' ? value.toString(10) : value
              ),
              JSON.stringify(val.details, (key, value) =>
                typeof value === 'bigint' ? value.toString(10) : value
              ),
              '',
              JSON.stringify(val.fee, (key, value) =>
                typeof value === 'bigint' ? value.toString(10) : value
              ),
              time,
              txid
            )
          );
        } else if (status === 'Pending') {
          const val = Object.values(res)[0] as TradingOrder;
          const tradingStatus = Object.keys(val.status)[0];
          return await withRetry(() =>
            stmt.run(
              status,
              tradingStatus,
              JSON.stringify(val.filled, (key, value) =>
                typeof value === 'bigint' ? value.toString(10) : value
              ),
              '',
              JSON.stringify(val.remaining, (key, value) =>
                typeof value === 'bigint' ? value.toString(10) : value
              ),
              JSON.stringify(val.fee, (key, value) =>
                typeof value === 'bigint' ? value.toString(10) : value
              ),
              time,
              txid
            )
          );
        }
      }
    }
  } catch (err) {
    if (err) {
      console.error(err);
    }
  } finally {
    await closeConnection(db);
  }
};
export const setPairInfo = async (
  exchangeName: ExchangeName,
  pairInfo: string
): Promise<boolean> => {
  const db = await createConnection();
  const time = new Date().getTime();
  try {
    const setICDexPairInfo = db.prepare(
      `INSERT INTO ICDexPairInfo (pairId, token0, token1, token0Info, token1Info, setting, paused, time, updateTime) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    const setBinancePairInfo = db.prepare(
      `INSERT INTO binancePairInfo (symbol, baseAsset, baseAssetPrecision, quoteAsset, quoteAssetPrecision, filters, status, time, updateTime) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    if (exchangeName === ExchangeName.ICDex) {
      const ICDexPainInfo = JSON.parse(pairInfo) as ICDexPairInfo;
      const row = await withRetry(() =>
        db
          .prepare('SELECT * FROM ICDexPairInfo WHERE pairId = ?')
          .get(ICDexPainInfo.pairId)
      );
      if (!row) {
        return await withRetry(() =>
          setICDexPairInfo.run(
            ICDexPainInfo.pairId,
            JSON.stringify(ICDexPainInfo.token0),
            JSON.stringify(ICDexPainInfo.token1),
            JSON.stringify(ICDexPainInfo.token0Info),
            JSON.stringify(ICDexPainInfo.token1Info),
            JSON.stringify(ICDexPainInfo.setting),
            ICDexPainInfo.paused ? 1 : 0,
            time,
            time
          )
        );
      }
    } else if (exchangeName === ExchangeName.Binance) {
      const binancePairInfo = JSON.parse(pairInfo) as BinanceSymbol;
      const row = await withRetry(() =>
        db
          .prepare('SELECT * FROM binancePairInfo WHERE symbol = ?')
          .get(binancePairInfo.symbol)
      );
      if (!row) {
        return await withRetry(() =>
          setBinancePairInfo.run(
            binancePairInfo.symbol,
            binancePairInfo.baseAsset,
            binancePairInfo.baseAssetPrecision,
            binancePairInfo.quoteAsset,
            binancePairInfo.quoteAssetPrecision,
            JSON.stringify(binancePairInfo.filters),
            binancePairInfo.status,
            time,
            time
          )
        );
      }
    }
    return true;
  } catch (err) {
    if (err) {
      console.error(err);
    }
    return false;
  } finally {
    await closeConnection(db);
  }
};
export const insertOrderIdOrUpdate = async (
  strategyId: number,
  mainExchangeOrderId: string,
  secondExchangeOrderId: ExchangeOrderId | null,
  mainExchangeErrorMessage: string,
  secondExchangeErrorMessage: string,
  status: OrdersStatus
): Promise<void> => {
  const db = await createConnection();
  const time = new Date().getTime();
  try {
    if (mainExchangeErrorMessage || secondExchangeErrorMessage) {
      status = OrdersStatus.Failed;
    }
    let secondExchangeOrderIdDB: Array<ExchangeOrderId> = [];
    if (secondExchangeOrderId) {
      secondExchangeOrderIdDB = [secondExchangeOrderId];
    }
    const row = await withRetry<OrderDB>(() =>
      db
        .prepare('SELECT * FROM orders WHERE mainExchangeOrderId = ?')
        .get(mainExchangeOrderId)
    );
    if (!row) {
      const stmt = db.prepare(
        `INSERT INTO orders (strategyId, mainExchangeOrderId, secondExchangeOrderId, mainExchangeErrorMessage, secondExchangeErrorMessage, status, time, updateTime) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      );
      const res = await withRetry<RunResult>(() =>
        stmt.run(
          strategyId,
          mainExchangeOrderId,
          JSON.stringify(secondExchangeOrderIdDB),
          mainExchangeErrorMessage,
          secondExchangeErrorMessage,
          status,
          time,
          time
        )
      );
      if (status === OrdersStatus.Completed || status === OrdersStatus.Failed) {
        await archiveOrder(res.lastInsertRowid as number);
      }
    } else {
      if (secondExchangeOrderId && row.secondExchangeOrderId) {
        secondExchangeOrderIdDB = JSON.parse(
          row.secondExchangeOrderId
        ) as Array<ExchangeOrderId>;
        secondExchangeOrderIdDB.unshift(secondExchangeOrderId);
      }
      const stmt = db.prepare(
        `UPDATE orders SET secondExchangeOrderId = ? , mainExchangeErrorMessage = ? , secondExchangeErrorMessage = ? , status = ? , updateTime = ? WHERE mainExchangeOrderId = ?`
      );
      await withRetry(() =>
        stmt.run(
          JSON.stringify(secondExchangeOrderIdDB),
          mainExchangeErrorMessage,
          secondExchangeErrorMessage,
          status,
          time,
          mainExchangeOrderId
        )
      );
      if (status === OrdersStatus.Completed || status === OrdersStatus.Failed) {
        await archiveOrder(row.id);
      }
    }
  } catch (err) {
    if (err) {
      console.error(err);
    }
  } finally {
    await closeConnection(db);
  }
};
export const updateBalanceChanges = async (
  strategyId: number,
  token0Change: string | undefined,
  token1Change: string | undefined,
  mainExchangeOrderId: string | undefined,
  secondExchangeOrderId: string | undefined
): Promise<number> => {
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
  const db = await createConnection();
  try {
    const res = await getBalanceChanges(strategyId);
    if (res && res.token0Balance) {
      token0 = res.token0Balance;
    }
    if (res && res.token1Balance) {
      token1 = res.token1Balance;
    }
    if (token0Change) {
      token0Balance = new BigNumber(token0).plus(token0Change).toNumber();
    }
    if (token1Change) {
      token1Balance = new BigNumber(token1).plus(token1Change).toNumber();
    }
    if (token0Change || token1Change) {
      const updateTime = new Date().getTime();
      const stmt = db.prepare(
        `INSERT INTO balanceChanges (strategyId, mainExchangeOrderId, secondExchangeOrderId, token0Balance, token0Change, token1Balance, token1Change, updateTime) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      );
      return await withRetry(() =>
        stmt.run(
          strategyId,
          mainExchangeOrderId,
          secondExchangeOrderId,
          token0Balance,
          token0Change,
          token1Balance,
          token1Change,
          updateTime
        )
      );
    }
  } catch (err) {
    if (err) {
      console.error(err);
    }
  } finally {
    await closeConnection(db);
  }
  return 0;
};
export const getBalanceChanges = async (
  strategyId: number
): Promise<BalanceChanges | null> => {
  const db = await createConnection();
  const stmt = db.prepare(
    'SELECT * FROM balanceChanges WHERE strategyId = ? ORDER BY id DESC LIMIT 1'
  );
  try {
    return await withRetry(() => stmt.all(strategyId));
  } catch (err) {
    if (err) {
      console.error(err);
    }
    return null;
  } finally {
    await closeConnection(db);
  }
};
export const getBalanceChangesByMainExchangeOrderId = async (
  strategyId: number,
  mainExchangeOrderId: string,
  isToken0: boolean
): Promise<{ add: string; subtract: string }> => {
  const db = await createConnection();
  const stmt = db.prepare(
    'SELECT * FROM balanceChanges WHERE strategyId = ? And mainExchangeOrderId = ?'
  );
  try {
    const res = await withRetry<Array<BalanceChanges>>(() =>
      stmt.all(strategyId, mainExchangeOrderId)
    );
    if (res && res.length) {
      let add = '0';
      let subtract = '0';
      res.forEach((item) => {
        if (isToken0) {
          if (new BigNumber(item.token0Change).lt(0)) {
            subtract = new BigNumber(-item.token0Change)
              .plus(subtract)
              .toString(10);
          }
          if (new BigNumber(item.token0Change).gt(0)) {
            add = new BigNumber(item.token0Change).plus(add).toString(10);
          }
        } else if (!isToken0) {
          if (new BigNumber(item.token1Change).lt(0)) {
            subtract = new BigNumber(-item.token1Change)
              .plus(subtract)
              .toString(10);
          }
          if (new BigNumber(item.token1Change).gt(0)) {
            add = new BigNumber(item.token1Change).plus(add).toString(10);
          }
        }
      });
      return { add: add, subtract: subtract };
    }
  } catch (err) {
    if (err) {
      console.error(err);
    }
  } finally {
    await closeConnection(db);
  }
  return { add: '0', subtract: '0' };
};
export const getBalanceChangesByOrderId = async (
  strategyId: number,
  mainExchangeOrderId: string,
  secondExchangeOrderId: string
): Promise<{ token0: number; token1: number }> => {
  const db = await createConnection();
  const stmt = db.prepare(
    'SELECT * FROM balanceChanges WHERE strategyId = ? And mainExchangeOrderId = ? And secondExchangeOrderId = ?'
  );
  try {
    const res = await withRetry<Array<BalanceChanges>>(() =>
      stmt.all(strategyId, mainExchangeOrderId, secondExchangeOrderId)
    );
    if (res && res.length) {
      const data = res[0];
      return {
        token0: -data.token0Change,
        token1: -data.token1Change
      };
    }
  } catch (err) {
    if (err) {
      console.error(err);
    }
  } finally {
    await closeConnection(db);
  }
  return {
    token0: 0,
    token1: 0
  };
};
export const updateOrderIdMaker = async (
  id: number,
  status: OrdersStatus = OrdersStatus.Completed
): Promise<void> => {
  const db = await createConnection();
  const time = new Date().getTime();
  const stmt = db.prepare(
    `UPDATE orders SET status = ?, updateTime = ? WHERE id = ?`
  );
  try {
    const res = await withRetry<RunResult>(() => stmt.run(status, time, id));
    if (
      (res.changes !== 0 && status === OrdersStatus.Completed) ||
      status === OrdersStatus.Failed
    ) {
      await archiveOrder(id);
    }
  } catch (err) {
    if (err) {
      console.error(err);
    }
  } finally {
    await closeConnection(db);
  }
};
export const archiveOrder = async (orderId: number): Promise<void> => {
  const db = await createConnection();
  const stmt = db.prepare('SELECT * FROM orders WHERE id = ?');
  try {
    const res = await withRetry<Orders>(() => stmt.get(orderId));
    if (res) {
      const row = await withRetry(() =>
        db.prepare('SELECT * FROM archives WHERE id = ?').get(orderId)
      );
      if (row) {
        const deleteStmt = db.prepare(`DELETE FROM orders WHERE id = ?`);
        await withRetry(() => deleteStmt.run(orderId));
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
      await withRetry(() =>
        archivesStmt.run(
          res.strategyId,
          orderId,
          res.status,
          res.mainExchangeOrderId,
          res.secondExchangeOrderId,
          res.mainExchangeErrorMessage,
          res.secondExchangeErrorMessage,
          res.time,
          res.updateTime
        )
      );
      const deleteStmt = db.prepare(`DELETE FROM orders WHERE id = ?`);
      await withRetry(() => deleteStmt.run(orderId));
    }
  } catch (err) {
    if (err) {
      console.error(err);
    }
  } finally {
    await closeConnection(db);
  }
};
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
export const insertUser = async (
  userName: string,
  password: string
): Promise<void> => {
  const db = await createConnection();
  try {
    const time = new Date().getTime();
    const saltRounds = 10;
    const salt = await bcrypt.genSaltSync(saltRounds);
    const hash = await bcrypt.hashSync(password, salt);
    const stmt = db.prepare(
      `INSERT INTO user (userName, password, salt, saltRounds, updateTime, lastLoginTime) VALUES (?, ?, ?, ?, ?, ?)`
    );
    await withRetry(() =>
      stmt.run(userName, hash, salt, saltRounds, time, time)
    );
  } catch (err) {
    if (err) {
      console.error(err);
    }
  } finally {
    await closeConnection(db);
  }
};
export const updateLoginTime = async (): Promise<number | null> => {
  const db = await createConnection();
  try {
    const time = new Date().getTime();
    const stmt = db.prepare(`UPDATE user SET lastLoginTime = ?`);
    return await withRetry<number>(() => stmt.run(time));
  } catch (err) {
    if (err) {
      console.error(err);
    }
    return null;
  } finally {
    await closeConnection(db);
  }
};
export const getUser = async (): Promise<User | null> => {
  const db = await createConnection();
  const stmt = db.prepare('SELECT * FROM user');
  try {
    return await withRetry(() => stmt.get());
  } catch (err) {
    if (err) {
      console.error(err);
    }
    return null;
  } finally {
    await closeConnection(db);
  }
};
export const withRetry = async <T>(
  operation: any,
  maxRetries = 3,
  delayMs = 100
): Promise<T> => {
  let retries = 0;
  let lastError;
  while (retries < maxRetries) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (error.code === 'SQLITE_BUSY') {
        retries++;
        console.warn(`${retries} retries, Error: ${error.message}`);
        await new Promise((resolve) => setTimeout(resolve, delayMs * retries));
      } else {
        throw error;
      }
    }
  }
  throw new Error(
    `The operation failed and the maximum number of retries has been reached (${maxRetries})，Error: ${lastError.message}`
  );
};
