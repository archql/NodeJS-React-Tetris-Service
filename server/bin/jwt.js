import jwt from 'jsonwebtoken';
import crypto from "crypto";

const secret = crypto.randomBytes(64).toString('hex')

export function generateAccessToken(user) {
    return jwt.sign(user, secret, { expiresIn: '1800s' }); // process.env.TOKEN_SECRET
}

export function authenticateToken(req) {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]

    if (token == null) return null;

    try {
        return jwt.verify(token, secret);
    } catch (ex) { console.log(ex.message); return null; }
    //return {user_id: 1}; // TEMP
}