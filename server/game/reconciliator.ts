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
    timeStarted;

    gameTick;
    gameTime;

    // special boolean to show if game was just resumed/paused
    justResumed: boolean = false;

    constructor(socket) { // happens on connection
        this.socket = socket;
    }

    onSync() {
        this.justResumed = false;
        // init
        this.time = performance.now();
        this.timeStarted = this.time;
        this.currentTick = 0; // TODO
        this.currentEvent = 0;
        this.gameTime = 0;
        this.gameTick = 0;
        // create brand-new game
        this.game = new Tetris(null);
        // set game status to be registered
        this.game.status = "registered";
        // set game state buffer
        const bufferIndex = this.currentEvent % BUFFER_SIZE;
        this.stateBuffer[bufferIndex] = new GameState(this.currentTick, this.currentEvent,
            this.time - this.timeStarted, this.game.deepCopy());
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
        // if time >
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
        // get current time
        this.time = performance.now();
        //
        let bufferIndex;
        while (this.inputQueue.length > 0) {
            const input = this.inputQueue.shift();
            bufferIndex = input.event % BUFFER_SIZE;
            // TODO check if input is too far away
            //console.log(`I     ${this.time - this.timeStarted} ms`);
            //console.log(`input ${input.time} ms`);
            // console.log(`processing input no ${input.event} "${input.input.id}" ${this.time - this.timeStarted - input.time} ms behind`);
            // timer event
            //console.log(`game time ${this.gameTime} ms`)
            let gameDelta = (input.time - this.gameTime);
            if (this.game.playing && !this.game.paused) {
                // console.log(`passed ${gameDelta} ms from last 7 event`)
                if (gameDelta > this.game.tickSpeed) {
                    //
                    const gameTicksSkipped = Math.floor(gameDelta / this.game.tickSpeed);
                    let gameTicksToProcess = 0;
                    if (input.input.id !== 7) { // means that were already have one 7 event
                        gameTicksToProcess ++;
                    } else {
                        this.gameTick++;
                    }
                    if (!this.justResumed) { // means that we need to process all skipped ticks
                        gameTicksToProcess += gameTicksSkipped - 1;
                    }
                    //if (gameTicksToProcess !== 0) {
                        // TODO looks like player is unfair
                        for (let i = 0; i < gameTicksToProcess; ++i) {
                            this.gameTick++;
                            this.game.processEventSilent(7);
                            console.log(`CHEATING at event no ${input.event}`);
                        }
                    //}
                    //
                    this.gameTime = input.time;
                }
            }
            // handle pause
            const isPaused: boolean = this.game.paused;
            // process event DUPLICATED FROM CLIENT!
            this.game.processEventSilent(input.input.id);
            this.stateBuffer[bufferIndex] = new GameState(input.tick, input.event, input.time, this.game.deepCopy());
            //
            this.justResumed = ( isPaused || this.game.paused ) && !( isPaused && this.game.paused );
        }
        // update client
        // send the last processed state
        // console.log("send update");
        // console.log(this.stateBuffer[bufferIndex]);
        this.socket.emit('update', this.stateBuffer[bufferIndex]);
        //console.log(this.stateBuffer[bufferIndex])
    }

}