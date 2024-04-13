import {Sequelize, Model, DataTypes, where} from 'sequelize';
import sqlite3 from 'sqlite3';
import crypto from "crypto";
import exp from "constants";

export const sequelize = new Sequelize('sqlite:database/database.db', {
    logging: console.log, // Displays all log function call parameters
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
    user_region: {
        type: DataTypes.STRING(3),
        allowNull: false,
    },
    user_name: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    user_surname: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    user_email: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    user_password_hash: {
        type: DataTypes.STRING(64),
        allowNull: false
    },
    user_nickname: {
        type: DataTypes.CHAR(8),
        allowNull: false,
        defaultValue: null
    },
    user_points: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    user_rank: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    user_last_online: DataTypes.DATE
}, {
    timestamps: true,
    createdAt: "user_created",
    updatedAt: false,
});
export const Region = sequelize.define("region", {
    region_id: {
        type: DataTypes.STRING(3),
        allowNull: false,
        primaryKey: true
    }
}, {timestamps: false})
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

export const Connection = sequelize.define("connection", {
    connection_from_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true
    },
    connection_to_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true
    },
    connection_status: {
        type: DataTypes.INTEGER,
        allowNull: false
    }
}, {
    timestamps: true,
    createdAt: "connection_created", // alias createdAt as created_date
    updatedAt: "connection_updated",
    validate: {
        noSelfConnection() {
            if ((this.connection_from_id === this.connection_to_id)) {
                throw new Error('Cannot create self-connection');
            }
        }
    }
});

export const ConStatus = sequelize.define("constatus", {
    constatus_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true
    },
    constatus_name: {
        type: DataTypes.STRING,
        allowNull: false,
    }
}, {
    timestamps: false,
});

export const Room = sequelize.define("room", {
    room_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
    },
    room_owner_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    room_name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    room_max_members: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    room_teams: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    room_description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    room_password_hash: {
        type: DataTypes.STRING(64),
        allowNull: true
    },
    room_places: {
        type: DataTypes.INTEGER,
        allowNull: false
    }
}, {
    timestamps: true,
    createdAt: "room_created",
    updatedAt: false
});

export const RoomUser = sequelize.define("ru", {
    ru_user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true
    },
    ru_room_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true
    },
    ru_game_id: { // TODO games
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1
    },
    ru_team: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    ru_last_score: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    ru_max_score: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
}, {
    timestamps: true,
    createdAt: "ru_joined",
    updatedAt: false
});
export const Skill = sequelize.define("skill", {
    skill_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
    },
    skill_rule: {
        type: DataTypes.TEXT("medium"),
        allowNull: false
    },
    skill_name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    skill_description: {
        type: DataTypes.STRING,
        allowNull: false
    },
}, {
    timestamps: true,
    createdAt: "skill_created",
    updatedAt: false
});
export const Achievement = sequelize.define("achievement", {
    ach_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
    },
    ach_rule: {
        type: DataTypes.TEXT("medium"),
        allowNull: false
    },
    ach_name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    ach_description: {
        type: DataTypes.STRING,
        allowNull: false
    },
    ach_obtained_cnt: {
        type: DataTypes.INTEGER,
        allowNull: false
    }
}, {
    timestamps: true,
    createdAt: "ach_created",
    updatedAt: false
});
export const UserSkill = sequelize.define("us", {
    us_user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true
    },
    us_skill_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true
    },
    us_level: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    us_max_level: {
        type: DataTypes.INTEGER,
        allowNull: false,
    }
}, {
    timestamps: true,
    createdAt: "us_created",
    updatedAt: false
});
export const UserAchievement = sequelize.define("ua", {
    ua_user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true
    },
    ua_ach_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true
    },
    ua_level: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    ua_max_level: {
        type: DataTypes.INTEGER,
        allowNull: false,
    }
}, {
    timestamps: true,
    createdAt: "ua_created",
    updatedAt: false
});


// User.hasMany(Room, {
//     foreignKey: {
//         name: 'room_owner_id',
//         allowNull: false,
//     },
//     as: "user_owns"
// });
Room.belongsTo(User, {
    foreignKey: {
        name: 'room_owner_id',
        allowNull: false,
    },
    as: "room_owner"
})

Room.hasMany(RoomUser, {
    foreignKey: {
        name: 'ru_room_id',
        allowNull: false,
    },
    as: "room_users",
    onDelete: 'CASCADE', // Cascade delete when the Room is deleted
    hooks: true
});
User.hasMany(RoomUser, {
    foreignKey: {
        name: 'ru_user_id',
        allowNull: false,
    },
    as: "user_rooms"
});
RoomUser.belongsTo(User, {
    foreignKey: {
        name: 'ru_user_id',
        allowNull: false,
    },
    as: "ru_user"
})
RoomUser.belongsTo(Room, {
    foreignKey: {
        name: 'ru_room_id',
        allowNull: false,
    },
    as: "ru_room",
})

