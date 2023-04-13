import http from 'http';
import express from 'express';
import path from 'path';
import logger from 'morgan';
import cookieParser from "cookie-parser";
import cors from 'cors';

import {fileURLToPath} from "url";
import {Server} from 'socket.io';
import SocketIOFileUpload from 'socketio-file-upload';

import authRouter from './routes/auth.js'
import chatSockets from './routes/api.js'
import {isAuthenticated} from "./bin/jwt.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export let app = express();
export const server = http.createServer(app); // Create HTTP server
export const io = new Server(server, {
    cors: {
        origin: "http://localhost:3000",
        credentials: true
    },
    path: '/chat'
}); // Attach Socket.io to HTTP server

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

app.use(cors());
app.use(SocketIOFileUpload.router);
app.use(cookieParser());
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/attachments', express.static(path.join(__dirname, 'uploads')));

app.use('/auth', authRouter)
io.use(isAuthenticated).on("connection", chatSockets);
server.listen(5000, () => {
    console.log('Listening on port 5000')
})
