// shared
import {GameInput, GameState} from "./server_client_globals";
import {BUFFER_SIZE, TPS} from "./server_client_globals";
import type {Tetris} from "./tetris";
import {RenderBuffer, STATUS_TABLE} from "./tetris";
import * as process from "process";

function arrayEquals(a: any[], b: any[]) {
    return a.length === b.length &&
        a.every((val, index) => isDeepEqual(val, b[index]));
}

function isDeepEqual (object1: any, object2: any) {

    const isObjects = isObject(object1) && isObject(object2);
    const isArrays = Array.isArray(object1) && Array.isArray(object2);
    const other = !isArrays && !isObjects;
    if (other) {
        return object1 === object2;
    }
    if (isArrays) {
        return arrayEquals(object1, object2);
    }

    const objKeys1 = Object.keys(object1);
    const objKeys2 = Object.keys(object2);

    if (objKeys1.length !== objKeys2.length) return false;

    for (let key of objKeys1) {
        const value1 = object1[key];
        const value2 = object2[key];

        if(!isDeepEqual(value1, value2)) {
            return false;
        }
    }
    return true;
}

function isObject (object) {
    return object != null && typeof object === "object";
}

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
    timer: any;
    timeStarted;
    //
    globalTime;

    constructor(game, socket) {
        this.game = game;
        this.socket = socket;

        const time = performance.now();
        this.time = time
        this.gameTime = time;
        this.timeStarted = time;
        this.globalTime = time;
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

        this.globalTime = now;
        if (tickDelta > 1000 / TPS) {
            this.currentTick++;
            this.time = now;
        }
        if (this.game.playing && !this.game.paused) {
            if (gameDelta > (this.game.softDrop ?
                (this.game.tickSpeed / 4) : this.game.tickSpeed)) {
                //console.log(`reconciliation 7th event at ${gameDelta} ms from last 7 event`)
                this.gameTick++;
                this.gameTime = now;
                this.processEvent(7);
            }
        }
    }

    destroy() {
        clearInterval(this.timer);
    }

    // client specific
    sync() {
        console.log("LOG sync");
        this.socket.emit('sync');
    }

    // must be linked to socket
    onServerUpdate(serverState: GameState) {
        this.lastServerProcessedState = serverState;
        //
        console.log(`server is running ${this.currentEvent - serverState.event} events behind`);
        console.log(this.stateBuffer[this.lastServerProcessedState.event % BUFFER_SIZE]);
        console.log(this.lastServerProcessedState);
        console.log(this.game)
        // check if server & client are synced
        const clnt = this.stateBuffer[this.lastServerProcessedState.event % BUFFER_SIZE];
        const serv = this.lastServerProcessedState
        if (!isDeepEqual(clnt,serv))
        {
            this.#reconcile();
        }
    }

    onServerConnect() {
        console.log("LOG connected");
        this.game.status = "connected";
        this.game.renderCallback && this.game.renderCallback();
    }

    onServerDisconnect () {
        if (this.game.playing && this.game.score > 0) {
            this.game.status = "connLost";
        } else {
            this.game.status = "offline";
        }
        this.game.renderCallback && this.game.renderCallback();
    }

    onServerSynced(serverState: GameState) {
        // setup all variables to match server's ones
        this.lastServerProcessedState = serverState;
        this.currentTick = serverState.tick;
        // +1 means that serverState is processed
        // and added to state buffer
        this.currentEvent = serverState.event + 1;
        this.time = performance.now();
        this.gameTime = performance.now();
        this.timeStarted = performance.now();
        //
        this.#reconcile();
    }

    #reconcile() {
        console.log("RECONCILIATION");
        console.log(this.game)
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
            this.stateBuffer[bufIndex] = new GameState(input.tick, input.event, input.time, this.game.deepCopy());
            //
            eventToProcess++;
        }
        console.log(this.game)
        // call update with latest state
        this.game.renderCallback && this.game.renderCallback();
    }
    // Clients update
    processEvent(event: number) {
        // determine new tick value
        // const newTime = performance.now(); // milliseconds, floating number
        // const ticksPassed = Math.floor(newTime / TPS) - Math.floor(this.time / TPS);
        // this.currentTick += ticksPassed;
        // this.time = newTime;

        // guarantee 7th event when time from last 7th event is expired
        if (this.game.playing && !this.game.paused && event !== 7
            && ((this.globalTime - this.gameTime) >
                (this.game.softDrop ? this.game.tickSpeed / 4 : this.game.tickSpeed))) {
            console.log("RECONCILIATION FORCE 7");
            // force process 7 event and ignore next one
            this.onTimer();
        }
        // add input to input buffer
        let bufferIndex = this.currentEvent % BUFFER_SIZE;
        // add new Input event
        this.inputBuffer[bufferIndex] = new GameInput(this.currentTick, this.currentEvent,
            this.globalTime - this.timeStarted, {id: event});
        // process event
        this.game.processEvent(event);
        // add game state to state buffer
        this.stateBuffer[bufferIndex] = new GameState(this.currentTick, this.currentEvent,
            this.globalTime - this.timeStarted, this.game.deepCopy());
        // increase number of processed events
        this.currentEvent++;
        // send input to server
        this.socket.emit('input', this.inputBuffer[bufferIndex]);
    }
}