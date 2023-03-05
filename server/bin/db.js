import { Sequelize, Model, DataTypes } from 'sequelize';
import sqlite3 from 'sqlite3';
import crypto from "crypto";

export const sequelize = new Sequelize('sqlite::memory:', {
    //logging: (...msg) => console.log(msg), // Displays all log function call parameters
    logging: console.log,
    dialect: 'sqlite',
    dialectOptions: {
        mode: sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE | sqlite3.OPEN_FULLMUTEX,
    }
}) // Example for sqlite

export const User = sequelize.define("user", {
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
    },
    user_role_id: {
        type: DataTypes.TINYINT,
        allowNull: false,
        defaultValue: 1
    },
    user_status_id: {
        type: DataTypes.TINYINT,
        allowNull: false,
        defaultValue: 1
    },
    user_name: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    user_password_hash: {
        type: DataTypes.STRING(64),
        allowNull: false
    },
    user_last_online: DataTypes.DATE
}, {
    timestamps: true,
    createdAt: "user_created",
    updatedAt: false,
});

export const Role = sequelize.define("role", {
    role_id: {
        type: DataTypes.TINYINT,
        allowNull: false,
        primaryKey: true
    },
    role_name: {
        type: DataTypes.STRING(40),
        allowNull: false
    },
    role_color: {
        type: DataTypes.STRING(20),
        allowNull: false
    }
}, {timestamps: false});
export const Status = sequelize.define("status", {
    status_id: {
        type: DataTypes.TINYINT,
        allowNull: false,
        primaryKey: true
    },
    status_name: {
        type: DataTypes.STRING(40),
        allowNull: false
    }
}, {timestamps: false});
export const Message = sequelize.define("message", {
    message_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
    },
    message_from: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    message_to: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    message_content: {
        type: DataTypes.TEXT,
        allowNull: false
    }
    }, {
        timestamps: true,
        createdAt: "message_created", // alias createdAt as created_date
        updatedAt: "message_updated"
    });
export const Attachment = sequelize.define("attachment", {
    attachment_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
    },
    attachment_message_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    attachment_filename: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
}, {timestamps: false});

Status.hasMany(User);
User.belongsTo(Status, {
    foreignKey: {
        name: 'user_status_id',
        allowNull: false
    }
});

Role.hasMany(User);
User.belongsTo(Role, {
    foreignKey: {
        name: 'user_role_id',
        type: DataTypes.TINYINT,
        allowNull: false,
        defaultValue: 1
    }
});

User.hasMany(Message);
Message.belongsTo(User, {
   // as: 'message_from_id',
    foreignKey: {
        name: 'message_from_id',
        allowNull: false
    }
});
Message.belongsTo(User, {
    //as: 'message_to_id',
    foreignKey: {
        name: 'message_to_id',
        allowNull: false
    }
})

Message.hasMany(Attachment);
Attachment.belongsTo(Message, {
    foreignKey: {
        name: 'attachment_message_id',
        allowNull: false
    }
});

await sequelize.sync();

await Status.create({
    status_id: 1,
    status_name: "offline"
});
await Status.create({
    status_id: 2,
    status_name: "on-line"
});
await Role.create({
    role_id: 1,
    role_name: "member",
    role_color: "lightskyblue"
});
await Role.create({
    role_id: 20,
    role_name: "root",
    role_color: "orange"
});
await User.create({
    user_role_id: 20,
    user_status_id: 1,
    user_name: 'root',
    user_password_hash: crypto.createHash("sha256").update("22122002").digest('hex')
})


