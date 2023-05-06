import {GameInput, GameState} from "./server_client_globals.ts";
import {BUFFER_SIZE, TPS} from "./server_client_globals.ts";
import {Tetris} from "./tetris.ts";
import {STATUS_TABLE} from "./tetris.ts";

export class ServerGameSessionControl {
    game = null;
    socket;

    inputQueue: GameInput[] = [];
    stateBuffer: GameState[] = new Array(BUFFER_SIZE);

    // TODO sync these
    currentTick: number;
    currentEvent: number;
    time;

    constructor(socket) { // happens on connection
        this.socket = socket;
    }

    onSync() {
        // init
        this.time = performance.now();
        this.currentTick = 0; // TODO
        this.currentEvent = 0;
        // create brand-new game
        this.game = new Tetris(null);
        // set game status to be registered
        this.game.status = "registered";
        // set game state buffer
        const bufferIndex = this.currentEvent % BUFFER_SIZE;
        this.stateBuffer[bufferIndex] = new GameState(this.currentTick, this.currentEvent, this.game.deepCopy());
        // send game state
        this.socket.emit('sync', this.stateBuffer[bufferIndex]);
    }

    onInput(input: GameInput) {
        this.inputQueue.push(input);
        // TOO MANY PACKETS
        if (this.inputQueue.length > BUFFER_SIZE) {
            this.socket.disconnect("TOO MANY PACKETS");
        }
        // if avg dt between packets is too small -- kick
        // if > 30 packets / tick -- kick
        //
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
            bufferIndex = input.event % BUFFER_SIZE; // TODO check if input tick is too far away
            // process event DUPLICATED FROM CLIENT!
            this.game.processEventSilent(input.input.id);
            this.stateBuffer[bufferIndex] = new GameState(input.tick, input.event, this.game.deepCopy());
        }
        // update client
        // send the last processed state
        // console.log("send update");
        // console.log(this.stateBuffer[bufferIndex]);
        this.socket.emit('update', this.stateBuffer[bufferIndex]);
    }

}