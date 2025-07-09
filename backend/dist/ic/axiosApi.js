"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const axios_retry_1 = __importDefault(require("axios-retry"));
const process_1 = __importDefault(require("process"));
const API = process_1.default.env.NODE_ENV !== 'development'
    ? 'https://api.binance.com'
    : 'https://testnet.binance.vision';
const instance = axios_1.default.create({
    baseURL: API,
    timeout: 5 * 1000
});
axios_retry_1.default(instance, {
    retries: 3,
    retryDelay: (retryCount) => {
        return retryCount * 10000;
    },
    retryCondition: (error) => {
        // Retries only for network errors
        return axios_retry_1.default.isNetworkOrIdempotentRequestError(error);
        // return axiosRetry.isRetryableError(error);
    },
    shouldResetTimeout: true
});
exports.default = instance;