Skill.hasMany(UserSkill, {
    foreignKey: {
        name: 'us_skill_id',
        allowNull: false,
    },
    as: "skill_users"
})
User.hasMany(UserSkill, {
    foreignKey: {
        name: 'us_user_id',
        allowNull: false,
    },
    as: "user_skills"
})
UserSkill.belongsTo(Skill, {
    foreignKey: {
        name: 'us_skill_id',
        allowNull: false,
    },
    as: "us_skill"
})
UserSkill.belongsTo(User, {
    foreignKey: {
        name: 'us_user_id',
        allowNull: false,
    },
    as: "us_user"
})

Achievement.hasMany(UserAchievement, {
    foreignKey: {
        name: 'ua_ach_id',
        allowNull: false,
    },
    as: "ach_users"
})
User.hasMany(UserAchievement, {
    foreignKey: {
        name: 'ua_user_id',
        allowNull: false,
    },
    as: "user_achievements"
})
UserAchievement.belongsTo(Achievement, {
    foreignKey: {
        name: 'ua_ach_id',
        allowNull: false,
    },
    as: "ua_ach"
})
UserAchievement.belongsTo(User, {
    foreignKey: {
        name: 'ua_user_id',
        allowNull: false,
    },
    as: "ua_user"
})

Status.hasMany(User, {
    // foreignKey: {
    //     name: 'status_id',
    //     allowNull: false
    // }
});
User.belongsTo(Status, {
    foreignKey: {
        name: 'user_status_id',
        allowNull: false
    }
});
Region.hasMany(User, {
    foreignKey: {
        name: 'user_region',
        allowNull: false,
    },
});

User.belongsTo(Region, {
    foreignKey: {
        name: 'user_region',
        allowNull: false
    }
});
Role.hasMany(User, {
    // foreignKey: {
    //     name: 'role_id',
    //     allowNull: false
    // }
});
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

Message.hasMany(Like, {
    foreignKey: {
        name: 'like_message_id',
            allowNull: false,
    },
    as: "message_likes"
});
Like.belongsTo(Message,
    {
        foreignKey: {
            name: 'like_message_id',
            allowNull: false
        }
    }
);

User.hasMany(Connection);
Connection.belongsTo(User, {
    // as: 'message_from_id',
    foreignKey: {
        name: 'connection_from_id',
        allowNull: false
    },
    as: "user_from"
});
Connection.belongsTo(User, {
    //as: 'message_to_id',
    foreignKey: {
        name: 'connection_to_id',
        allowNull: true
    },
    as: "user_to"
})

ConStatus.hasMany(Connection);
Connection.belongsTo(ConStatus,
    {
        foreignKey: {
            name: 'connection_status',
            allowNull: false
        }
    }
);

RoomUser.addHook('beforeCreate', 'checkRoomCapacity', async (roomUser, options) => {
    const room = await Room.findByPk(roomUser.ru_room_id);
    if (!room) {
        throw new Error('Room is dead!');
    }
    if (room.room_places === 0) {
        throw new Error('The room is already full. Cannot add more members.');
    }
    room.room_places -= 1
    await room.save()
});
RoomUser.addHook('beforeUpdate', 'checkRoomCapacity', async (roomUser, options) => {
    const room = await Room.findByPk(roomUser.ru_room_id, { include: RoomUser });
    if (!room) {
        throw new Error('Room is already dead!');
    }
    // determine teams distribution
    let teams = []
    room.room_users.forEach((ru => {
        const v = (ru.ru_team ?? -1) + 1
        teams[v] = teams[v] ? teams[v] + 1 : 1
    }))
    //
    if (roomUser.ru_team && (teams[roomUser.ru_team + 1] >= room.room_max_members)) {
        throw new Error('The room team is already full. Cannot add more members.');
    }
});
RoomUser.addHook('beforeDestroy', 'checkRoomCapacity', async (roomUser, options) => {
    const room = await Room.findByPk(roomUser.ru_room_id);
    if (!room) {
        throw new Error('Room is already dead!');
    }
    //
    room.room_places += 1
    await room.save()
})

await sequelize.sync();

// const test = await User.findOne({ where: { user_name: 'Test', user_nickname: null } });
// if (test) {
//     await User.destroy({ where: { user_name: 'Test', user_nickname: null } });
// } else {
//     console.log("NOT FOUND");
// }

