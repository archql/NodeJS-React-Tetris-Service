import jwt from 'jsonwebtoken';
import crypto from "crypto";

const secret = crypto.randomBytes(64).toString('hex')

export function generateAccessToken(user) {
    return jwt.sign(user, secret, { expiresIn: '1800s' }); // process.env.TOKEN_SECRET
}

export function authenticateToken(req, res, next) {
    // const authHeader = req.headers['authorization']
    // const token = authHeader && authHeader.split(' ')[1]
    //
    // if (token == null) return res.sendStatus(401);
    //
    // jwt.verify(token, secret, (err, user) => {
    //     console.log(err)
    //     if (err) return res.sendStatus(403);
    //
    //     req.user = user;
    //
    //     next();
    // })
    req.user = {user_id: 1};
    next()
}