"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccountStatus = exports.RobotName = exports.OrderStatus = exports.ExchangeName = exports.StrategyStatus = exports.OrdersStatus = void 0;
var OrdersStatus;
(function (OrdersStatus) {
    OrdersStatus["Pending"] = "Pending";
    OrdersStatus["Completed"] = "Completed";
    OrdersStatus["Failed"] = "Failed";
})(OrdersStatus = exports.OrdersStatus || (exports.OrdersStatus = {}));
var StrategyStatus;
(function (StrategyStatus) {
    StrategyStatus["Stopped"] = "Stopped";
    StrategyStatus["Running"] = "Running";
})(StrategyStatus = exports.StrategyStatus || (exports.StrategyStatus = {}));
var ExchangeName;
(function (ExchangeName) {
    ExchangeName["ICDex"] = "ICDex";
    ExchangeName["Binance"] = "Binance";
})(ExchangeName = exports.ExchangeName || (exports.ExchangeName = {}));
var OrderStatus;
(function (OrderStatus) {
    OrderStatus["Pending"] = "Pending";
    OrderStatus["Completed"] = "Completed";
    OrderStatus["Failed"] = "Failed";
})(OrderStatus = exports.OrderStatus || (exports.OrderStatus = {}));
var RobotName;
(function (RobotName) {
    RobotName["Timer"] = "Timer Robot";
    RobotName["Maker"] = "Maker Robot";
})(RobotName = exports.RobotName || (exports.RobotName = {}));
var AccountStatus;
(function (AccountStatus) {
    AccountStatus["Available"] = "Available";
    AccountStatus["Unavailable"] = "Unavailable";
})(AccountStatus = exports.AccountStatus || (exports.AccountStatus = {}));
