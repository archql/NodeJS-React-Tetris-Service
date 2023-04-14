import {buildSchema} from 'graphql';

export const schema = buildSchema(`
    type User {
        user_id: Int
        role: Role
        status: Status
        user_name: String
        user_passwordHash: String
        user_lastOnline: String
    }
    
    type Role {
        role_id: Int
        role_name: String
        role_color: String
    }

    type Status {
        status_id: Int
        status_name: String
    }

    type Message {
        message_id: Int
        message_from_id: Int
        message_to_id: Int
        user_from: User
        user_to: User
        message_content: String
        attachments: [Attachment]
        message_created: String
        message_updated: String
    }

    type Attachment {
        attachment_id: Int
        attachment_message: Message
        attachment_filename: String
    }
    
    type Query {
        getMessages(from: Int!): [Message!]!
        getSelf:User
        getOthers:[User!]
    }
    type Mutation {
        editMessage(message_id: Int!, message_content: String): Message
        deleteMessage(msgId: Int!): Int
        sendMessage(toId: Int!, content: String!): Message
    }
`)
