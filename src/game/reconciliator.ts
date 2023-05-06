// shared
import {GameInput, GameState} from "./server_client_globals.ts";
import {BUFFER_SIZE, TPS} from "./server_client_globals.ts";
import type {Tetris} from "./tetris.ts";
import {STATUS_TABLE} from "./tetris.ts";

export class ClientGameSessionControl {

    socket = null;
    // were master over game
    game: Tetris = null;
    //shared
    currentTick;
    currentEvent;
    time;

    // client specific
    inputBuffer: GameInput[] = new Array(BUFFER_SIZE);
    stateBuffer: GameState[] = new Array(BUFFER_SIZE);
    lastClientProcessedState: GameState;
    lastServerProcessedState: GameState;

    constructor(game, socket) {
        this.game = game;
        this.socket = socket;
        this.time = performance.now();
        this.currentTick = 0; // TODO
        this.currentEvent = 0;
    }

    // client specific
    sync() {
        this.socket.emit('sync');
    }

    // must be linked to socket
    onServerUpdate(serverState: GameState) {
        this.lastServerProcessedState = serverState;
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
        // construct a game from server state
        this.lastServerProcessedState = serverState;
        this.currentTick = serverState.tick;
        this.time = performance.now();
        this.game.constructFromPrototype(serverState.state);
        this.game.callback(this.game.render());
    }

    #reconcile() {
        console.log("reconciliation");
        //
        this.lastClientProcessedState = this.lastServerProcessedState;
        const serverBufferIndex = this.lastServerProcessedState.tick % BUFFER_SIZE;
        // reset problematic point
        this.stateBuffer[serverBufferIndex] = this.lastServerProcessedState;
        this.game.constructFromPrototype(this.lastServerProcessedState.state);
        // simulate all ticks up to the current
        let tickToProcess = this.lastServerProcessedState.tick + 1;
        while (tickToProcess < this.currentTick) {
            const bufIndex = tickToProcess % BUFFER_SIZE;
            const input = this.inputBuffer[bufIndex];
            // check if input is valid
            if (input && input.tick === tickToProcess) {
                // reprocess input
                this.game.processEventSilent(input.input.id);
                this.stateBuffer[bufIndex] = new GameState(this.currentTick, this.game);
            }
            tickToProcess++;
        }
        // call update with latest state
        this.game.callback(this.game.render());
    }
    // Clients update
    processEvent(event: number) {
        // check if server & client are synced
        if (JSON.stringify(this.lastClientProcessedState) !==
            JSON.stringify(this.lastServerProcessedState)) // TODO deep comparison
        {
            this.#reconcile();
        }
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
        this.currentEvent++;
        // add game state to state buffer
        this.stateBuffer[bufferIndex] = new GameState(this.currentTick, this.game);
        // send input to server
        this.socket.emit('input', this.inputBuffer[bufferIndex]);
    }
}