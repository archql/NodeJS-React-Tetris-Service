import {GameInput} from "../game/server_client_globals.js";
import {ServerGameSessionControl} from "../game/reconciliator.js";
import {TPS} from "../game/server_client_globals.js";
import {Record, Room, RoomUser, sequelize, User} from "../bin/db.js";
import {io} from "../app.js";
import {bufferFromMessage, inputFromBuffer, leaderboardToBuffer} from "../game/tetrisAsm.js";
import {RANDOM_MAX} from "../game/tetris.js";

type UserGameSessionsType = {
    [key: string]: ServerGameSessionControl;
};
const userGameSessions: UserGameSessionsType = {};

type RoomReadyToStartInfoType = {
    [room_id: string]: { started: boolean, members: number[]};
};
const roomReadyToStartInfos: RoomReadyToStartInfoType = {};

const gameHandler = async (socket) => {
    //
    console.log(`Socket connected: ${socket.id}`);
    //
    const user = socket.request.user;
    const error = socket.request.error;
    let room: string = null;
    let nickname: string = null;
    // room disconnect function
    async function roomLeave () {
        console.log(`ROOM LEAVE ${nickname} ${room}`)
        if (room) {
            // immediately set room to null (async)
            const temp = room;
            room = null;
            // notify everybody
            socket.to(temp).emit('room leave', user.user_id);
            if (nickname) {
                // Notify asm clients
                socket.to(temp).emit('r lv', Buffer.from(nickname, 'latin1'));
            }
            io.of('/chat').emit('room leave', {
                ru_user_id: user.user_id,
                ru_room_id: parseInt(temp)
            });
            // TODO
            const msg = {
                text:  `${nickname} left the room`,
                nickname: "@SERVER "
            };
            io.of('/game').to(temp).emit('room message', msg);
            io.of('/game').to(temp).emit('r ms', bufferFromMessage(msg));
            // reset competition if it has one
            if (roomReadyToStartInfos[temp]) {
                const index = roomReadyToStartInfos[temp].members.indexOf(user.user_id);
                if (index !== -1) {
                    roomReadyToStartInfos[temp].members.splice(index, 1);
                    userGameSessions[socket.id].competition = false;
                    io.of('/game').to(temp).emit('room ready', {
                        user_id: user.user_id,
                        state: ''
                    });
                    // check if we're ready to start
                    competitionReadyCheck(temp)
                }
            }
            // leave
            socket.leave(temp);
            //
            await RoomUser.destroy({
                where: {
                    ru_user_id: user.user_id,
                    ru_room_id: parseInt(temp)
                }
            });
            console.log(`ROOM LEAVE 2 ${nickname} ${temp}`)
        }
    }
    function competitionReadyCheck (room: string) {
        console.log(`competitionReadyCheck ${nickname}`)
        if (roomReadyToStartInfos[room].members.length
            === io.of("/game").adapter.rooms.get(room)?.size) {
            // notify everybody
            io.of("/game").to(room).emit('room ready', {
                user_id: null, // for all
                state: 'playing'
            })
            // get seed
            const seed = Math.floor(Math.random() * RANDOM_MAX);
            // start competition
            io.of("/game").adapter.rooms.get(room).forEach((sid) => {
                userGameSessions[sid].startCompetition(
                    seed,
                    onCompetitionViolation,
                    onCompetitionEnd,
                );
            })
            // TODO notify
            const msg = {
                text:  `competition started!`,
                nickname: "@SERVER "
            };
            io.of('/game').to(room).emit('room message', msg);
            io.of('/game').to(room).emit('r ms', bufferFromMessage(msg));
        }
    }
    // local user needed just because we use these functions from one player's instance
    function onCompetitionViolation (user: any, room: string)  {
        console.log(`onCompetitionViolation ${user.user_nickname}`)
        const index = roomReadyToStartInfos[room].members.indexOf(user.user_id);
        if (index !== -1) {
            roomReadyToStartInfos[room].members.splice(index, 1);
        }
        io.of('/game').to(room).emit('room ready', {
            user_id: user.user_id,
            state: 'violation'
        });
        // TODO notify
        const msg = {
            text:  `${user.user_nickname} violated rule`,
            nickname: "@SERVER "
        };
        io.of('/game').to(room).emit('room message', msg);
        io.of('/game').to(room).emit('r ms', bufferFromMessage(msg));
    }
    function onCompetitionEnd (user: any, room: string, score: number)  {
        console.log(`onCompetitionEnd ${user.user_nickname}`)
        const index = roomReadyToStartInfos[room].members.indexOf(user.user_id);
        if (index !== -1) {
            roomReadyToStartInfos[room].members.splice(index, 1);
        }
        io.of('/game').to(room).emit('room ready', {
            user_id: user.user_id,
            state: 'end',
            score: score
        });
        // TODO notify
        const msg = {
            text:  `${user.user_nickname} scored ${score}!`,
            nickname: "@SERVER "
        };
        io.of('/game').to(room).emit('room message', msg);
        io.of('/game').to(room).emit('r ms', bufferFromMessage(msg));
    }
    // create a game instance
    userGameSessions[socket.id] = new ServerGameSessionControl(socket, io.of('/game'), null, null);
    // Create socket connections
    socket.on('disconnect', async () => {
        console.log('A client disconnected');
        // notify users in the room
        await roomLeave();
        userGameSessions[socket.id].onDisconnect();
        delete userGameSessions[socket.id];
    });

    socket.on('r rd', () => {
        onRoomReady();
    })
    socket.on('room ready', () => {
        onRoomReady();
    })

    socket.on('r ms', (textBuffer: Buffer) => {
        if (room) {
            const msg = {
                text:  textBuffer.toString(),
                nickname: nickname
            };
            io.of('/game').to(room).emit('room message', msg);
            io.of('/game').to(room).emit('r ms', bufferFromMessage(msg));
        }
    })
    socket.on('room message', (text: string) => {
        //
        console.log(`ROOM MESSAGE is ${text} from ${nickname}`)
        if (room) {
            const msg = {
                text:  text,
                nickname: nickname
            };
            io.of('/game').to(room).emit('room message', msg);
            io.of('/game').to(room).emit('r ms', bufferFromMessage(msg));
        }
    })

    const onRoomReady = () => {
        //
        console.log(`ON ROOM READY ${nickname}`)
        //
        if (room) {
            if (!roomReadyToStartInfos[room]) {
                roomReadyToStartInfos[room] = { started: false, members: []};
            }
            const index = roomReadyToStartInfos[room].members.indexOf(user.user_id);
            if (index === -1) {
                // does not contain - add
                roomReadyToStartInfos[room].members.push(user.user_id);
                // notify all users
                io.of('/game').to(room).emit('room ready', {
                    user_id: user.user_id,
                    state: 'ready'
                });
            } else {
                // if already contains - drop
                roomReadyToStartInfos[room].members.splice(index, 1);
                // drop competition mode
                userGameSessions[socket.id].competition = false;
                // notify all users
                io.of('/game').to(room).emit('room ready', {
                    user_id: user.user_id,
                    state: ''
                });
            }
            // check if we're fully ready to start competition
            competitionReadyCheck(room);
        }
    }

    socket.on('room leave', async () => {
        await roomLeave();
    })

    socket.on('input', (input: GameInput) => {
        userGameSessions[socket.id].onInput(input);
    })
    // TODO do we need sync on demand?
    socket.on('leaderboard', async () => {
        const leaderboardData = await ServerGameSessionControl.getLeaderboard();
        socket.emit('leaderboard', leaderboardData);
    });
    // ASM listener
    socket.on('inpX', (inputBuf: Buffer)=> {
        const input = inputFromBuffer(inputBuf);
        userGameSessions[socket.id].onInput(input);
    });
    //
    // send leaderboard
    const leaderboardData = await ServerGameSessionControl.getLeaderboard();
    socket.emit('leaderboard', leaderboardData);
    socket.emit('lbXX', leaderboardToBuffer(leaderboardData));

    // TODO test!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
    // TODO include records INSIDE
    let usr = null;
    let rcd = null;
    if (user !== null && user.user_id) {
        // TODO awful query
        usr = await User.findByPk(user.user_id, {
            include: [{
                model: RoomUser,
                as: "user_rooms",
                //limit: 1, // extract only one room of the user (TODO here a bug lies)
                include: [{
                    model: Room,
                    attributes: ['room_id', 'room_name', 'room_max_members', 'room_description', 'room_owner_id'],
                    as: "ru_room",
                    include: [{
                        model: RoomUser,
                        as: "room_users",
                        include: [{
                            model: User,
                            attributes: ['user_id', 'user_nickname'],
                            as: "ru_user",
                        }]
                    }/*, { model: User, as: "room_owner", attributes: ['user_id', 'user_nickname'] }*/],
                }]
            }]
        });
        // check if user has a room
        if (usr.user_rooms && usr.user_rooms.length) {
            // send info about joined room
            nickname = usr.user_nickname;
            room = usr.user_rooms[0].ru_room_id.toString();
            //
            socket.join(room);
            socket.emit('room self', usr.user_rooms[0].ru_user_id);
            io.of('game').to(room).emit('room join', usr.user_rooms[0].ru_room)
            // TODO
            const msg = {
                text:  `${nickname} join the room`,
                nickname: "@SERVER "
            };
            io.of('/game').to(room).emit('room message', msg);
            io.of('/game').to(room).emit('r ms', bufferFromMessage(msg));
        }
        // TODO set user status to PLAYING
        // if (usr !== null) {
        //     usr = await usr.update({user_status_id: 2});
        // }
        // find all records which correspond to user
        rcd = await Record.findOne({
            where: {
                record_user_id: user.user_id
            },
            order: sequelize.literal('record_score DESC'),
        });
    } else if (error) {
        usr = {error: true}; // TODO
    }
    //
    userGameSessions[socket.id].onSync(usr, rcd, room);
}

export default gameHandler;

// game loop variables
let time = performance.now();
let currentTick = 0;

export const launchGameLoop = () => {
    setTimeout(launchGameLoop, 1000 / TPS);
    if (userGameSessions) {
        let now = performance.now();
        let delta = (now - time) / 1000;
        // console.log(`real TPS = ${1 / delta}`)
        // TODO game update loop
        for (const [, session] of Object.entries(userGameSessions)) {
            session.process();
        }
        //
        time = now
        currentTick++
    }
}