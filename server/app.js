import express from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
import logger from 'morgan';
import { createHandler } from 'graphql-http/lib/use/express';
import graphqlUploadExpress from "graphql-upload/graphqlUploadExpress.mjs";

import {router as indexRouter} from './routes/index.js';
import {router as apiRouter} from './routes/api.js';
import {fileURLToPath} from "url";

import http from "http";
import {authenticateToken} from "./bin/jwt.js";
import {schema} from "./bin/shema.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export let app = express();

app.use(logger('dev'));
//app.use(cors());
app.use(express.json({limit: '25mb'}));
app.use(express.urlencoded({ extended: false, limit: '25mb' }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/attachments', express.static(path.join(__dirname, 'uploads')));

app.use('/', indexRouter);
app.use('/api', apiRouter);
app.use("/graphql", graphqlUploadExpress({ maxFileSize: 10000000, maxFiles: 10 }));
app.use("/graphql",
      createHandler({
            graphiql: true,
            schema: schema,
            context: async (req, args) => {
                const user = authenticateToken(req);
                return { user };
            }
      })
);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  //next(createError(404));
    res.status(404).send("<h1>Oops! Looks like resource you requested is nonexistent!</h1> <h1>404</h1>");
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
