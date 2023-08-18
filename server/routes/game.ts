import {GameInput} from "../game/server_client_globals.ts";
import {ServerGameSessionControl} from "../game/reconciliator.ts";
import {TPS} from "../game/server_client_globals.ts";
import {Record, Room, RoomUser, sequelize, User} from "../bin/db.js";
import {io} from "../app.ts";
import {inputFromBuffer, leaderboardToBuffer} from "../game/tetrisAsm.ts";

type UserGameSessionsType = {
    [key: string]: ServerGameSessionControl;
};
const userGameSessions: UserGameSessionsType = {};

const gameHandler = async (socket) => {
    //
    console.log(`Socket connected: ${socket.id}`);
    //
    const user = socket.request.user;
    const error = socket.request.error;
    let room = null;
    let nickname = null;
    // room disconnect function
    const roomLeave = async () => {
        if (room) {
            // notify everybody
            socket.to(room).emit('room leave', user.user_id);
            // TODO get player's nickname
            if (nickname) {
                // Notify asm clients
                socket.to(room).emit('r lv', Buffer.from(nickname, 'latin1'));
            }
            io.of('/chat').emit('room leave', {
                ru_user_id: user.user_id,
                ru_room_id: parseInt(room)
            });
            // leave
            socket.leave(room);
            //
            await RoomUser.destroy({
                where: {
                    ru_user_id: user.user_id,
                    ru_room_id: parseInt(room)
                }
            });
            room = null;
        }
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

    socket.on('room leave', async () => {
        await roomLeave();
    })

    socket.on('input', (input: GameInput) => {
        userGameSessions[socket.id].onInput(input);
    })
    // TODO do we need sync on demand?
    // socket.on('sync', async () => {
    //     // request user info from DB
    //     let usr = null;
    //     let rcd = null;
    //     if (user !== null && user.user_id) {
    //         usr = await User.findByPk(user.user_id);
    //         // TODO set user status to PLAYING
    //         // if (usr !== null) {
    //         //     usr = await usr.update({user_status_id: 2});
    //         // }
    //         // find all records which correspond to user
    //         rcd = await Record.findOne({
    //             where: {
    //                 record_user_id: user.user_id
    //             },
    //             order: sequelize.literal('record_score DESC'),
    //         });
    //     } else if (error) {
    //         usr = {error: true}; // TODO
    //     }
    //     //
    //     userGameSessions[socket.id].onSync(usr, rcd);
    // });
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