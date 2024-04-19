import express from 'express';
import {User} from "../bin/db.js";
import crypto from "crypto";
import {authenticateToken, generateAccessToken} from "../bin/jwt.js";

const router = express.Router();

// TODO!!!!!!!!!!!!!!!!!!
// const password_hash = crypto.createHash("sha256").update(password).digest('hex');
router.post('/register', async function (req, res, next) {

    const { name, surname, nickname, password_hash } = req.body
    if (!name || !password_hash || !surname || !nickname) {
        return res.status(400).json({error_message: "wrong params" });
    }
    if (name.length < 3 || surname.length < 3 || !nickname.match(/^[_A-Z]{8}$/g)) {
        return res.status(409).json({error_message: "wrong input format" });
    }
    // register user
    // 1st check if already exists
    const user = await User.findOne({ where: { user_nickname: nickname } });
    if (user) {
        return res.status(409).json({error_message: "user already exists" });
    }
    let n_user;
    try {
        n_user = await User.create({
            user_region: "BLR",
            user_email: "example@test.by",
            user_name: name,
            user_surname: surname,
            user_nickname: nickname,
            user_password_hash: password_hash
        });
    } catch (e) {
        return res.status(409).json({error_message: JSON.stringify(e) });
    }
    // return
    if (!n_user) {
        return res.status(500).json({error_message: "internal server error" });
    }
    // return success
    return res.json({"user_id": n_user.user_id});
});

router.post('/login', async function (req, res, next) {
    const { nickname, password_hash } = req.body;
    if (!nickname || !password_hash) {
        return res.status(400).json({error_message: "wrong params" });
    }

    const user = await User.findOne({
        where: {
            user_nickname: nickname,
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

router.get('/logout', authenticateToken, async function (req, res, next) {
    if (!req.user) {
        return res.status(401).json({error_message: "unauthorized" });
    }

    const user = await User.findByPk(req.user.user_id);
    if (!user) {
        return res.status(409).json({error_message: "user do not exists" });
    }
    try {
        await user.update({user_status_id: 1});
    } catch (e) {
        console.log(e);
        return res.status(500).json({error_message: "internal server error" });
    }
    // generate access token
    res.clearCookie("jwt");
    // return success
    res.sendStatus(200);
});

export default router;