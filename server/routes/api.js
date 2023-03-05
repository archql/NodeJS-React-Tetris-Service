import express from 'express';
import crypto from "crypto";
import {Message, Status, User} from "../bin/db.js";
import {Op} from "sequelize";

export let router = express.Router();

router.get('/messages', async function (req, res, next) {
    let session = req.session;
    if (!session.user_id) {
        return res.sendStatus(401);
    }

    const messages = await Message.findAll({
        where: {
            [Op.or]: {
                message_from_id: session.user_id,
                message_to_id: session.user_id
            }
        },
        include: User
    });
    res.send(JSON.stringify(messages, null, 2));
});

router.get('/users', async function (req, res, next) {
    let session = req.session;
    if (!session.user_id) {
        return res.sendStatus(401);
    }

    const users = await User.findAll({
        include: [
            { model: Status },
            { model: Message }
        ]
    });
    res.send(JSON.stringify(users, null, 2));
});

router.post('/messages', async function (req, res, next) {
    if(!req.body) return res.sendStatus(400); // TODO check if all fields defined
    let session = req.session;
    if (!session.user_id) {
        return res.sendStatus(401);
    }

    //const { message_body, message_to_id } = req.body
    const message = JSON.parse(req.body);

    const nMessage = await Message.create({
        message_content: message.content,
        message_from_id: session.user_id,
        message_to_id: message.to
    });
    if (!nMessage) {
        return res.send(JSON.stringify({error_message: "error" })).status(500);
    }
    return res.send(JSON.stringify(nMessage)).status(200);
});

router.put('/messages', async function (req, res, next) {
    if(!req.body) return res.sendStatus(400); // TODO check if all fields defined
    let session = req.session;
    if (!session.user_id) {
        return res.sendStatus(401);
    }

    //const { message_body, message_to_id } = req.body
    const message = JSON.parse(req.body);
    try {
        let count = await Message.update({message_content: message.content}, {
            where: {
                message_id: message.id,
                message_from_id: session.user_id
            }
        });
        if (count === 0) {
            return res.send(JSON.stringify({error_message: "error" })).status(403);
        }
    } catch (e) {
        console.log(e);
        return res.send(JSON.stringify({error_message: "error" })).status(500);
    }
    return res.send(JSON.stringify({error_message: "OK" })).status(200);
});

router.delete('/messages/:id', async function (req, res, next) {
    let session = req.session;
    if (!session.user_id) {
        return res.sendStatus(401);
    }

    const id = req.params.id;
    try {
        let count = await Message.destroy({
            where: {
                message_id: id,
                message_from_id: session.user_id
            }
        });
        if (count === 0) {
            return res.send(JSON.stringify({error_message: "error" })).status(403);
        }
    } catch (e) {
        console.log(e);
        return res.send(JSON.stringify({error_message: "error" })).status(500);
    }
    return res.send(JSON.stringify({error_message: "OK" })).status(200);
});

router.post('/register', async function (req, res, next) {
    if(!req.body) return res.sendStatus(400); // TODO check if all fields defined

    const { name, password } = req.body
    if (name.length < 3 || password.length < 4) {
        return res.status(409).send(JSON.stringify({error_message: "wrong input format" }));
    }
    // register user
    // 1st check if already exists
    const user = await User.findOne({ where: { user_name: name } });
    if (user) {
        return res.status(409).send(JSON.stringify({error_message: "user already exists" }));
    }
    // if ok (TODO mk hash on client side)
    const password_hash = crypto.createHash("sha256").update(password).digest('hex');
    //
    const n_user = await User.create({
        user_name: name,
        user_password_hash: password_hash
    });
    // return
    if (!n_user) {
        return res.status(500).send(JSON.stringify({error_message: "internal server error" }));
    }
    // setup session

    // return success
    return res.send(JSON.stringify(n_user, null, 2)); // TODO danger
});

router.post('/login', async function (req, res, next) {
    if(!req.body) return res.sendStatus(400); // TODO check if all fields defined

    const { name, password } = req.body

    // if ok (TODO mk hash on client side)
    const password_hash = crypto.createHash("sha256").update(password).digest('hex');
    const user = await User.findOne({
        where: {
            user_name: name,
            user_password_hash: password_hash
        }
    });
    const users = await User.findAll();
    if (!user) {
        return res.status(409).send(JSON.stringify({error_message: "user do not exists" }));
    }
    try {
        await User.update({user_status_id: 1}, {
            where: {
                user_id: user.user_id
            }
        });
    } catch (e) {
        console.log(e);
        return res.status(500).send(JSON.stringify({error_message: "internal server error" }));
    }
    // setup session
    let session = req.session;
    session.user_id = user.user_id;
    console.log(req.session)
    // return success
    return res.send(JSON.stringify(user, null, 2)); // TODO danger
});