import jwt from 'jsonwebtoken';
import crypto from "crypto";
import {User} from "./db.js";

// generates random secret every time server starts
const secret = 'my-secret'//crypto.randomBytes(64).toString('hex') // TODO WARNING

export function generateAccessToken(user) {
    return jwt.sign(user, secret, { expiresIn: '1800s' }); // process.env.TOKEN_SECRET
}

export function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]

    if (token == null) return res.sendStatus(401);

    jwt.verify(token, secret, (err, user) => {
        console.log(err)
        if (err) return res.sendStatus(403);

        req.user = user;

        next();
    })
}

export const isAuthenticated = (socket, next) => {
    const token = socket.handshake?.auth?.token;
    if (!token) {
        return next(new Error("Unauthorized"));
    }
    try {
        socket.request.user = jwt.verify(token, secret);
        return next();
    } catch (err) {
        return next(new Error("Forbidden"));
    }
};

export const isAuthenticatedGame = async (socket, next) => {
    const token = socket.handshake?.auth?.token;
    socket.request.user = null;
    if (!token) {
        // check for direct auth
        const nickname = socket.handshake?.auth?.nickname;
        const password_hash = socket.handshake?.auth?.password_hash;
        // TODO DUPLICATED
        if (!nickname || !password_hash) {
            return next();
        }

        const user = await User.findOne({
            where: {
                user_nickname: nickname,
                user_password_hash: password_hash,
                //user_status_id: 1 // offline
            }
        });
        if (!user) {
            socket.request.error = true;
            return next();
        }
        try {
            await User.update({user_status_id: 2}, {
                where: {
                    user_id: user.user_id
                }
            });
        } catch (e) {
            console.log(e);
            socket.request.error = true;
            return next();
        }
        socket.request.user = user;
        return next();
    }
    try {
        socket.request.user = jwt.verify(token, secret);
    } catch (err) {
        console.log(err);
    }
    return next();
};