import {GameInput, GameState} from "./server_client_globals.ts";
import {BUFFER_SIZE, TPS} from "./server_client_globals.ts";
import {Tetris} from "./tetris.ts";
import {STATUS_TABLE} from "./tetris.ts";

export class ServerGameSessionControl {
    game = null;
    socket;

    inputQueue: GameInput[] = [];
    stateBuffer: GameState[] = new Array(BUFFER_SIZE);

    currentTick: number;
    time;

    constructor(socket) { // happens on connection
        this.socket = socket;
    }

    onSync() {
        // init
        this.time = performance.now();
        this.currentTick = 0; // TODO
        // create brand new game
        this.game = new Tetris(null);
        // set game status to be registered
        this.game.status = "registered";
        // set game state buffer
        const bufferIndex = this.currentTick % BUFFER_SIZE;
        this.stateBuffer[bufferIndex] = new GameState(this.currentTick, this.game);
        // send game state
        this.socket.emit('sync', this.stateBuffer[bufferIndex]);
    }

    onInput(input: GameInput) {
        this.inputQueue.push(input);
        if (this.inputQueue.length > 2048) {
            // TOO MANY PACKETS
            this.socket.disconnect("TOO MANY PACKETS");
        }
    }

    onDisconnect() {
        // TODO here I want somehow to handle client disconnection
        // for now it is just destruction
    }

    process() {
        if (!this.game) {
            // game is null - so there is nothing to be processed
            return;
        }
        // if there are no pending messages - ignore
        if (this.inputQueue.length === 0) {
            return;
        }
        let bufferIndex;
        while (this.inputQueue.length > 0) {
            const input = this.inputQueue.shift();
            bufferIndex = input.tick % BUFFER_SIZE; // TODO check if input tick is too far away
            // check if state buffer is free (DUPLICATED FROM CLIENT!)
            while (this.stateBuffer[bufferIndex] && this.stateBuffer[bufferIndex].tick >= input.tick) {
                bufferIndex = (bufferIndex + 1) % BUFFER_SIZE;
            }
            // process event DUPLICATED FROM CLIENT!
            this.game.processEventSilent(input.input.id);
            // add game state to state buffer
            this.stateBuffer[bufferIndex] = new GameState(input.tick, this.game);
        }
        // update client
        // send the last processed state
        this.socket.emit('update', this.stateBuffer[bufferIndex]);
    }

}