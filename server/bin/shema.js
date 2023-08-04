import { GraphQLObjectType, GraphQLString, GraphQLInt, GraphQLList, GraphQLNonNull, GraphQLSchema } from 'graphql';
import {rootql} from "./rootql.js";
import GraphQLUpload from "graphql-upload/GraphQLUpload.mjs";

const RoleType = new GraphQLObjectType({
    name: 'Role',
    fields: () => ({
        role_id: { type: GraphQLInt },
        role_name: { type: GraphQLString },
        role_color: { type: GraphQLString }
    })
});

const FileInfo = new GraphQLObjectType({
    name: 'FileInfo',
    fields: () => ({
        type: { type: GraphQLString },
        name: { type: GraphQLString },
        base64String: { type: GraphQLString }
    })
});

const StatusType = new GraphQLObjectType({
    name: 'Status',
    fields: () => ({
        status_id: { type: GraphQLInt },
        status_name: { type: GraphQLString }
    })
});

const UserType = new GraphQLObjectType({
    name: 'User',
    fields: () => ({
        user_id: { type: GraphQLInt },
        role: { type: RoleType },
        status: { type: StatusType },
        user_name: { type: GraphQLString },
        user_passwordHash: { type: GraphQLString },
        user_lastOnline: { type: GraphQLString }
    })
});

const AttachmentType = new GraphQLObjectType({
    name: 'Attachment',
    fields: () => ({
        attachment_id: { type: GraphQLInt },
        attachment_message: { type: MessageType },
        attachment_filename: { type: GraphQLString }
    })
});

const MessageType = new GraphQLObjectType({
    name: 'Message',
    fields: () => ({
        message_id: { type: GraphQLInt },
        message_from_id: { type: GraphQLInt },
        message_to_id: { type: GraphQLInt },
        user_from: { type: UserType },
        user_to: { type: UserType },
        message_content: { type: GraphQLString },
        attachments: { type: new GraphQLList(AttachmentType) },
        message_created: { type: GraphQLString },
        message_updated: { type: GraphQLString }
    })
});

const RootQueryType = new GraphQLObjectType({
    name: 'Query',
    fields: {
        getMessages: {
            type: new GraphQLList(MessageType),
            args: {
                from: { type: new GraphQLNonNull(GraphQLInt) }
            },
            resolve(parent, args, context) {
                return rootql.getMessages(args, context);
            }
        },
        getSelf: {
            type: UserType,
            resolve(parent, args, context) {
                return rootql.getSelf(args, context);
            }
        },
        getOthers: {
            type: new GraphQLList(UserType),
            resolve(parent, args, context) {
                return rootql.getOthers(args, context);
            }
        }
    }
});

const RootMutationType = new GraphQLObjectType({
    name: 'Mutation',
    fields: {
        editMessage: {
            type: MessageType,
            args: {
                message_id: { type: new GraphQLNonNull(GraphQLInt) },
                message_content: { type: GraphQLString }
            },
            resolve(parent, args, context) {
                return rootql.editMessage(args, context);
            }
        },
        deleteMessage: {
            type: GraphQLInt,
            args: {
                msgId: { type: new GraphQLNonNull(GraphQLInt) }
            },
            resolve(parent, args, context) {
                return rootql.deleteMessage(args, context);
            }
        },
        sendMessage: {
            type: MessageType,
            args: {
                toId: { type: new GraphQLNonNull(GraphQLInt) },
                content: { type: new GraphQLNonNull(GraphQLString) },
                attachments: {type: new GraphQLList(GraphQLString)}
            },
            resolve(parent, args, context) {
                return rootql.sendMessage(args, context);
            }
        },
        uploadFile: {
            type: GraphQLString,
            args: {
                file: {
                    type: GraphQLUpload,
                },
            },
            async resolve(parent, { file }) {
                // `file` will be an object with `filename`, `mimetype`, `encoding` and `createReadStream`
                // Use this object to save the file to your desired location, e.g. using `fs.createWriteStream`
                const { filename } = await file;
                // Add logic to save the file
                console.log(`Received file: ${filename}`);
                return 'File uploaded successfully';
            },
        },
    }
});

export const schema = new GraphQLSchema({
    query: RootQueryType,
    mutation: RootMutationType,

});