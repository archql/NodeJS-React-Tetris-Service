import jwt from 'jsonwebtoken';
import crypto from "crypto";

// generates random secret every time server starts
const secret = crypto.randomBytes(64).toString('hex')

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

export const isAuthenticatedGame = (socket, next) => {
    const token = socket.handshake?.auth?.token;
    socket.request.user = null;
    if (!token) {
        return next();
    }
    try {
        socket.request.user = jwt.verify(token, secret);
    } catch (err) {

    }
    return next();
};