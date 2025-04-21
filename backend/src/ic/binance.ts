import {
  AccountInfo,
  AvgPriceInfo,
  BinancePrice,
  Depth,
  ErrorData,
  ExchangeInfo,
  OrderInfo,
  OrderTypes,
  Side,
  TimeInForce,
  TradeResponseFULL
} from './model';
import { AxiosRequestConfig } from 'axios';
import crypto from 'crypto';
import instance from './axiosApi';
import { getAccount } from '../db';
import { getAccountValue } from '../trade';
import { ExchangeName } from '../model';
import { BinanceConfig } from '../trade/model';
// const APIKey = 'Z3eEtEM1lprYr0I3io13fLW9bl8ixC1uXSPDdQ2bixAIcNnwjAbhlSr56rZjL4AT'; //testnet
export const getAccountInfo = async (
  accountId: number
): Promise<AccountInfo | ErrorData | null> => {
  try {
    const accountInfo = await getAccount(accountId);
    if (accountInfo) {
      const mainAccount = getAccountValue(
        ExchangeName.Binance,
        accountInfo.value
      );
      if (mainAccount) {
        const account = mainAccount as BinanceConfig;
        const { APIKey, privateKey } = account;
        const time = new Date().getTime();
        const data = `timestamp=${time}&omitZeroBalances=${true}`;
        const sign = crypto.createSign('RSA-SHA256');
        sign.update(data);
        sign.end();
        const signature = sign.sign(privateKey, 'base64');
        const response = await instance.get(
          `/api/v3/account?timestamp=${time}&omitZeroBalances=${true}&signature=${encodeURIComponent(
            signature
          )}`,
          {
            headers: {
              'x-mbx-apikey': APIKey
            }
          } as AxiosRequestConfig
        );
        return response.data as AccountInfo;
      }
    }
    return null;
  } catch (error) {
    return filterError(error);
  }
};
export const tradeOfBinance = async (
  APIKey: string,
  privateKey: string,
  symbol: string,
  side: Side,
  type: OrderTypes,
  quantity?: number,
  timeInForce?: TimeInForce,
  price?: number,
  quoteOrderQty?: number
): Promise<TradeResponseFULL | ErrorData> => {
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
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(data);
    sign.end();
    const signature = sign.sign(privateKey, 'base64');
    const response = await instance.post(
      `/api/v3/order?${data}&signature=${encodeURIComponent(signature)}`,
      null,
      {
        headers: {
          'x-mbx-apikey': APIKey
        }
      } as AxiosRequestConfig
    );
    return response.data as TradeResponseFULL;
  } catch (error) {
    return filterError(error);
  }
};
export const tradeOfBinanceTest = async (
  symbol: string,
  quantity: number,
  APIKey: string,
  privateKey: string
): Promise<{} | ErrorData> => {
  try {
    const time = new Date().getTime();
    let data = `symbol=${symbol}&side=BUY&type=MARKET&quantity=${quantity}`;
    data = data + `&timestamp=${time}`;
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(data);
    sign.end();
    const signature = sign.sign(privateKey, 'base64');
    const response = await instance.post(
      `/api/v3/order/test?${data}&signature=${encodeURIComponent(signature)}`,
      null,
      {
        headers: {
          'x-mbx-apikey': APIKey
        }
      } as AxiosRequestConfig
    );
    return response.data as {};
  } catch (error) {
    return filterError(error);
  }
};
export const getExchangeInfo = async (
  symbol: string
): Promise<ExchangeInfo | ErrorData> => {
  try {
    let url = `/api/v3/exchangeInfo?permissions=SPOT`;
    if (symbol) {
      const symbols = symbol.split('-');
      if (symbols.length === 2) {
        url = `/api/v3/exchangeInfo?symbols=${encodeURIComponent(
          JSON.stringify(symbols)
        )}`;
      } else {
        url = `/api/v3/exchangeInfo?symbol=${symbol}`;
      }
    }
    const response = await instance.get(url);
    return response.data as ExchangeInfo;
  } catch (error) {
    return filterError(error);
  }
};
export const getAvgPrice = async (
  symbol: string
): Promise<AvgPriceInfo | ErrorData> => {
  try {
    const response = await instance.get(`/api/v3/avgPrice?symbol=${symbol}`);
    return response.data as AvgPriceInfo;
  } catch (error) {
    return filterError(error);
  }
};
export const getTickerPrice = async (
  symbol: string
): Promise<BinancePrice | ErrorData> => {
  try {
    const response = await instance.get(
      `/api/v3/ticker/price?symbol=${symbol}`
    );
    return response.data as BinancePrice;
  } catch (error) {
    return filterError(error);
  }
};
export const getDepth = async (symbol: string): Promise<Depth | ErrorData> => {
  try {
    const response = await instance.get(`/api/v3/depth?symbol=${symbol}`);
    return response.data as Depth;
  } catch (error) {
    return filterError(error);
  }
};
export const openOrders = async (
  APIKey: string,
  privateKey: string,
  symbol: string
): Promise<Array<OrderInfo> | ErrorData> => {
  try {
    const time = new Date().getTime();
    const data = `timestamp=${time}&symbol=${symbol}`;
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(data);
    sign.end();
    const signature = sign.sign(privateKey, 'base64');
    const response = await instance.get(
      `/api/v3/openOrders?timestamp=${time}&symbol=${symbol}&signature=${encodeURIComponent(
        signature
      )}`,
      {
        headers: {
          'x-mbx-apikey': APIKey
        }
      } as AxiosRequestConfig
    );
    return response.data as Array<OrderInfo>;
  } catch (error) {
    return filterError(error);
  }
};
export const getOrderInfo = async (
  APIKey: string,
  privateKey: string,
  symbol: string,
  orderId: number
): Promise<OrderInfo | ErrorData> => {
  try {
    const time = new Date().getTime();
    const data = `timestamp=${time}&symbol=${symbol}&orderId=${orderId}`;
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(data);
    sign.end();
    const signature = sign.sign(privateKey, 'base64');
    const response = await instance.get(
      `/api/v3/order?timestamp=${time}&symbol=${symbol}&orderId=${orderId}&signature=${encodeURIComponent(
        signature
      )}`,
      {
        headers: {
          'x-mbx-apikey': APIKey
        }
      } as AxiosRequestConfig
    );
    return response.data as OrderInfo;
  } catch (error) {
    return filterError(error);
  }
};
export const cancelOrder = async (
  APIKey: string,
  privateKey: string,
  symbol: string,
  orderId: number
): Promise<OrderInfo | ErrorData> => {
  try {
    const time = new Date().getTime();
    const data = `timestamp=${time}&symbol=${symbol}&orderId=${orderId}`;
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(data);
    sign.end();
    const signature = sign.sign(privateKey, 'base64');
    const response = await instance.delete(
      `/api/v3/order?timestamp=${time}&symbol=${symbol}&orderId=${orderId}&signature=${encodeURIComponent(
        signature
      )}`,
      {
        headers: {
          'x-mbx-apikey': APIKey
        }
      } as AxiosRequestConfig
    );
    return response.data as OrderInfo;
  } catch (error) {
    return filterError(error);
  }
};
export const testConnectivity = async (): Promise<boolean> => {
  try {
    await instance.get(`/api/v3/ping`, {
      timeout: 5 * 1000
    } as AxiosRequestConfig);
    return true;
  } catch (error) {
    return false;
  }
};
const filterError = (error: any): ErrorData => {
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
  } else if (error.request) {
    return {
      code: 9999,
      msg: 'request error'
    };
  } else {
    return {
      code: 9999,
      msg: error.message
    };
  }
};
