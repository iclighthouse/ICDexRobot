"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const db_1 = require("./db");
const cors_1 = __importDefault(require("cors"));
const index_1 = __importStar(require("./routes/index"));
const cross_fetch_1 = __importDefault(require("cross-fetch"));
global.fetch = cross_fetch_1.default;
const https = require('https');
const fs = require('fs');
const app = express_1.default();
// const port = process.env.NODE_ENV !== 'development' ? 26535 : 9000;
const port = 26535;
const setCacheControl = function (req, res, next) {
    res.set('Cache-Control', 'no cache');
    next();
};
app.use(cors_1.default());
app.use(index_1.auth);
app.use(setCacheControl);
app.use(express_1.default.static('frontend'));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use('/', index_1.default);
// try {
//   const options = {
//     key: fs.readFileSync('../ssl/key.pem'),
//     cert: fs.readFileSync('../ssl/cert.pem')
//   };
//   process.on('SIGINT', () => {
//     closeAllConnections().finally(() => {
//       process.exit(0);
//     });
//   });
//   https.createServer(options, app).listen(port, () => {
//     initDb().then(() => {
//       console.log('HTTPS Server running on port 443');
//     });
//   });
// } catch (e) {
//   console.log(e);
// }
process.on('SIGINT', () => {
    db_1.closeAllConnections().finally(() => {
        process.exit(0);
    });
});
app.listen(port, () => {
    db_1.initDb().then(() => {
        // todo
        console.log(`Server running at http://localhost:${port}.`);
    });
});
