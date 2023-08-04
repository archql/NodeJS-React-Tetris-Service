import {GameInput} from "../game/server_client_globals.ts";
import {ServerGameSessionControl} from "../game/reconciliator.ts";
import {TPS} from "../game/server_client_globals.ts";
import {Record, sequelize, User} from "../bin/db.js";
import {io} from "../app.ts";
import {inputFromBuffer, leaderboardToBuffer} from "../game/tetrisAsm.ts";

type UserGameSessionsType = {
    [key: string]: ServerGameSessionControl;
};
const userGameSessions: UserGameSessionsType = {};

const gameHandler = async (socket) => {
    console.log(`Socket connected: ${socket.id}`);
    //
    const user = socket.request.user;
    const error = socket.request.error;
    // create a game instance
    userGameSessions[socket.id] = new ServerGameSessionControl(socket, io.of('/game'), null, null);
    // Create socket connections
    socket.on('disconnect', async () => {
        console.log('A client disconnected');
        userGameSessions[socket.id].onDisconnect();
        delete userGameSessions[socket.id];
    });

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
    let usr = null;
    let rcd = null;
    if (user !== null && user.user_id) {
        usr = await User.findByPk(user.user_id);
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
    userGameSessions[socket.id].onSync(usr, rcd);
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
        console.log(`real TPS = ${1 / delta}`)
        // TODO game update loop
        for (const [, session] of Object.entries(userGameSessions)) {
            session.process();
        }
        //
        time = now
        currentTick++
    }
}