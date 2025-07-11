import axios, { CreateAxiosDefaults } from 'axios';
import axiosRetry from 'axios-retry';
import process from 'process';
const API =
  process.env.NODE_ENV !== 'development'
    ? 'https://api.binance.com'
    : 'https://testnet.binance.vision';
const instance = axios.create({
  baseURL: API,
  timeout: 5 * 1000
} as CreateAxiosDefaults);
axiosRetry(instance, {
  retries: 3,
  retryDelay: (retryCount) => {
    return retryCount * 10000;
  },
  retryCondition: (error) => {
    // Retries only for network errors
    return axiosRetry.isNetworkOrIdempotentRequestError(error);
    // return axiosRetry.isRetryableError(error);
  },
  shouldResetTimeout: true
});
export default instance;
