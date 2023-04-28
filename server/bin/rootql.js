import {Attachment, Message, Role, Status, User} from "../bin/db.js";
import {Op} from "sequelize";
import crypto from "crypto";
import fetch from "node-fetch";
import fs from 'fs';

function extractFileExt(base64String) {
    const startIndex = base64String.indexOf('/');
    const endIndex = base64String.indexOf(';');
    return base64String.substring(startIndex + 1, endIndex);
}
function extractFileType(base64String) {
    const startIndex = base64String.indexOf(':');
    const endIndex = base64String.indexOf(';');
    return base64String.substring(startIndex + 1, endIndex);
}

async function urlToFile(url, filename, mimeType) {
    const res = await fetch(url);
    const buf = await res.buffer();
    await fs.promises.writeFile("uploads/"+filename, buf);
    return {name: filename, type: mimeType};
}

async function base64FilesToFiles(base64Strings) {
    const files = [];
    for (let i = 0; i < base64Strings.length; i++) {
        const base64File = base64Strings[i];
        const current_date = (new Date()).valueOf().toString();
        const name = current_date + crypto.randomBytes(8).toString('hex') + '.' + extractFileExt(base64File);
        const file = await urlToFile(base64File, name, extractFileType(base64File));
        files.push(file);
    }
    return files;
}

export const rootql = {
    getMessages: async (data, context) => {
        console.log("getMessages");
        console.log(data);
        console.log(context);
        const fromId = data.from;
        const user = context.user;
        //const user = req.user;
        return await Message.findAll({
            where: {
                [Op.or]: [{
                    [Op.and]: {
                        message_from_id: user.user_id,
                        message_to_id: fromId
                    }
                },
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
                {model: Attachment}
            ]
        });
    },
    getSelf: async(data, context) => {
        const user = context.user;
        return await User.findByPk(user.user_id, {
            include: [
                { model: Status },
                { model: Role },
                { model: Message }
            ]
        });
    },
    getOthers: async(data, context) => {
        const user = context.user;
        return await User.findAll({
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
    },
    sendMessage: async (input, context) => {
        const user = context.user;
        const { toId, content, attachments } = input;
        const files = await base64FilesToFiles(attachments);
        // create message
        const nMessage = await Message.create({
            message_content: content,
            message_from_id: user.user_id,
            message_to_id: toId
        });
        if (!nMessage) {
            return null;
        }
        // create attachments
        let resultAttachments = [];
        console.log(files);
        if (files.length > 0) {
            let newAttachments = [];
            for (const file of files) {
                newAttachments.push({
                    attachment_filename: file.name,
                    attachment_message_id: nMessage.message_id
                })
            }
            resultAttachments = await Attachment.bulkCreate(newAttachments);
            console.log(files);
        }
        console.log(resultAttachments);
        console.log("dssdasd");
        //
        let result = nMessage.get({ plain: true });
        // TODO
        result["attachments"] = resultAttachments;
        result["user_from"] = { user_id: user.user_id, user_name: user.user_name};
        result["user_to"] = { user_id: toId};
        return result;
    },
    deleteMessage: async (input, context) => {
        const user = context.user;
        const { msgId } = input;
        try {
            let count = await Message.destroy({
                where: {
                    message_id: msgId,
                    message_from_id: user.user_id
                }
            });
            if (count === 0) {
                return null;
            }
            return msgId;
        } catch (e) {
            console.log(e);
            return null;
        }
    },
    editMessage: async (input, context) => {
        const user = context.user;
        const { message_id, message_content } = input;
        try {
            let msg = await Message.findOne({
                where: {
                    message_id: message_id,
                    message_from_id: user.user_id
                }
            })
            if (!msg) {
                return null;
            }
            msg = await msg.update({message_content: message_content});
            return msg;
        } catch (e) {
            console.log(e);
            return null;
        }
    },
}