import crypto from "crypto";
import {Attachment, Like, Message, Record, Role, Room, RoomUser, sequelize, Status, User} from "../bin/db.js";
import {Op} from "sequelize";
import {io} from "../app.ts"
import { promises as fs } from 'fs';
import path from "path";
import {__dirname} from "../app.ts";
import {ServerGameSessionControl} from "../game/reconciliator.ts";

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
    // Retrieve user data from db TODO duplicated
    const userDB = await User.findByPk(user.user_id, {
        include: [
            { model: Status },
            { model: Role },
            { model: Message }
        ]
    });
    let userPlain = userDB.get({plain: true});
    const rcd = user && await Record.findOne({
        where: {
            record_user_id: user.user_id
        },
        order: sequelize.literal('record_score DESC'),
    });
    userPlain["user_max_score"] = rcd ? rcd.record_score : 0;
    socket.emit("self", userPlain);

    socket.on('self', async () => {
        // Retrieve user data from db
        const userDB = await User.findByPk(user.user_id, {
            include: [
                { model: Status },
                { model: Role },
                { model: Message }
            ]
        });
        // find users max score
        let userPlain = userDB.get({plain: true});
        const rcd = user && await Record.findOne({
            where: {
                record_user_id: user.user_id
            },
            order: sequelize.literal('record_score DESC'),
        });
        userPlain["user_max_score"] = rcd ? rcd.record_score : 0;
        socket.emit("self", userPlain);
    });

    socket.on('leaderboard', async () => {
        const leaderboardData = await ServerGameSessionControl.getLeaderboard();
        socket.emit('leaderboard', leaderboardData);
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
        socket.emit('members', users);
    });

    socket.on('records', async () => {
        const records = await Record.findAll({
            where: {
                record_user_id: user.user_id
            },
            order: sequelize.literal('record_created DESC'),
        });
        socket.emit('records', records);
    });

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
            const targetSocket = io.of('/chat').sockets.get(userSockets[user_to_id]);
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
                const targetSocket = io.of('/chat').sockets.get(userSockets[msg.message_to_id]);
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

    socket.on('like message', async (message_id) => {
        try {
            const msg = await Message.findOne({
                where: {
                    message_id: message_id,
                    message_to_id: user.user_id
                }
            })
            if (!msg) {
                return socket.emit("error", { status: 409, who: "like message", message: "Failed to like message" });
            }
            let like = await Like.findOne({
                where: {
                    like_user_id: user.user_id,
                    like_message_id: message_id
                }
            })
            if (like) {
                // already exists
                await like.destroy();
                //
                like = {
                    like_user_id: user.user_id,
                    like_message_id: message_id,
                    like_revoke: true
                }
            } else {
                //
                like = await Like.create({
                    like_user_id: user.user_id,
                    like_message_id: message_id
                })
            }
            // TODO
            const targetSocket = io.of('/chat').sockets.get(userSockets[msg.message_from_id]);
            targetSocket && targetSocket.emit('like message', like);
            socket.emit('like message', like);
        } catch (e) {
            console.log(e);
            return socket.emit("error", { status: 409, who: "like message", message: "Failed to like message" });
        }
    })

    socket.on('edit message', async (message_id, content) => {
        try {
            let msg = await Message.findOne({
                where: {
                    message_id: message_id,
                    message_from_id: user.user_id
                }
            })
            if (msg === null) {
                return socket.emit("error", { status: 403, who: "edit message", message: "Failed to update message" });
            }
            msg = await msg.update({message_content: content});
            // send success
            socket.emit("edit message", msg);
            // send message to target user
            const targetSocket = io.of('/chat').sockets.get(userSockets[msg.message_to_id]);
            console.log(userSockets[msg.message_to_id]);
            console.log("targetSocket");
            console.log(targetSocket);
            if (targetSocket) {
                targetSocket.emit('edit message', msg);
            }
        } catch (e) {
            console.log(e);
            return socket.emit("error", { status: 409, who: "edit message", message: "Failed to update message" });
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
                { model: Attachment },
                {
                    model: Like,
                    as: "message_likes"
                }
            ]
        });
        return socket.emit('messages', messages);
    });

    // TODO separate rooms info logics
    socket.on('rooms', async () => {
        // retrieve all rooms available
        const rooms = await Room.findAll({
            // where: {
            //     user_id: {
            //         [Op.not]: user.user_id
            //     }
            // },
            attributes: ['room_id', 'room_name', 'room_max_members', 'room_description', 'room_password_hash', 'room_teams'],
            include: [{
                model: RoomUser,
                as: "room_users",
                include: {
                    model: User,
                    attributes: ['user_nickname'],
                    as: "ru_user",
                }
            }, { model: User, as: "room_owner", attributes: ['user_nickname', 'user_id'] }],
        });
        rooms.forEach((item) => {
            item.room_password_hash = item.room_password_hash ? 'Y' : null
        })
        socket.emit('rooms', rooms);
    })

    socket.on('room create', async (room) => {
        const usr = await User.findByPk(user.user_id);
        const temp = await Room.findOne({
                where: {room_owner_id: user.user_id}
            });
        if (!usr) return socket.emit("error", {status: 409, who: "room create", message: "You're not exist"});
        // allow for status 10+
        if ((usr.user_status_id < 10) && temp) return socket.emit("error", {status: 409, who: "room create", message: "Already has a room"});
        //
        const r = await Room.create({
            room_owner_id: usr.user_id,
            room_name: room.name,
            room_description: `Room of ${user.user_nickname}`, // TODO undefined
            room_max_members: room.members,
            room_teams: room.teams,
            room_password_hash: room.password_hash
        });
        if (!r) {
            return socket.emit("error", {status: 409, who: "room create", message: "Unexpected error"});
        }
        // join
        const ru = await RoomUser.create({
            ru_user_id: user.user_id,
            ru_room_id: r.room_id,
        });
        if (!ru) {
            return socket.emit("error", {status: 409, who: "room create", message: "Created. Join error"});
        }
        //
        socket.emit('room create', r);
        // only if room was joined not rejoined
        io.of('/chat').emit("room join", ru);
    })
    socket.on('room delete', async (room_id) => {
        const temp = await Room.findByPk(room_id);
        if (!temp) return socket.emit("error", {status: 409, who: "room delete", message: "Nothing to delete"});
        const delRes = await temp.destroy();
        if (!delRes) return socket.emit("error", {status: 409, who: "room delete", message: "Failed to delete"});
        // TODO notify all users room is destroyed
        socket.emit('room delete', room_id);
    })

    socket.on('room join', async (room_id) => {
        // 0th check if somewhere
        let ru0 = await RoomUser.findOne({
            where: {
                ru_user_id: user.user_id,
            }
        });
        if (ru0) {
            return socket.emit("error", {status: 409, who: "room join", message: `Already joined room ${ru0.room_name}`});
        }
        // 1st find the room
        const room = await Room.findByPk(room_id);
        if (!room) return socket.emit("error", {status: 409, who: "room join", message: "Failed to join room"});
        // TODO check the limit in the DB
        // 2nd check if already joined
        let ru = await RoomUser.findOne({
            where: {
                ru_room_id: room.room_id,
                ru_user_id: user.user_id,
            }
        });
        if (!ru) {
            ru = await RoomUser.create({
                ru_user_id: user.user_id,
                ru_room_id: room.room_id
            });
            // only if room was joined not rejoined
            io.of('/chat').emit("room join", ru);
        }
        // join completed
        socket.emit("room join", room.room_id);
    })

    socket.on('room leave', async (room_id) => {
        const room = await Room.findByPk(room_id);
        if (!room) return socket.emit("error", {status: 409, who: "room leave", message: "Failed to leave room"});
        // find record and delete it
        const ru = await RoomUser.findOne({
            where: {
                ru_room_id: room.room_id,
                ru_user_id: user.user_id,
            }
        });
        if (!ru) return socket.emit("error", {status: 409, who: "room leave", message: "Failed to leave room"});
        const delRes = await ru.destroy();
        if (!delRes) {
             return socket.emit("error", {status: 409, who: "room leave", message: "Failed to leave room"});
        } else {
             //return socket.emit("room leave");
             //socket.emit("room left");
             //socket.broadcast.emit("room leave", room.room_id);
             io.of('/chat').emit('room leave', ru);
        }
    })
}

export default chatHandler;