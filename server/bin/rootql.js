import {Attachment, Message, User} from "../bin/db.js";
import {Op} from "sequelize";

export const rootql = {
    test: async (data, context) => {
        console.log("test");
        console.log(data);
        console.log(context);
        const fromId = data.from;
        const user = context.user;
        return fromId;
    },
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
    // getAllTasks: async () => {
    //     fileCount = await Task.find({}).count()
    //     return Task.find({})
    // },
    // createTask: async ({input}) => {
    //     fileCount++
    //     const newTask = new Task({
    //         key: input.key,
    //         summary: input.summary,
    //         postDate: new Date(),
    //         status: 'wip',
    //         fileName: input.fileName,
    //         fid: fileCount + path.extname(input.fileName),
    //         dueTo: input.dueTo
    //     })
    //     return newTask.save()
    // },
    // updateTask: async ({input}) => {
    //     const res = await Task.updateOne({_id: input.id}, {status: 'done'})
    //
    //     if (res.modifiedCount === 1) return Task.findOne({_id: input.id});
    // }
}