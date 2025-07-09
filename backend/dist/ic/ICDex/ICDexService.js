"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ICDexService = void 0;
const ICDex_idl_1 = __importDefault(require("./ICDex.idl"));
const converter_1 = require("../converter");
const service_1 = require("../service");
class ICDexService {
    constructor() {
        this.trade = async (canisterId, identity, orderPrice, orderType, nonce = [], expiration = [], subAccountId = 0, data = [[]]) => {
            const service = service_1.buildService(identity, ICDex_idl_1.default, canisterId);
            let subAccount = [[]];
            if (subAccountId || subAccountId === 0) {
                subAccount = [converter_1.fromSubAccountId(subAccountId)];
            }
            const res = await service.trade(orderPrice, orderType, expiration, nonce, subAccount, data);
            return converter_1.SerializableIC(res);
        };
        this.accountSetting = async (canisterId, address) => {
            const service = service_1.buildService(null, ICDex_idl_1.default, canisterId);
            return service.accountSetting(address);
        };
        this.accountConfig = async (canisterId, identity, mode, keeping) => {
            const service = service_1.buildService(identity, ICDex_idl_1.default, canisterId);
            try {
                return await service.accountConfig(mode, keeping, []);
            }
            catch (e) {
                return undefined;
            }
        };
        this.accountBalance = async (canisterId, address) => {
            const service = service_1.buildService(null, ICDex_idl_1.default, canisterId);
            return await service.accountBalance(address);
        };
        this.stats = async (canisterId) => {
            const service = service_1.buildService(null, ICDex_idl_1.default, canisterId);
            return await service.stats();
        };
        this.statusByTxid = async (canisterId, txid) => {
            const service = service_1.buildService(null, ICDex_idl_1.default, canisterId);
            const res = await service.statusByTxid(txid);
            return converter_1.SerializableIC(res);
        };
        this.level100 = async (canisterId) => {
            const service = service_1.buildService(null, ICDex_idl_1.default, canisterId);
            const res = await service.level100();
            return converter_1.SerializableIC(res);
        };
        this.drc205_dexInfo = async (canisterId) => {
            const service = service_1.buildService(null, ICDex_idl_1.default, canisterId);
            const res = await service.drc205_dexInfo();
            return converter_1.SerializableIC(res);
        };
        this.cancelByTxid = async (canisterId, identity, txid, subaccount = []) => {
            const service = service_1.buildService(identity, ICDex_idl_1.default, canisterId);
            try {
                await service.cancelByTxid(txid, subaccount);
                return true;
            }
            catch (e) {
                return false;
            }
        };
        this.pending = async (canisterId, address, page = [], size = []) => {
            const service = service_1.buildService(null, ICDex_idl_1.default, canisterId);
            const res = await service.pending([address], page, size);
            return converter_1.SerializableIC(res);
        };
    }
}
exports.ICDexService = ICDexService;
