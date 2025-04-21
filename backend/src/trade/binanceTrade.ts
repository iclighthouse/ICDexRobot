import BigNumber from 'bignumber.js';
import {
  AvgPriceInfo,
  BinanceFilter,
  BinanceOrder,
  BinanceSymbolDB,
  Depth,
  ErrorData,
  OrderTypes,
  TimeInForce,
  TradeResponseFULL
} from '../ic/model';
import {
  Balance,
  BinanceConfig,
  DepthToken,
  Filters,
  TimerConfig
} from './model';
import { getAvgPrice, getDepth, tradeOfBinance } from '../ic/binance';
import { insertOrUpdateBinanceOrderInfo } from '../db';
import { sendEventToClients } from '../routes';
export const onBinanceBuy = async (
  strategyId: number,
  binanceConfig: BinanceConfig,
  pairInfo: BinanceSymbolDB,
  token1Value: number,
  filter: Filters,
  balance: Balance,
  type: OrderTypes = 'MARKET',
  token0Value?: string,
  price?: number
): Promise<BinanceOrder | string> => {
  let buyValue;
  if (type === 'LIMIT' && token0Value) {
    const token0Sell = new BigNumber(
      Math.floor(
        new BigNumber(token0Value)
          .times(10 ** filter.token0.decimals)
          .toNumber()
      )
    )
      .div(10 ** filter.token0.decimals)
      .toNumber();
    if (new BigNumber(token0Sell).lt(filter.token0.minQty)) {
      return JSON.stringify({
        message: 'Minimum notional value failed',
        type: 'BinanceMinimumNotionalError'
      });
    } else if (new BigNumber(token0Sell).gt(balance.token0)) {
      const message = JSON.stringify({
        message: `${pairInfo.symbol}: Binance ${pairInfo.baseAsset} insufficient balance`,
        type: 'BinanceInsufficientError'
      });
      // sendEventToClients(strategyId, message);
      return message;
    }
    buyValue = await tradeOfBinance(
      binanceConfig.APIKey,
      binanceConfig.privateKey,
      pairInfo.symbol,
      'BUY',
      type,
      token0Sell,
      'GTC',
      price
    );
    console.dir(buyValue);
  } else if (type === 'MARKET') {
    const token1Buy = new BigNumber(
      Math.ceil(
        new BigNumber(token1Value)
          .times(10 ** filter.token1.decimals)
          .toNumber()
      )
    )
      .div(10 ** filter.token1.decimals)
      .toNumber();
    if (new BigNumber(token1Buy).lt(filter.token1.minQty)) {
      return JSON.stringify({
        message: 'Minimum notional value failed',
        type: 'BinanceMinimumNotionalError'
      });
    }
    if (new BigNumber(token1Buy).gt(balance.token1)) {
      const message = JSON.stringify({
        message: `${pairInfo.symbol}: Binance ${pairInfo.quoteAsset} insufficient balance`,
        type: 'BinanceInsufficientError'
      });
      // sendEventToClients(strategyId, message);
      return message;
    }
    buyValue = await tradeOfBinance(
      binanceConfig.APIKey,
      binanceConfig.privateKey,
      pairInfo.symbol,
      'BUY',
      type,
      undefined,
      undefined,
      price,
      token1Buy
    );
    console.dir(buyValue);
  }
  if (buyValue && (buyValue as ErrorData).code) {
    return JSON.stringify({
      type: 'BinanceTradeError',
      message: `${pairInfo.symbol}: ${(buyValue as ErrorData).msg}`
    });
  } else {
    const data = buyValue as TradeResponseFULL;
    await insertOrUpdateBinanceOrderInfo(strategyId, data);
    sendEventToClients(strategyId, '', 'Trade');
    return {
      executedQty: data.executedQty,
      cummulativeQuoteQty: data.cummulativeQuoteQty,
      orderId: data.orderId
    };
  }
};
export const onBinanceSell = async (
  strategyId: number,
  pairInfo: BinanceSymbolDB,
  binanceConfig: BinanceConfig,
  token0Value: string,
  filter: Filters,
  balance: Balance,
  type: OrderTypes = 'MARKET',
  price?: number
): Promise<BinanceOrder | string> => {
  const token0Sell = new BigNumber(
    Math.floor(
      new BigNumber(token0Value).times(10 ** filter.token0.decimals).toNumber()
    )
  )
    .div(10 ** filter.token0.decimals)
    .toNumber();
  if (new BigNumber(token0Sell).lt(filter.token0.minQty)) {
    return JSON.stringify({
      message: 'Minimum notional value failed',
      type: 'BinanceMinimumNotionalError'
    });
  } else if (new BigNumber(token0Sell).gt(balance.token0)) {
    const message = JSON.stringify({
      message: `${pairInfo.symbol}: Binance ${pairInfo.baseAsset} insufficient balance`,
      type: 'BinanceInsufficientError'
    });
    // sendEventToClients(strategyId, message);
    return message;
  } else {
    let timeInForce: TimeInForce = undefined;
    if (type === 'LIMIT') {
      timeInForce = 'GTC';
    }
    const sellValue = await tradeOfBinance(
      binanceConfig.APIKey,
      binanceConfig.privateKey,
      pairInfo.symbol,
      'SELL',
      type,
      token0Sell,
      timeInForce,
      price
    );
    if (sellValue && (sellValue as ErrorData).code) {
      console.dir(sellValue);
      return JSON.stringify({
        type: 'BinanceTradeError',
        message: `${pairInfo.symbol}: ${(sellValue as ErrorData).msg}`
      });
    } else {
      const data = sellValue as TradeResponseFULL;
      await insertOrUpdateBinanceOrderInfo(strategyId, data);
      sendEventToClients(strategyId, '', 'Trade');
      return {
        cummulativeQuoteQty: data.cummulativeQuoteQty,
        executedQty: data.executedQty,
        orderId: data.orderId
      };
    }
  }
};
export const getBinanceToken0SellMarket = async (
  pairInfo: BinanceSymbolDB,
  secondPairInfo: BinanceSymbolDB,
  token1Amount: string,
  binanceTradeFee: string,
  invert: number
): Promise<string> => {
  const symbol = pairInfo.symbol;
  const filter = await getBinanceFilter(pairInfo);
  let filter1;
  let symbol1 = '';
  if (secondPairInfo) {
    symbol1 = secondPairInfo.symbol;
    filter1 = await getBinanceFilter(secondPairInfo);
  }
  let depth;
  let depthQuote;
  const res = await getDepth(symbol);
  if (!(res as ErrorData).code) {
    depth = res as Depth;
  }
  if (symbol1) {
    const res1 = await getDepth(symbol1);
    if (!(res1 as ErrorData).code) {
      depthQuote = res1 as Depth;
    }
  }
  let token0Sell = '0';
  if (depth) {
    const depth = res as Depth;
    if (invert === 1) {
      token0Sell = getBinanceMktToken0(
        depth,
        token1Amount,
        binanceTradeFee,
        filter,
        filter1,
        depthQuote
      );
    } else {
      token0Sell = getBinanceMktToken0Sell(
        depth,
        token1Amount,
        binanceTradeFee,
        filter,
        filter1,
        depthQuote
      );
    }
  }
  return token0Sell;
};
export const getBinanceToken1AndToken0ByOrderToken1Amount = async (
  pairInfo: BinanceSymbolDB,
  secondPairInfo: BinanceSymbolDB,
  token1Amount: string,
  binanceTradeFee: string,
  invert: number
): Promise<{ buyToken0: string; sellToken0: string }> => {
  const symbol = pairInfo.symbol;
  const filter = await getBinanceFilter(pairInfo);
  let filter1;
  let symbol1 = '';
  if (secondPairInfo) {
    symbol1 = secondPairInfo.symbol;
    filter1 = await getBinanceFilter(secondPairInfo);
  }
  let buyToken0 = '0';
  let sellToken0 = '0';
  let depth;
  let depthQuote;
  const res = await getDepth(symbol);
  if (!(res as ErrorData).code) {
    depth = res as Depth;
  }
  if (symbol1) {
    const res1 = await getDepth(symbol1);
    if (!(res1 as ErrorData).code) {
      depthQuote = res1 as Depth;
    }
  }
  if (depth) {
    if (invert) {
      sellToken0 = getBinanceMktToken0Sell(
        depth,
        token1Amount,
        binanceTradeFee,
        filter
      );
      buyToken0 = getBinanceMktToken0(
        depth,
        token1Amount,
        binanceTradeFee,
        filter
      );
    } else {
      buyToken0 = getBinanceMktToken0(
        depth,
        token1Amount,
        binanceTradeFee,
        filter,
        filter1,
        depthQuote
      );
      sellToken0 = getBinanceMktToken0Sell(
        depth,
        token1Amount,
        binanceTradeFee,
        filter,
        filter1,
        depthQuote
      );
    }
  }
  return {
    buyToken0: buyToken0,
    sellToken0: sellToken0
  };
};
export const getBinanceToken0Sell = (
  depth: Depth,
  token1: string,
  token0Size: number,
  sellTotal?: string
): { quantity: string; total: string } => {
  let sellTotalMKT = '0';
  if (sellTotal) {
    sellTotalMKT = sellTotal;
  } else {
    sellTotalMKT = token1;
  }
  let quantity = '0';
  let total = '0';
  for (let i = 0; i < depth.bids.length; i++) {
    const price = depth.bids[i][0];
    const currentQuantity = depth.bids[i][1];
    const currentTotal = new BigNumber(price).times(currentQuantity);
    if (new BigNumber(total).plus(currentTotal).lt(sellTotalMKT)) {
      total = new BigNumber(total).plus(currentTotal).toString(10);
      quantity = new BigNumber(currentQuantity).plus(quantity).toString(10);
    } else {
      const lastQuantity = new BigNumber(sellTotalMKT)
        .minus(total)
        .div(price)
        .decimalPlaces(token0Size, 1);
      total = new BigNumber(lastQuantity).times(price).plus(total).toString(10);
      quantity = new BigNumber(quantity)
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
export const getBinanceMktToken0Sell = (
  depth: Depth,
  configToken1: string,
  binanceTradeFee: string,
  filter: Filters,
  filter1?: Filters,
  depthQuote?: Depth
): string => {
  if (!depthQuote) {
    const res = getBinanceToken0Sell(
      depth,
      configToken1,
      filter.token0.decimals,
      configToken1
    );
    return res.quantity;
  } else if (depthQuote && filter1) {
    const res = getBinanceToken1(
      depthQuote,
      configToken1,
      filter1.token1.decimals,
      configToken1
    ); // Quote -> USDT
    const totalNeed = new BigNumber(res.total)
      .div(new BigNumber(1).minus(binanceTradeFee))
      .decimalPlaces(filter1.token1.decimals, 1)
      .toString(10);
    const quantityAsset = getBinanceToken0(
      depth,
      res.total,
      filter.token0.decimals,
      totalNeed
    ); //  USDT -> Asset
    return quantityAsset.quantity;
  }
  return '';
};
export const getBinanceToken1AndToken0ByOrderAmount = async (
  pairInfo: BinanceSymbolDB,
  config: TimerConfig,
  binanceTradeFee: string
): Promise<{ buyToken0NeedToken1: string; sellToken0GetToken1: string }> => {
  const res = await getDepth(pairInfo.symbol);
  if (!(res as ErrorData).code) {
    const depth = res as Depth;
    const filter = await getBinanceFilter(pairInfo);
    const mktToken1Sell = getBinanceToken1(
      depth,
      config.orderAmount,
      filter.token0.decimals
    );
    const orderAmount = new BigNumber(1)
      .plus(binanceTradeFee)
      .times(config.orderAmount)
      .toString(10);
    const mktToken1Buy = getBinanceMktToken1Buy(
      depth,
      orderAmount,
      binanceTradeFee,
      filter
    );
    const token1Sell = new BigNumber(1)
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
export const getBinanceToken1AndToken0 = async (
  pairInfo: BinanceSymbolDB,
  secondPairInfo: BinanceSymbolDB,
  token: DepthToken,
  binanceTradeFee: string,
  invert: number
): Promise<{ token0: string; token1: string }> => {
  const symbol = pairInfo.symbol;
  const filter = await getBinanceFilter(pairInfo);
  let filter1;
  let symbol1 = '';
  if (secondPairInfo) {
    symbol1 = secondPairInfo.symbol;
    filter1 = await getBinanceFilter(secondPairInfo);
  }
  let token0 = '0';
  let token1 = '0;';
  if (!symbol1) {
    const res = await getDepth(symbol);
    if (!(res as ErrorData).code) {
      const depth = res as Depth;
      if (invert) {
        token1 = getBinanceMktToken1(
          depth,
          { token0: token.token1, token1: token.token0 },
          binanceTradeFee,
          filter,
          filter1
        );
        token0 = getBinanceMktToken0(
          depth,
          token.token0,
          binanceTradeFee,
          filter,
          filter1
        );
      } else {
        token0 = getBinanceMktToken1(
          depth,
          token,
          binanceTradeFee,
          filter,
          filter1
        );
        token1 = getBinanceMktToken0(
          depth,
          token.token1,
          binanceTradeFee,
          filter,
          filter1
        );
      }
    }
  } else {
    const res = await getDepth(symbol);
    const res1 = await getDepth(symbol1);
    if (!(res as ErrorData).code && !(res1 as ErrorData).code && filter1) {
      const depth = res as Depth;
      const depthQuote = res1 as Depth;
      token1 = getBinanceMktToken1(
        depth,
        token,
        binanceTradeFee,
        filter,
        filter1,
        depthQuote
      );
      token0 = getBinanceMktToken0(
        depth,
        token.token1,
        binanceTradeFee,
        filter,
        filter1,
        depthQuote
      );
    }
  }
  return {
    token0: token0,
    token1: token1
  };
};
export const getBinanceFilter = async (
  pairInfo: BinanceSymbolDB
): Promise<Filters> => {
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
      const filters = JSON.parse(pairInfo.filters) as Array<BinanceFilter>;
      filters.forEach((filter) => {
        if (filter.filterType === 'LOT_SIZE') {
          token0.minQty = filter.minQty as string;
          token0.maxQty = filter.maxQty as string;
          token0MinStepSize = filter.stepSize as string;
        }
        if (filter.filterType === 'NOTIONAL') {
          token1.minQty = filter.minNotional as string;
          token1.maxQty = filter.maxNotional as string;
        }
        if (filter.filterType === 'PRICE_FILTER') {
          const tickSize = filter.tickSize as string;
          if (tickSize.includes('.')) {
            price.decimals = tickSize.replace(/0+$/, '').split('.')[1].length;
          }
          price.minPrice = filter.minPrice as string;
          price.maxPrice = filter.maxPrice as string;
        }
      });
      const res = await getAvgPrice(pairInfo.symbol);
      if (!(res as ErrorData).code) {
        const avgPrice = (res as AvgPriceInfo).price;
        if (token0MinStepSize.includes('.')) {
          token0.decimals = token0MinStepSize
            .replace(/0+$/, '')
            .split('.')[1].length;
        }
        const minToken0Avg = new BigNumber(token1.minQty)
          .div(avgPrice)
          .decimalPlaces(token0Decimals)
          .toString(10);
        if (new BigNumber(minToken0Avg).gt(token0.minQty)) {
          token0.minQty = minToken0Avg;
        }
        return {
          token0: token0,
          token1: token1,
          price: price
        };
      }
    }
  } catch (e) {}
  return {
    token0: token0,
    token1: token1,
    price: price
  };
};
export const getBinanceMktToken1Buy = (
  depth: Depth,
  token0: string,
  binanceTradeFee: string,
  filter: Filters
): string => {
  token0 = new BigNumber(token0)
    .decimalPlaces(filter.token0.decimals, 1)
    .toString(10);
  let quantity = '0';
  let total = '0';
  for (let i = 0; i < depth.asks.length; i++) {
    const price = depth.asks[i][0];
    const currentQuantity = depth.asks[i][1];
    const currentTotal = new BigNumber(price).times(currentQuantity);
    if (new BigNumber(total).plus(currentQuantity).lt(token0)) {
      total = new BigNumber(total).plus(currentTotal).toString(10);
      quantity = new BigNumber(currentQuantity).plus(quantity).toString(10);
    } else {
      const lastQuantity = new BigNumber(token0)
        .minus(total)
        .decimalPlaces(filter.token0.decimals, 1);
      total = new BigNumber(lastQuantity).times(price).plus(total).toString(10);
      quantity = new BigNumber(quantity)
        .plus(lastQuantity.toString(10))
        .toString(10);
      break;
    }
  }
  return total;
};
export const getBinanceMktToken1 = (
  depth: Depth,
  token: DepthToken,
  binanceTradeFee: string,
  filter: Filters,
  filter1?: Filters,
  depthQuote?: Depth
): string => {
  const token0 = new BigNumber(token.token0)
    .decimalPlaces(filter.token0.decimals, 1)
    .toString(10);
  if (!depthQuote) {
    const res = getBinanceToken1(
      depth,
      token.token0,
      filter.token0.decimals,
      token0
    );
    return new BigNumber(1)
      .minus(binanceTradeFee)
      .times(res.total)
      .toString(10);
  } else if (depthQuote && filter1) {
    const resToken1 = getBinanceToken1(
      depth,
      token.token0,
      filter.token0.decimals,
      token0
    ); // Asset -> USDT
    const totalRemaining = new BigNumber(1)
      .minus(binanceTradeFee)
      .times(resToken1.total)
      .toString(10);
    const res = getBinanceToken0(
      depthQuote,
      token.token1,
      filter1.token0.decimals,
      totalRemaining
    ); //  USDT -> Quote
    return new BigNumber(1)
      .minus(binanceTradeFee)
      .times(res.quantity)
      .toString(10);
  }
  return '0';
};
export const getBinanceToken0 = (
  depth: Depth,
  token1: string,
  token0Size: number,
  sellTotal?: string
): { quantity: string; total: string } => {
  let sellTotalMKT = '0';
  if (sellTotal) {
    sellTotalMKT = sellTotal;
  } else {
    sellTotalMKT = token1;
  }
  let quantity = '0';
  let total = '0';
  for (let i = 0; i < depth.asks.length; i++) {
    const price = depth.asks[i][0];
    const currentQuantity = depth.asks[i][1];
    const currentTotal = new BigNumber(price).times(currentQuantity);
    if (new BigNumber(total).plus(currentTotal).lt(sellTotalMKT)) {
      total = new BigNumber(total).plus(currentTotal).toString(10);
      quantity = new BigNumber(currentQuantity).plus(quantity).toString(10);
    } else {
      const lastQuantity = new BigNumber(sellTotalMKT)
        .minus(total)
        .div(price)
        .decimalPlaces(token0Size, 1);
      total = new BigNumber(lastQuantity).times(price).plus(total).toString(10);
      quantity = new BigNumber(quantity)
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
export const getBinanceToken1 = (
  depth: Depth,
  token0: string,
  token0Size: number,
  buyTotal?: string
): { quantity: string; total: string } => {
  let buyTotalMKT = '0';
  if (buyTotal) {
    buyTotalMKT = buyTotal;
  } else {
    buyTotalMKT = token0;
  }
  let quantity = '0';
  let total = '0';
  for (let i = 0; i < depth.bids.length; i++) {
    const price = depth.bids[i][0];
    const currentQuantity = depth.bids[i][1];
    const currentTotal = new BigNumber(price).times(currentQuantity);
    if (new BigNumber(quantity).plus(currentQuantity).lt(buyTotalMKT)) {
      total = new BigNumber(total).plus(currentTotal).toString(10);
      quantity = new BigNumber(currentQuantity).plus(quantity).toString(10);
    } else {
      const lastQuantity = new BigNumber(buyTotalMKT)
        .minus(quantity)
        .decimalPlaces(token0Size, 1)
        .toString(10);
      quantity = new BigNumber(lastQuantity).plus(quantity).toString(10);
      const lastTotal = new BigNumber(lastQuantity).times(price);
      total = new BigNumber(total).plus(lastTotal.toString(10)).toString(10);
      break;
    }
  }
  return {
    quantity: quantity,
    total: total
  };
};
export const getBinanceMktToken0 = (
  depth: Depth,
  configToken1: string,
  binanceTradeFee: string,
  filter: Filters,
  filter1?: Filters,
  depthQuote?: Depth
): string => {
  if (!depthQuote) {
    const token1 = new BigNumber(configToken1)
      .decimalPlaces(filter.token1.decimals, 1)
      .toString(10);
    const res = getBinanceToken0(
      depth,
      configToken1,
      filter.token0.decimals,
      token1
    );
    return new BigNumber(1)
      .minus(binanceTradeFee)
      .times(res.quantity)
      .toString(10);
  } else if (depthQuote && filter1) {
    const token1 = new BigNumber(configToken1)
      .decimalPlaces(filter1.token1.decimals, 1)
      .toString(10);
    const resToken1 = getBinanceToken1(
      depthQuote,
      configToken1,
      filter1.token0.decimals,
      token1
    ); // Quote(depthQuote Asset) -> USDT
    const totalRemaining = new BigNumber(1)
      .minus(binanceTradeFee)
      .times(resToken1.total)
      .toString(10);
    const res = getBinanceToken0(
      depth,
      configToken1,
      filter.token0.decimals,
      totalRemaining
    ); //  USDT -> Asset
    return new BigNumber(1)
      .minus(binanceTradeFee)
      .times(res.quantity)
      .toString(10);
  }
  return '0';
};
export const getBinanceToken0BuyMarket = async (
  pairInfo: BinanceSymbolDB,
  secondPairInfo: BinanceSymbolDB,
  token1Amount: string,
  binanceTradeFee: string,
  invert: number
): Promise<string> => {
  const symbol = pairInfo.symbol;
  const filter = await getBinanceFilter(pairInfo);
  let filter1;
  let symbol1 = '';
  if (secondPairInfo) {
    symbol1 = secondPairInfo.symbol;
    filter1 = await getBinanceFilter(secondPairInfo);
  }
  let depth;
  let depthQuote;
  const res = await getDepth(symbol);
  if (!(res as ErrorData).code) {
    depth = res as Depth;
  }
  if (symbol1) {
    const res1 = await getDepth(symbol1);
    if (!(res1 as ErrorData).code) {
      depthQuote = res1 as Depth;
    }
  }
  let token0Buy = '0';
  if (depth) {
    const depth = res as Depth;
    if (invert === 1) {
      token0Buy = getBinanceMktToken1(
        depth,
        { token0: token1Amount, token1: '0' },
        binanceTradeFee,
        filter,
        filter1,
        depthQuote
      );
    } else {
      token0Buy = getBinanceMktToken0(
        depth,
        token1Amount,
        binanceTradeFee,
        filter,
        filter1,
        depthQuote
      );
    }
  }
  return token0Buy;
};
