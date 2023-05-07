//import {User} from "../bin/db.js";
import {GameInput} from "../game/server_client_globals.ts";
import {ServerGameSessionControl} from "../game/reconciliator.ts";
import {TPS} from "../game/server_client_globals.ts";
import {User} from "../bin/db.js";

type UserGameSessionsType = {
    [key: string]: ServerGameSessionControl;
};
const userGameSessions: UserGameSessionsType = {};

const gameHandler = async (socket) => {
    console.log(`Socket connected: ${socket.id}`);
    //
    const user = socket.request.user;
    //
    // request user info from DB
    let usr = user && await User.findByPk(user.user_id);
    // TODO set user status to PLAYING
    // if (usr !== null) {
    //     usr = await usr.update({user_status_id: 2});
    // }
    // create a game instance for user
    userGameSessions[socket.id] = new ServerGameSessionControl(socket, usr);
    //
    socket.on('disconnect', async () => {
        console.log('A client disconnected');
        delete userGameSessions[socket.id];
    });

    socket.on('input', (input: GameInput) => {
        userGameSessions[socket.id].onInput(input);
    })
    socket.on('sync', () => {
        userGameSessions[socket.id].onSync();
    });
}

export default gameHandler;

// game loop variables
let time = performance.now();
let currentTick = 0;

// const gameLoop = () => {
//
// }

export const launchGameLoop = () => {
    setTimeout(launchGameLoop, 1000 / TPS);
    if (userGameSessions) {
        let now = performance.now();
        let delta = (now - time) / 1000;
        //console.log(`real TPS = ${1 / delta}`)
        // TODO game update loop
        for (const [, session] of Object.entries(userGameSessions)) {
            session.process();
        }
        //
        time = now
        currentTick++
    }
}