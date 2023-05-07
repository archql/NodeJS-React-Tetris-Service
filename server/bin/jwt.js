import jwt from 'jsonwebtoken';
import crypto from "crypto";

// generates random secret every time server starts
const secret = crypto.randomBytes(64).toString('hex')

export function generateAccessToken(user) {
    return jwt.sign(user, secret, { expiresIn: '1800s' }); // process.env.TOKEN_SECRET
}

export const isAuthenticated = (socket, next) => {
    const token = socket.handshake?.auth?.token;
    if (!token) {
        return next(new Error("Unauthorized"));
    }
    try {
        const decoded = jwt.verify(token, secret);
        socket.request.user = decoded;
        return next();
    } catch (err) {
        return next(new Error("Forbidden"));
    }
    return next();
};

export const isAuthenticatedGame = (socket, next) => {
    const token = socket.handshake?.auth?.token;
    socket.request.user = null;
    if (!token) {
        return next();
    }
    try {
        socket.request.user = jwt.verify(token, secret);
    } catch (err) {

    } finally {
        return next();
    }
};