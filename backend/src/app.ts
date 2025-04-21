import express from 'express';
import { closeAllConnections, initDb } from './db';
import cors from 'cors';
import indexRouter from './routes/index';
import fetch from 'cross-fetch';
import path from 'path';
global.fetch = fetch;

const https = require('https');
const fs = require('fs');
const app = express();
// const port = process.env.NODE_ENV !== 'development' ? 26535 : 9000;
const port = 26535;
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/', indexRouter);

try {
  const options = {
    key: fs.readFileSync('../ssl/key.pem'),
    cert: fs.readFileSync('../ssl/cert.pem')
  };
  process.on('SIGINT', () => {
    closeAllConnections().finally(() => {
      process.exit(0);
    });
  });
  https.createServer(options, app).listen(port, () => {
    initDb().then(() => {
      console.log('HTTPS Server running on port 443');
    });
  });
} catch (e) {
  console.log(e);
}

// app.listen(port, () => {
//   initDb().then(() => {
//     // todo
//     console.log(`Server running at http://localhost:${port}.`);
//   });
// });
