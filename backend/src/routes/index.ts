import BigNumber from 'bignumber.js';
import { Request, Response, Router } from 'express';
import {
  AccountInfo,
  AvgPriceInfo,
  BinancePrice,
  BinanceSymbolDB,
  Depth,
  ErrorData,
  ExchangeInfo,
  ICDexPairInfoDB,
  OrderInfo
} from '../ic/model';
import {
  getAccountInfo,
  getAvgPrice,
  getDepth,
  getExchangeInfo,
  getOrderInfo,
  getTickerPrice,
  testConnectivity,
  tradeOfBinanceTest
} from '../ic/binance';
import {
  addExchangeAccount,
  addStrategy,
  deleteStrategyStatus,
  getAccounts,
  getBalanceChangesByMainExchangeOrderId,
  getExchangeAccounts,
  getExchanges,
  getPairInfo,
  getRobotType,
  getStrategies,
  getStrategy,
  getUser,
  insertUser,
  queryOrders,
  updateStrategyConfig,
  updateStrategyStatus
} from '../db';
import {
  Account,
  Exchange,
  ExchangeName,
  OrdersRow,
  OrderStatus,
  RobotType,
  Strategies,
  Strategy,
  StrategyParams,
  StrategyStatus,
  User
} from '../model';
import { cancelAll, runStrategy } from '../trade';
import { NextFunction } from 'express-serve-static-core';
import bcrypt from 'bcrypt';
import { Balance } from '../trade/model';

const router = Router();

const basicAuth = require('basic-auth');

export const auth = async (req: Request, res: Response, next: NextFunction) => {
  if (req.originalUrl && req.originalUrl === '/getUser') {
    next();
    return;
  }
  const user = basicAuth(req);
  let verify = true;
  const userLocal = await getUser();
  if (userLocal && user && user.pass) {
    verify = user.pass === userLocal.password;
    if (!verify) {
      verify = await bcrypt.compareSync(user.pass, userLocal.password);
    }
  }
  if (!userLocal) {
    if (user && user.name && user.pass) {
      await insertUser(user.name, user.pass);
    } else {
      res.set('WWW-Authenticate', 'Basic realm="Secure Area"');
      return res.status(401).send('Access denied: Invalid credentials.');
    }
  } else {
    if (
      user &&
      user.name &&
      user.pass &&
      user.name === userLocal.userName &&
      verify
    ) {
      //
    } else {
      res.set('WWW-Authenticate', 'Basic realm="Secure Area"');
      return res.status(401).send('Access denied: Invalid credentials.');
    }
  }
  next();
};
router.use(auth);

