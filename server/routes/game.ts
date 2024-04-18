import {GameInput} from "../game/server_client_globals.js";
import {ServerGameSessionControl} from "../game/reconciliator.js";
import {TPS} from "../game/server_client_globals.js";
import {Record, Room, RoomUser, sequelize, User} from "../bin/db.js";
import {io} from "../app.js";
import {RANDOM_MAX} from "../game/tetris.js";
import crypto from "crypto";
import {RoomSessionControl} from "../game/room_control";

type UserGameSessionsType = {
    [key: string]: {
        data: {
            user: {} | null,
            room: {} | null,
            ru: {} | null
        },
        game: ServerGameSessionControl,
        room: RoomSessionControl
    };
};
const userGameSessions: UserGameSessionsType = {};

type RoomReadyToStartInfoType = {
    [room_id: string]: { started: boolean, members: number[] };
};
const roomReadyToStartInfos: RoomReadyToStartInfoType = {};

const gameHandler = async (socket) => {
    //
    console.log(`Socket connected: ${socket.id}`);
    //
    const user_id = socket.request.user?.user_id;
    const error = socket.request.error;
    //
    // create a game instance
    userGameSessions[socket.id] = {
        data: {user: null, room: null, ru: null},
        game: new ServerGameSessionControl(socket, io.of('/game')),
        room: new RoomSessionControl(socket, io.of('/game'))
    }
    userGameSessions[socket.id].room.callback = startCompetition;
    //
    async function sync_data() {
        //
        let user: any = null;
        let ru: any = null;
        let room: any = null;
        // let record: any = null;
        // assign default user if need
        if (user_id) {
            user = await User.findByPk(user_id, {

            })
            // record = await Record.findOne({
            //     where: {
            //         record_user_id: user.user_id
            //     },
            //     order: sequelize.literal('record_score DESC'),
            // });
        } else {
            user = await User.findOne({
                where: {
                    user_role_id: 50
                },
            })
        }
        ru = user && await RoomUser.findOne({
            where: {
                ru_user_id: user.user_id
            },
            include: [{
                model: User,
                as: "ru_user",
                attributes: ['user_id', 'user_nickname', 'user_rank'],
            }]
        });
        room = ru && await Room.findByPk(ru.ru_room_id, {
            include: [{
                model: RoomUser,
                as: "room_users",
                include: [{
                    model: User,
                    as: "ru_user",
                    attributes: ['user_id', 'user_nickname', 'user_rank'],
                }]
            }, { model: User, as: "room_owner", attributes: ['user_id', 'user_nickname'] }],
        });
        //
        userGameSessions[socket.id].data = {user: user, room: room, ru: ru}
        // update session data
        userGameSessions[socket.id].room?.sync(user, room, ru)
    }

    await sync_data()

    // Create socket connections
    socket.on('disconnect', async () => {
        console.log('A client disconnected');
        // call on disconnect
        userGameSessions[socket.id].game?.onDisconnect();
        await userGameSessions[socket.id].room?.onDisconnect();
        // delete
        delete userGameSessions[socket.id];
    });

    socket.on('room message', (text: string) => {
        userGameSessions[socket.id]?.room.message(text)
    })

    socket.on('room random', async () => {
        const res = await userGameSessions[socket.id]?.room.join_random_room()
        console.log('room random ', res)
    })

    socket.on('room team change', async (team: number) => {
        const res = await userGameSessions[socket.id]?.room.join_team(team)
        console.log("room team change ", res)
    })

    socket.on('room leave', async () => {
        await userGameSessions[socket.id]?.room.leave()
    })

    socket.on('input', (input: GameInput) => {
        userGameSessions[socket.id].game?.onInput(input);
    })

    socket.on('game sync', async () => {
        const {user, room, ru} = userGameSessions[socket.id].data;
        userGameSessions[socket.id].game?.onSync(user, room, ru)
    })

    // room ready
    function startCompetition(room: string) {
        // get seed
        const seed = Math.floor(Math.random() * RANDOM_MAX);
        // TODO
        // userGameSessions[socket.id].game?.sync()
        // start competition
        io.of("/game").adapter.rooms.get(room).forEach((sid) => {
            // TODO
            // userGameSessions[sid].game.startCompetition(
            //     seed,
            // );
        })
    }
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
            session.game?.process();
        }
        //
        time = now
        currentTick++
    }
}