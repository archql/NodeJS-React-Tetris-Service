import express from 'express';
import {User} from "../bin/db.js";
import crypto from "crypto";
import {generateAccessToken} from "../bin/jwt.js";

const router = express.Router();

// TODO!!!!!!!!!!!!!!!!!!
// const password_hash = crypto.createHash("sha256").update(password).digest('hex');
router.post('/register', async function (req, res, next) {

    const { name, password_hash } = req.body
    if (!name || !password_hash) {
        return res.status(400).json({error_message: "wrong params" });
    }
    if (name.length < 3) {
        return res.status(409).json({error_message: "wrong input format" });
    }
    // register user
    // 1st check if already exists
    const user = await User.findOne({ where: { user_name: name } });
    if (user) {
        return res.status(409).json({error_message: "user already exists" });
    }
    const n_user = await User.create({
        user_name: name,
        user_password_hash: password_hash
    });
    // return
    if (!n_user) {
        return res.status(500).json({error_message: "internal server error" });
    }
    // setup session

    // return success
    return res.json({"user_id": n_user.user_id});
});

router.post('/login', async function (req, res, next) {
    const { name, password_hash } = req.body;
    if (!name || !password_hash) {
        return res.status(400).json({error_message: "wrong params" });
    }

    const user = await User.findOne({
        where: {
            user_name: name,
            user_password_hash: password_hash,
            //user_status_id: 1 // offline
        }
    });
    if (!user) {
        return res.status(409).json({error_message: "user do not exists" });
    }
    try {
        await User.update({user_status_id: 2}, {
            where: {
                user_id: user.user_id
            }
        });
    } catch (e) {
        console.log(e);
        return res.status(500).json({error_message: "internal server error" });
    }
    // generate access token
    const token = generateAccessToken({ user_id: user.user_id, user_name: user.user_name, user_role: user.user_role });
    res.cookie("jwt", token/*, { httpOnly: true }*/);
    // return success
    return res.json({accessToken: token, user_id: user.user_id});
});

export default router;