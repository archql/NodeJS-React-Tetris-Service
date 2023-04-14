import {Attachment, Message, Role, Status, User} from "../bin/db.js";
import {Op} from "sequelize";

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
        const { toId, content } = input;
        // create message
        const nMessage = await Message.create({
            message_content: content,
            message_from_id: user.user_id,
            message_to_id: toId
        });
        if (!nMessage) {
            return null;
        }
        let result = nMessage.get({ plain: true });
        // TODO
        result["attachments"] = [];
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