async function createUser(name, surname, nickname, password, role_id, status_id, region, email, score) {
    const usr = await User.findOne({ where: { user_nickname: nickname } });
    if (!usr) {
        const newUsr = await User.create({
            user_role_id: role_id,
            user_status_id: status_id,
            user_name: name,
            user_surname: surname,
            user_nickname: nickname,
            user_region: region,
            user_email: email,
            user_password_hash: crypto.createHash("sha256").update(password).digest('hex')
        });
        if (!score) return
        await Record.create({
            record_user_id: newUsr.user_id,
            record_score: score,
            record_time_elapsed: score * 700,
            record_figures_placed: Math.floor(score * 0.8),
        });
    }
}
export async function createRoom(name, owner_nickname, description, max_members, teams, password = null, id = null) {
    const usr = await User.findOne({ where: { user_nickname: owner_nickname } });
    if (usr) {
        const room = await Room.findOne({ where: { room_owner_id: usr.user_id } });
        if (!room) {
            await Room.create({
                room_id: id,
                room_owner_id: usr.user_id,
                room_name: name,
                room_description: description,
                room_max_members: max_members,
                room_teams: teams,
                room_places: max_members * teams,
                room_password_hash: password && crypto.createHash("sha256").update(password).digest('hex')
            });
        }
    }
}
async function createStatus(id, name) {
    const test = await Status.findByPk(id);
    if (test) return;
    await Status.create({
        status_id: id,
        status_name: name
    });
}
async function createRole(id, name, color) {
    const test = await Role.findByPk(id);
    if (test) return;
    await Role.create({
        role_id: id,
        role_name: name,
        role_color: color
    });
}
async function createRegion(name) {
    const test = await Region.findByPk(name);
    if (test) return;
    await Region.create({
        region_id: name
    });
}
//
await createRegion("BLR");
await createRegion("RUS");
await createRegion("UKR");
await createRegion("POL");
await createRegion("DEU");
//
//
try {
    // await sequelize.getQueryInterface().addColumn('users', 'user_email', {
    //     type: DataTypes.STRING(100),
    //     allowNull: false,
    //     defaultValue: "example@mail.com"
    // });
    await sequelize.getQueryInterface().addColumn('rooms', 'room_places', {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    });
    // await sequelize.getQueryInterface().addColumn('users', 'user_max_score', {
    //     type: DataTypes.INTEGER,
    //     allowNull: false,
    //     defaultValue: 0
    // });
} catch (e) {
    console.log(`WARNING. Failed to add column: ${e}`)
}

// REPOPULATE DB
await createStatus(1, "offline");
await createStatus(2, "on-line");
await createStatus(3, "playing");

await createRole(1, "member", "lightskyblue");
await createRole(20, "root", "orange");
await createRole(100, "server", "orange");

await createRoom('Global', '_ARCHQL_', 'room which can be joined by any player', 4, 4, null, 1);

await createUser('anonymous', 'player', '@DEFAULT', crypto.randomBytes(64).toString('hex'), 50, 1, 'XXX', 'null',  null);
await createUser('SERVER', 'ROOT', '@SYSROOT', crypto.randomBytes(64).toString('hex'), 100, 1, 'XXX', 'null',  null);
await createUser('Artsiom', 'Drankevich', '_ARCHQL_', '2212', 20, 1, 'BLR', 'emxample@mail.com', null);
await createUser('Dummy', 'Testovich', 'AAAAAAAA', '1234', 1, 1, 'BLR', 'emxample@mail.com', 6284);
await createUser('Dummy', 'Testovich', 'TETRISTE', '1234', 1, 1, 'BLR', 'emxample@mail.com', 6272);
await createUser('Dummy', 'Testovich', '_KJIOYN_', '1234', 1, 1, 'BLR', 'emxample@mail.com', 4412);
await createUser('Dummy', 'Testovich', 'GHGGHGHG', '1234', 1, 1, 'BLR', 'emxample@mail.com', 4400);
await createUser('Dummy', 'Testovich', 'PUTINLFF', '1234', 1, 1, 'BLR', 'emxample@mail.com', 3096);
await createUser('Dummy', 'Testovich', 'ELBARONO', '1234', 1, 1, 'BLR', 'emxample@mail.com', 2700);
await createUser('Dummy', 'Testovich', 'ANNASAYU', '1234', 1, 1, 'BLR', 'emxample@mail.com', 2228);
await createUser('Dummy', 'Testovich', 'WHISKEYJ', '1234', 1, 1, 'BLR', 'emxample@mail.com', 1192);
await createUser('Dummy', 'Testovich', 'GOODIKER', '1234', 1, 1, 'BLR', 'emxample@mail.com', 1112);
await createUser('Dummy', 'Testovich', 'AMONG_US', '1234', 1, 1, 'BLR', 'emxample@mail.com', 1084);
await createUser('Dummy', 'Testovich', 'KOSTAHKA', '1234', 1, 1, 'BLR', 'emxample@mail.com', 1076);
await createUser('Dummy', 'Testovich', '_CMEXOB_', '1234', 1, 1, 'BLR', 'emxample@mail.com', 968);
await createUser('Dummy', 'Testovich', 'DAMIORAD', '1234', 1, 1, 'BLR', 'emxample@mail.com', 672);
await createUser('Dummy', 'Testovich', 'FILKADFS', '1234', 1, 1, 'BLR', 'emxample@mail.com', 228);

const usr = await User.findOne({ where: { user_nickname: '_ARCHQL_' } });
if (usr) {
    const rcd = await Record.findOne({ where: { record_user_id: usr.user_id, record_score: 7336   } });
    if (!rcd) {
        await Record.create({
            record_user_id: usr.user_id,
            record_score: 7336,
            record_time_elapsed: 1438192,
            record_figures_placed: 691,
        });
    }
}

