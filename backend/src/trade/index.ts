import BigNumber from 'bignumber.js';
import {
  getAccount,
  getAllPendingOrders,
  getBalanceChanges,
  getBalanceChangesByMainExchangeOrderId,
  getExchanges,
  getInfo,
  getPairInfo,
  getPendingOrders,
  getRobotType,
  getStrategiesError,
  getStrategy,
  insertOrderIdOrUpdate,
  insertOrUpdateBinanceOrderInfo,
  insertOrUpdateICDexOrderInfo,
  updateBalanceChanges,
  updateOrderIdMaker,
  updateStrategyStatus
} from '../db';
import {
  Account,
  AccountStatus,
  BinanceOrderInfo,
  DexSetting,
  ExchangeName,
  ICDexOrderInfo,
  OrdersStatus,
  RobotName,
  Strategy,
  StrategyStatus,
  TokenInfo
} from '../model';
import {
  Balance,
  BalanceChangesType,
  BinanceConfig,
  DepthToken,
  ExchangeOrderId,
  Filters,
  ICDexConfig,
  MakerConfig,
  PendingOrdersBinance,
  PendingOrdersICDex,
  TimerConfig
} from './model';
import { hexToBytes, identityFromPem, toHexString } from '../ic/converter';
import { Identity } from '@dfinity/agent';
import { ICDexService } from '../ic/ICDex/ICDexService';
import {
  AccountInfo,
  BinanceBuyResponse,
  BinanceOrder,
  BinanceSellResponse,
  BinanceSymbolDB,
  BooleanType,
  Depth,
  ErrorData,
  ICDexBuyResponse,
  ICDexOrder,
  ICDexPairInfoDB,
  ICDexSellResponse,
  OrderInfo,
  Side,
  TradeResponseFULL
} from '../ic/model';
import {
  cancelOrder,
  getAccountInfo,
  getDepth,
  getOrderInfo,
  openOrders
} from '../ic/binance';
import { clearTimeout, setTimeout } from 'timers';
import {
  filterSide,
  getICDexBuyResponse,
  getICDexSellResponse,
  getICDexToken0AndToken1,
  getICDexToken0BuyMarket,
  getICDexToken0SellMarket,
  getICDexToken1AndToken0,
  onICDexBuy,
  onICDexSell
} from './ICDexTrade';
import {
  getBinanceFilter,
  getBinanceToken0BuyMarket,
  getBinanceToken0SellMarket,
  getBinanceToken1,
  getBinanceToken1AndToken0,
  getBinanceToken1AndToken0ByOrderAmount,
  onBinanceBuy,
  onBinanceSell
} from './binanceTrade';
import { OrderPrice } from '../ic/ICDex/ICDex.idl';
const interval = 5 * 1000;
const binanceAccountInfo: {
  [key: string]: {
    time: number;
    info: AccountInfo;
  };
} = {};
const intervalId: { [key: string]: NodeJS.Timeout } = {};
const pendingMax = 5;
const errorMax = 3;
export const runStrategy = async (
  strategyId: number,
  init = true
): Promise<string> => {
  const strategy = await getStrategy(strategyId);
  if (strategy) {
    console.log(!init, strategy.status);
    if (init && strategy.status === StrategyStatus.Running) {
      return 'Strategy is running';
    }
    if (!init && strategy.status === StrategyStatus.Stopped) {
      return 'Strategy is stopped';
    }
    if (intervalId[strategyId]) {
      delete intervalId[strategyId];
      clearTimeout(intervalId[strategyId]);
    }
    const mainExchangeAccount = await getAccount(
      strategy.mainExchangeAccountId
    );
    const secondExchangeAccount = await getAccount(
      strategy.secondExchangeAccountId
    );
    const exchanges = await getExchanges();
    const exchange: { [key: number]: ExchangeName } = {};
    exchanges.forEach((item) => {
      exchange[item.id] = item.name;
    });
    const robotTypes = await getRobotType();
    const robotType: { [key: number]: RobotName } = {};
    robotTypes.forEach((item) => {
      robotType[item.id] = item.name;
    });
    if (mainExchangeAccount && secondExchangeAccount) {
      if (mainExchangeAccount.status === AccountStatus.Unavailable) {
        return `${exchange[strategy.mainExchangeId]} ${
          mainExchangeAccount.name
        } Account Unavailable.`;
      }
      if (secondExchangeAccount.status === AccountStatus.Unavailable) {
        return `${exchange[strategy.mainExchangeId]} ${
          secondExchangeAccount.name
        } Account Unavailable.`;
      }
      await toRun(
        strategy,
        exchange,
        robotType,
        mainExchangeAccount,
        secondExchangeAccount
      );
      // todo errs = 3 -> stop
      const orders = await getStrategiesError(strategy.id, strategy.updateTime);
      if (orders && orders.length >= errorMax) {
        await updateStrategyStatus(strategyId, StrategyStatus.Stopped);
        return '';
      }
      const config = JSON.parse(strategy.arguments) as TimerConfig;
      let interval = 1000 * 60;
      if (robotType[strategy.typeId] === RobotName.Timer) {
        interval = Number(config.interval) * 1000 * 60;
      } else {
        // 3S
        interval = Number(config.interval) * 1000;
      }
      const range = interval * 0.1;
      const min = interval - range;
      const max = interval + range;
      const intervalTime = Math.floor(Math.random() * (max - min + 1)) + min;
      intervalId[strategy.id] = setTimeout(() => {
        console.log('intervalId');
        runStrategy(strategy.id, false);
      }, intervalTime);
    }
  }
  return '';
};
export const toRun = async (
  strategy: Strategy,
  exchange: { [key: number]: ExchangeName },
  robotType: { [key: number]: RobotName },
  mainExchangeAccount: Account,
  secondExchangeAccount: Account
): Promise<string> => {
  const mainPairInfo = await getPairInfo(
    exchange[strategy.mainExchangeId],
    strategy.mainExchangePair
  );
  const secondExchangePair = strategy.secondExchangePair.split(',');
  const secondPairInfo = await getPairInfo(
    exchange[strategy.secondExchangeId],
    secondExchangePair[0]
  );
  let secondPairInfoTwo = null;
  if (secondExchangePair.length === 2) {
    secondPairInfoTwo = await getPairInfo(
      exchange[strategy.secondExchangeId],
      secondExchangePair[1]
    );
  }
  if (
    mainExchangeAccount &&
    secondExchangeAccount &&
    mainPairInfo &&
    secondPairInfo
  ) {
    const mainAccount = getAccountValue(
      exchange[strategy.mainExchangeId],
      mainExchangeAccount.value
    );
    const secondAccount = getAccountValue(
      exchange[strategy.secondExchangeId],
      secondExchangeAccount.value
    );
    if (mainAccount && secondAccount) {
      const mainAccountBalance = await getBalance(
        strategy.mainExchangeAccountId,
        exchange[strategy.mainExchangeId],
        mainPairInfo,
        mainAccount
      );
      const secondAccountBalance = await getBalance(
        strategy.secondExchangeAccountId,
        exchange[strategy.secondExchangeId],
        secondPairInfo,
        secondAccount
      );
      let secondAccountTwoBalance = null;
      if (secondPairInfoTwo) {
        secondAccountTwoBalance = await getBalance(
          strategy.secondExchangeAccountId,
          exchange[strategy.secondExchangeId],
          secondPairInfoTwo,
          secondAccount
        );
      }
      if (robotType[strategy.typeId] === RobotName.Timer) {
        return await toRunTimer(
          strategy,
          exchange,
          mainPairInfo,
          mainAccount,
          mainAccountBalance,
          secondPairInfo,
          secondAccount,
          secondAccountBalance,
          secondPairInfoTwo,
          secondAccountTwoBalance
        );
      } else if (robotType[strategy.typeId] === RobotName.Maker) {
        return await toRunMaker(
          strategy,
          exchange,
          mainPairInfo,
          mainAccount,
          mainAccountBalance,
          secondPairInfo,
          secondAccount,
          secondAccountBalance,
          secondPairInfoTwo,
          secondAccountTwoBalance
        );
      }
    }
  }
  return '';
};
export const toRunMaker = async (
  strategy: Strategy,
  exchange: { [key: number]: ExchangeName },
  mainPairInfo: ICDexPairInfoDB | BinanceSymbolDB,
  mainAccount: Identity | BinanceConfig,
  mainAccountBalance: Balance,
  secondPairInfo: ICDexPairInfoDB | BinanceSymbolDB,
  secondAccount: Identity | BinanceConfig,
  secondAccountBalance: Balance,
  secondPairInfoTwo: ICDexPairInfoDB | BinanceSymbolDB | null,
  secondAccountBalanceTwo: Balance | null
): Promise<string> => {
  try {
    const mainExchangeName = exchange[strategy.mainExchangeId];
    const secondExchangeName = exchange[strategy.secondExchangeId];
    const config = JSON.parse(strategy.arguments) as MakerConfig;
    const minimumProfit = Number(config.minimumProfit) / 100;
    const minimumPriceFluctuation =
      Number(config.minimumPriceFluctuation) / 100;
    const hasPending = await hasPendingOrders(
      strategy.id,
      mainExchangeName,
      mainPairInfo,
      mainAccount
    );
    if (config && config.token1Amount && config.minimumProfit) {
      if (mainExchangeName === ExchangeName.ICDex) {
        mainAccount = mainAccount as Identity;
        mainPairInfo = mainPairInfo as ICDexPairInfoDB;
        const token0Info = JSON.parse(mainPairInfo.token0Info) as TokenInfo;
        const token1Info = JSON.parse(mainPairInfo.token1Info) as TokenInfo;
        const token0Decimals = token0Info.decimals;
        const token1Decimals = token1Info.decimals;
        const setting = JSON.parse(mainPairInfo.setting) as DexSetting;
        const unitSize = setting.UNIT_SIZE;
        let tokenMinUnit = 0;
        const tokenUnitDecimals = unitSize.length - 1; // Unit must 1+0000
        if (token0Decimals > tokenUnitDecimals) {
          // todo
          tokenMinUnit = token0Decimals - tokenUnitDecimals;
        }
        if (secondExchangeName === ExchangeName.Binance) {
          secondPairInfo = secondPairInfo as BinanceSymbolDB;
          secondPairInfoTwo = secondPairInfoTwo as BinanceSymbolDB;
          secondAccount = secondAccount as BinanceConfig;
          if (!hasPending) {
            await Promise.all([
              pendingOrderBuyICDex(
                strategy,
                minimumProfit,
                minimumPriceFluctuation,
                config,
                mainPairInfo,
                mainAccount,
                strategy.mainExchangeFee,
                mainAccountBalance,
                secondPairInfo,
                secondPairInfoTwo,
                secondAccount,
                secondAccountBalance,
                secondAccountBalanceTwo,
                strategy.secondExchangeFee,
                token0Decimals,
                token1Decimals,
                tokenMinUnit,
                unitSize,
                OrdersStatus.Pending
              ),
              pendingOrderSellICDex(
                strategy,
                minimumProfit,
                minimumPriceFluctuation,
                config,
                mainPairInfo,
                mainAccount,
                strategy.mainExchangeFee,
                mainAccountBalance,
                secondPairInfo,
                secondPairInfoTwo,
                secondAccount,
                secondAccountBalance,
                secondAccountBalanceTwo,
                strategy.secondExchangeFee,
                token0Decimals,
                token1Decimals,
                tokenMinUnit,
                unitSize,
                OrdersStatus.Pending
              )
            ]);
          } else {
            const orders = await tradeMarketPendingICDex(
              strategy,
              minimumProfit,
              mainPairInfo,
              secondPairInfo,
              secondPairInfoTwo,
              secondAccount,
              secondAccountBalance,
              secondAccountBalanceTwo,
              strategy.secondExchangeFee,
              token0Decimals,
              token1Decimals
            );
            const tradePending = await checkMarketPendingICDex(
              orders,
              strategy,
              minimumProfit,
              minimumPriceFluctuation,
              config,
              mainPairInfo,
              mainAccount,
              strategy.mainExchangeFee,
              mainAccountBalance,
              secondPairInfo,
              secondPairInfoTwo,
              secondAccount,
              secondAccountBalance,
              secondAccountBalanceTwo,
              strategy.secondExchangeFee,
              token0Decimals,
              token1Decimals,
              tokenMinUnit,
              unitSize
            );
            await Promise.all([
              pendingOrderBuyICDex(
                strategy,
                minimumProfit,
                minimumPriceFluctuation,
                config,
                mainPairInfo,
                mainAccount,
                strategy.mainExchangeFee,
                mainAccountBalance,
                secondPairInfo,
                secondPairInfoTwo,
                secondAccount,
                secondAccountBalance,
                secondAccountBalanceTwo,
                strategy.secondExchangeFee,
                token0Decimals,
                token1Decimals,
                tokenMinUnit,
                unitSize,
                OrdersStatus.Pending,
                tradePending.buyPrice
              ),
              pendingOrderSellICDex(
                strategy,
                minimumProfit,
                minimumPriceFluctuation,
                config,
                mainPairInfo,
                mainAccount,
                strategy.mainExchangeFee,
                mainAccountBalance,
                secondPairInfo,
                secondPairInfoTwo,
                secondAccount,
                secondAccountBalance,
                secondAccountBalanceTwo,
                strategy.secondExchangeFee,
                token0Decimals,
                token1Decimals,
                tokenMinUnit,
                unitSize,
                OrdersStatus.Pending,
                tradePending.sellPrice
              )
            ]);
          }
          await tradeCumulativeAmountICDex(
            strategy,
            minimumProfit,
            secondPairInfo,
            secondPairInfoTwo,
            secondAccount,
            secondAccountBalance,
            secondAccountBalanceTwo
          );
        }
      } else if (mainExchangeName === ExchangeName.Binance) {
        mainAccount = mainAccount as BinanceConfig;
        mainPairInfo = mainPairInfo as BinanceSymbolDB;
        if (secondExchangeName === ExchangeName.ICDex) {
          secondPairInfo = secondPairInfo as ICDexPairInfoDB;
          secondPairInfoTwo = secondPairInfoTwo as ICDexPairInfoDB;
          secondAccount = secondAccount as Identity;
          if (!hasPending) {
            await Promise.all([
              pendingOrderBuyBinance(
                strategy,
                minimumProfit,
                minimumPriceFluctuation,
                config,
                mainPairInfo,
                mainAccount,
                strategy.mainExchangeFee,
                mainAccountBalance,
                secondPairInfo,
                secondPairInfoTwo,
                secondAccount,
                strategy.secondExchangeFee,
                secondAccountBalance,
                secondAccountBalanceTwo,
                OrdersStatus.Pending
              ),
              pendingOrderSellBinance(
                strategy,
                minimumProfit,
                minimumPriceFluctuation,
                config,
                mainPairInfo,
                mainAccount,
                strategy.mainExchangeFee,
                mainAccountBalance,
                secondPairInfo,
                secondPairInfoTwo,
                secondAccount,
                strategy.secondExchangeFee,
                secondAccountBalance,
                secondAccountBalanceTwo,
                OrdersStatus.Pending
              )
            ]);
          } else {
            const orders = await tradeMarketPendingBinance(
              strategy,
              minimumProfit,
              mainPairInfo,
              mainAccount,
              secondPairInfo,
              secondPairInfoTwo,
              secondAccount,
              secondAccountBalance,
              secondAccountBalanceTwo
            );
            const tradePending = await checkMarketPendingBinance(
              orders,
              strategy,
              minimumProfit,
              minimumPriceFluctuation,
              config,
              mainPairInfo,
              mainAccount,
              strategy.mainExchangeFee,
              mainAccountBalance,
              secondPairInfo,
              secondPairInfoTwo,
              secondAccount,
              secondAccountBalance,
              secondAccountBalanceTwo,
              strategy.secondExchangeFee
            );
            await Promise.all([
              pendingOrderBuyBinance(
                strategy,
                minimumProfit,
                minimumPriceFluctuation,
                config,
                mainPairInfo,
                mainAccount,
                strategy.mainExchangeFee,
                mainAccountBalance,
                secondPairInfo,
                secondPairInfoTwo,
                secondAccount,
                strategy.secondExchangeFee,
                secondAccountBalance,
                secondAccountBalanceTwo,
                OrdersStatus.Pending,
                tradePending.buyPrice
              ),
              pendingOrderSellBinance(
                strategy,
                minimumProfit,
                minimumPriceFluctuation,
                config,
                mainPairInfo,
                mainAccount,
                strategy.mainExchangeFee,
                mainAccountBalance,
                secondPairInfo,
                secondPairInfoTwo,
                secondAccount,
                strategy.secondExchangeFee,
                secondAccountBalance,
                secondAccountBalanceTwo,
                OrdersStatus.Pending,
                tradePending.sellPrice
              )
            ]);
            await tradeCumulativeAmountBinance(
              strategy,
              minimumProfit,
              secondPairInfo,
              secondPairInfoTwo,
              secondAccount,
              secondAccountBalance,
              secondAccountBalanceTwo
            );
          }
        }
      }
    }
  } catch (e) {}
  return '';
};
export const checkMarketPendingBinance = async (
  orders: PendingOrdersBinance,
  strategy: Strategy,
  minimumProfit: number,
  minimumPriceFluctuation: number,
  config: MakerConfig,
  binancePairInfo: BinanceSymbolDB,
  binanceConfig: BinanceConfig,
  binanceTradeFee: string,
  binanceBalance: Balance,
  ICDexPairInfo: ICDexPairInfoDB,
  secondICDexPairInfo: ICDexPairInfoDB,
  identity: Identity,
  ICDexBalance: Balance,
  ICDexBalanceTwo: Balance | null,
  ICDexTradeFee: string
): Promise<{
  buyPrice: number;
  sellPrice: number;
}> => {
  const tradePending = {
    buyPrice: 0,
    sellPrice: 0
  };
  const promiseCancel = [];
  orders.bid.sort((a, b) => {
    if (new BigNumber(a.binanceResponse.price).gte(b.binanceResponse.price)) {
      return 1;
    }
    return -1;
  });
  orders.ask.sort((a, b) => {
    if (new BigNumber(a.binanceResponse.price).gte(b.binanceResponse.price)) {
      return -1;
    }
    return 1;
  });
  const filter = await getBinanceFilter(binancePairInfo);
  const buyRes = await getBuyPriceBinance(
    strategy,
    binancePairInfo,
    filter,
    ICDexPairInfo,
    secondICDexPairInfo,
    minimumProfit,
    binanceTradeFee,
    config,
    ICDexTradeFee
  );
  let bidCancel = false;
  for (let i = 0; i < orders.bid.length; i++) {
    const bid = orders.bid[i];
    const orderId = orders.bid[i].orders.id;
    const price = bid.binanceResponse.price;
    if (bidCancel || i >= pendingMax - 1) {
      promiseCancel.push(
        cancelMarketPendingAndUpdateBinance(
          strategy.id,
          orderId,
          binancePairInfo.symbol,
          Number(bid.orders.mainExchangeOrderId),
          binanceConfig
        )
      );
      break;
    } else {
      if (
        price &&
        new BigNumber(1)
          .plus(minimumPriceFluctuation)
          .times(buyRes.binancePriceBuy)
          .lt(price)
      ) {
        promiseCancel.push(
          cancelMarketPendingAndUpdateBinance(
            strategy.id,
            orderId,
            binancePairInfo.symbol,
            Number(bid.orders.mainExchangeOrderId),
            binanceConfig
          )
        );
        bidCancel = true;
      } else {
        tradePending.buyPrice = Number(price);
      }
    }
  }
  const sellRes = await getSellPriceBinance(
    strategy,
    binancePairInfo,
    filter,
    ICDexPairInfo,
    secondICDexPairInfo,
    minimumProfit,
    binanceTradeFee,
    config,
    ICDexTradeFee
  );
  let askCancel = false;
  for (let i = 0; i < orders.ask.length; i++) {
    const ask = orders.ask[i];
    const orderId = orders.ask[i].orders.id;
    const price = ask.binanceResponse.price;
    if (askCancel || i >= pendingMax - 1) {
      promiseCancel.push(
        cancelMarketPendingAndUpdateBinance(
          strategy.id,
          orderId,
          binancePairInfo.symbol,
          Number(ask.orders.mainExchangeOrderId),
          binanceConfig
        )
      );
      break;
    } else {
      if (
        price &&
        new BigNumber(1)
          .minus(minimumPriceFluctuation)
          .times(sellRes.binancePriceSell)
          .gt(price)
      ) {
        promiseCancel.push(
          cancelMarketPendingAndUpdateBinance(
            strategy.id,
            orderId,
            binancePairInfo.symbol,
            Number(ask.orders.mainExchangeOrderId),
            binanceConfig
          )
        );
        askCancel = true;
      } else {
        tradePending.sellPrice = Number(price);
      }
    }
  }
  await Promise.all(promiseCancel);
  return tradePending;
};
export const checkMarketPendingICDex = async (
  orders: PendingOrdersICDex,
  strategy: Strategy,
  minimumProfit: number,
  minimumPriceFluctuation: number,
  config: MakerConfig,
  ICDePairInfo: ICDexPairInfoDB,
  identity: Identity,
  ICDexTradeFee: string,
  ICDexBalance: Balance,
  binancePairInfo: BinanceSymbolDB,
  secondBinancePairInfo: BinanceSymbolDB,
  binanceConfig: BinanceConfig,
  binanceBalance: Balance,
  binanceBalanceTwo: Balance | null,
  binanceTradeFee: string,
  token0Decimals: number,
  token1Decimals: number,
  tokenMinUnit: number,
  unitSize: string
): Promise<{
  buyPrice: number;
  sellPrice: number;
}> => {
  const tradePending = {
    buyPrice: 0,
    sellPrice: 0
  };
  const promiseCancel = [];
  orders.bid.sort((a, b) => {
    if (new BigNumber(a.ICDexBuyResponse.price).gte(b.ICDexBuyResponse.price)) {
      return 1;
    }
    return -1;
  });
  orders.ask.sort((a, b) => {
    if (
      new BigNumber(a.ICDexSellResponse.price).gte(b.ICDexSellResponse.price)
    ) {
      return -1;
    }
    return 1;
  });
  const buyRes = await getBuyPrice(
    strategy,
    ICDePairInfo,
    binancePairInfo,
    secondBinancePairInfo,
    minimumProfit,
    ICDexTradeFee,
    config,
    binanceTradeFee,
    token0Decimals,
    token1Decimals,
    tokenMinUnit,
    unitSize
  );
  let bidCancel = false;
  for (let i = 0; i < orders.bid.length; i++) {
    const bid = orders.bid[i];
    const orderId = orders.bid[i].orders.id;
    const price = bid.ICDexBuyResponse.price;
    if (bidCancel || i >= pendingMax - 1) {
      promiseCancel.push(
        cancelMarketPendingAndUpdateICDex(
          strategy.id,
          orderId,
          ICDePairInfo.pairId,
          identity.getPrincipal().toString(),
          bid.orders.mainExchangeOrderId,
          identity
        )
      );
      break;
    } else {
      if (
        price &&
        new BigNumber(1)
          .plus(minimumPriceFluctuation)
          .times(buyRes.priceBuy)
          .lt(price)
      ) {
        promiseCancel.push(
          cancelMarketPendingAndUpdateICDex(
            strategy.id,
            orderId,
            ICDePairInfo.pairId,
            identity.getPrincipal().toString(),
            bid.orders.mainExchangeOrderId,
            identity
          )
        );
        bidCancel = true;
      } else {
        tradePending.buyPrice = price;
      }
    }
  }
  const sellRes = await getSellPrice(
    strategy,
    ICDePairInfo,
    binancePairInfo,
    secondBinancePairInfo,
    minimumProfit,
    ICDexTradeFee,
    config,
    binanceTradeFee,
    token0Decimals,
    token1Decimals,
    tokenMinUnit,
    unitSize
  );
  let askCancel = false;
  for (let i = 0; i < orders.ask.length; i++) {
    const ask = orders.ask[i];
    const orderId = orders.ask[i].orders.id;
    const price = ask.ICDexSellResponse.price;
    if (askCancel || i >= pendingMax - 1) {
      promiseCancel.push(
        cancelMarketPendingAndUpdateICDex(
          strategy.id,
          orderId,
          ICDePairInfo.pairId,
          identity.getPrincipal().toString(),
          ask.orders.mainExchangeOrderId,
          identity
        )
      );
      break;
    } else {
      if (
        price &&
        new BigNumber(1)
          .minus(minimumPriceFluctuation)
          .times(sellRes.priceSell)
          .gt(price)
      ) {
        promiseCancel.push(
          cancelMarketPendingAndUpdateICDex(
            strategy.id,
            orderId,
            ICDePairInfo.pairId,
            identity.getPrincipal().toString(),
            ask.orders.mainExchangeOrderId,
            identity
          )
        );
        askCancel = true;
      } else {
        tradePending.sellPrice = price;
      }
    }
  }
  await Promise.all(promiseCancel);
  return tradePending;
};
export const cancelMarketPendingAndUpdateBinance = async (
  strategyId: number,
  id: number,
  symbol: string,
  orderId: number,
  binanceConfig: BinanceConfig
): Promise<void> => {
  const response = await cancelOrder(
    binanceConfig.APIKey,
    binanceConfig.privateKey,
    symbol,
    orderId
  );
  if (
    response &&
    !((response as ErrorData).code || (response as ErrorData).code === 0)
  ) {
    const info = response as OrderInfo;
    const orderInfo: TradeResponseFULL = {
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
    await insertOrUpdateBinanceOrderInfo(strategyId, orderInfo);
    await updateOrderIdMaker(id);
  }
};
export const cancelMarketPendingAndUpdateICDex = async (
  strategyId: number,
  id: number,
  pairId: string,
  address: string,
  txid: string,
  identity: Identity
): Promise<void> => {
  const service = new ICDexService();
  const flag = await service.cancelByTxid(pairId, identity, hexToBytes(txid));
  if (flag) {
    await insertOrUpdateICDexOrderInfo(strategyId, pairId, txid);
    // sendEventToClients(strategyId, '', 'Trade');
    await updateOrderIdMaker(id);
  }
};
export const cancelPendingOrder = async (
  strategyId: number,
  id: number,
  orderId: string,
  mainExchangeName: ExchangeName,
  mainPairId: string,
  mainAccount: Identity | BinanceConfig
): Promise<void> => {
  if (mainExchangeName === ExchangeName.ICDex) {
    const service = new ICDexService();
    const account = mainAccount as Identity;
    const statusByTxid = await service.statusByTxid(
      mainPairId,
      hexToBytes(orderId)
    );
    const type = Object.keys(statusByTxid)[0];
    if (type === 'Pending') {
      await cancelMarketPendingAndUpdateICDex(
        strategyId,
        id,
        mainPairId,
        account.getPrincipal().toString(),
        orderId,
        account
      );
    } else {
      await insertOrUpdateICDexOrderInfo(strategyId, mainPairId, orderId);
      await updateOrderIdMaker(id);
    }
  } else if (mainExchangeName === ExchangeName.Binance) {
    const account = mainAccount as BinanceConfig;
    const response = await getOrderInfo(
      account.APIKey,
      account.privateKey,
      mainPairId,
      Number(orderId)
    );
    if (
      response &&
      !((response as ErrorData).code || (response as ErrorData).code === 0)
    ) {
      const status = (response as OrderInfo).status;
      if (
        status === 'NEW' ||
        status === 'PENDING_NEW' ||
        status === 'PARTIALLY_FILLED'
      ) {
        await cancelMarketPendingAndUpdateBinance(
          strategyId,
          id,
          mainPairId,
          Number(orderId),
          account
        );
      } else {
        const info = response as OrderInfo;
        const orderInfo: TradeResponseFULL = {
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
        await insertOrUpdateBinanceOrderInfo(strategyId, orderInfo);
        await updateOrderIdMaker(id);
      }
    }
  }
};
export const cancelPending = async (
  strategyId: number,
  mainExchangeName: ExchangeName,
  mainPairId: string,
  mainAccount: Identity | BinanceConfig
): Promise<void> => {
  if (intervalId[strategyId]) {
    console.log(intervalId[strategyId]);
    delete intervalId[strategyId];
    clearTimeout(intervalId[strategyId]);
  }
  const pendingOrder = await getPendingOrders(strategyId);
  const mainOrders: Array<string> = [];
  if (pendingOrder && pendingOrder.length) {
    pendingOrder.forEach((item) => {
      mainOrders.push(item.mainExchangeOrderId);
    });
  }
  const promiseValue: Array<Promise<void | number>> = [];
  if (mainExchangeName === ExchangeName.ICDex) {
    const service = new ICDexService();
    const account = mainAccount as Identity;
    const pending = await service.pending(
      mainPairId,
      account.getPrincipal().toString()
    );
    if (pending && pending.data && pending.data.length && pendingOrder.length) {
      pendingOrder.forEach((item) => {
        pending.data.forEach((pending) => {
          const status = Object.keys(pending[1].status)[0];
          const txid = toHexString(new Uint8Array(pending[0]));
          if (item.mainExchangeOrderId === txid) {
            if (status === 'Pending') {
              promiseValue.push(
                cancelMarketPendingAndUpdateICDex(
                  strategyId,
                  item.id,
                  mainPairId,
                  account.getPrincipal().toString(),
                  item.mainExchangeOrderId,
                  account
                )
              );
            } else {
              promiseValue.push(updateOrderIdMaker(item.id));
            }
          }
          if (status === 'Pending' && !mainOrders.includes(txid)) {
            getInfo(strategyId, mainExchangeName, mainPairId, txid, false).then(
              (info) => {
                if (info) {
                  promiseValue.push(
                    cancelMarketPendingAndUpdateICDex(
                      strategyId,
                      item.id,
                      mainPairId,
                      account.getPrincipal().toString(),
                      item.mainExchangeOrderId,
                      account
                    )
                  );
                }
              }
            );
          }
        });
      });
    }
  } else if (mainExchangeName === ExchangeName.Binance) {
    const account = mainAccount as BinanceConfig;
    const response = await openOrders(
      account.APIKey,
      account.privateKey,
      mainPairId
    );
    if (
      response &&
      !((response as ErrorData).code || (response as ErrorData).code === 0)
    ) {
      const pending = response as Array<OrderInfo>;
      if (pending && pending.length && pendingOrder.length) {
        pendingOrder.forEach((item) => {
          pending.forEach((pendingInfo) => {
            const orderId = pendingInfo.orderId.toString(10);
            const status = pendingInfo.status;
            if (item.mainExchangeOrderId === orderId) {
              if (
                status === 'NEW' ||
                status === 'PENDING_NEW' ||
                status === 'PARTIALLY_FILLED'
              ) {
                promiseValue.push(
                  cancelMarketPendingAndUpdateBinance(
                    strategyId,
                    item.id,
                    mainPairId,
                    Number(item.mainExchangeOrderId),
                    account
                  )
                );
              } else {
                promiseValue.push(updateOrderIdMaker(item.id));
              }
            }
            if (
              status === 'NEW' ||
              status === 'PENDING_NEW' ||
              status === 'PARTIALLY_FILLED'
            ) {
              if (!mainOrders.includes(orderId)) {
                getInfo(
                  strategyId,
                  mainExchangeName,
                  mainPairId,
                  orderId,
                  false
                ).then((info) => {
                  if (info) {
                    promiseValue.push(
                      cancelMarketPendingAndUpdateBinance(
                        strategyId,
                        item.id,
                        mainPairId,
                        Number(item.mainExchangeOrderId),
                        account
                      )
                    );
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
export const cancelAll = async (): Promise<void> => {
  const allPendingOrders = await getAllPendingOrders();
  const exchanges = await getExchanges();
  const exchange: { [key: number]: ExchangeName } = {};
  exchanges.forEach((item) => {
    exchange[item.id] = item.name;
  });
  const promiseValue: Array<Promise<void>> = [];
  const strategyInfo: { [key: number]: Strategy } = {};
  const accountInfo: { [key: number]: Identity | BinanceConfig } = {};
  if (allPendingOrders && allPendingOrders.length) {
    for (let i = 0; i < allPendingOrders.length; i++) {
      const pending = allPendingOrders[i];
      if (intervalId[pending.strategyId]) {
        delete intervalId[pending.strategyId];
        clearTimeout(intervalId[pending.strategyId]);
      }
      if (!strategyInfo[pending.strategyId]) {
        const strategy = await getStrategy(pending.strategyId);
        if (strategy) {
          strategyInfo[pending.strategyId] = strategy;
        }
      }
      if (
        !accountInfo[strategyInfo[pending.strategyId].mainExchangeAccountId]
      ) {
        const account = await getAccount(
          strategyInfo[pending.strategyId].mainExchangeAccountId
        );
        if (account) {
          const mainAccount = getAccountValue(
            exchange[strategyInfo[pending.strategyId].mainExchangeId],
            account.value
          );
          if (mainAccount) {
            accountInfo[
              strategyInfo[pending.strategyId].mainExchangeAccountId
            ] = mainAccount;
          }
        }
      }
      promiseValue.push(
        cancelPendingOrder(
          pending.strategyId,
          pending.id,
          pending.mainExchangeOrderId,
          exchange[strategyInfo[pending.strategyId].mainExchangeId],
          strategyInfo[pending.strategyId].mainExchangePair,
          accountInfo[strategyInfo[pending.strategyId].mainExchangeAccountId]
        )
      );
    }
  }
  await Promise.all(promiseValue);
};
export const tradeMarketPendingBinance = async (
  strategy: Strategy,
  minimumProfit: number,
  binancePairInfo: BinanceSymbolDB,
  binanceConfig: BinanceConfig,
  ICDexPairInfo: ICDexPairInfoDB,
  secondICDexPairInfo: ICDexPairInfoDB,
  identity: Identity,
  ICDexBalance: Balance,
  ICDexBalanceTwo: Balance | null
): Promise<PendingOrdersBinance> => {
  const orders: PendingOrdersBinance = { ask: [], bid: [] };
  const pendingOrder = await getPendingOrders(strategy.id);
  if (pendingOrder && pendingOrder.length) {
    for (let i = 0; i < pendingOrder.length; i++) {
      const order = pendingOrder[i];
      const orderId = order.mainExchangeOrderId;
      let info = await getInfo(
        strategy.id,
        ExchangeName.Binance,
        strategy.mainExchangePair,
        orderId
      );
      info = info as BinanceOrderInfo;
      let binanceOrderRes = await getOrderInfo(
        binanceConfig.APIKey,
        binanceConfig.privateKey,
        binancePairInfo.symbol,
        Number(orderId)
      );
      if (binanceOrderRes && !(binanceOrderRes as ErrorData).code) {
        binanceOrderRes = binanceOrderRes as OrderInfo;
        let status: OrdersStatus = OrdersStatus.Pending;
        if (
          binanceOrderRes.status !== 'NEW' &&
          binanceOrderRes.status !== 'PENDING_NEW' &&
          binanceOrderRes.status === 'PARTIALLY_FILLED'
        ) {
          status = OrdersStatus.Completed;
        } else {
          if (info.side === 'BUY') {
            orders.bid.push({
              orders: order,
              binanceResponse: binanceOrderRes
            });
          } else if (info.side === 'SELL') {
            orders.ask.push({
              orders: order,
              binanceResponse: binanceOrderRes
            });
          }
        }
        if (info.side === 'BUY') {
          // trade by user
          // const token0Value = ICDexBuyRes.token0Value;
          const token0 = await getBalanceChangesByMainExchangeOrderId(
            strategy.id,
            orderId,
            true
          );
          const token0Value = new BigNumber(binanceOrderRes.executedQty)
            .minus(token0.subtract)
            .toString(10);
          const token0Remaining = new BigNumber(binanceOrderRes.executedQty)
            .minus(token0.add)
            .toString(10);
          const token1DebitRecord = new BigNumber(token0Value)
            .div(binanceOrderRes.executedQty)
            .times(binanceOrderRes.cummulativeQuoteQty)
            .toString();
          await binanceBuyToICDexTrade(
            strategy,
            minimumProfit,
            ICDexPairInfo,
            secondICDexPairInfo,
            ICDexBalance,
            ICDexBalanceTwo,
            identity,
            orderId,
            token0Value,
            token0Remaining,
            token1DebitRecord,
            1,
            status,
            'AddToken0'
          );
        } else if (info.side === 'SELL') {
          const token1 = await getBalanceChangesByMainExchangeOrderId(
            strategy.id,
            orderId,
            false
          );
          const token1Value = new BigNumber(binanceOrderRes.cummulativeQuoteQty)
            .minus(token1.subtract)
            .toString(10);
          const token1Remaining = new BigNumber(
            binanceOrderRes.cummulativeQuoteQty
          )
            .minus(token1.add)
            .toString(10);
          const token0DebitRecord = new BigNumber(token1Value)
            .div(binanceOrderRes.cummulativeQuoteQty)
            .times(binanceOrderRes.executedQty)
            .toString();
          await binanceSellToICDexTrade(
            strategy,
            minimumProfit,
            ICDexPairInfo,
            secondICDexPairInfo,
            ICDexBalance,
            ICDexBalanceTwo,
            identity,
            orderId,
            token1Value,
            token1Remaining,
            token0DebitRecord,
            1,
            status,
            'AddToken1'
          );
        }
        if (status === 'Completed') {
          const orderInfo: TradeResponseFULL = {
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
          await insertOrUpdateBinanceOrderInfo(strategy.id, orderInfo);
          await updateOrderIdMaker(order.id);
        }
      } else {
        // await updateOrderIdArbitrage(address, pairId, txid);
      }
    }
  }
  return orders;
};
export const tradeMarketPendingICDex = async (
  strategy: Strategy,
  minimumProfit: number,
  ICDePairInfo: ICDexPairInfoDB,
  binancePairInfo: BinanceSymbolDB,
  secondBinancePairInfo: BinanceSymbolDB,
  binanceConfig: BinanceConfig,
  binanceBalance: Balance,
  binanceBalanceTwo: Balance | null,
  binanceTradeFee: string,
  token0Decimals: number,
  token1Decimals: number
): Promise<PendingOrdersICDex> => {
  const orders: PendingOrdersICDex = { ask: [], bid: [] };
  const pendingOrder = await getPendingOrders(strategy.id);
  if (pendingOrder && pendingOrder.length) {
    for (let i = 0; i < pendingOrder.length; i++) {
      const order = pendingOrder[i];
      const orderId = order.mainExchangeOrderId;
      let info = await getInfo(
        strategy.id,
        ExchangeName.ICDex,
        strategy.mainExchangePair,
        orderId
      );
      info = info as ICDexOrderInfo;
      const side = filterSide(JSON.parse(info.orderPrice));
      if (side === 'Buy') {
        let ICDexBuyRes = await getICDexBuyResponse(
          ICDePairInfo,
          orderId,
          token0Decimals,
          token1Decimals
        );
        if (typeof ICDexBuyRes !== 'string') {
          ICDexBuyRes = ICDexBuyRes as ICDexBuyResponse;
          let status: OrdersStatus = OrdersStatus.Pending;
          if (ICDexBuyRes.status !== 'Pending') {
            status = OrdersStatus.Completed;
          } else {
            orders.bid.push({
              orders: order,
              ICDexBuyResponse: ICDexBuyRes
            });
          }
          // trade by user
          // const token0Value = ICDexBuyRes.token0Value;
          const token0 = await getBalanceChangesByMainExchangeOrderId(
            strategy.id,
            orderId,
            true
          );
          const token0Value = new BigNumber(ICDexBuyRes.token0Value)
            .minus(token0.subtract)
            .toString(10);
          const token0Remaining = new BigNumber(ICDexBuyRes.token0Value)
            .minus(token0.add)
            .toString(10);
          const token1DebitRecord = new BigNumber(token0Value)
            .div(ICDexBuyRes.token0Value)
            .times(ICDexBuyRes.token1DebitRecord)
            .toString();
          if (Number(token0Value) > 0) {
            await insertOrUpdateICDexOrderInfo(
              strategy.id,
              ICDePairInfo.pairId,
              orderId
            );
          }
          await ICDexBuyToBinanceTrade(
            strategy,
            minimumProfit,
            binancePairInfo,
            secondBinancePairInfo,
            binanceBalance,
            binanceBalanceTwo,
            binanceConfig,
            orderId,
            token0Value,
            token0Remaining,
            token1DebitRecord,
            1,
            status,
            'AddToken0'
          );
          if (ICDexBuyRes.status !== 'Pending' || status === 'Completed') {
            await insertOrUpdateICDexOrderInfo(
              strategy.id,
              ICDePairInfo.pairId,
              orderId
            );
            await updateOrderIdMaker(order.id);
          }
        } else {
          // await updateOrderIdArbitrage(address, pairId, txid);
        }
      } else if (side === 'Sell') {
        let ICDexSellRes = await getICDexSellResponse(
          ICDePairInfo,
          orderId,
          token0Decimals,
          token1Decimals
        );
        if (typeof ICDexSellRes !== 'string') {
          ICDexSellRes = ICDexSellRes as ICDexSellResponse;
          let status: OrdersStatus = OrdersStatus.Pending;
          if (ICDexSellRes.status === 'Pending') {
            orders.ask.push({
              orders: order,
              ICDexSellResponse: ICDexSellRes
            });
          } else {
            status = OrdersStatus.Completed;
          }
          // traded by user
          // const token1Value = ICDexSellRes.token1Value;
          const token1 = await getBalanceChangesByMainExchangeOrderId(
            strategy.id,
            orderId,
            false
          );
          const token1Value = new BigNumber(ICDexSellRes.token1Value)
            .minus(token1.subtract)
            .toString(10);
          const token1Remaining = new BigNumber(ICDexSellRes.token1Value)
            .minus(token1.add)
            .toString(10);
          const token0DebitRecord = new BigNumber(token1Value)
            .div(ICDexSellRes.token1Value)
            .times(ICDexSellRes.token0DebitRecord)
            .toString();
          if (Number(token1Value) > 0) {
            await insertOrUpdateICDexOrderInfo(
              strategy.id,
              ICDePairInfo.pairId,
              orderId
            );
          }
          await ICDexSellToBinanceTrade(
            strategy,
            minimumProfit,
            binancePairInfo,
            secondBinancePairInfo,
            binanceBalance,
            binanceBalanceTwo,
            binanceConfig,
            orderId,
            token1Value,
            token1Remaining,
            token0DebitRecord,
            1,
            status,
            'AddToken1'
          );
          if (ICDexSellRes.status !== 'Pending' || status === 'Completed') {
            await insertOrUpdateICDexOrderInfo(
              strategy.id,
              ICDePairInfo.pairId,
              orderId
            );
            await updateOrderIdMaker(order.id);
          }
        } else {
          // await updateOrderIdArbitrage(address, pairId, txid);
        }
      }
    }
  }
  return orders;
};
export const pendingOrderSellICDex = async (
  strategy: Strategy,
  minimumProfit: number,
  minimumPriceFluctuation: number,
  config: MakerConfig,
  ICDePairInfo: ICDexPairInfoDB,
  identity: Identity,
  ICDexTradeFee: string,
  ICDexBalance: Balance,
  binancePairInfo: BinanceSymbolDB,
  secondBinancePairInfo: BinanceSymbolDB,
  binanceConfig: BinanceConfig,
  binanceBalance: Balance,
  binanceBalanceTwo: Balance | null,
  binanceTradeFee: string,
  token0Decimals: number,
  token1Decimals: number,
  tokenMinUnit: number,
  unitSize: string,
  status: OrdersStatus,
  sellPrice = 0
): Promise<BinanceOrder | string> => {
  try {
    const sellRes = await getSellPrice(
      strategy,
      ICDePairInfo,
      binancePairInfo,
      secondBinancePairInfo,
      minimumProfit,
      ICDexTradeFee,
      config,
      binanceTradeFee,
      token0Decimals,
      token1Decimals,
      tokenMinUnit,
      unitSize
    );
    if (
      sellRes &&
      sellRes.token0Sell &&
      sellRes.priceSell &&
      Number(sellRes.token0Sell) &&
      Number(sellRes.priceSell)
    ) {
      const token0SellAmount = BigInt(
        new BigNumber(sellRes.token0Sell)
          .times(10 ** token0Decimals)
          .toString(10)
      );
      if (
        sellPrice &&
        new BigNumber(1)
          .minus(minimumPriceFluctuation)
          .times(sellPrice)
          .lt(sellRes.priceSell)
      ) {
        return '';
      }
      const orderPriceSell: OrderPrice = {
        quantity: { Sell: token0SellAmount },
        price: BigInt(sellRes.ICDexPriceSell)
      };
      const res = await onICDexSell(
        strategy.id,
        ICDePairInfo,
        orderPriceSell,
        token0Decimals,
        token1Decimals,
        identity,
        sellRes.token0Sell,
        ICDexBalance,
        'LMT'
      );
      if (res) {
        if (typeof res !== 'string') {
          const ICDexSellRes = res as ICDexSellResponse;
          const txid = ICDexSellRes.txid;
          const token1Value = ICDexSellRes.token1Value;
          const token0DebitRecord = ICDexSellRes.token0DebitRecord;
          await insertOrderIdOrUpdate(strategy.id, txid, null, '', '', status);
          if (new BigNumber(token1Value).gt(0)) {
            await ICDexSellToBinanceTrade(
              strategy,
              minimumProfit,
              binancePairInfo,
              secondBinancePairInfo,
              binanceBalance,
              binanceBalanceTwo,
              binanceConfig,
              txid,
              token1Value,
              token1Value,
              token0DebitRecord,
              1,
              status,
              'AddToken1'
            );
          }
        }
      }
    }
  } catch (e) {
    console.error(e);
  }
  return '';
};
export const pendingOrderSellBinance = async (
  strategy: Strategy,
  minimumProfit: number,
  minimumPriceFluctuation: number,
  config: MakerConfig,
  binancePairInfo: BinanceSymbolDB,
  binanceConfig: BinanceConfig,
  binanceTradeFee: string,
  binanceBalance: Balance,
  ICDexPairInfo: ICDexPairInfoDB,
  secondICDexPairInfo: ICDexPairInfoDB,
  identity: Identity,
  ICDexTradeFee: string,
  ICDexBalance: Balance,
  ICDexBalanceTwo: Balance | null,
  status: OrdersStatus,
  sellPrice = 0
): Promise<ICDexOrder | string> => {
  try {
    const filter = await getBinanceFilter(binancePairInfo);
    const sellRes = await getSellPriceBinance(
      strategy,
      binancePairInfo,
      filter,
      ICDexPairInfo,
      secondICDexPairInfo,
      minimumProfit,
      binanceTradeFee,
      config,
      ICDexTradeFee
    );
    if (sellRes && sellRes.token0Sell && Number(sellRes.token0Sell)) {
      if (
        sellPrice &&
        new BigNumber(1)
          .minus(minimumPriceFluctuation)
          .times(sellPrice)
          .lt(sellRes.binancePriceSell)
      ) {
        return '';
      }
      const sellResponse = await onBinanceSell(
        strategy.id,
        binancePairInfo,
        binanceConfig,
        sellRes.token0Sell,
        filter,
        binanceBalance,
        'LIMIT',
        Number(sellRes.binancePriceSell)
      );
      if (sellResponse) {
        if (typeof sellResponse !== 'string') {
          const binanceSellRes = sellResponse as BinanceOrder;
          const orderId = binanceSellRes.orderId.toString(10);
          const token1Value = binanceSellRes.cummulativeQuoteQty;
          const token0DebitRecord = binanceSellRes.executedQty;
          await insertOrderIdOrUpdate(
            strategy.id,
            orderId,
            null,
            '',
            '',
            status
          );
          if (new BigNumber(token1Value).gt(0)) {
            await binanceSellToICDexTrade(
              strategy,
              minimumProfit,
              ICDexPairInfo,
              secondICDexPairInfo,
              ICDexBalance,
              ICDexBalanceTwo,
              identity,
              orderId,
              token1Value,
              token1Value,
              token0DebitRecord,
              1,
              status,
              'AddToken1'
            );
          }
        }
      }
    }
  } catch (e) {
    console.error(e);
  }
  return '';
};
export const pendingOrderBuyBinance = async (
  strategy: Strategy,
  minimumProfit: number,
  minimumPriceFluctuation: number,
  config: MakerConfig,
  binancePairInfo: BinanceSymbolDB,
  binanceConfig: BinanceConfig,
  binanceTradeFee: string,
  binanceBalance: Balance,
  ICDexPairInfo: ICDexPairInfoDB,
  secondICDexPairInfo: ICDexPairInfoDB,
  identity: Identity,
  ICDexTradeFee: string,
  ICDexBalance: Balance,
  ICDexBalanceTwo: Balance | null,
  status: OrdersStatus,
  buyPrice = 0
): Promise<ICDexOrder | string> => {
  try {
    const filter = await getBinanceFilter(binancePairInfo);
    const buyRes = await getBuyPriceBinance(
      strategy,
      binancePairInfo,
      filter,
      ICDexPairInfo,
      secondICDexPairInfo,
      minimumProfit,
      binanceTradeFee,
      config,
      ICDexTradeFee
    );
    if (buyRes && buyRes.token0Buy && Number(buyRes.token0Buy)) {
      if (
        buyPrice &&
        new BigNumber(1)
          .plus(minimumPriceFluctuation)
          .times(buyPrice)
          .gt(buyRes.binancePriceBuy)
      ) {
        return '';
      }
      const buyResponse = await onBinanceBuy(
        strategy.id,
        binanceConfig,
        binancePairInfo,
        Number(config.token1Amount),
        filter,
        binanceBalance,
        'LIMIT',
        buyRes.token0Buy,
        Number(buyRes.binancePriceBuy)
      );
      if (buyResponse) {
        if (typeof buyResponse !== 'string') {
          const binanceBuyRes = buyResponse as BinanceOrder;
          const orderId = binanceBuyRes.orderId.toString(10);
          const token0Value = binanceBuyRes.executedQty;
          const token1DebitRecord = binanceBuyRes.cummulativeQuoteQty;
          await insertOrderIdOrUpdate(
            strategy.id,
            orderId,
            null,
            '',
            '',
            status
          );
          if (new BigNumber(token0Value).gt(0)) {
            return await binanceBuyToICDexTrade(
              strategy,
              minimumProfit,
              ICDexPairInfo,
              secondICDexPairInfo,
              ICDexBalance,
              ICDexBalanceTwo,
              identity,
              orderId,
              token0Value,
              token0Value,
              token1DebitRecord,
              1,
              status,
              'AddToken0'
            );
          }
        }
      }
    }
  } catch (e) {
    console.error(e);
  }
  return '';
};
export const pendingOrderBuyICDex = async (
  strategy: Strategy,
  minimumProfit: number,
  minimumPriceFluctuation: number,
  config: MakerConfig,
  ICDePairInfo: ICDexPairInfoDB,
  identity: Identity,
  ICDexTradeFee: string,
  ICDexBalance: Balance,
  binancePairInfo: BinanceSymbolDB,
  secondBinancePairInfo: BinanceSymbolDB,
  binanceConfig: BinanceConfig,
  binanceBalance: Balance,
  binanceBalanceTwo: Balance | null,
  binanceTradeFee: string,
  token0Decimals: number,
  token1Decimals: number,
  tokenMinUnit: number,
  unitSize: string,
  status: OrdersStatus,
  buyPrice = 0
): Promise<BinanceOrder | string> => {
  try {
    const buyRes = await getBuyPrice(
      strategy,
      ICDePairInfo,
      binancePairInfo,
      secondBinancePairInfo,
      minimumProfit,
      ICDexTradeFee,
      config,
      binanceTradeFee,
      token0Decimals,
      token1Decimals,
      tokenMinUnit,
      unitSize
    );
    if (
      buyRes &&
      buyRes.priceBuy &&
      buyRes.token0Buy &&
      Number(buyRes.priceBuy) &&
      Number(buyRes.token0Buy)
    ) {
      if (
        buyPrice &&
        new BigNumber(1)
          .plus(minimumPriceFluctuation)
          .times(buyPrice)
          .gt(buyRes.priceBuy)
      ) {
        return '';
      }
      const token0BuyAmount = BigInt(
        new BigNumber(buyRes.token0Buy).times(10 ** token0Decimals).toString(10)
      );
      const token1Amount = BigInt(
        new BigNumber(buyRes.ICDexPriceBuy)
          .div(unitSize)
          .times(buyRes.token0Buy)
          .times(10 ** token0Decimals)
          .toString(10)
      );
      const orderPriceBuy: OrderPrice = {
        quantity: { Buy: [BigInt(token0BuyAmount), token1Amount] },
        price: BigInt(buyRes.ICDexPriceBuy)
      };
      const res = await onICDexBuy(
        strategy.id,
        ICDePairInfo,
        orderPriceBuy,
        token0Decimals,
        token1Decimals,
        identity,
        new BigNumber(buyRes.priceBuy).times(buyRes.token0Buy).toString(10),
        ICDexBalance,
        'LMT'
      );
      if (res) {
        if (typeof res !== 'string') {
          const ICDexBuyRes = res as ICDexBuyResponse;
          const txid = ICDexBuyRes.txid;
          const token0Value = ICDexBuyRes.token0Value;
          const token1DebitRecord = ICDexBuyRes.token1DebitRecord;
          await insertOrderIdOrUpdate(strategy.id, txid, null, '', '', status);
          if (new BigNumber(token0Value).gt(0)) {
            return await ICDexBuyToBinanceTrade(
              strategy,
              minimumProfit,
              binancePairInfo,
              secondBinancePairInfo,
              binanceBalance,
              binanceBalanceTwo,
              binanceConfig,
              txid,
              token0Value,
              token0Value,
              token1DebitRecord,
              1,
              status,
              'AddToken0'
            );
          }
        }
      }
    }
  } catch (e) {
    console.error(e);
  }
  return '';
};
export const binanceSellToICDexTrade = async (
  strategy: Strategy,
  minimumProfit: number,
  pairInfo: ICDexPairInfoDB,
  secondPairInfo: ICDexPairInfoDB,
  balance: Balance,
  secondBalance: Balance | null,
  identity: Identity,
  orderId: string,
  token1Value: string,
  token1Remaining: string,
  token0DebitRecord: string,
  arbitrage: BooleanType,
  status: OrdersStatus,
  balanceChangesType: BalanceChangesType = null
): Promise<ICDexOrder | string> => {
  let updateBalance = false;
  if (strategy.invert === 1) {
    if (Number(token1Value) > 0) {
      return await toSellICDex(
        strategy,
        minimumProfit,
        pairInfo,
        secondPairInfo,
        balance,
        secondBalance,
        identity,
        orderId,
        token1Value,
        token1Value,
        token0DebitRecord,
        arbitrage,
        status,
        balanceChangesType
      );
    } else if (
      balanceChangesType === 'AddToken1' &&
      Number(token1Remaining) > 0
    ) {
      updateBalance = true;
    }
  } else {
    if (Number(token1Value) > 0) {
      return await toBuyICDex(
        strategy,
        minimumProfit,
        pairInfo,
        secondPairInfo,
        balance,
        secondBalance,
        identity,
        orderId,
        token1Value,
        token1Value,
        token0DebitRecord,
        arbitrage,
        status,
        balanceChangesType
      );
    } else if (
      balanceChangesType === 'AddToken1' &&
      Number(token1Remaining) > 0
    ) {
      updateBalance = true;
    }
  }
  if (updateBalance) {
    await updateBalanceChanges(strategy.id, token1Remaining, '', orderId, '');
  }
  return '';
};
export const ICDexSellToBinanceTrade = async (
  strategy: Strategy,
  minimumProfit: number,
  pairInfo: BinanceSymbolDB,
  secondPairInfo: BinanceSymbolDB,
  balance: Balance,
  secondBalance: Balance | null,
  binanceConfig: BinanceConfig,
  txid: string,
  token1Value: string,
  token1Remaining: string,
  token0DebitRecord: string,
  arbitrage: BooleanType,
  status: OrdersStatus,
  balanceChangesType: BalanceChangesType = null
): Promise<BinanceOrder | string> => {
  const filter = await getBinanceFilter(pairInfo);
  const secondFilter = await getBinanceFilter(secondPairInfo);
  let updateBalance = false;
  if (strategy.invert === 1) {
    if (
      Number(token1Value) > 0 &&
      new BigNumber(token1Value).gt(filter.token0.minQty)
    ) {
      return await toSellBinance(
        strategy,
        minimumProfit,
        pairInfo,
        filter,
        secondPairInfo,
        secondFilter,
        balance,
        secondBalance,
        binanceConfig,
        txid,
        token1Value,
        token1Remaining,
        token0DebitRecord,
        1,
        status,
        balanceChangesType
      );
    } else if (
      balanceChangesType === 'AddToken1' &&
      Number(token1Remaining) > 0
    ) {
      updateBalance = true;
    }
  } else {
    if (Number(token1Value) > 0) {
      if (
        (secondPairInfo &&
          new BigNumber(token1Value).gt(secondFilter.token0.minQty)) ||
        (!secondPairInfo && new BigNumber(token1Value).gt(filter.token1.minQty))
      ) {
        return await toBuyBinance(
          strategy,
          minimumProfit,
          pairInfo,
          filter,
          secondPairInfo,
          secondFilter,
          balance,
          secondBalance,
          binanceConfig,
          txid,
          token1Value,
          token1Remaining,
          token0DebitRecord,
          1,
          status,
          balanceChangesType
        );
      } else if (
        balanceChangesType === 'AddToken1' &&
        Number(token1Remaining) > 0
      ) {
        updateBalance = true;
      }
    }
  }
  if (updateBalance) {
    await updateBalanceChanges(strategy.id, '', token1Remaining, txid, '');
  }
  return '';
};
export const binanceBuyToICDexTrade = async (
  strategy: Strategy,
  minimumProfit: number,
  pairInfo: ICDexPairInfoDB,
  secondPairInfo: ICDexPairInfoDB,
  balance: Balance,
  secondBalance: Balance | null,
  identity: Identity,
  orderId: string,
  token0Value: string,
  token0Remaining: string,
  token1DebitRecord: string,
  arbitrage: BooleanType,
  status: OrdersStatus,
  balanceChangesType: BalanceChangesType = null
): Promise<ICDexOrder | string> => {
  let updateBalance = false;
  if (strategy.invert === 1) {
    if (Number(token0Value) > 0) {
      return await toBuyICDex(
        strategy,
        minimumProfit,
        pairInfo,
        secondPairInfo,
        balance,
        secondBalance,
        identity,
        orderId,
        token0Value,
        token0Value,
        token1DebitRecord,
        arbitrage,
        status,
        balanceChangesType
      );
    } else if (
      balanceChangesType === 'AddToken0' &&
      Number(token0Remaining) > 0
    ) {
      updateBalance = true;
    }
  } else {
    if (Number(token0Value) > 0) {
      return await toSellICDex(
        strategy,
        minimumProfit,
        pairInfo,
        secondPairInfo,
        balance,
        secondBalance,
        identity,
        orderId,
        token0Value,
        token0Value,
        token1DebitRecord,
        arbitrage,
        status,
        balanceChangesType
      );
    } else if (
      balanceChangesType === 'AddToken0' &&
      Number(token0Remaining) > 0
    ) {
      updateBalance = true;
    }
  }
  if (updateBalance) {
    await updateBalanceChanges(strategy.id, token0Remaining, '', orderId, '');
  }
  return '';
};
export const ICDexBuyToBinanceTrade = async (
  strategy: Strategy,
  minimumProfit: number,
  pairInfo: BinanceSymbolDB,
  secondPairInfo: BinanceSymbolDB,
  balance: Balance,
  secondBalance: Balance | null,
  binanceConfig: BinanceConfig,
  txid: string,
  token0Value: string,
  token0Remaining: string,
  token1DebitRecord: string,
  arbitrage: BooleanType,
  status: OrdersStatus,
  balanceChangesType: BalanceChangesType = null
): Promise<BinanceOrder | string> => {
  const filter = await getBinanceFilter(pairInfo);
  const secondFilter = await getBinanceFilter(secondPairInfo);
  let updateBalance = false;
  if (strategy.invert === 1) {
    if (
      Number(token0Value) > 0 &&
      new BigNumber(token0Value).gt(filter.token1.minQty)
    ) {
      return await toBuyBinance(
        strategy,
        minimumProfit,
        pairInfo,
        filter,
        secondPairInfo,
        secondFilter,
        balance,
        secondBalance,
        binanceConfig,
        txid,
        token0Value,
        token0Remaining,
        token1DebitRecord,
        arbitrage,
        status,
        balanceChangesType
      );
    } else if (
      balanceChangesType === 'AddToken0' &&
      Number(token0Remaining) > 0
    ) {
      updateBalance = true;
    }
  } else {
    if (
      Number(token0Value) > 0 &&
      new BigNumber(token0Value).gt(filter.token0.minQty)
    ) {
      return await toSellBinance(
        strategy,
        minimumProfit,
        pairInfo,
        filter,
        secondPairInfo,
        secondFilter,
        balance,
        secondBalance,
        binanceConfig,
        txid,
        token0Value,
        token0Remaining,
        token1DebitRecord,
        arbitrage,
        status,
        balanceChangesType
      );
    } else if (
      balanceChangesType === 'AddToken0' &&
      Number(token0Remaining) > 0
    ) {
      updateBalance = true;
    }
  }
  if (updateBalance) {
    await updateBalanceChanges(strategy.id, token0Remaining, '', txid, '');
  }
  return '';
};
export const getBuyPrice = async (
  strategy: Strategy,
  ICDexPairInfo: ICDexPairInfoDB,
  binancePairInfo: BinanceSymbolDB,
  secondBinancePairInfo: BinanceSymbolDB,
  minimumProfit: number,
  ICDexTradeFee: string,
  config: MakerConfig,
  binanceTradeFee: string,
  token0Decimals: number,
  token1Decimals: number,
  tokenMinUnit: number,
  unitSize: string
): Promise<{ token0Buy: string; ICDexPriceBuy: string; priceBuy: string }> => {
  try {
    let unit = 0;
    if (token1Decimals - tokenMinUnit > 0) {
      unit = token1Decimals - tokenMinUnit;
      if (unit > 8) {
        unit = 8;
      }
    } else {
      unit = 0;
    }

    const minSellToken1 = new BigNumber(config.token1Amount)
      .times(new BigNumber(1).plus(minimumProfit))
      .div(new BigNumber(1).minus(binanceTradeFee))
      .toString(10);
    const sellToken0 = await getBinanceToken0SellMarket(
      binancePairInfo,
      secondBinancePairInfo,
      minSellToken1,
      binanceTradeFee,
      strategy.invert
    );
    const token0Buy = new BigNumber(sellToken0)
      .div(new BigNumber(1).minus(ICDexTradeFee))
      .decimalPlaces(tokenMinUnit, 2)
      .toString(10);
    const ICDexPriceBuy = new BigNumber(config.token1Amount)
      .div(token0Buy)
      .decimalPlaces(unit, 1)
      .times(10 ** token1Decimals)
      .times(new BigNumber(unitSize).div(10 ** token0Decimals))
      .toString(10);
    const priceBuy = new BigNumber(config.token1Amount)
      .div(token0Buy)
      .toString(10);
    return {
      token0Buy: token0Buy,
      ICDexPriceBuy: ICDexPriceBuy,
      priceBuy: priceBuy
    };
  } catch (e) {
    return { token0Buy: '', priceBuy: '', ICDexPriceBuy: '' };
  }
};
export const getBuyPriceBinance = async (
  strategy: Strategy,
  binancePairInfo: BinanceSymbolDB,
  filter: Filters,
  ICDexPairInfo: ICDexPairInfoDB,
  secondICDexPairInfo: ICDexPairInfoDB,
  minimumProfit: number,
  binanceTradeFee: string,
  config: MakerConfig,
  ICDexTradeFee: string
): Promise<{
  token0Buy: string;
  binancePriceBuy: string;
}> => {
  try {
    const minSellToken1 = new BigNumber(config.token1Amount)
      .times(new BigNumber(1).plus(minimumProfit))
      .div(new BigNumber(1).minus(ICDexTradeFee))
      .toString(10);
    const sellToken0 = await getICDexToken0SellMarket(
      ICDexPairInfo,
      secondICDexPairInfo,
      minSellToken1,
      ICDexTradeFee,
      strategy.invert
    );
    if (!sellToken0) {
      return { token0Buy: '', binancePriceBuy: '' };
    }
    const token0Buy = new BigNumber(sellToken0)
      .div(new BigNumber(1).minus(binanceTradeFee))
      .decimalPlaces(filter.token0.decimals, 2)
      .toString(10);
    const binancePriceBuy = new BigNumber(config.token1Amount)
      .div(token0Buy)
      .decimalPlaces(filter.price.decimals, 1)
      .toString(10);
    return {
      token0Buy: token0Buy,
      binancePriceBuy: binancePriceBuy
    };
  } catch (e) {
    return { token0Buy: '', binancePriceBuy: '' };
  }
};
export const getSellPriceBinance = async (
  strategy: Strategy,
  binancePairInfo: BinanceSymbolDB,
  filter: Filters,
  ICDexPairInfo: ICDexPairInfoDB,
  secondICDexPairInfo: ICDexPairInfoDB,
  minimumProfit: number,
  binanceTradeFee: string,
  config: MakerConfig,
  ICDexTradeFee: string
): Promise<{
  token0Sell: string;
  binancePriceSell: string;
}> => {
  try {
    const minBuyToken1 = new BigNumber(config.token1Amount)
      .times(new BigNumber(1).minus(binanceTradeFee))
      .toString(10);
    const buyToken0 = await getICDexToken0BuyMarket(
      ICDexPairInfo,
      secondICDexPairInfo,
      minBuyToken1,
      ICDexTradeFee,
      strategy.invert
    );
    if (!buyToken0) {
      return { token0Sell: '', binancePriceSell: '' };
    }
    const token0Sell = new BigNumber(buyToken0)
      .times(new BigNumber(1).minus(ICDexTradeFee))
      .div(new BigNumber(1).plus(minimumProfit))
      .decimalPlaces(filter.token0.decimals, 1)
      .toString(10);
    const binancePriceSell = new BigNumber(config.token1Amount)
      .div(token0Sell)
      .decimalPlaces(filter.price.decimals, 1)
      .toString(10);
    return {
      token0Sell: token0Sell,
      binancePriceSell: binancePriceSell
    };
  } catch (e) {
    return { token0Sell: '', binancePriceSell: '' };
  }
};
export const getSellPrice = async (
  strategy: Strategy,
  ICDexPairInfo: ICDexPairInfoDB,
  binancePairInfo: BinanceSymbolDB,
  secondBinancePairInfo: BinanceSymbolDB,
  minimumProfit: number,
  ICDexTradeFee: string,
  config: MakerConfig,
  binanceTradeFee: string,
  token0Decimals: number,
  token1Decimals: number,
  tokenMinUnit: number,
  unitSize: string
): Promise<{
  token0Sell: string;
  ICDexPriceSell: string;
  priceSell: string;
}> => {
  try {
    let unit = 0;
    if (token1Decimals - tokenMinUnit > 0) {
      unit = token1Decimals - tokenMinUnit;
      if (unit > 8) {
        unit = 8;
      }
    } else {
      unit = 0;
    }
    const minBuyToken1 = new BigNumber(config.token1Amount)
      .times(new BigNumber(1).minus(ICDexTradeFee))
      .toString(10);
    const buyToken0 = await getBinanceToken0BuyMarket(
      binancePairInfo,
      secondBinancePairInfo,
      minBuyToken1,
      strategy.mainExchangeFee,
      strategy.invert
    );
    const token0Sell = new BigNumber(buyToken0)
      .times(new BigNumber(1).minus(binanceTradeFee))
      .div(new BigNumber(1).plus(minimumProfit))
      .decimalPlaces(tokenMinUnit, 1)
      .toString(10);
    const ICDexPriceSell = new BigNumber(config.token1Amount)
      .div(token0Sell)
      .decimalPlaces(unit, 1)
      .times(10 ** token1Decimals)
      .times(new BigNumber(unitSize).div(10 ** token0Decimals))
      .toString(10);
    const priceSell = new BigNumber(config.token1Amount)
      .div(token0Sell)
      .toString(10);
    return {
      token0Sell: token0Sell,
      ICDexPriceSell: ICDexPriceSell,
      priceSell: priceSell
    };
  } catch (e) {
    return { token0Sell: '', ICDexPriceSell: '', priceSell: '' };
  }
};
export const hasPendingOrders = async (
  strategyId: number,
  mainExchangeName: ExchangeName,
  mainPairInfo: ICDexPairInfoDB | BinanceSymbolDB,
  mainAccount: Identity | BinanceConfig
): Promise<boolean> => {
  let flag = false;
  const pendingOrder = await getPendingOrders(strategyId);
  const mainOrders: Array<string> = [];
  if (pendingOrder && pendingOrder.length) {
    pendingOrder.forEach((item) => {
      mainOrders.push(item.mainExchangeOrderId);
    });
  }
  if (mainExchangeName === ExchangeName.ICDex) {
    const service = new ICDexService();
    const pairInfo = mainPairInfo as ICDexPairInfoDB;
    const account = mainAccount as Identity;
    const pending = await service.pending(
      pairInfo.pairId,
      account.getPrincipal().toString()
    );
    if (pending && pending.data && pending.data.length) {
      pending.data.forEach((item) => {
        const txid = toHexString(new Uint8Array(item[0]));
        const status = Object.keys(item[1].status)[0];
        if (mainOrders.includes(txid) && status === 'Pending') {
          flag = true;
        }
        if (!mainOrders.includes(txid) && status === 'Pending') {
          // todo pending
        }
      });
    }
  } else if (mainExchangeName === ExchangeName.Binance) {
    const pairInfo = mainPairInfo as BinanceSymbolDB;
    const account = mainAccount as BinanceConfig;
    const response = await openOrders(
      account.APIKey,
      account.privateKey,
      pairInfo.symbol
    );
    if (
      response &&
      !((response as ErrorData).code || (response as ErrorData).code === 0)
    ) {
      const pending = response as Array<OrderInfo>;
      if (pending && pending.length) {
        for (let i = 0; i < pending.length; i++) {
          const orderId = pending[i].orderId.toString(10);
          const status = pending[i].status;
          if (
            mainOrders.includes(orderId) &&
            (status === 'NEW' ||
              status === 'PENDING_NEW' ||
              status === 'PARTIALLY_FILLED')
          ) {
            flag = true;
            break;
          }
        }
      }
    }
  }
  return flag;
};
const tradeType: { [key: number]: Side } = {};
export const toRunTimer = async (
  strategy: Strategy,
  exchange: { [key: number]: ExchangeName },
  mainPairInfo: ICDexPairInfoDB | BinanceSymbolDB,
  mainAccount: Identity | BinanceConfig,
  mainAccountBalance: Balance,
  secondPairInfo: ICDexPairInfoDB | BinanceSymbolDB,
  secondAccount: Identity | BinanceConfig,
  secondAccountBalance: Balance,
  secondPairInfoTwo: ICDexPairInfoDB | BinanceSymbolDB | null,
  secondAccountBalanceTwo: Balance | null
): Promise<string> => {
  try {
    const mainExchangeName = exchange[strategy.mainExchangeId];
    const secondExchangeName = exchange[strategy.secondExchangeId];
    const config = JSON.parse(strategy.arguments) as TimerConfig;
    if (config && config.orderAmount) {
      if (mainExchangeName === ExchangeName.ICDex) {
        mainAccount = mainAccount as Identity;
        mainPairInfo = mainPairInfo as ICDexPairInfoDB;
        const token0Info = JSON.parse(mainPairInfo.token0Info) as TokenInfo;
        const token1Info = JSON.parse(mainPairInfo.token1Info) as TokenInfo;
        const token0Decimals = token0Info.decimals;
        const token1Decimals = token1Info.decimals;
        const setting = JSON.parse(mainPairInfo.setting) as DexSetting;
        const unitSize = setting.UNIT_SIZE;
        let tokenMinUnit = 0;
        const tokenUnitDecimals = unitSize.length - 1; // Unit must 1+0000
        if (token0Decimals > tokenUnitDecimals) {
          // todo
          tokenMinUnit = token0Decimals - tokenUnitDecimals;
        }
        const ICDexRes = await getICDexToken1AndToken0(
          mainPairInfo.pairId,
          mainPairInfo,
          config,
          strategy.mainExchangeFee
        );
        const token0 = new BigNumber(1)
          .minus(strategy.mainExchangeFee)
          .times(config.orderAmount)
          .toString(10);
        const depthToken: DepthToken = {
          token0: token0,
          token1: ICDexRes.sellToken0GetToken1
        };
        if (secondExchangeName === ExchangeName.Binance) {
          secondPairInfo = secondPairInfo as BinanceSymbolDB;
          secondPairInfoTwo = secondPairInfoTwo as BinanceSymbolDB;
          secondAccount = secondAccount as BinanceConfig;
          const binanceRes = await getBinanceToken1AndToken0(
            secondPairInfo,
            secondPairInfoTwo,
            depthToken,
            strategy.secondExchangeFee,
            strategy.invert
          );
          if (!config.unilateral && config.arbitrage) {
            if (new BigNumber(binanceRes.token0).gt(config.orderAmount)) {
              const res = await ICDexSellThenBinanceTrade(
                strategy,
                0,
                mainPairInfo,
                mainAccount,
                mainAccountBalance,
                secondPairInfo,
                secondPairInfoTwo,
                secondAccount,
                secondAccountBalance,
                secondAccountBalanceTwo,
                config.orderAmount,
                token0Decimals,
                token1Decimals,
                tokenMinUnit,
                config.arbitrage,
                config.unilateral,
                OrdersStatus.Completed
              );
              if (typeof res === 'string') {
                return res;
              }
            } else if (
              new BigNumber(binanceRes.token1).gt(ICDexRes.buyToken0NeedToken1)
            ) {
              const res = await ICDexBuyThenBinanceTrade(
                strategy,
                0,
                mainPairInfo,
                mainAccount,
                mainAccountBalance,
                secondPairInfo,
                secondPairInfoTwo,
                secondAccount,
                secondAccountBalance,
                secondAccountBalanceTwo,
                ICDexRes.buyToken0NeedToken1,
                token0Decimals,
                token1Decimals,
                tokenMinUnit,
                config.arbitrage,
                config.unilateral,
                OrdersStatus.Completed
              );
              if (typeof res === 'string') {
                return res;
              }
            }
          } else {
            const service = new ICDexService();
            const res = await service.stats(mainPairInfo.pairId);
            const tokenPrice = new BigNumber(res.price)
              .times(10 ** token0Decimals)
              .div(10 ** token1Decimals)
              .toString(10);
            const token0Sell = new BigNumber(mainAccountBalance.token0)
              .times(tokenPrice)
              .toString(10);
            if (
              new BigNumber(token0Sell).times(0.2).gt(mainAccountBalance.token1)
            ) {
              // 80%
              tradeType[strategy.id] = 'SELL';
              const token0Amount = new BigNumber(config.orderAmount)
                .times(2)
                .toString(10);
              const res = await ICDexSellThenBinanceTrade(
                strategy,
                0,
                mainPairInfo,
                mainAccount,
                mainAccountBalance,
                secondPairInfo,
                secondPairInfoTwo,
                secondAccount,
                secondAccountBalance,
                secondAccountBalanceTwo,
                token0Amount,
                token0Decimals,
                token1Decimals,
                tokenMinUnit,
                config.arbitrage,
                config.unilateral,
                OrdersStatus.Completed
              );
              if (typeof res === 'string') {
                return res;
              }
            } else if (
              new BigNumber(token0Sell)
                .times(0.8)
                .gt(mainAccountBalance.token1) ||
              (!tradeType[strategy.id] &&
                new BigNumber(token0Sell).gte(mainAccountBalance.token1))
            ) {
              // 20%
              tradeType[strategy.id] = 'SELL';
              const res = await ICDexSellThenBinanceTrade(
                strategy,
                0,
                mainPairInfo,
                mainAccount,
                mainAccountBalance,
                secondPairInfo,
                secondPairInfoTwo,
                secondAccount,
                secondAccountBalance,
                secondAccountBalanceTwo,
                config.orderAmount,
                token0Decimals,
                token1Decimals,
                tokenMinUnit,
                config.arbitrage,
                config.unilateral,
                OrdersStatus.Completed
              );
              if (typeof res === 'string') {
                return res;
              }
            } else if (
              new BigNumber(mainAccountBalance.token1).times(0.2).gt(token0Sell)
            ) {
              // 80%
              tradeType[strategy.id] = 'BUY';
              const buyConfig = JSON.parse(
                JSON.stringify(config)
              ) as TimerConfig;
              buyConfig.orderAmount = new BigNumber(buyConfig.orderAmount)
                .times(2)
                .toString(10);
              const ICDexToken1AndToken0 = await getICDexToken1AndToken0(
                mainPairInfo.pairId,
                mainPairInfo,
                buyConfig,
                strategy.mainExchangeFee
              );
              const res = await ICDexBuyThenBinanceTrade(
                strategy,
                0,
                mainPairInfo,
                mainAccount,
                mainAccountBalance,
                secondPairInfo,
                secondPairInfoTwo,
                secondAccount,
                secondAccountBalance,
                secondAccountBalanceTwo,
                ICDexToken1AndToken0.buyToken0NeedToken1,
                token0Decimals,
                token1Decimals,
                tokenMinUnit,
                config.arbitrage,
                config.unilateral,
                OrdersStatus.Completed
              );
              if (typeof res === 'string') {
                return res;
              }
            } else if (
              new BigNumber(mainAccountBalance.token1)
                .times(0.8)
                .gt(token0Sell) ||
              (tradeType[strategy.id] && tradeType[strategy.id] === 'SELL') ||
              (!tradeType[strategy.id] &&
                new BigNumber(mainAccountBalance.token1).gt(token0Sell))
            ) {
              // 20%
              tradeType[strategy.id] = 'BUY';
              const res = await ICDexBuyThenBinanceTrade(
                strategy,
                0,
                mainPairInfo,
                mainAccount,
                mainAccountBalance,
                secondPairInfo,
                secondPairInfoTwo,
                secondAccount,
                secondAccountBalance,
                secondAccountBalanceTwo,
                ICDexRes.buyToken0NeedToken1,
                token0Decimals,
                token1Decimals,
                tokenMinUnit,
                config.arbitrage,
                config.unilateral,
                OrdersStatus.Completed
              );
              if (typeof res === 'string') {
                return res;
              }
            } else if (
              tradeType[strategy.id] &&
              tradeType[strategy.id] === 'BUY'
            ) {
              tradeType[strategy.id] = 'SELL';
              const res = await ICDexSellThenBinanceTrade(
                strategy,
                0,
                mainPairInfo,
                mainAccount,
                mainAccountBalance,
                secondPairInfo,
                secondPairInfoTwo,
                secondAccount,
                secondAccountBalance,
                secondAccountBalanceTwo,
                config.orderAmount,
                token0Decimals,
                token1Decimals,
                tokenMinUnit,
                config.arbitrage,
                config.unilateral,
                OrdersStatus.Completed
              );
              if (typeof res === 'string') {
                return res;
              }
              return '';
            }
          }
        }
      } else if (mainExchangeName === ExchangeName.Binance) {
        mainAccount = mainAccount as BinanceConfig;
        mainPairInfo = mainPairInfo as BinanceSymbolDB;
        const binanceRes = await getBinanceToken1AndToken0ByOrderAmount(
          mainPairInfo,
          config,
          strategy.mainExchangeFee
        );
        const token0 = new BigNumber(1)
          .minus(strategy.mainExchangeFee)
          .times(config.orderAmount)
          .toString(10);
        const depthToken: DepthToken = {
          token0: token0,
          token1: binanceRes.sellToken0GetToken1
        };
        if (secondExchangeName === ExchangeName.ICDex) {
          secondPairInfo = secondPairInfo as ICDexPairInfoDB;
          secondPairInfoTwo = secondPairInfoTwo as ICDexPairInfoDB;
          secondAccount = secondAccount as Identity;
          const ICDexRes = await getICDexToken0AndToken1(
            secondPairInfo,
            secondPairInfoTwo,
            depthToken,
            strategy.secondExchangeFee,
            strategy.invert
          );
          if (!config.unilateral && config.arbitrage) {
            if (new BigNumber(ICDexRes.token0).gt(config.orderAmount)) {
              const res = await binanceSellThenICDexTrade(
                strategy,
                0,
                mainPairInfo,
                mainAccount,
                mainAccountBalance,
                secondPairInfo,
                secondPairInfoTwo,
                secondAccount,
                secondAccountBalance,
                secondAccountBalanceTwo,
                config.orderAmount,
                config.arbitrage,
                config.unilateral,
                OrdersStatus.Completed
              );
              if (typeof res === 'string') {
                return res;
              }
            } else if (
              new BigNumber(ICDexRes.token1).gt(binanceRes.buyToken0NeedToken1)
            ) {
              const res = await binanceBuyThenICDexTrade(
                strategy,
                0,
                mainPairInfo,
                mainAccount,
                mainAccountBalance,
                secondPairInfo,
                secondPairInfoTwo,
                secondAccount,
                secondAccountBalance,
                secondAccountBalanceTwo,
                binanceRes.buyToken0NeedToken1,
                config.arbitrage,
                config.unilateral,
                OrdersStatus.Completed
              );
              if (typeof res === 'string') {
                return res;
              }
            }
          } else {
            const res = await getDepth(mainPairInfo.symbol);
            let token0Sell = mainAccountBalance.token0;
            if (!(res as ErrorData).code) {
              const depth = res as Depth;
              token0Sell = new BigNumber(mainAccountBalance.token0)
                .times(depth.bids[0][0])
                .toString(10);
            }
            if (
              new BigNumber(token0Sell).times(0.2).gt(mainAccountBalance.token1)
            ) {
              // 80%
              tradeType[strategy.id] = 'SELL';
              const token0Amount = new BigNumber(config.orderAmount)
                .times(2)
                .toString(10);
              const res = await binanceSellThenICDexTrade(
                strategy,
                0,
                mainPairInfo,
                mainAccount,
                mainAccountBalance,
                secondPairInfo,
                secondPairInfoTwo,
                secondAccount,
                secondAccountBalance,
                secondAccountBalanceTwo,
                token0Amount,
                config.arbitrage,
                config.unilateral,
                OrdersStatus.Completed
              );
              if (typeof res === 'string') {
                return res;
              }
            } else if (
              new BigNumber(token0Sell)
                .times(0.8)
                .gt(mainAccountBalance.token1) ||
              (!tradeType[strategy.id] &&
                new BigNumber(token0Sell).gte(mainAccountBalance.token1))
            ) {
              // 20%
              tradeType[strategy.id] = 'SELL';
              const res = await binanceSellThenICDexTrade(
                strategy,
                0,
                mainPairInfo,
                mainAccount,
                mainAccountBalance,
                secondPairInfo,
                secondPairInfoTwo,
                secondAccount,
                secondAccountBalance,
                secondAccountBalanceTwo,
                config.orderAmount,
                config.arbitrage,
                config.unilateral,
                OrdersStatus.Completed
              );
              if (typeof res === 'string') {
                return res;
              }
            } else if (
              new BigNumber(mainAccountBalance.token1).times(0.2).gt(token0Sell)
            ) {
              // 80%
              tradeType[strategy.id] = 'BUY';
              const buyConfig = JSON.parse(
                JSON.stringify(config)
              ) as TimerConfig;
              buyConfig.orderAmount = new BigNumber(buyConfig.orderAmount)
                .times(2)
                .toString(10);
              const binanceRes = await getBinanceToken1AndToken0ByOrderAmount(
                mainPairInfo,
                buyConfig,
                strategy.mainExchangeFee
              );
              const res = await binanceBuyThenICDexTrade(
                strategy,
                0,
                mainPairInfo,
                mainAccount,
                mainAccountBalance,
                secondPairInfo,
                secondPairInfoTwo,
                secondAccount,
                secondAccountBalance,
                secondAccountBalanceTwo,
                binanceRes.buyToken0NeedToken1,
                config.arbitrage,
                config.unilateral,
                OrdersStatus.Completed
              );
              if (typeof res === 'string') {
                return res;
              }
            } else if (
              new BigNumber(mainAccountBalance.token1)
                .times(0.8)
                .gt(token0Sell) ||
              (tradeType[strategy.id] && tradeType[strategy.id] === 'SELL') ||
              (!tradeType[strategy.id] &&
                new BigNumber(mainAccountBalance.token1).gt(token0Sell))
            ) {
              // 20%
              tradeType[strategy.id] = 'BUY';
              const res = await binanceBuyThenICDexTrade(
                strategy,
                0,
                mainPairInfo,
                mainAccount,
                mainAccountBalance,
                secondPairInfo,
                secondPairInfoTwo,
                secondAccount,
                secondAccountBalance,
                secondAccountBalanceTwo,
                binanceRes.buyToken0NeedToken1,
                config.arbitrage,
                config.unilateral,
                OrdersStatus.Completed
              );
              if (typeof res === 'string') {
                return res;
              }
            } else if (
              tradeType[strategy.id] &&
              tradeType[strategy.id] === 'BUY'
            ) {
              tradeType[strategy.id] = 'SELL';
              const res = await binanceSellThenICDexTrade(
                strategy,
                0,
                mainPairInfo,
                mainAccount,
                mainAccountBalance,
                secondPairInfo,
                secondPairInfoTwo,
                secondAccount,
                secondAccountBalance,
                secondAccountBalanceTwo,
                config.orderAmount,
                config.arbitrage,
                config.unilateral,
                OrdersStatus.Completed
              );
              if (typeof res === 'string') {
                return res;
              }
              return '';
            }
          }
        }
      }
    }
  } catch (e) {}
  return '';
};
export const getBalance = async (
  accountId: number,
  exchangeName: ExchangeName,
  pairInfo: ICDexPairInfoDB | BinanceSymbolDB,
  accountValue: Identity | BinanceConfig
): Promise<Balance> => {
  const balance = {
    token0: '0',
    token1: '0'
  };
  if (exchangeName === ExchangeName.ICDex) {
    const service = new ICDexService();
    pairInfo = pairInfo as ICDexPairInfoDB;
    accountValue = accountValue as Identity;
    const keepingBalance = await service.accountBalance(
      pairInfo.pairId,
      accountValue.getPrincipal().toString()
    );
    const token0Info = JSON.parse(pairInfo.token0Info);
    const token1Info = JSON.parse(pairInfo.token1Info);
    balance.token0 = new BigNumber(keepingBalance.token0.available.toString(10))
      .div(10 ** token0Info.decimals)
      .toString(10);
    balance.token1 = new BigNumber(keepingBalance.token1.available.toString(10))
      .div(10 ** token1Info.decimals)
      .toString(10);
  } else if (exchangeName === ExchangeName.Binance) {
    pairInfo = pairInfo as BinanceSymbolDB;
    accountValue = accountValue as BinanceConfig;
    if (!binanceAccountInfo[accountValue.APIKey]) {
      await getBinanceAccountInfoInterval(accountId, accountValue);
    }
    balance.token0 = filterBinanceBalance(
      binanceAccountInfo[accountValue.APIKey].info,
      pairInfo.baseAsset
    );
    balance.token1 = filterBinanceBalance(
      binanceAccountInfo[accountValue.APIKey].info,
      pairInfo.quoteAsset
    );
  }
  return balance;
};
export const getAccountValue = (
  exchangeName: ExchangeName,
  value: string
): Identity | BinanceConfig | null => {
  let account: Identity | BinanceConfig | null = null;
  if (exchangeName === ExchangeName.ICDex) {
    const mainAccountValue = JSON.parse(value) as ICDexConfig;
    if (mainAccountValue && mainAccountValue.pem) {
      const identity = identityFromPem(mainAccountValue.pem);
      if (identity) {
        account = identity;
      }
    }
  } else if (exchangeName === ExchangeName.Binance) {
    account = JSON.parse(value) as BinanceConfig;
  }
  return account;
};
export const getBinanceAccountInfo = async (
  accountId: number
): Promise<AccountInfo | null> => {
  const res = await getAccountInfo(accountId);
  if ((res as ErrorData).code) {
    //
  } else {
    return res as AccountInfo;
  }
  return null;
};
export const filterBinanceBalance = (
  accountInfo: AccountInfo,
  symbol: string
): string => {
  const res = accountInfo.balances.find((item) => symbol === item.asset);
  if (res) {
    return res.free;
  }
  return '0';
};
export const getBinanceAccountInfoInterval = async (
  accountId: number,
  val: BinanceConfig
): Promise<void> => {
  const time = new Date().getTime();
  if (binanceAccountInfo[val.APIKey]) {
    if (binanceAccountInfo[val.APIKey].time + interval < time) {
      return;
    }
  }
  const res = await getBinanceAccountInfo(accountId);
  if (res) {
    binanceAccountInfo[val.APIKey] = {
      time: time,
      info: res
    };
  }
  setTimeout(() => {
    getBinanceAccountInfoInterval(accountId, val);
  }, interval);
};
export const binanceBuyThenICDexTrade = async (
  strategy: Strategy,
  minimumProfit: number,
  binancePairInfo: BinanceSymbolDB,
  binanceConfig: BinanceConfig,
  binanceBalance: Balance,
  ICDexPairInfo: ICDexPairInfoDB,
  secondICDexPairInfo: ICDexPairInfoDB,
  identity: Identity,
  ICDexBalance: Balance,
  ICDexBalanceTwo: Balance | null,
  token1Amount: string,
  arbitrage: BooleanType,
  unilateral: BooleanType,
  status: OrdersStatus
): Promise<ICDexOrder | string> => {
  const filter = await getBinanceFilter(binancePairInfo);
  const buyResponse = await onBinanceBuy(
    strategy.id,
    binanceConfig,
    binancePairInfo,
    Number(token1Amount),
    filter,
    binanceBalance
  );
  if (typeof buyResponse === 'string') {
    await insertOrderIdOrUpdate(strategy.id, '', null, buyResponse, '', status);
    return buyResponse;
  } else {
    const token0Value = buyResponse.executedQty;
    const token1DebitRecord = buyResponse.cummulativeQuoteQty;
    const orderId = buyResponse.orderId;
    if (unilateral) {
      await insertOrderIdOrUpdate(
        strategy.id,
        orderId.toString(10),
        null,
        '',
        '',
        status
      );
      return '';
    } else {
      if (strategy.invert === 1) {
        return await toBuyICDex(
          strategy,
          minimumProfit,
          ICDexPairInfo,
          secondICDexPairInfo,
          ICDexBalance,
          ICDexBalanceTwo,
          identity,
          orderId.toString(10),
          token0Value,
          token0Value,
          token1DebitRecord,
          arbitrage,
          status
        );
      } else {
        return await toSellICDex(
          strategy,
          minimumProfit,
          ICDexPairInfo,
          secondICDexPairInfo,
          ICDexBalance,
          ICDexBalanceTwo,
          identity,
          orderId.toString(10),
          token0Value,
          token0Value,
          token1DebitRecord,
          arbitrage,
          status
        );
      }
    }
  }
};
export const ICDexBuyThenBinanceTrade = async (
  strategy: Strategy,
  minimumProfit: number,
  ICDePairInfo: ICDexPairInfoDB,
  identity: Identity,
  ICDexBalance: Balance,
  binancePairInfo: BinanceSymbolDB,
  secondBinancePairInfo: BinanceSymbolDB,
  binanceConfig: BinanceConfig,
  binanceBalance: Balance,
  binanceBalanceTwo: Balance | null,
  token1Amount: string,
  token0decimals: number,
  token1decimals: number,
  tokenMinUnit: number,
  arbitrage: BooleanType,
  unilateral: BooleanType,
  status: OrdersStatus
): Promise<BinanceOrder | string> => {
  const price = BigInt(0);
  const amount = BigInt(
    new BigNumber(token1Amount)
      .times(10 ** token1decimals)
      .decimalPlaces(token1decimals, 1)
      .toString(10)
  );
  const orderPriceBuy: OrderPrice = {
    quantity: { Buy: [BigInt(0), BigInt(amount)] },
    price: price
  };
  const ICDexBuyRes = await onICDexBuy(
    strategy.id,
    ICDePairInfo,
    orderPriceBuy,
    token0decimals,
    token1decimals,
    identity,
    token1Amount,
    ICDexBalance
  );
  if (typeof ICDexBuyRes === 'string') {
    await insertOrderIdOrUpdate(strategy.id, '', null, ICDexBuyRes, '', status);
    return ICDexBuyRes;
  } else {
    const filter = await getBinanceFilter(binancePairInfo);
    const secondFilter = await getBinanceFilter(secondBinancePairInfo);
    const token0Value = ICDexBuyRes.token0Value;
    const token1DebitRecord = ICDexBuyRes.token1DebitRecord;
    const txid = ICDexBuyRes.txid;
    if (unilateral) {
      await insertOrderIdOrUpdate(strategy.id, txid, null, '', '', status);
      return '';
    } else {
      if (strategy.invert === 1) {
        return await toBuyBinance(
          strategy,
          minimumProfit,
          binancePairInfo,
          filter,
          secondBinancePairInfo,
          secondFilter,
          binanceBalance,
          binanceBalanceTwo,
          binanceConfig,
          txid,
          token0Value,
          token0Value,
          token1DebitRecord,
          arbitrage,
          status
        );
      } else {
        return await toSellBinance(
          strategy,
          minimumProfit,
          binancePairInfo,
          filter,
          secondBinancePairInfo,
          secondFilter,
          binanceBalance,
          binanceBalanceTwo,
          binanceConfig,
          txid,
          token0Value,
          token0Value,
          token1DebitRecord,
          arbitrage,
          status
        );
      }
    }
  }
};
export const binanceSellThenICDexTrade = async (
  strategy: Strategy,
  minimumProfit: number,
  binancePairInfo: BinanceSymbolDB,
  binanceConfig: BinanceConfig,
  binanceBalance: Balance,
  ICDexPairInfo: ICDexPairInfoDB,
  secondICDexPairInfo: ICDexPairInfoDB,
  identity: Identity,
  ICDexBalance: Balance,
  ICDexBalanceTwo: Balance | null,
  token0Amount: string,
  arbitrage: BooleanType,
  unilateral: BooleanType,
  status: OrdersStatus
): Promise<ICDexOrder | string> => {
  const filter = await getBinanceFilter(binancePairInfo);
  const sellResponse = await onBinanceSell(
    strategy.id,
    binancePairInfo,
    binanceConfig,
    token0Amount,
    filter,
    binanceBalance
  );
  if (typeof sellResponse === 'string') {
    await insertOrderIdOrUpdate(
      strategy.id,
      '',
      null,
      sellResponse,
      '',
      status
    );
    return sellResponse;
  } else {
    const token1Value = sellResponse.cummulativeQuoteQty;
    const token0DebitRecord = sellResponse.executedQty;
    const orderId = sellResponse.orderId;
    if (unilateral) {
      await insertOrderIdOrUpdate(
        strategy.id,
        orderId.toString(10),
        null,
        '',
        '',
        status
      );
      return '';
    } else {
      if (strategy.invert === 1) {
        return await toSellICDex(
          strategy,
          minimumProfit,
          ICDexPairInfo,
          secondICDexPairInfo,
          ICDexBalance,
          ICDexBalanceTwo,
          identity,
          orderId.toString(10),
          token1Value,
          token1Value,
          token0DebitRecord,
          arbitrage,
          status
        );
      } else {
        return await toBuyICDex(
          strategy,
          minimumProfit,
          ICDexPairInfo,
          secondICDexPairInfo,
          ICDexBalance,
          ICDexBalanceTwo,
          identity,
          orderId.toString(10),
          token1Value,
          token1Value,
          token0DebitRecord,
          arbitrage,
          status
        );
      }
    }
  }
};
export const ICDexSellThenBinanceTrade = async (
  strategy: Strategy,
  minimumProfit: number,
  ICDePairInfo: ICDexPairInfoDB,
  identity: Identity,
  ICDexBalance: Balance,
  binancePairInfo: BinanceSymbolDB,
  secondBinancePairInfo: BinanceSymbolDB,
  binanceConfig: BinanceConfig,
  binanceBalance: Balance,
  binanceBalanceTwo: Balance | null,
  token0Amount: string,
  token0decimals: number,
  token1decimals: number,
  tokenMinUnit: number,
  arbitrage: BooleanType,
  unilateral: BooleanType,
  status: OrdersStatus
): Promise<BinanceOrder | string> => {
  const price = BigInt(0);
  const amount = BigInt(
    new BigNumber(token0Amount)
      .times(10 ** token0decimals)
      .decimalPlaces(tokenMinUnit, 1)
      .toString(10)
  );
  const orderPriceSell: OrderPrice = {
    quantity: { Sell: amount },
    price: price
  };
  const ICDexSellRes = await onICDexSell(
    strategy.id,
    ICDePairInfo,
    orderPriceSell,
    token0decimals,
    token1decimals,
    identity,
    token0Amount,
    ICDexBalance
  );
  if (typeof ICDexSellRes === 'string') {
    await insertOrderIdOrUpdate(
      strategy.id,
      '',
      null,
      ICDexSellRes,
      '',
      status
    );
    return ICDexSellRes;
  } else {
    const filter = await getBinanceFilter(binancePairInfo);
    const secondFilter = await getBinanceFilter(secondBinancePairInfo);
    const token1Value = ICDexSellRes.token1Value;
    const token0DebitRecord = ICDexSellRes.token0DebitRecord;
    const txid = ICDexSellRes.txid;
    if (unilateral) {
      await insertOrderIdOrUpdate(strategy.id, txid, null, '', '', status);
      return '';
    } else {
      if (strategy.invert === 1) {
        return await toSellBinance(
          strategy,
          minimumProfit,
          binancePairInfo,
          filter,
          secondBinancePairInfo,
          secondFilter,
          binanceBalance,
          binanceBalanceTwo,
          binanceConfig,
          txid,
          token1Value,
          token1Value,
          token0DebitRecord,
          arbitrage,
          status
        );
      } else {
        return await toBuyBinance(
          strategy,
          minimumProfit,
          binancePairInfo,
          filter,
          secondBinancePairInfo,
          secondFilter,
          binanceBalance,
          binanceBalanceTwo,
          binanceConfig,
          txid,
          token1Value,
          token1Value,
          token0DebitRecord,
          arbitrage,
          status
        );
      }
    }
  }
};
export const toSellICDex = async (
  strategy: Strategy,
  minimumProfit: number,
  pairInfo: ICDexPairInfoDB,
  secondPairInfo: ICDexPairInfoDB,
  balance: Balance,
  secondBalance: Balance | null,
  identity: Identity,
  orderId: string,
  token0Value: string,
  token0Remaining: string,
  token1DebitRecord: string,
  arbitrage: BooleanType,
  status: OrdersStatus,
  balanceChangesType: BalanceChangesType = null
): Promise<ICDexOrder | string> => {
  if (
    Number(token0Remaining) > 0 &&
    balanceChangesType &&
    balanceChangesType === 'AddToken0'
  ) {
    await updateBalanceChanges(strategy.id, token0Remaining, '', orderId, '');
  }
  if (
    Number(token0Remaining) > 0 &&
    balanceChangesType &&
    balanceChangesType === 'AddToken1'
  ) {
    await updateBalanceChanges(strategy.id, '', token0Remaining, orderId, '');
  }
  if (secondPairInfo && secondBalance) {
    // sell token0
    const filterSell = filterICDexSell(pairInfo, token0Value);
    const sellResponse = await onICDexSell(
      strategy.id,
      pairInfo,
      filterSell.orderPrice,
      filterSell.token0Decimals,
      filterSell.token1Decimals,
      identity,
      token0Value,
      secondBalance
    );
    if (typeof sellResponse === 'string') {
      if (!balanceChangesType) {
        await insertOrderIdOrUpdate(
          strategy.id,
          orderId,
          null,
          '',
          sellResponse,
          status
        );
      }
      return sellResponse;
    }
    const sellRes = sellResponse as ICDexSellResponse;
    const txid = sellRes.txid;
    const secondExchangeOrderId: ExchangeOrderId = {};
    secondExchangeOrderId[pairInfo.pairId] = txid;
    if (
      balanceChangesType &&
      (balanceChangesType === 'SubtractToken0' ||
        balanceChangesType === 'AddToken0')
    ) {
      const token0 = -token0Value;
      await updateBalanceChanges(
        strategy.id,
        token0.toString(10),
        '',
        orderId,
        txid
      );
    }
    if (balanceChangesType && balanceChangesType === 'AddToken1') {
      const token0 = -token0Value;
      await updateBalanceChanges(
        strategy.id,
        '',
        token0.toString(10),
        orderId,
        txid
      );
    }
    // buy token1
    const filterBuy = filterICDexBuy(secondPairInfo, sellRes.token1Value);
    const buyResponse = await onICDexBuy(
      strategy.id,
      secondPairInfo,
      filterBuy.orderPrice,
      filterBuy.token0Decimals,
      filterBuy.token1Decimals,
      identity,
      sellRes.token1Value,
      balance
    );
    if (typeof buyResponse === 'string') {
      if (!balanceChangesType) {
        await insertOrderIdOrUpdate(
          strategy.id,
          orderId,
          secondExchangeOrderId,
          '',
          buyResponse,
          status
        );
      }
      return buyResponse;
    }
    const buyRes = buyResponse as ICDexBuyResponse;
    secondExchangeOrderId[secondPairInfo.pairId] = buyRes.txid;
    await insertOrderIdOrUpdate(
      strategy.id,
      orderId,
      secondExchangeOrderId,
      '',
      '',
      status
    );
    if (arbitrage) {
      const debitRecord = new BigNumber(token1DebitRecord)
        .times(1 + minimumProfit)
        .toString();
      if (new BigNumber(buyRes.token0Value).lt(debitRecord)) {
        return 'Arbitrage failure';
      }
    }
    return {
      token0Value: buyRes.token0Value,
      token1Value: buyRes.token1DebitRecord,
      txid: buyRes.txid
    };
  } else {
    const filterSell = filterICDexSell(pairInfo, token0Value);
    const sellResponse = await onICDexSell(
      strategy.id,
      pairInfo,
      filterSell.orderPrice,
      filterSell.token0Decimals,
      filterSell.token1Decimals,
      identity,
      token0Value,
      balance
    );
    if (typeof sellResponse === 'string') {
      if (!balanceChangesType) {
        await insertOrderIdOrUpdate(
          strategy.id,
          orderId,
          null,
          '',
          sellResponse,
          status
        );
      }
      return sellResponse;
    }
    const sellRes = sellResponse as ICDexSellResponse;
    const txid = sellRes.txid;
    const secondExchangeOrderId: ExchangeOrderId = {};
    secondExchangeOrderId[pairInfo.pairId] = txid;
    if (
      balanceChangesType &&
      (balanceChangesType === 'SubtractToken0' ||
        balanceChangesType === 'AddToken0')
    ) {
      const token0 = -token0Value;
      await updateBalanceChanges(
        strategy.id,
        token0.toString(10),
        '',
        orderId,
        txid
      );
    }
    if (balanceChangesType && balanceChangesType === 'AddToken1') {
      const token0 = -token0Value;
      await updateBalanceChanges(
        strategy.id,
        '',
        token0.toString(10),
        orderId,
        txid
      );
    }
    await insertOrderIdOrUpdate(
      strategy.id,
      orderId,
      secondExchangeOrderId,
      '',
      '',
      status
    );
    if (arbitrage) {
      const debitRecord = new BigNumber(token1DebitRecord)
        .times(1 + minimumProfit)
        .toString();
      if (new BigNumber(sellRes.token1Value).lt(debitRecord)) {
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
export const toSellBinance = async (
  strategy: Strategy,
  minimumProfit: number,
  pairInfo: BinanceSymbolDB,
  filter: Filters,
  secondPairInfo: BinanceSymbolDB,
  secondFilter: Filters,
  balance: Balance,
  secondBalance: Balance | null,
  binanceConfig: BinanceConfig,
  txid: string,
  token0Value: string,
  token0Remaining: string,
  token1DebitRecord: string,
  arbitrage: BooleanType,
  status: OrdersStatus,
  balanceChangesType: BalanceChangesType = null
): Promise<BinanceOrder | string> => {
  if (
    Number(token0Remaining) > 0 &&
    balanceChangesType &&
    balanceChangesType === 'AddToken0'
  ) {
    await updateBalanceChanges(strategy.id, token0Remaining, '', txid, '');
  }
  if (
    Number(token0Remaining) > 0 &&
    balanceChangesType &&
    balanceChangesType === 'AddToken1'
  ) {
    await updateBalanceChanges(strategy.id, '', token0Remaining, txid, '');
  }
  if (secondPairInfo && secondBalance) {
    // sell token0
    const sellResponse = await onBinanceSell(
      strategy.id,
      pairInfo,
      binanceConfig,
      token0Value,
      filter,
      balance
    );
    if (typeof sellResponse === 'string') {
      if (!balanceChangesType) {
        await insertOrderIdOrUpdate(
          strategy.id,
          txid,
          null,
          '',
          sellResponse,
          status
        );
      }
      return sellResponse;
    }
    const sellRes = sellResponse as BinanceSellResponse;
    const orderId = sellRes.orderId.toString();
    const secondExchangeOrderId: ExchangeOrderId = {};
    secondExchangeOrderId[pairInfo.symbol] = orderId;
    if (
      balanceChangesType &&
      (balanceChangesType === 'SubtractToken0' ||
        balanceChangesType === 'AddToken0')
    ) {
      const token0 = -token0Value;
      await updateBalanceChanges(
        strategy.id,
        token0.toString(10),
        '',
        txid,
        orderId
      );
    }
    if (balanceChangesType && balanceChangesType === 'AddToken1') {
      const token0 = -token0Value;
      await updateBalanceChanges(
        strategy.id,
        '',
        token0.toString(10),
        txid,
        orderId
      );
    }
    // buy token1
    const buyResponse = await onBinanceBuy(
      strategy.id,
      binanceConfig,
      secondPairInfo,
      new BigNumber(sellRes.cummulativeQuoteQty).toNumber(),
      secondFilter,
      secondBalance
    );
    if (typeof buyResponse === 'string') {
      if (!balanceChangesType) {
        await insertOrderIdOrUpdate(
          strategy.id,
          txid,
          secondExchangeOrderId,
          '',
          buyResponse,
          status
        );
      }
      return buyResponse;
    }
    const buyRes = buyResponse as BinanceBuyResponse;
    secondExchangeOrderId[secondPairInfo.symbol] = buyRes.orderId.toString();
    await insertOrderIdOrUpdate(
      strategy.id,
      txid,
      secondExchangeOrderId,
      '',
      '',
      status
    );
    if (arbitrage) {
      const debitRecord = new BigNumber(token1DebitRecord)
        .times(1 + minimumProfit)
        .toString();
      if (new BigNumber(buyRes.executedQty).lt(debitRecord)) {
        return 'Arbitrage failure';
      }
    }
    return {
      executedQty: sellResponse.executedQty,
      cummulativeQuoteQty: buyResponse.cummulativeQuoteQty,
      orderId: buyResponse.orderId
    };
  } else {
    const sellResponse = await onBinanceSell(
      strategy.id,
      pairInfo,
      binanceConfig,
      token0Value,
      filter,
      balance
    );
    if (typeof sellResponse === 'string') {
      if (!balanceChangesType) {
        await insertOrderIdOrUpdate(
          strategy.id,
          txid,
          null,
          '',
          sellResponse,
          status
        );
      }
      return sellResponse;
    }
    const sellRes = sellResponse as BinanceSellResponse;
    const orderId = sellRes.orderId.toString();
    const secondExchangeOrderId: ExchangeOrderId = {};
    secondExchangeOrderId[pairInfo.symbol] = orderId;
    if (
      balanceChangesType &&
      (balanceChangesType === 'SubtractToken0' ||
        balanceChangesType === 'AddToken0')
    ) {
      const token0 = -token0Value;
      await updateBalanceChanges(
        strategy.id,
        token0.toString(10),
        '',
        txid,
        orderId
      );
    }
    if (balanceChangesType && balanceChangesType === 'AddToken1') {
      const token0 = -token0Value;
      await updateBalanceChanges(
        strategy.id,
        '',
        token0.toString(10),
        txid,
        orderId
      );
    }
    await insertOrderIdOrUpdate(
      strategy.id,
      txid,
      secondExchangeOrderId,
      '',
      '',
      status
    );
    if (arbitrage) {
      const debitRecord = new BigNumber(token1DebitRecord)
        .times(1 + minimumProfit)
        .toString();
      if (new BigNumber(sellRes.cummulativeQuoteQty).lt(debitRecord)) {
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
export const filterICDexBuy = (
  pairInfo: ICDexPairInfoDB,
  token1Amount: string
): {
  orderPrice: OrderPrice;
  token0Decimals: number;
  token1Decimals: number;
} => {
  const token0Info = JSON.parse(pairInfo.token0Info) as TokenInfo;
  const token1Info = JSON.parse(pairInfo.token1Info) as TokenInfo;
  const token0Decimals = token0Info.decimals;
  const token1Decimals = token1Info.decimals;
  const price = BigInt(0);
  const amount = BigInt(
    new BigNumber(token1Amount)
      .times(10 ** token1Decimals)
      .decimalPlaces(token1Decimals, 1)
      .toString(10)
  );
  return {
    orderPrice: {
      quantity: { Buy: [BigInt(0), BigInt(amount)] },
      price: price
    },
    token0Decimals: token0Decimals,
    token1Decimals: token1Decimals
  };
};
export const filterICDexSell = (
  pairInfo: ICDexPairInfoDB,
  token0Amount: string
): {
  orderPrice: OrderPrice;
  token0Decimals: number;
  token1Decimals: number;
  tokenMinUnit: number;
} => {
  const price = BigInt(0);
  const token0Info = JSON.parse(pairInfo.token0Info) as TokenInfo;
  const token1Info = JSON.parse(pairInfo.token1Info) as TokenInfo;
  const token0Decimals = token0Info.decimals;
  const token1Decimals = token1Info.decimals;
  const setting = JSON.parse(pairInfo.setting) as DexSetting;
  const unitSize = setting.UNIT_SIZE;
  let tokenMinUnit = 0;
  const tokenUnitDecimals = unitSize.length - 1; // Unit must 1+0000
  if (token0Decimals > tokenUnitDecimals) {
    // todo
    tokenMinUnit = token0Decimals - tokenUnitDecimals;
  }
  const amount = BigInt(
    new BigNumber(token0Amount)
      .times(10 ** token0Decimals)
      .decimalPlaces(tokenMinUnit, 1)
      .toString(10)
  );
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
export const toBuyICDex = async (
  strategy: Strategy,
  minimumProfit: number,
  pairInfo: ICDexPairInfoDB,
  secondPairInfo: ICDexPairInfoDB,
  balance: Balance,
  secondBalance: Balance | null,
  identity: Identity,
  orderId: string,
  token1Value: string,
  token1Remaining: string,
  token0DebitRecord: string,
  arbitrage: BooleanType,
  status: OrdersStatus,
  balanceChangesType: BalanceChangesType = null
): Promise<ICDexOrder | string> => {
  if (
    Number(token1Remaining) > 0 &&
    balanceChangesType &&
    balanceChangesType === 'AddToken1'
  ) {
    await updateBalanceChanges(strategy.id, '', token1Remaining, orderId, '');
  }
  if (
    Number(token1Remaining) > 0 &&
    balanceChangesType &&
    balanceChangesType === 'AddToken0'
  ) {
    await updateBalanceChanges(strategy.id, token1Remaining, '', orderId, '');
  }
  if (secondPairInfo && secondBalance) {
    // sell token1
    const filterSell = filterICDexSell(secondPairInfo, token1Value);
    const sellResponse = await onICDexSell(
      strategy.id,
      secondPairInfo,
      filterSell.orderPrice,
      filterSell.token0Decimals,
      filterSell.token1Decimals,
      identity,
      token1Value,
      secondBalance
    );
    if (typeof sellResponse === 'string') {
      if (!balanceChangesType) {
        await insertOrderIdOrUpdate(
          strategy.id,
          orderId,
          null,
          '',
          sellResponse,
          status
        );
      }
      return sellResponse;
    }
    const sellRes = sellResponse as ICDexSellResponse;
    const txid = sellRes.txid;
    const secondExchangeOrderId: ExchangeOrderId = {};
    secondExchangeOrderId[secondPairInfo.pairId] = txid;
    if (
      balanceChangesType &&
      (balanceChangesType === 'SubtractToken1' ||
        balanceChangesType === 'AddToken1')
    ) {
      const token1 = -token1Value;
      await updateBalanceChanges(
        strategy.id,
        '',
        token1.toString(10),
        orderId,
        txid
      );
    }
    if (balanceChangesType && balanceChangesType === 'AddToken0') {
      const token1 = -token1Value;
      await updateBalanceChanges(
        strategy.id,
        token1.toString(10),
        '',
        orderId,
        txid
      );
    }
    // buy token0
    const filterBuy = filterICDexBuy(pairInfo, sellRes.token1Value);
    const buyResponse = await onICDexBuy(
      strategy.id,
      pairInfo,
      filterBuy.orderPrice,
      filterBuy.token0Decimals,
      filterBuy.token1Decimals,
      identity,
      sellRes.token1Value,
      balance
    );
    if (typeof buyResponse === 'string') {
      if (!balanceChangesType) {
        await insertOrderIdOrUpdate(
          strategy.id,
          orderId,
          null,
          '',
          buyResponse,
          status
        );
      }
      return buyResponse;
    }
    const buyRes = buyResponse as ICDexBuyResponse;
    secondExchangeOrderId[pairInfo.pairId] = buyRes.txid;
    await insertOrderIdOrUpdate(
      strategy.id,
      orderId,
      secondExchangeOrderId,
      '',
      '',
      status
    );
    if (arbitrage) {
      const debitRecord = new BigNumber(token0DebitRecord)
        .times(1 + minimumProfit)
        .toString();
      if (new BigNumber(buyRes.token0Value).lt(debitRecord)) {
        return 'Arbitrage failure';
      }
    }
    return {
      token0Value: buyRes.token0Value,
      token1Value: buyRes.token1DebitRecord,
      txid: buyRes.txid
    };
  } else {
    const secondExchangeOrderId: ExchangeOrderId = {};
    const filterBuy = filterICDexBuy(pairInfo, token1Value);
    const buyResponse = await onICDexBuy(
      strategy.id,
      pairInfo,
      filterBuy.orderPrice,
      filterBuy.token0Decimals,
      filterBuy.token1Decimals,
      identity,
      token1Value,
      balance
    );
    if (typeof buyResponse === 'string') {
      if (!balanceChangesType) {
        await insertOrderIdOrUpdate(
          strategy.id,
          orderId,
          null,
          '',
          buyResponse,
          status
        );
      }
      return buyResponse;
    }
    const buyRes = buyResponse as ICDexBuyResponse;
    const txid = buyRes.txid;
    secondExchangeOrderId[pairInfo.pairId] = txid;
    if (
      balanceChangesType &&
      (balanceChangesType === 'SubtractToken1' ||
        balanceChangesType === 'AddToken1')
    ) {
      const token1 = -token1Value;
      if (Number(token1) < 0) {
        await updateBalanceChanges(
          strategy.id,
          '',
          token1.toString(10),
          orderId,
          txid
        );
      }
    }
    if (balanceChangesType && balanceChangesType === 'AddToken0') {
      const token1 = -token1Value;
      if (Number(token1) < 0) {
        await updateBalanceChanges(
          strategy.id,
          token1.toString(10),
          '',
          orderId,
          txid
        );
      }
    }
    await insertOrderIdOrUpdate(
      strategy.id,
      orderId,
      secondExchangeOrderId,
      '',
      '',
      status
    );
    if (arbitrage) {
      const debitRecord = new BigNumber(token0DebitRecord)
        .times(1 + minimumProfit)
        .toString();
      if (new BigNumber(buyRes.token0Value).lt(debitRecord)) {
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
export const toBuyBinance = async (
  strategy: Strategy,
  minimumProfit: number,
  pairInfo: BinanceSymbolDB,
  filter: Filters,
  secondPairInfo: BinanceSymbolDB,
  secondFilter: Filters,
  balance: Balance,
  secondBalance: Balance | null,
  binanceConfig: BinanceConfig,
  txid: string,
  token1Value: string,
  token1Remaining: string,
  token0DebitRecord: string,
  arbitrage: BooleanType,
  status: OrdersStatus,
  balanceChangesType: BalanceChangesType = null
): Promise<BinanceOrder | string> => {
  if (
    Number(token1Remaining) > 0 &&
    balanceChangesType &&
    balanceChangesType === 'AddToken1'
  ) {
    await updateBalanceChanges(strategy.id, '', token1Remaining, txid, '');
  }
  if (
    Number(token1Remaining) > 0 &&
    balanceChangesType &&
    balanceChangesType === 'AddToken0'
  ) {
    await updateBalanceChanges(strategy.id, token1Remaining, '', txid, '');
  }
  if (secondPairInfo && secondBalance) {
    // sell token1
    const sellResponse = await onBinanceSell(
      strategy.id,
      secondPairInfo,
      binanceConfig,
      token1Value,
      secondFilter,
      secondBalance
    );
    if (typeof sellResponse === 'string') {
      if (!balanceChangesType) {
        await insertOrderIdOrUpdate(
          strategy.id,
          txid,
          null,
          '',
          sellResponse,
          status
        );
      }
      return sellResponse;
    }
    const sellRes = sellResponse as BinanceSellResponse;
    const orderId = sellRes.orderId.toString();
    const secondExchangeOrderId: ExchangeOrderId = {};
    secondExchangeOrderId[secondPairInfo.symbol] = orderId;
    if (
      balanceChangesType &&
      (balanceChangesType === 'SubtractToken1' ||
        balanceChangesType === 'AddToken1')
    ) {
      const token1 = -token1Value;
      await updateBalanceChanges(
        strategy.id,
        '',
        token1.toString(10),
        txid,
        orderId
      );
    }
    if (balanceChangesType && balanceChangesType === 'AddToken0') {
      const token1 = -token1Value;
      await updateBalanceChanges(
        strategy.id,
        token1.toString(10),
        '',
        txid,
        orderId
      );
    }
    // buy token0
    const buyResponse = await onBinanceBuy(
      strategy.id,
      binanceConfig,
      pairInfo,
      new BigNumber(sellRes.cummulativeQuoteQty).toNumber(),
      filter,
      balance
    );
    if (typeof buyResponse === 'string') {
      if (!balanceChangesType) {
        await insertOrderIdOrUpdate(
          strategy.id,
          txid,
          null,
          '',
          buyResponse,
          status
        );
      }
      return buyResponse;
    }
    const buyRes = buyResponse as BinanceBuyResponse;
    secondExchangeOrderId[pairInfo.symbol] = buyRes.orderId.toString();
    await insertOrderIdOrUpdate(
      strategy.id,
      txid,
      secondExchangeOrderId,
      '',
      '',
      status
    );
    if (arbitrage) {
      const debitRecord = new BigNumber(token0DebitRecord)
        .times(1 + minimumProfit)
        .toString();
      if (new BigNumber(buyRes.executedQty).lt(debitRecord)) {
        return 'Arbitrage failure';
      }
    }
    return {
      executedQty: buyResponse.executedQty,
      cummulativeQuoteQty: sellResponse.cummulativeQuoteQty,
      orderId: buyResponse.orderId
    };
  } else {
    const secondExchangeOrderId: ExchangeOrderId = {};
    const buyResponse = await onBinanceBuy(
      strategy.id,
      binanceConfig,
      pairInfo,
      new BigNumber(token1Value).toNumber(),
      filter,
      balance
    );
    if (typeof buyResponse === 'string') {
      if (!balanceChangesType) {
        await insertOrderIdOrUpdate(
          strategy.id,
          txid,
          null,
          '',
          buyResponse,
          status
        );
      }
      return buyResponse;
    }
    const buyRes = buyResponse as BinanceBuyResponse;
    const orderId = buyRes.orderId.toString();
    secondExchangeOrderId[pairInfo.symbol] = orderId;
    if (
      balanceChangesType &&
      (balanceChangesType === 'SubtractToken1' ||
        balanceChangesType === 'AddToken1')
    ) {
      const token1 = -token1Value;
      if (Number(token1) < 0) {
        await updateBalanceChanges(
          strategy.id,
          '',
          token1.toString(10),
          txid,
          orderId
        );
      }
    }
    if (balanceChangesType && balanceChangesType === 'AddToken0') {
      const token1 = -token1Value;
      if (Number(token1) < 0) {
        await updateBalanceChanges(
          strategy.id,
          token1.toString(10),
          '',
          txid,
          orderId
        );
      }
    }
    await insertOrderIdOrUpdate(
      strategy.id,
      txid,
      secondExchangeOrderId,
      '',
      '',
      status
    );
    if (arbitrage) {
      const debitRecord = new BigNumber(token0DebitRecord)
        .times(1 + minimumProfit)
        .toString();
      if (new BigNumber(buyRes.executedQty).lt(debitRecord)) {
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
export const tradeCumulativeAmountICDex = async (
  strategy: Strategy,
  minimumProfit: number,
  binancePairInfo: BinanceSymbolDB,
  secondBinancePairInfo: BinanceSymbolDB,
  binanceConfig: BinanceConfig,
  binanceBalance: Balance,
  binanceBalanceTwo: Balance | null
): Promise<void> => {
  const pendingOrder = await getPendingOrders(strategy.id);
  const promiseValue: Array<Promise<{ add: string; subtract: string }>> = [];
  const promiseValueToken1: Array<Promise<{ add: string; subtract: string }>> =
    [];
  pendingOrder.forEach((item) => {
    const orderId = item.mainExchangeOrderId;
    promiseValue.push(
      getBalanceChangesByMainExchangeOrderId(strategy.id, orderId, true)
    );
    promiseValueToken1.push(
      getBalanceChangesByMainExchangeOrderId(strategy.id, orderId, false)
    );
  });
  let token0Pending = '0';
  const token0 = await Promise.all(promiseValue);
  if (token0 && token0.length) {
    token0.forEach((item) => {
      token0Pending = new BigNumber(item.add).minus(item.subtract).toString(10);
    });
  }
  let token1Pending = '0';
  const token1 = await Promise.all(promiseValueToken1);
  if (token1 && token1.length) {
    token1.forEach((item) => {
      token1Pending = new BigNumber(item.add).minus(item.subtract).toString(10);
    });
  }
  const res = await getBalanceChanges(strategy.id);
  if (res && res.token0Balance) {
    const token0 = new BigNumber(res.token0Balance)
      .minus(token0Pending)
      .toString(10);
    await ICDexBuyToBinanceTrade(
      strategy,
      minimumProfit,
      binancePairInfo,
      secondBinancePairInfo,
      binanceBalance,
      binanceBalanceTwo,
      binanceConfig,
      '',
      token0,
      token0,
      '0',
      0,
      OrdersStatus.Completed,
      'SubtractToken0'
    );
  }
  if (res && res.token1Balance) {
    const token1 = new BigNumber(res.token1Balance)
      .minus(token1Pending)
      .toString(10);
    await ICDexSellToBinanceTrade(
      strategy,
      minimumProfit,
      binancePairInfo,
      secondBinancePairInfo,
      binanceBalance,
      binanceBalanceTwo,
      binanceConfig,
      '',
      token1,
      token1,
      '0',
      0,
      OrdersStatus.Completed,
      'SubtractToken1'
    );
  }
};
export const tradeCumulativeAmountBinance = async (
  strategy: Strategy,
  minimumProfit: number,
  ICDexPairInfo: ICDexPairInfoDB,
  secondICDexPairInfo: ICDexPairInfoDB,
  identity: Identity,
  ICDexBalance: Balance,
  ICDexBalanceTwo: Balance | null
): Promise<void> => {
  const pendingOrder = await getPendingOrders(strategy.id);
  const promiseValue: Array<Promise<{ add: string; subtract: string }>> = [];
  const promiseValueToken1: Array<Promise<{ add: string; subtract: string }>> =
    [];
  pendingOrder.forEach((item) => {
    const orderId = item.mainExchangeOrderId;
    promiseValue.push(
      getBalanceChangesByMainExchangeOrderId(strategy.id, orderId, true)
    );
    promiseValueToken1.push(
      getBalanceChangesByMainExchangeOrderId(strategy.id, orderId, false)
    );
  });
  let token0Pending = '0';
  const token0 = await Promise.all(promiseValue);
  if (token0 && token0.length) {
    token0.forEach((item) => {
      token0Pending = new BigNumber(item.add).minus(item.subtract).toString(10);
    });
  }
  let token1Pending = '0';
  const token1 = await Promise.all(promiseValueToken1);
  if (token1 && token1.length) {
    token1.forEach((item) => {
      token1Pending = new BigNumber(item.add).minus(item.subtract).toString(10);
    });
  }
  const res = await getBalanceChanges(strategy.id);
  if (res && res.token0Balance) {
    const token0 = new BigNumber(res.token0Balance)
      .minus(token0Pending)
      .toString(10);
    await binanceBuyToICDexTrade(
      strategy,
      minimumProfit,
      ICDexPairInfo,
      secondICDexPairInfo,
      ICDexBalance,
      ICDexBalanceTwo,
      identity,
      '',
      token0,
      token0,
      '0',
      0,
      OrdersStatus.Completed,
      'SubtractToken0'
    );
  }
  if (res && res.token1Balance) {
    const token1 = new BigNumber(res.token1Balance)
      .minus(token1Pending)
      .toString(10);
    await binanceSellToICDexTrade(
      strategy,
      minimumProfit,
      ICDexPairInfo,
      secondICDexPairInfo,
      ICDexBalance,
      ICDexBalanceTwo,
      identity,
      '',
      token1,
      token1,
      '0',
      0,
      OrdersStatus.Completed,
      'SubtractToken1'
    );
  }
};
