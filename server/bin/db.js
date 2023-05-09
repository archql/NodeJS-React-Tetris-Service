import { Sequelize, Model, DataTypes } from 'sequelize';
import sqlite3 from 'sqlite3';
import crypto from "crypto";
import exp from "constants";

export const sequelize = new Sequelize('sqlite:database/database.db', {
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
    user_nickname: {
        type: DataTypes.CHAR(8),
        allowNull: true,
        defaultValue: null
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
    message_from_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    message_to_id: {
        type: DataTypes.INTEGER,
        allowNull: true
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
    // attachment_message_id: {
    //     type: DataTypes.INTEGER,
    //     allowNull: false
    // },
    attachment_filename: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
}, {timestamps: false});
export const Record = sequelize.define("record", {
    record_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
    },
    record_user_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    record_score: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unsigned: true
    },
    record_time_elapsed: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unsigned: true
    },
    record_figures_placed: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unsigned: true
    },
    record_image: {
        type: DataTypes.BLOB,
        allowNull: true
    },
    record_file: {
        type: DataTypes.BLOB,
        allowNull: true
    },
}, {
    timestamps: true,
    createdAt: "record_created", // alias createdAt as created_date
    updatedAt: false
});

export const Like = sequelize.define("like", {
    like_user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
    },
    like_message_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
    },
}, {
    timestamps: true,
    createdAt: "like_created", // alias createdAt as created_date
    updatedAt: false
});

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
    },
    as: "user_from"
});
Message.belongsTo(User, {
    //as: 'message_to_id',
    foreignKey: {
        name: 'message_to_id',
        allowNull: true
    },
    as: "user_to"
})

Attachment.belongsTo(Message, {
    foreignKey: {
        name: 'attachment_message_id',
        allowNull: false
    }
});
Message.hasMany(Attachment,
    { foreignKey: 'attachment_message_id' });

User.hasMany(Record);
Record.belongsTo(User,
    {
        foreignKey: {
            name: 'record_user_id',
            allowNull: false
        }
    }
);

User.hasMany(Like);
Like.belongsTo(User,
    {
        foreignKey: {
            name: 'like_user_id',
            allowNull: false
        }
    }
);

Message.hasMany(Like);
Like.belongsTo(Message,
    {
        foreignKey: {
            name: 'like_message_id',
            allowNull: false
        }
    }
);

await sequelize.sync();

// await User.create({
//     user_role_id: 1,
//     user_status_id: 1,
//     user_name: 'abcd',
//     user_password_hash: crypto.createHash("sha256").update("1234").digest('hex')
// })
const abcd = await User.findOne({ where: { user_name: 'abcd' } });
if (abcd) {
    await abcd.update({user_nickname: "BBBBBBBB"});
}
const records = await Record.findAll({ where: { record_user_id: abcd.user_id } });
if (records) {
    records.forEach(async (record) => {
        await record.update({record_score: 1});
    })
}

const root = await User.findOne({ where: { user_name: 'root' } });
if (root) {
    await root.update({ user_nickname: "_ARCHQL_" });
    // await Record.create({
    //     record_user_id: root.user_id,
    //     record_score: 1000,
    //     record_time_elapsed: 100000,
    //     record_figures_placed: 240,
    // });
    // await Record.create({
    //     record_user_id: root.user_id,
    //     record_score: 2000,
    //     record_time_elapsed: 200000,
    //     record_figures_placed: 480,
    // });
}
const abc = await User.findOne({ where: { user_name: 'abc' } });
if (abc) {
    await abc.update({ user_nickname: "AAAAAAAA" });
    // await Record.create({
    //     record_user_id: abc.user_id,
    //     record_score: 500,
    //     record_time_elapsed: 30000,
    //     record_figures_placed: 120,
    // });
}

// await Status.create({
//     status_id: 1,
//     status_name: "offline"
// });
// await Status.create({
//     status_id: 2,
//     status_name: "on-line"
// });
// await Status.create({
//     status_id: 3,
//     status_name: "playing"
// });
// await Role.create({
//     role_id: 1,
//     role_name: "member",
//     role_color: "lightskyblue"
// });
// await Role.create({
//     role_id: 20,
//     role_name: "root",
//     role_color: "orange"
// });
// await User.create({
//     user_role_id: 1,
//     user_status_id: 1,
//     user_name: 'abc',
//     user_password_hash: crypto.createHash("sha256").update("1234").digest('hex')
// })
// await User.create({
//     user_role_id: 20,
//     user_status_id: 1,
//     user_name: 'root',
//     user_password_hash: crypto.createHash("sha256").update("2212").digest('hex')
// })
// await Message.create({
//     message_from_id: 2,
//     message_to_id: 1,
//     message_content: "Welcome to the Tetris Chat!"
// })



