// shared
import {GameInput, GameState} from "./server_client_globals.ts";
import {BUFFER_SIZE, TPS} from "./server_client_globals.ts";
import type {Tetris} from "./tetris.ts";
import {STATUS_TABLE} from "./tetris.ts";
import * as process from "process";

function isDeepEqual (object1, object2) {

    const objKeys1 = Object.keys(object1);
    const objKeys2 = Object.keys(object2);

    if (objKeys1.length !== objKeys2.length) return false;

    for (let key of objKeys1) {
        const value1 = object1[key];
        const value2 = object2[key];

        const isObjects = isObject(value1) && isObject(value2);

        if ((isObjects && !isDeepEqual(value1, value2)) ||
            (!isObjects && value1 !== value2)
        ) {
            return false;
        }
    }
    return true;
}

const isObject = (object) => {
    return object != null && typeof object === "object";
};

export class ClientGameSessionControl {

    socket = null;
    // were master over game
    game: Tetris = null;
    //shared
    currentTick;
    currentEvent;
    time;
    //
    gameTick;
    gameTime;

    // client specific
    inputBuffer: GameInput[] = new Array(BUFFER_SIZE);
    stateBuffer: GameState[] = new Array(BUFFER_SIZE);
    lastProcessedState: GameState;
    lastServerProcessedState: GameState;

    //
    timer: NodeJS.Timer;

    constructor(game, socket) {
        this.game = game;
        this.socket = socket;
        this.time = performance.now();
        this.gameTime = performance.now();
        this.currentTick = 0; // TODO
        this.currentEvent = 0;
        this.gameTick = 0;
        this.timer = setInterval(this.onTimer, 0);
    }

    // on timer
    onTimer = () => {
        const now = performance.now();
        const tickDelta = (now - this.time);
        const gameDelta = (now - this.gameTime);

        if (tickDelta > 1000 / TPS) {
            this.currentTick++;
            this.time = now;
        }
        if (this.game.playing && !this.game.paused) {
            if (gameDelta > this.game.tickSpeed) {
                this.gameTick++;
                this.processEvent(7);
                this.gameTime = now;
            }
        }
    }

    destroy() {
        clearInterval(this.timer);
    }

    // client specific
    sync() {
        this.socket.emit('sync');
    }

    // must be linked to socket
    onServerUpdate(serverState: GameState) {
        this.lastServerProcessedState = serverState;
        //
        console.log(`server is running ${this.currentEvent - serverState.event} events behind`);

        // check if server & client are synced
        if (isDeepEqual(this.stateBuffer[this.lastServerProcessedState.event % BUFFER_SIZE],
            this.lastServerProcessedState)) // TODO deep comparison
        {
            this.#reconcile();
        }
        else
        {
            console.log("NO reconciliation");
        }
    }

    onServerConnect() {
        this.game.status = "connected";
        this.game.callback(this.game.render());
    }

    onServerDisconnect () {
        if (this.game.playing) {
            this.game.status = "connLost";
        } else {
            this.game.status = "offline";
        }
        this.game.callback(this.game.render());
    }

    onServerSynced(serverState: GameState) {
        // setup all variables to match server's ones
        this.lastServerProcessedState = serverState;
        this.currentTick = serverState.tick;
        // +1 means that serverState is processed
        // and added to state buffer
        this.currentEvent = serverState.event + 1;
        this.time = performance.now();
        //
        this.#reconcile();
    }

    #reconcile() {
        console.log("RECONCILIATION");
        //
        this.lastProcessedState = this.lastServerProcessedState;
        const serverBufferIndex = this.lastServerProcessedState.event % BUFFER_SIZE;
        // reset problematic point
        this.stateBuffer[serverBufferIndex] = this.lastServerProcessedState;
        this.game.constructFromPrototype(this.lastServerProcessedState.state);
        // simulate all ticks up to the current
        let eventToProcess = this.lastServerProcessedState.event + 1;
        while (eventToProcess < this.currentEvent) {
            const bufIndex = eventToProcess % BUFFER_SIZE;
            const input = this.inputBuffer[bufIndex];
            // reprocess input
            this.game.processEventSilent(input.input.id);
            this.stateBuffer[bufIndex] = new GameState(input.tick, input.event, this.game.deepCopy());
            //
            eventToProcess++;
        }
        // call update with latest state
        this.game.callback(this.game.render());
    }
    // Clients update
    processEvent(event: number) {
        // determine new tick value
        const newTime = performance.now(); // milliseconds, floating number
        const ticksPassed = Math.floor(newTime / TPS) - Math.floor(this.time / TPS);
        this.currentTick += ticksPassed;
        this.time = newTime;
        // add input to input buffer
        let bufferIndex = this.currentEvent % BUFFER_SIZE;
        // add new Input event
        this.inputBuffer[bufferIndex] = new GameInput(this.currentTick, this.currentEvent, {id: event});
        // process event
        this.game.processEvent(event);
        // add game state to state buffer
        this.stateBuffer[bufferIndex] = new GameState(this.currentTick, this.currentEvent, this.game.deepCopy());
        // increase number of processed events
        this.currentEvent++;
        // send input to server
        this.socket.emit('input', this.inputBuffer[bufferIndex]);
    }
}