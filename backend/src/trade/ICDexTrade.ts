import { Balance, DepthToken, TimerConfig } from './model';
import BigNumber from 'bignumber.js';
import {
  ICDexBuyResponse,
  ICDexPairInfoDB,
  ICDexSellResponse
} from '../ic/model';
import { ICDexService } from '../ic/ICDex/ICDexService';
import {
  icpPrice,
  LevelResponse,
  OrderPrice,
  tokenAmount,
  TradingOrder,
  TradingResultErr,
  TradingResultOk,
  TxnRecord
} from '../ic/ICDex/ICDex.idl';
import { Identity } from '@dfinity/agent';
import { hexToBytes, toHexString } from '../ic/converter';
import { DexSetting, TokenInfo } from '../model';
import { insertOrUpdateICDexOrderInfo } from '../db';
import { sendEventToClients } from '../routes';
export const onICDexBuy = async (
  strategyId: number,
  pairInfo: ICDexPairInfoDB,
  orderPrice: OrderPrice,
  token0decimals: number,
  token1decimals: number,
  identity: Identity,
  token1Amount: string,
  balance: Balance,
  type = 'MKT'
): Promise<ICDexBuyResponse | string> => {
  if (new BigNumber(token1Amount).gt(balance.token1)) {
    const token1Info = JSON.parse(pairInfo.token1Info) as TokenInfo;
    const message = JSON.stringify({
      message: `${pairInfo.pairId}: ICDex ${token1Info.symbol} insufficient balance`,
      type: 'ICDexInsufficientError'
    });
    // sendEventToClients(strategyId, message);
    return message;
  }
  const service = new ICDexService();
  let res;
  if (type === 'MKT') {
    res = await service.trade(pairInfo.pairId, identity, orderPrice, {
      MKT: null
    });
  } else {
    res = await service.trade(pairInfo.pairId, identity, orderPrice, {
      LMT: null
    });
  }
  if ((res as TradingResultOk).ok) {
    const response = await getICDexBuyResponse(
      pairInfo,
      toHexString(new Uint8Array((res as TradingResultOk).ok.txid)),
      token0decimals,
      token1decimals
    );
    await insertOrUpdateICDexOrderInfo(
      strategyId,
      pairInfo.pairId,
      toHexString(new Uint8Array((res as TradingResultOk).ok.txid))
    );
    sendEventToClients(strategyId, '', 'Trade');
    return response;
  } else {
    return JSON.stringify({
      type: 'ICDexTradeError',
      message: `${pairInfo.pairId}: ${(res as TradingResultErr).err.message}`
    });
  }
};
export const onICDexSell = async (
  strategyId: number,
  pairInfo: ICDexPairInfoDB,
  orderPrice: OrderPrice,
  token0decimals: number,
  token1decimals: number,
  identity: Identity,
  token0Amount: string,
  balance: Balance,
  type = 'MKT'
): Promise<ICDexSellResponse | string> => {
  if (new BigNumber(token0Amount).gt(balance.token0)) {
    const token0Info = JSON.parse(pairInfo.token0Info) as TokenInfo;
    const message = JSON.stringify({
      message: `${pairInfo.pairId}: ICDex ${token0Info.symbol} insufficient balance`,
      type: 'ICDexInsufficientError'
    });
    // sendEventToClients(strategyId, message);
    return message;
  }
  const service = new ICDexService();
  let res;
  if (type === 'MKT') {
    res = await service.trade(pairInfo.pairId, identity, orderPrice, {
      MKT: null
    });
  } else {
    res = await service.trade(pairInfo.pairId, identity, orderPrice, {
      LMT: null
    });
  }
  if ((res as TradingResultOk).ok) {
    const txid = toHexString(new Uint8Array((res as TradingResultOk).ok.txid));
    const response = await getICDexSellResponse(
      pairInfo,
      txid,
      token0decimals,
      token1decimals
    );
    await insertOrUpdateICDexOrderInfo(
      strategyId,
      pairInfo.pairId,
      toHexString(new Uint8Array((res as TradingResultOk).ok.txid))
    );
    sendEventToClients(strategyId, '', 'Trade');
    return response;
  } else {
    return JSON.stringify({
      type: 'ICDexTradeError',
      message: `${pairInfo.pairId}: ${(res as TradingResultErr).err.message}`
    });
  }
};
export const ICDexCanSell = (
  token1: string,
  pairInfo: ICDexPairInfoDB,
  level100: LevelResponse,
  ICDexTradeFee: string,
  pairInfoTwo?: ICDexPairInfoDB,
  level100Two?: LevelResponse
): boolean => {
  if (pairInfoTwo && level100Two) {
    return ICDexCanSell(token1, pairInfoTwo, level100Two, ICDexTradeFee);
  } else {
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
        const price = filterLevelPrice(
          bid[i].price,
          level100[0],
          token0Decimals,
          token1Decimals
        );
        const currentQuantity = filterQuantity(
          bid[i].quantity,
          token0Decimals,
          tokenMinUnit
        );
        const currentTotal = new BigNumber(price).times(currentQuantity);
        total = new BigNumber(total).plus(currentTotal).toString(10);
        if (new BigNumber(total).gte(token1)) {
          flag = true;
          break;
        }
      }
    }
    return flag;
  }
};
export const ICDexCanBuy = (
  token1: string,
  pairInfo: ICDexPairInfoDB,
  level100: LevelResponse,
  ICDexTradeFee: string,
  pairInfoTwo?: ICDexPairInfoDB,
  level100Two?: LevelResponse
): boolean => {
  if (pairInfoTwo && level100Two) {
    return ICDexCanSell(token1, pairInfo, level100, ICDexTradeFee);
  } else {
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
        const price = filterLevelPrice(
          ask[i].price,
          level100[0],
          token0Decimals,
          token1Decimals
        );
        const currentQuantity = filterQuantity(
          ask[i].quantity,
          token0Decimals,
          tokenMinUnit
        );
        const currentTotal = new BigNumber(price).times(currentQuantity);
        total = new BigNumber(total).plus(currentTotal).toString(10);
        if (new BigNumber(total).gte(token1)) {
          flag = true;
          break;
        }
      }
    }
    return flag;
  }
};
export const getICDexToken0SellMarket = async (
  pairInfo: ICDexPairInfoDB,
  secondPairInfo: ICDexPairInfoDB,
  token1: string,
  ICDexTradeFee: string,
  invert: number
): Promise<string> => {
  const service = new ICDexService();
  let token0Sell = '0';
  let level1001;
  const level100 = await service.level100(pairInfo.pairId);
  if (secondPairInfo) {
    level1001 = await service.level100(secondPairInfo.pairId);
  }
  if (level100) {
    const canBuy = ICDexCanBuy(
      token1,
      pairInfo,
      level100,
      ICDexTradeFee,
      secondPairInfo,
      level1001
    );
    if (!canBuy) {
      return '';
    }
    if (invert) {
      token0Sell = getICDexMktToken0(
        pairInfo,
        token1,
        level100,
        ICDexTradeFee,
        secondPairInfo,
        level1001
      );
    } else {
      token0Sell = getICDexMktToken0Sell(
        pairInfo,
        token1,
        level100,
        ICDexTradeFee,
        secondPairInfo,
        level1001
      );
    }
  }
  return token0Sell;
};
export const getICDexToken0BuyMarket = async (
  pairInfo: ICDexPairInfoDB,
  secondPairInfo: ICDexPairInfoDB,
  token1: string,
  ICDexTradeFee: string,
  invert: number
): Promise<string> => {
  const service = new ICDexService();
  let token0 = '0';
  let level1001;
  const level100 = await service.level100(pairInfo.pairId);
  if (secondPairInfo) {
    level1001 = await service.level100(secondPairInfo.pairId);
  }
  if (level100) {
    const canSell = ICDexCanSell(
      token1,
      pairInfo,
      level100,
      ICDexTradeFee,
      secondPairInfo,
      level1001
    );
    if (!canSell) {
      return '';
    }
    if (invert) {
      token0 = getICDexMktToken1(
        pairInfo,
        token1,
        level100,
        ICDexTradeFee,
        secondPairInfo,
        level1001
      );
    } else {
      token0 = getICDexMktToken0(
        pairInfo,
        token1,
        level100,
        ICDexTradeFee,
        secondPairInfo,
        level1001
      );
    }
  }
  return token0;
};
export const getICDexMktToken0Sell = (
  pairInfo: ICDexPairInfoDB,
  token1: string,
  level100: LevelResponse,
  ICDexTradeFee: string,
  pairInfoTwo?: ICDexPairInfoDB,
  level100Two?: LevelResponse
): string => {
  if (!level100Two) {
    return getICDexToken0Sell(pairInfo, token1, level100);
  } else if (pairInfoTwo && level100Two) {
    // Quote(depthQuote Asset) -> USDT
    const resToken1 = getMKTToken1(pairInfoTwo, token1, level100Two);
    const totalRemaining = new BigNumber(1)
      .minus(ICDexTradeFee)
      .times(resToken1)
      .toString(10);
    return getMktToken0(pairInfo, totalRemaining, level100);
  }
  return '0';
};
export const getICDexToken0Sell = (
  pairInfo: ICDexPairInfoDB,
  token1: string,
  level100: LevelResponse
): string => {
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
      const price = filterLevelPrice(
        bid[i].price,
        level100[0],
        token0Decimals,
        token1Decimals
      );
      const currentQuantity = filterQuantity(
        bid[i].quantity,
        token0Decimals,
        tokenMinUnit
      );
      const currentTotal = new BigNumber(price).times(currentQuantity);
      if (new BigNumber(total).plus(currentTotal).lt(token1)) {
        total = new BigNumber(total).plus(currentTotal).toString(10);
        quantity = new BigNumber(currentQuantity).plus(quantity).toString(10);
      } else {
        const lastQuantity = new BigNumber(token1)
          .minus(total)
          .div(price)
          .decimalPlaces(tokenMinUnit, 1);
        quantity = new BigNumber(quantity)
          .plus(lastQuantity.toString(10))
          .toString(10);
        break;
      }
    }
  }
  return quantity;
};
export const getICDexToken0AndToken1 = async (
  pairInfo: ICDexPairInfoDB,
  secondPairInfo: ICDexPairInfoDB,
  token: DepthToken,
  ICDexTradeFee: string,
  invert: number
): Promise<{ token0: string; token1: string }> => {
  const service = new ICDexService();
  let token0 = '0';
  let token1 = '0';
  if (!secondPairInfo) {
    const res = await service.level100(pairInfo.pairId);
    if (res) {
      if (invert) {
        token1 = await getMktToken0(pairInfo, token.token0, res);
        token0 = await getMKTToken1(pairInfo, token.token1, res);
      } else {
        token0 = await getMktToken0(pairInfo, token.token1, res);
        token1 = await getMKTToken1(pairInfo, token.token0, res);
      }
    }
  } else {
    const res = await service.level100(pairInfo.pairId);
    const res1 = await service.level100(secondPairInfo.pairId);
    token1 = getICDexMktToken1(
      pairInfo,
      token.token1,
      res,
      ICDexTradeFee,
      secondPairInfo,
      res1
    );
    token0 = getICDexMktToken0(
      pairInfo,
      token.token1,
      res,
      ICDexTradeFee,
      secondPairInfo,
      res1
    );
  }
  if (new BigNumber(token0).gt(0)) {
    token0 = new BigNumber(1).minus(ICDexTradeFee).times(token0).toString(10);
  }
  if (new BigNumber(token1).gt(0)) {
    if (invert) {
      token1 = new BigNumber(1).plus(ICDexTradeFee).times(token1).toString(10);
    } else {
      token1 = new BigNumber(1).minus(ICDexTradeFee).times(token1).toString(10);
    }
  }
  return {
    token0: token0,
    token1: token1
  };
};
export const getICDexMktToken1 = (
  pairInfo: ICDexPairInfoDB,
  token0: string,
  level100: LevelResponse,
  ICDexTradeFee: string,
  pairInfoTwo?: ICDexPairInfoDB,
  level100Two?: LevelResponse
): string => {
  if (!level100Two) {
    return getMKTToken1(pairInfo, token0, level100);
  } else if (pairInfoTwo && level100Two) {
    // Quote(depthQuote Asset) -> USDT
    const resToken1 = getMKTToken1(pairInfo, token0, level100); // Asset -> USDT
    const totalRemaining = new BigNumber(1)
      .minus(ICDexTradeFee)
      .times(resToken1)
      .toString(10);
    return getMktToken0(pairInfoTwo, totalRemaining, level100Two);
  }
  return '0';
};
export const getICDexMktToken0 = (
  pairInfo: ICDexPairInfoDB,
  token1: string,
  level100: LevelResponse,
  ICDexTradeFee: string,
  pairInfoTwo?: ICDexPairInfoDB,
  level100Two?: LevelResponse
): string => {
  if (!level100Two) {
    return getMktToken0(pairInfo, token1, level100);
  } else if (pairInfoTwo && level100Two) {
    // Quote(depthQuote Asset) -> USDT
    const resToken1 = getMKTToken1(pairInfoTwo, token1, level100Two);
    const totalRemaining = new BigNumber(1)
      .minus(ICDexTradeFee)
      .times(resToken1)
      .toString(10);
    return getMktToken0(pairInfo, totalRemaining, level100);
  }
  return '0';
};
export const getICDexToken1AndToken0 = async (
  pairId: string,
  pairInfo: ICDexPairInfoDB,
  config: TimerConfig,
  ICDexTradeFee: string
): Promise<{ buyToken0NeedToken1: string; sellToken0GetToken1: string }> => {
  const service = new ICDexService();
  const res = await service.level100(pairId);
  const mktToken1Buy = getMktToken1Buy(pairInfo, config.orderAmount, res);
  const mktToken1Sell = getMKTToken1(pairInfo, config.orderAmount, res);
  const token1Sell = new BigNumber(1)
    .minus(ICDexTradeFee)
    .times(mktToken1Sell)
    .toString(10);
  return {
    buyToken0NeedToken1: mktToken1Buy,
    sellToken0GetToken1: token1Sell
  };
};
export const getMktToken1Buy = (
  pairInfo: ICDexPairInfoDB,
  token0: string,
  level100: LevelResponse
): string => {
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
      const price = filterLevelPrice(
        ask[i].price,
        level100[0],
        token0Decimals,
        token1Decimals
      );
      const currentQuantity = filterQuantity(
        ask[i].quantity,
        token0Decimals,
        tokenMinUnit
      );
      const currentTotal = new BigNumber(price).times(currentQuantity);
      if (new BigNumber(quantity).plus(currentQuantity).lt(buyTotalMKT)) {
        total = new BigNumber(total).plus(currentTotal).toString(10);
        quantity = new BigNumber(currentQuantity).plus(quantity).toString(10);
      } else {
        const lastTotal = new BigNumber(buyTotalMKT)
          .minus(quantity)
          .times(price);
        quantity = buyTotalMKT;
        total = new BigNumber(total)
          .plus(lastTotal.toString(10))
          .decimalPlaces(token1Decimals, 1)
          .toString(10);
        break;
      }
    }
  }
  if (new BigNumber(quantity).lt(buyTotalMKT)) {
    return '0';
  }
  return total;
};
export const getMktToken0 = (
  pairInfo: ICDexPairInfoDB,
  token1: string,
  level100: LevelResponse
): string => {
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
      const price = filterLevelPrice(
        ask[i].price,
        level100[0],
        token0Decimals,
        token1Decimals
      );
      const currentQuantity = filterQuantity(
        ask[i].quantity,
        token0Decimals,
        tokenMinUnit
      );
      const currentTotal = new BigNumber(price).times(currentQuantity);
      if (new BigNumber(total).plus(currentTotal).lte(buyTotalMKT)) {
        total = new BigNumber(total).plus(currentTotal).toString(10);
        quantity = new BigNumber(ask[i].quantity.toString(10))
          .div(10 ** token0Decimals)
          .plus(quantity)
          .toString(10);
      } else {
        const lastQuantity = new BigNumber(buyTotalMKT).minus(total).div(price);
        quantity = new BigNumber(quantity)
          .plus(lastQuantity.toString(10))
          .decimalPlaces(tokenMinUnit, 1)
          .toString(10);
        break;
      }
    }
  }
  return quantity;
};
export const filterLevelPrice = (
  price: bigint,
  unitSize: bigint,
  token0Decimals: number,
  token1Decimals: number
): number => {
  return new BigNumber(price.toString(10))
    .div(10 ** token1Decimals)
    .div(new BigNumber(unitSize.toString(10)).div(10 ** token0Decimals))
    .toNumber();
};
export const filterQuantity = (
  quantity: bigint,
  token0Decimals: number,
  tokenAmountUnit: number
): string => {
  return new BigNumber(quantity.toString(10))
    .div(10 ** token0Decimals)
    .toFixed(tokenAmountUnit);
};
export const getMKTToken1 = (
  pairInfo: ICDexPairInfoDB,
  token0: string,
  level100: LevelResponse
): string => {
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
      const price = filterLevelPrice(
        bid[i].price,
        level100[0],
        token0Decimals,
        token1Decimals
      );
      const currentQuantity = filterQuantity(
        bid[i].quantity,
        token0Decimals,
        tokenMinUnit
      );
      const currentTotal = new BigNumber(price).times(currentQuantity);
      if (new BigNumber(quantity).plus(currentQuantity).lt(sellTotalMKT)) {
        total = new BigNumber(total).plus(currentTotal).toString(10);
        quantity = new BigNumber(currentQuantity).plus(quantity).toString(10);
      } else {
        const lastTotal = new BigNumber(sellTotalMKT)
          .minus(quantity)
          .times(price);
        total = new BigNumber(total)
          .plus(lastTotal.toString(10))
          .decimalPlaces(token1Decimals, 1)
          .toString(10);
        break;
      }
    }
  }
  return total;
};
export const getICDexBuyResponse = async (
  pairInfo: ICDexPairInfoDB,
  txid: string,
  token0decimals: number,
  token1decimals: number
): Promise<ICDexBuyResponse | string> => {
  const service = new ICDexService();
  let token0Value = '0';
  let token1DebitRecord = '0';
  let token0ValueRemaining = '0';
  let token1ValueRemaining = '0';
  let price = 0;
  const statusByTxid = await service.statusByTxid(
    pairInfo.pairId,
    hexToBytes(txid)
  );
  const type = Object.keys(statusByTxid)[0];
  let status: 'Pending' | 'Completed' = 'Completed';
  if (type === 'Completed') {
    const tradeInfo = (statusByTxid as { Completed: TxnRecord }).Completed;
    if (new BigNumber(tradeInfo.fee.token0Fee.toString(10)).lt(0)) {
      tradeInfo.fee.token0Fee = BigInt(0);
    }
    token0Value = new BigNumber(
      tradeInfo.filled.token0Value.CreditRecord.toString(10)
    )
      .minus(tradeInfo.fee.token0Fee.toString(10))
      .div(10 ** token0decimals)
      .toString(10);
    token1DebitRecord = new BigNumber(
      tradeInfo.filled.token1Value.DebitRecord.toString(10)
    )
      .div(10 ** token1decimals)
      .toString(10);
  } else if (type === 'Pending') {
    const tradeInfo = (statusByTxid as { Pending: TradingOrder }).Pending;
    tradeInfo.filled.forEach((item) => {
      token0Value = new BigNumber(item.token0Value.CreditRecord.toString(10))
        .plus(token0Value)
        .toString(10);
      token1DebitRecord = new BigNumber(
        item.token1Value.DebitRecord.toString(10)
      )
        .div(10 ** token1decimals)
        .plus(token1DebitRecord)
        .toString(10);
    });
    if (new BigNumber(tradeInfo.fee.fee0.toString(10)).lt(0)) {
      tradeInfo.fee.fee0 = BigInt(0);
    }
    token0Value = new BigNumber(token0Value)
      .minus(tradeInfo.fee.fee0.toString(10))
      .div(10 ** token0decimals)
      .toString(10);
    token0ValueRemaining = new BigNumber(
      (
        tradeInfo.remaining.quantity as { Buy: [tokenAmount, icpPrice] }
      ).Buy[0].toString(10)
    )
      .div(10 ** token0decimals)
      .toString(10);
    token1ValueRemaining = new BigNumber(
      (
        tradeInfo.remaining.quantity as { Buy: [tokenAmount, icpPrice] }
      ).Buy[1].toString(10)
    )
      .div(10 ** token1decimals)
      .toString(10);
    const setting = JSON.parse(pairInfo.setting) as DexSetting;
    const unitSize = setting.UNIT_SIZE;
    price = filterLevelPrice(
      tradeInfo.remaining.price,
      BigInt(unitSize),
      token0decimals,
      token1decimals
    );
    if (Object.keys(tradeInfo.status)[0] === 'Pending') {
      status = 'Pending';
    }
  } else {
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
export const getICDexSellResponse = async (
  pairInfo: ICDexPairInfoDB,
  txid: string,
  token0decimals: number,
  token1decimals: number
): Promise<ICDexSellResponse | string> => {
  const service = new ICDexService();
  let token1Value = '0';
  let token0DebitRecord = '0';
  let token0ValueRemaining = '0';
  let token1ValueRemaining = '0';
  let price = 0;
  const statusByTxid = await service.statusByTxid(
    pairInfo.pairId,
    hexToBytes(txid)
  );
  const type = Object.keys(statusByTxid)[0];
  let status: 'Pending' | 'Completed' = 'Completed';
  if (type === 'Completed') {
    const tradeInfo = (statusByTxid as { Completed: TxnRecord }).Completed;
    if (new BigNumber(tradeInfo.fee.token1Fee.toString(10)).lt(0)) {
      tradeInfo.fee.token1Fee = BigInt(0);
    }
    token1Value = new BigNumber(
      tradeInfo.filled.token1Value.CreditRecord.toString(10)
    )
      .minus(tradeInfo.fee.token1Fee.toString(10))
      .div(10 ** token1decimals)
      .toString(10);
    token0DebitRecord = new BigNumber(
      tradeInfo.filled.token0Value.DebitRecord.toString(10)
    )
      .div(10 ** token0decimals)
      .toString(10);
  } else if (type === 'Pending') {
    const tradeInfo = (statusByTxid as { Pending: TradingOrder }).Pending;
    tradeInfo.filled.forEach((item) => {
      token1Value = new BigNumber(item.token1Value.CreditRecord.toString(10))
        .plus(token1Value)
        .toString(10);
      token0DebitRecord = new BigNumber(
        item.token0Value.DebitRecord.toString(10)
      )
        .div(10 ** token0decimals)
        .plus(token0DebitRecord)
        .toString(10);
    });
    if (new BigNumber(tradeInfo.fee.fee1.toString(10)).lt(0)) {
      tradeInfo.fee.fee1 = BigInt(0);
    }
    token1Value = new BigNumber(token1Value)
      .minus(tradeInfo.fee.fee1.toString(10))
      .div(10 ** token1decimals)
      .toString(10);
    token0ValueRemaining = new BigNumber(
      (tradeInfo.remaining.quantity as { Sell: bigint }).Sell.toString(10)
    )
      .div(10 ** token0decimals)
      .toString(10);
    const setting = JSON.parse(pairInfo.setting) as DexSetting;
    const unitSize = setting.UNIT_SIZE;
    price = filterLevelPrice(
      tradeInfo.remaining.price,
      BigInt(unitSize),
      token0decimals,
      token1decimals
    );
    token1ValueRemaining = new BigNumber(token0ValueRemaining)
      .times(price)
      .toString(10);
    if (Object.keys(tradeInfo.status)[0] === 'Pending') {
      status = 'Pending';
    }
  } else {
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
export const filterSide = (orderPrice: OrderPrice): string => {
  const quantity = orderPrice.quantity;
  if (
    (
      quantity as {
        Buy: [tokenAmount, icpPrice];
      }
    ).Buy
  ) {
    return 'Buy';
  } else {
    return 'Sell';
  }
};