let rateLimit = 0;
const clientsTrade = new Map();
router.get(
  '/getAccountInfo',
  async (
    req: Request<{}, {}, {}, { accountId: number }>,
    res: Response<AccountInfo | ErrorData | null>
  ) => {
    const { accountId } = req.query;
    if (rateLimit) {
      return res.status(400).json({
        code: 429,
        msg: rateLimit.toString(10)
      });
    }
    const response = await getAccountInfo(accountId);
    if (
      response &&
      ((response as ErrorData).code || (response as ErrorData).code === 0)
    ) {
      if (
        (response as ErrorData).code === 429 ||
        (response as ErrorData).code === 418
      ) {
        // todo stop robot
        if (
          (response as ErrorData).msg &&
          rateLimit < Number((response as ErrorData).msg)
        ) {
          rateLimit = Number((response as ErrorData).msg);
        }
        if (!(response as ErrorData).msg) {
          (response as ErrorData).msg = rateLimit.toString(10);
        }
      }
      res.status(400).json(response);
    } else {
      res.status(200).json(response);
    }
  }
);
router.get(
  '/getExchangeInfo',
  async (
    req: Request<{}, {}, {}, { symbol: string }>,
    res: Response<ExchangeInfo | ErrorData>
  ) => {
    if (rateLimit) {
      return res.status(400).json({
        code: 429,
        msg: rateLimit.toString(10)
      });
    }
    const response = await getExchangeInfo(req.query.symbol);
    if (
      response &&
      ((response as ErrorData).code || (response as ErrorData).code === 0)
    ) {
      if (
        (response as ErrorData).code === 429 ||
        (response as ErrorData).code === 418
      ) {
        if (
          (response as ErrorData).msg &&
          rateLimit < Number((response as ErrorData).msg)
        ) {
          rateLimit = Number((response as ErrorData).msg);
        }
        if (!(response as ErrorData).msg) {
          (response as ErrorData).msg = rateLimit.toString(10);
        }
      }
      res.status(400).json(response);
    } else {
      res.status(200).json(response);
    }
  }
);
router.get(
  '/getAvgPrice',
  async (
    req: Request<{}, {}, {}, { symbol: string }>,
    res: Response<AvgPriceInfo | ErrorData>
  ) => {
    if (rateLimit) {
      return res.status(400).json({
        code: 429,
        msg: rateLimit.toString(10)
      });
    }
    const response = await getAvgPrice(req.query.symbol);
    if (
      response &&
      ((response as ErrorData).code || (response as ErrorData).code === 0)
    ) {
      if (
        (response as ErrorData).code === 429 ||
        (response as ErrorData).code === 418
      ) {
        if (
          (response as ErrorData).msg &&
          rateLimit < Number((response as ErrorData).msg)
        ) {
          rateLimit = Number((response as ErrorData).msg);
        }
        if (!(response as ErrorData).msg) {
          (response as ErrorData).msg = rateLimit.toString(10);
        }
      }
      res.status(400).json(response);
    } else {
      res.status(200).json(response);
    }
  }
);
router.post(
  '/tradeOfBinanceTest',
  async (
    req: Request<
      {},
      {},
      {
        APIKey: string;
        privateKey: string;
        symbol: string;
        quantity: number;
      }
    >,
    res: Response
  ) => {
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
    const tradeTestResponse = await tradeOfBinanceTest(
      symbol,
      quantity,
      APIKey,
      privateKey
    );
    if (tradeTestResponse && (tradeTestResponse as ErrorData).code) {
      if (
        (tradeTestResponse as ErrorData).code === 429 ||
        (tradeTestResponse as ErrorData).code === 418
      ) {
        rateLimit = Number((tradeTestResponse as ErrorData).msg);
      }
      res.status(200).json(tradeTestResponse);
    } else {
      res.status(200).json(tradeTestResponse);
    }
  }
);
router.get(
  '/testConnectivity',
  async (req: Request, res: Response<boolean>) => {
    const response = await testConnectivity();
    res.status(200).json(response);
  }
);
router.get(
  '/getDepth',
  async (
    req: Request<{}, {}, {}, { symbol: string }>,
    res: Response<Depth | ErrorData>
  ) => {
    const { symbol } = req.query;
    const response = await getDepth(symbol);
    if (
      response &&
      ((response as ErrorData).code || (response as ErrorData).code === 0)
    ) {
      res.status(400).json(response);
    } else {
      res.status(200).json(response);
    }
  }
);
router.get(
  '/getTickerPrice',
  async (
    req: Request<{}, {}, {}, { symbol: string }>,
    res: Response<BinancePrice | ErrorData>
  ) => {
    const { symbol } = req.query;
    const response = await getTickerPrice(symbol);
    if (
      response &&
      ((response as ErrorData).code || (response as ErrorData).code === 0)
    ) {
      res.status(400).json(response);
    } else {
      res.status(200).json(response);
    }
  }
);
router.get(
  '/getStrategies',
  async (
    req: Request<{}, {}, {}, { page: number; pageSize: number }>,
    res: Response<Strategies | null>
  ) => {
    const { page, pageSize } = req.query;
    const response = await getStrategies(Number(page), Number(pageSize));
    if (response) {
      res.status(200).json(response);
    } else {
      res.status(400).json(response);
    }
  }
);
router.get(
  '/getStrategy',
  async (
    req: Request<{}, {}, {}, { id: number }>,
    res: Response<Strategy | null>
  ) => {
    const { id } = req.query;
    const response = await getStrategy(Number(id));
    if (response) {
      res.status(200).json(response);
    } else {
      res.status(400).json(response);
    }
  }
);
router.get(
  '/getRobotType',
  async (req: Request, res: Response<Array<RobotType>>) => {
    const response = await getRobotType();
    res.status(200).json(response);
  }
);
router.get(
  '/getExchanges',
  async (req: Request, res: Response<Array<Exchange>>) => {
    const response = await getExchanges();
    res.status(200).json(response);
  }
);
router.get(
  '/getExchangeAccounts',
  async (
    req: Request<{}, {}, {}, { exchangeId: number }>,
    res: Response<Array<Account>>
  ) => {
    const { exchangeId } = req.query;
    const response = await getExchangeAccounts(exchangeId);
    res.status(200).json(response);
  }
);
router.get(
  '/getAccounts',
  async (req: Request, res: Response<Array<Account>>) => {
    const response = await getAccounts();
    res.status(200).json(response);
  }
);
router.post(
  '/addExchangeAccount',
  (
    req: Request<{}, {}, { exchangeId: number; name: string; value: string }>,
    res: Response
  ) => {
    const { exchangeId, name, value } = req.body;
    addExchangeAccount(exchangeId, name, value)
      .then((response) => {
        res.status(200).json(response);
      })
      .catch((response) => {
        res.status(400).json(response);
      });
  }
);
router.get(
  '/getPairInfo',
  async (
    req: Request<{}, {}, {}, { pairId: string; exchangeName: ExchangeName }>,
    res: Response<ICDexPairInfoDB | BinanceSymbolDB | null>
  ) => {
    const { pairId, exchangeName } = req.query;
    const response = await getPairInfo(exchangeName, pairId);
    res.status(200).json(response);
  }
);
router.post(
  '/addStrategy',
  (
    req: Request<
      {},
      {},
      {
        config: string;
        strategyParams: StrategyParams;
      }
    >,
    res: Response
  ) => {
    const { config, strategyParams } = req.body;
    addStrategy(config, strategyParams)
      .then((response) => {
        res.status(200).json(response);
      })
      .catch((response) => {
        res.status(400).json(response);
      });
  }
);
router.post(
  '/runStrategy',
  (
    req: Request<
      {},
      {},
      {
        strategyId: number;
      }
    >,
    res: Response
  ) => {
    const { strategyId } = req.body;
    runStrategy(strategyId)
      .then((response) => {
        if (response) {
          res.status(400).json(response);
        } else {
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
  }
);
router.post(
  '/stopStrategy',
  (
    req: Request<
      {},
      {},
      {
        strategyId: number;
      }
    >,
    res: Response
  ) => {
    const { strategyId } = req.body;
    updateStrategyStatus(strategyId, StrategyStatus.Stopped)
      .then((response) => {
        res.status(200).json(response);
      })
      .catch((e) => {
        res.status(400).json(e);
      });
  }
);
router.post('/cancelAll', (req: Request, res: Response) => {
  cancelAll()
    .then(() => {
      res.status(200).json('Success');
    })
    .catch(() => {
      res.status(400).json('Error');
    });
});
router.post(
  '/deleteStrategy',
  (
    req: Request<
      {},
      {},
      {
        strategyId: number;
      }
    >,
    res: Response
  ) => {
    const { strategyId } = req.body;
    deleteStrategyStatus(strategyId)
      .then((response) => {
        res.status(200).json(response);
      })
      .catch((e) => {
        res.status(400).json(e);
      });
  }
);
router.post(
  '/updateStrategyConfig',
  (
    req: Request<
      {},
      {},
      {
        id: number;
        config: string;
      }
    >,
    res: Response
  ) => {
    const { config, id } = req.body;
    updateStrategyConfig(id, config)
      .then((response) => {
        res.status(200).json(response);
      })
      .catch((response) => {
        res.status(400).json(response);
      });
  }
);
router.get(
  '/getOrders',
  async (
    req: Request<
      {},
      {},
      {},
      {
        page: number;
        pageSize: number;
        status: OrderStatus;
        strategyId: string;
      }
    >,
    res: Response<OrdersRow | null>
  ) => {
    const { page, pageSize, status, strategyId } = req.query;
    const response = await queryOrders({
      page: Number(page),
      pageSize: Number(pageSize),
      status: status,
      strategyId: strategyId === 'all' ? undefined : Number(strategyId)
    });
    if (response) {
      res.status(200).json(response);
    } else {
      res.status(400).json(response);
    }
  }
);
router.get(
  '/getBinanceOrderInfo',
  async (
    req: Request<
      {},
      {},
      {},
      { APIKey: string; privateKey: string; symbol: string; orderId: string }
    >,
    res: Response<OrderInfo | ErrorData>
  ) => {
    const { APIKey, privateKey, symbol, orderId } = req.query;
    const response = await getOrderInfo(
      APIKey,
      privateKey,
      symbol,
      Number(orderId)
    );
    if (response) {
      res.status(200).json(response);
    } else {
      res.status(400).json(response);
    }
  }
);
router.get('/getUser', async (req: Request, res: Response<User | null>) => {
  const response = await getUser();
  if (response) {
    res.status(200).json(response);
  } else {
    res.status(400).json(response);
  }
});
router.get(
  '/getBalanceChangesByMainExchangeOrderId',
  async (
    req: Request<
      {},
      {},
      {},
      { strategyId: number; mainExchangeOrderId: string }
    >,
    res: Response<{ token0: number; token1: number } | null>
  ) => {
    try {
      const { strategyId, mainExchangeOrderId } = req.query;
      const token0 = await getBalanceChangesByMainExchangeOrderId(
        strategyId,
        mainExchangeOrderId,
        true
      );
      const token1 = await getBalanceChangesByMainExchangeOrderId(
        strategyId,
        mainExchangeOrderId,
        false
      );
      const filled = {
        token0: Number(token0.subtract),
        token1: Number(token1.subtract)
      };
      res.status(200).json(filled);
    } catch (e) {
      res.status(400).json(null);
    }
  }
);
router.get('/events', (req: Request<{}, {}, {}, { type?: string }>, res) => {
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
  } else {
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
export const sendEventToClients = (
  strategyId: number,
  message: string,
  type?: string
) => {
  if (type && type === 'Trade') {
    const client = clientsTrade.get('Trade');
    if (client) {
      client.write(`data: ${message}\n\n`);
    }
  } else {
    const client = clientsTrade.get('Events');
    if (client) {
      client.write(`data: ${message}\n\n`);
    }
  }
};
export default router;
