import crypto from "crypto";
import {Attachment, Message, Role, Status, User} from "../bin/db.js";
import {Op} from "sequelize";
import {io} from "../app.js"
import { promises as fs } from 'fs';
import path from "path";
import {__dirname} from "../app.js";

const userSockets = [];

async function saveFile(file) {
    const MIME_TYPE_MAP = [
                'image/png',
                'image/jpeg',
                'image/jpg'
            ];
    const EXTENSION_MAP = [
        'png',
        'jpeg',
        'jpg'
    ];
    const extension = file.name.split('.').pop();
    if (!MIME_TYPE_MAP.includes(file.type) || !EXTENSION_MAP.includes(extension)) {
        return null;
    }
    console.log("Includes");
    // generate filename
    const timestamp = Date.now();
    const randomString = crypto.randomBytes(6).toString('hex');
    file.name = `${randomString}-${timestamp}.${extension}`;
    // try save
    try {
        await fs.writeFile(path.join(__dirname, 'uploads', file.name), file.buffer);
        return file.name;
    } catch (err) {
        console.log(err);
        return null;
    }
}

const chatHandler = async (socket) => {
    console.log(`Socket connected: ${socket.id}`);
    // create file uploader
    // let uploader = new SocketIOFileUpload();
    // uploader.dir = "uploads";
    //
    // uploader.maxFileSize = 100 * 1024 * 1024; // 100MB
    // uploader.uploadValidator = function(event, callback){
    //     const MIME_TYPE_MAP = {
    //         'image/png': 'png',
    //         'image/jpeg': 'jpeg',
    //         'image/jpg': 'jpg'
    //     };
    //
    //     //let extArray = file.mimetype.split("/");
    //     let isValid = !!MIME_TYPE_MAP[event.file.mimetype];
    //     callback(isValid);
    // };
    // uploader.on('start', (event) => {
    //     const timestamp = Date.now();
    //     const randomString = crypto.randomBytes(6).toString('hex');
    //     event.file.name = `${randomString}-${timestamp}`;
    // });
    // -------------
    // Retrieve user object from the socket object
    const user = socket.request.user;
    // hold info about socket ids
    userSockets[user.user_id] = socket.id;
    // Set online
    let usr = await User.findByPk(user.user_id);
    if (usr !== null) {
        usr = await usr.update({user_status_id: 2});
    }
    socket.broadcast.emit("user updated", usr);
    // Retrieve user data from db
    const userDB = await User.findByPk(user.user_id, {
        include: [
            { model: Status },
            { model: Role },
            { model: Message }
        ]
    });
    socket.emit("self", userDB);
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
    socket.emit('members', users);

    socket.on('disconnect', async () => {
        console.log('A client disconnected');
        delete userSockets[user.user_id];

        let usr = await User.findByPk(user.user_id);
        if (usr !== null) {
            usr = await usr.update({user_status_id: 1});
        }
        socket.broadcast.emit("user updated", usr);
    });

    socket.on('create message', async (user_to_id, content, attachments) => {
        // create message
        try {
            const newMessage = await Message.create({
                message_content: content,
                message_from_id: user.user_id,
                message_to_id: user_to_id
            });
            if (!newMessage) {
                // TODO better to send created message with error inside??
                return socket.emit("error", {status: 403, who: "create message", message: "Failed to create message"});
            }
            let resultAttachments = [];
            console.log(attachments);
            if (attachments.length > 0) {
                let attachmentsRecords = []
                console.log(attachments.length);
                await Promise.all(attachments.map(async (file) => {
                    let filename = await saveFile(file);
                    if (filename) {
                        attachmentsRecords.push({
                            attachment_filename: filename,
                            attachment_message_id: newMessage.message_id
                        })
                    } else {
                        socket.emit("error", {status: 409, who: "create message", message: "Failed to add attachment"});
                    }
                }));
                resultAttachments = await Attachment.bulkCreate(attachmentsRecords);
            }
            let result = newMessage.get({ plain: true });
            result["attachments"] = resultAttachments;
            result["user_from"] = { user_id: user.user_id, user_name: user.user_name};
            result["user_to"] = { user_id: user_to_id};

            // send success
            socket.emit("create message", result);
            // send message to target user
            const targetSocket = io.sockets.sockets.get(userSockets[user_to_id]);
            if (targetSocket) {
                targetSocket.emit('new message', result);
            }
        } catch (e) {
            console.log(e);
            return socket.emit("error", { status: 409, who: "create message", message: "Failed to create message" });
        }
    });

    socket.on('delete message', async (message_id) => {
        try {
            let msg = await Message.findOne({
                where: {
                    message_id: message_id,
                    message_from_id: user.user_id
                }
            })
            if (!msg) {
                return socket.emit("error", { status: 403, who: "delete message", message: "Failed to delete message" });
            }
            const delRes = await msg.destroy();
            if (delRes) {
                // send message to target user
                socket.emit("delete message", message_id);
                const targetSocket = io.sockets.sockets.get(userSockets[msg.message_to_id]);
                if (targetSocket) {
                    targetSocket.emit('delete message', message_id);
                }
            } else {
                return socket.emit("error", { status: 403, who: "delete message", message: "Failed to delete message" });
            }
        } catch (e) {
            console.log(e);
            return socket.emit("error", { status: 409, who: "delete message", message: "Failed to delete message" });
        }
    });

    socket.on('edit message', async (message_id, content) => {
        try {
            let msg = await Message.findOne({
                where: {
                    message_id: message_id,
                    message_from_id: user.user_id
                }
            })
            if (msg === null) {
                return socket.emit("error", { status: 403, who: "update message", message: "Failed to update message" });
            }
            msg = await msg.update({message_content: content});
            // send success
            socket.emit("edit message", msg);
            // send message to target user
            const targetSocket = io.sockets.sockets.get(userSockets[msg.message_to_id]);
            if (targetSocket) {
                targetSocket.emit('edit message', msg);
            }
        } catch (e) {
            console.log(e);
            return socket.emit("error", { status: 409, who: "update message", message: "Failed to update message" });
        }
    });

    socket.on('members', async () => {
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
        return socket.emit('members', users);
    });

    socket.on('messages', async (user_from_id) => {
        const messages = await Message.findAll({
            where: {
                [Op.or]: [{
                    [Op.and]: {
                        message_from_id: user.user_id,
                        message_to_id: user_from_id
                    }},
                    {
                        [Op.and]: {
                            message_to_id: user.user_id,
                            message_from_id: user_from_id
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
        return socket.emit('messages', messages);
    });
}

export default chatHandler;

// // setup multer
// let multerStorage = multer.diskStorage({
//     destination: function (req, file, cb) {
//         cb(null, './uploads')
//     },
//     filename: function (req, file, cb) {
//         let extArray = file.mimetype.split("/");
//         let extension = extArray[extArray.length - 1];
//         cb(null, file.fieldname + '-' + Date.now() + crypto.randomBytes(16).toString('hex')+ '.' +extension)
//     }
// });
// let upload = multer({
//     storage: multerStorage,
//     limits: { fileSize: 1024 * 1024 * 100 },
//     fileFilter: function fileFilter (req, file, cb) {
//
//         const MIME_TYPE_MAP = {
//             'image/png': 'png',
//             'image/jpeg': 'jpeg',
//             'image/jpg': 'jpg'
//         };
//
//         //let extArray = file.mimetype.split("/");
//         let isValid = !!MIME_TYPE_MAP[file.mimetype];
//         cb(null, isValid); // false - reject
//     }
// }).array("attachment", 9); // use as separate function

// router.get('/messages', authenticateToken, async function (req, res, next) {
//     const user = req.user;
//     const messages = await Message.findAll({
//         where: {
//             [Op.or]: {
//                 message_from_id: user.user_id,
//                 message_to_id: user.user_id
//             }
//         },
//         include: User
//     });
//     res.send(JSON.stringify(messages, null, 2));
// });
// router.get('/messages/:from', authenticateToken, async function (req, res, next) {
//     const fromId = req.params.from;
//     const user = req.user;
//     const messages = await Message.findAll({
//         where: {
//             [Op.or]: [{
//                 [Op.and]: {
//                     message_from_id: user.user_id,
//                     message_to_id: fromId
//                 }},
//                 {
//                 [Op.and]: {
//                     message_to_id: user.user_id,
//                     message_from_id: fromId
//                 }
//             }]
//         },
//         include: [
//             {
//                 model: User,
//                 as: "user_from"
//             },
//             {
//                 model: User,
//                 as: "user_to"
//             },
//             { model: Attachment }
//         ]
//     });
//     res.send(JSON.stringify(messages, null, 2));
// });

// router.get('/others', authenticateToken, async function (req, res, next) {
//     const user = req.user;
//     const users = await User.findAll({
//         where: {
//             user_id: {
//                 [Op.not]: user.user_id
//             }
//         },
//         include: [
//             { model: Status },
//             { model: Role }
//         ]
//     });
//     res.send(JSON.stringify(users, null, 2));
// });

// router.get('/self', authenticateToken, async function (req, res, next) {
//     const user = req.user;
//     const users = await User.findByPk(user.user_id, {
//         include: [
//             { model: Status },
//             { model: Role },
//             { model: Message }
//         ]
//     });
//     res.send(JSON.stringify(users, null, 2));
// });
// router.post('/messages/:to',authenticateToken, async function (req, res, next) {
//     upload(req, res, async function(err) {
//         if(!req.body) return res.sendStatus(400); // TODO check if all fields defined
//
//         if (err) {
//             return res.status(409).send(JSON.stringify({error_message: "error with parameters" }));
//         }
//
//         const user = req.user;
//         const toId = req.params.to;
//
//         console.log(req.body);
//         console.log(req.files);
//
//         // create message
//         const nMessage = await Message.create({
//             message_content: req.body.content,
//             message_from_id: user.user_id,
//             message_to_id: toId
//         });
//         if (!nMessage) {
//             return res.status(500).send(JSON.stringify({error_message: "error" }));
//         }
//         let resultAttachments = [];
//         if (req.files.length > 0) {
//             let attachments = [];
//             for (const file of req.files) {
//                 attachments.push({
//                     attachment_filename: file.filename,
//                     attachment_message_id: nMessage.message_id
//                 })
//             }
//             resultAttachments = await Attachment.bulkCreate(attachments);
//         }
//         let result = nMessage.get({ plain: true });
//         // TODO bullshit??
//         result["attachments"] = resultAttachments;
//         result["user_from"] = { user_id: user.user_id, user_name: user.user_name};
//         result["user_to"] = { user_id: toId};
//
//         // here goes attachment creation logics
//         console.log(result);
//
//         return res.status(200).send(JSON.stringify(result));
//     });
// });
//
// router.put('/messages', authenticateToken, async function (req, res, next) {
//     if(!req.body) return res.sendStatus(400); // TODO check if all fields defined
//
//     //const { message_body, message_to_id } = req.body
//     const { message_id, message_content } = req.body
//     const user = req.user;
//     try {
//         let msg = await Message.findOne({
//             where: {
//                 message_id: message_id,
//                 message_from_id: user.user_id
//             }
//         })
//         if (msg === null) {
//             return res.status(403).send(JSON.stringify({error_message: "error" }));
//         }
//         msg = await msg.update({message_content: message_content});
//         return res.status(200).send(JSON.stringify(msg));
//     } catch (e) {
//         console.log(e);
//         return res.status(500).send(JSON.stringify({error_message: "error" }));
//     }
// });
//
// router.delete('/messages/:id', authenticateToken, async function (req, res, next) {
//
//     const id = req.params.id;
//     const user = req.user;
//     try {
//         let count = await Message.destroy({
//             where: {
//                 message_id: id,
//                 message_from_id: user.user_id
//             }
//         });
//         if (count === 0) {
//             return res.status(403).send(JSON.stringify({error_message: "error" }));
//         }
//     } catch (e) {
//         console.log(e);
//         return res.status(500).send(JSON.stringify({error_message: "error" }));
//     }
//     return res.status(200).send(JSON.stringify({error_message: "OK" }));
// });