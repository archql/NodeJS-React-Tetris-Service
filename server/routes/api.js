import express from 'express';
import crypto from "crypto";
import multer from 'multer';
import {Attachment, Message, Role, Status, User} from "../bin/db.js";
import {Op} from "sequelize";

import {authenticateToken, generateAccessToken} from '../bin/jwt.js';

export let router = express.Router();

// setup multer
let multerStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './uploads')
    },
    filename: function (req, file, cb) {
        let extArray = file.mimetype.split("/");
        let extension = extArray[extArray.length - 1];
        cb(null, file.fieldname + '-' + Date.now() + crypto.randomBytes(16).toString('hex')+ '.' +extension)
    }
});
let upload = multer({
    storage: multerStorage,
    limits: { fileSize: 1024 * 1024 * 100 },
    fileFilter: function fileFilter (req, file, cb) {

        const MIME_TYPE_MAP = {
            'image/png': 'png',
            'image/jpeg': 'jpeg',
            'image/jpg': 'jpg'
        };

        //let extArray = file.mimetype.split("/");
        let isValid = !!MIME_TYPE_MAP[file.mimetype];
        cb(null, isValid); // false - reject
    }
}).array("attachment", 9); // use as separate function

router.get('/messages', authenticateToken, async function (req, res, next) {
    const user = req.user;
    const messages = await Message.findAll({
        where: {
            [Op.or]: {
                message_from_id: user.user_id,
                message_to_id: user.user_id
            }
        },
        include: User
    });
    res.send(JSON.stringify(messages, null, 2));
});
router.get('/messages/:from', authenticateToken, async function (req, res, next) {
    const fromId = req.params.from;
    const user = req.user;
    const messages = await Message.findAll({
        where: {
            [Op.or]: [{
                [Op.and]: {
                    message_from_id: user.user_id,
                    message_to_id: fromId
                }},
                {
                [Op.and]: {
                    message_to_id: user.user_id,
                    message_from_id: fromId
                }
            }]
        },
        include: [
            {
                model: User,
                as: "user_from"
            },
            {
                model: User,
                as: "user_to"
            },
            { model: Attachment }
        ]
    });
    res.send(JSON.stringify(messages, null, 2));
});

router.get('/others', authenticateToken, async function (req, res, next) {
    const user = req.user;
    const users = await User.findAll({
        where: {
            user_id: {
                [Op.not]: user.user_id
            }
        },
        include: [
            { model: Status },
            { model: Role }
        ]
    });
    res.send(JSON.stringify(users, null, 2));
});

router.get('/self', authenticateToken, async function (req, res, next) {
    const user = req.user;
    const users = await User.findByPk(user.user_id, {
        include: [
            { model: Status },
            { model: Role },
            { model: Message }
        ]
    });
    res.send(JSON.stringify(users, null, 2));
});

router.post('/attachments/:to',authenticateToken, async function (req, res, next) {
    upload(req, res, async function(err) {
        const user = req.user; // TODO CHECK IT
        const msgId = req.params.to;
        console.log("dssadsadsad");

        let resultAttachments = [];
        if (req.files.length > 0) {
            let attachments = [];
            for (const file of req.files) {
                attachments.push({
                    attachment_filename: file.filename,
                    attachment_message_id: msgId
                })
            }
            resultAttachments = await Attachment.bulkCreate(attachments);
        }

        // here goes attachment creation logics
        console.log(resultAttachments);

        return res.status(200).json(resultAttachments);
    });
});

router.put('/messages', authenticateToken, async function (req, res, next) {
    if(!req.body) return res.sendStatus(400); // TODO check if all fields defined

    //const { message_body, message_to_id } = req.body
    const { message_id, message_content } = req.body
    const user = req.user;
    try {
        let msg = await Message.findOne({
            where: {
                message_id: message_id,
                message_from_id: user.user_id
            }
        })
        if (msg === null) {
            return res.status(403).send(JSON.stringify({error_message: "error" }));
        }
        msg = await msg.update({message_content: message_content});
        return res.status(200).send(JSON.stringify(msg));
    } catch (e) {
        console.log(e);
        return res.status(500).send(JSON.stringify({error_message: "error" }));
    }
});

router.delete('/messages/:id', authenticateToken, async function (req, res, next) {

    const id = req.params.id;
    const user = req.user;
    try {
        let count = await Message.destroy({
            where: {
                message_id: id,
                message_from_id: user.user_id
            }
        });
        if (count === 0) {
            return res.status(403).send(JSON.stringify({error_message: "error" }));
        }
    } catch (e) {
        console.log(e);
        return res.status(500).send(JSON.stringify({error_message: "error" }));
    }
    return res.status(200).send(JSON.stringify({error_message: "OK" }));
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
    if (!user) {
        return res.status(409).send(JSON.stringify({error_message: "user do not exists" }));
    }
    try {
        await User.update({user_status_id: 2}, {
            where: {
                user_id: user.user_id
            }
        });
    } catch (e) {
        console.log(e);
        return res.status(500).send(JSON.stringify({error_message: "internal server error" }));
    }
    // generate access token
    const token = generateAccessToken({ user_id: user.user_id, user_name: user.user_name, user_role: user.user_role });
    // return success
    return res.send(JSON.stringify({accessToken: token, user_id: user.user_id}, null, 2));
});