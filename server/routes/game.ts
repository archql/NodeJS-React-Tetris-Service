import {GameInput} from "../game/server_client_globals.js";
import {ServerGameSessionControl} from "../game/reconciliator.js";
import {TPS} from "../game/server_client_globals.js";
import {createRoom, Record, Room, RoomUser, sequelize, User} from "../bin/db.js";
import {io} from "../app.js";
import {RANDOM_MAX} from "../game/tetris.js";
import crypto from "crypto";
import {RoomSessionControl} from "../game/room_control";
import {Op} from "sequelize";
import {PlayerData} from "../game/player_data";

type UserGameSessionsType = {
    [key: string]: {
        data: PlayerData,
        game: ServerGameSessionControl,
        room: RoomSessionControl,
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
        data: new PlayerData(),
        game: new ServerGameSessionControl(socket, io.of('/game')),
        room: new RoomSessionControl(socket, io.of('/game'))
    }
    userGameSessions[socket.id].room.callback = startCompetition;
    //
    async function sync_data() {
        //
        const data = await userGameSessions[socket.id].data.queryData(user_id);
        // update session data
        userGameSessions[socket.id].room?.sync(data)
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
        console.log(`REQUEST game sync from ${socket.id}`)
        const data = userGameSessions[socket.id].data;
        await data.reload()
        userGameSessions[socket.id].game?.onSync(data)
    })

    // room ready
    function startCompetition(room: string) {
        // get seed
        const seed = Math.floor(Math.random() * RANDOM_MAX);
        // start competition
        io.of("/game").adapter.rooms.get(room).forEach(async (sid) => {
            // TODO
            console.log(`IN ROOM ${room} ${sid} ${seed}`)
            const data = userGameSessions[sid].data;
            await data.reload()
            userGameSessions[sid].game?.onSync(data, seed)
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