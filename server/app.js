import createError from 'http-errors';
import express from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
import logger from 'morgan';
import {graphqlHTTP} from "express-graphql";
//import cors from 'cors';

import {router as indexRouter} from './routes/index.js';
import {router as apiRouter} from './routes/api.js';
import {fileURLToPath} from "url";

import crypto from "crypto";
import http from "http";
import debug from "debug";
import {authenticateToken} from "./bin/jwt.js";
import {schema} from "./bin/shema.js";
import {rootql} from "./bin/rootql.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export let app = express();

app.use(logger('dev'));
//app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/attachments', express.static(path.join(__dirname, 'uploads')));

app.use('/', indexRouter);
app.use('/api', apiRouter);
app.use('/graphql', authenticateToken, graphqlHTTP(req => ({
  graphiql: true,
  schema: schema,
  rootValue: rootql,
  context: { user: req.user }
})))

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

let port = process.env.PORT || '5000';
let server = http.createServer(app);
server.listen(port, () => {
  console.log("started on " + port);
});
// server.on('error', onError);
// server.on('listening', onListening);
//
// function onError(error) {
//   if (error.syscall !== 'listen') {
//     throw error;
//   }
//
//   let bind = typeof port === 'string'
//       ? 'Pipe ' + port
//       : 'Port ' + port;
//
//   // handle specific listen errors with friendly messages
//   switch (error.code) {
//     case 'EACCES':
//       console.error(bind + ' requires elevated privileges');
//       process.exit(1);
//       break;
//     case 'EADDRINUSE':
//       console.error(bind + ' is already in use');
//       process.exit(1);
//       break;
//     default:
//       throw error;
//   }
// }
//
// /**
//  * Event listener for HTTP server "listening" event.
//  */
//
// function onListening() {
//   let addr = server.address();
//   let bind = typeof addr === 'string'
//       ? 'pipe ' + addr
//       : 'port ' + addr.port;
//   debug('Listening on ' + bind);
// }
