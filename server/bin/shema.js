import {buildSchema} from 'graphql';

export const schema = buildSchema(`
    type User {
        user_id: ID
        user_role: Role
        user_status: Status
        user_name: String
        user_passwordHash: String
        user_lastOnline: String
    }
    
    type Role {
        id: ID
        name: String
        color: String
    }

    type Status {
        id: ID
        name: String
    }

    type Message {
        message_id: ID
        message_from: User
        message_to: User
        message_content: String
        message_attachments: [Attachment]
        message_created: String
        message_updated: String
    }

    type Attachment {
        id: ID
        message: Message
        filename: String
    }
    
    type Query {
        getMessages(from: Int!): [Message!]!
        test(from: Int!): Int
    }
`)
