import {GameInput, GameState} from "./server_client_globals.js";
import {BUFFER_SIZE, TPS} from "./server_client_globals.js";
import {Tetris} from "./tetris.js";
import {Record, RoomUser, sequelize} from "../bin/db.js";
import {QueryTypes} from "sequelize";
import {PlayerData} from "./player_data";

export class ServerGameSessionControl {
    // Database user
    data: PlayerData = null;
    game = null;
    socket;
    io;

    // competition mode does not allow pause or stop
    competition: boolean = false;
    onCompetitionViolation: (data: PlayerData) => void;
    onCompetitionEnd: (data: PlayerData, score: number) => void;

    inputQueue: GameInput[] = [];
    stateBuffer: GameState[] = new Array(BUFFER_SIZE);

    // TODO sync these
    currentTick: number;
    currentEvent: number;
    time;
    timeStarted;
    timeGameStarted;

    gameTick;
    gameTime; // time of last processed evt

    // special boolean to show if game was just resumed/paused
    justResumed: boolean = false;

    constructor(socket, io, data: PlayerData = null) { // happens on connection
        this.io = io;
        this.socket = socket;
        this.data = data;
    }

    static async getLeaderboard() {
        // TODO send leaderboard
        const topRecordsQuery = `
            SELECT u.user_nickname, r.user_max_score, u.user_id, u.user_region
            FROM users u
            INNER JOIN (
                SELECT record_user_id, MAX(record_score) as user_max_score
                FROM records
                GROUP BY record_user_id
            ) r ON u.user_id = r.record_user_id
            ORDER BY r.user_max_score DESC
            LIMIT 15;
        `;
        return await sequelize.query(topRecordsQuery, { type: QueryTypes.SELECT });
    }

    // onCompetitionViolation: (data: PlayerData) => void,
    // onCompetitionEnd: (data: PlayerData, score: number) => void
    startCompetition(seed: number)
    {
        console.log(this)
        this.game.initializeFrom(seed);
        this.game.paused = false;
        // !! set callbacks only after game restart
        this.competition = true;

        // TODO duplicated - init game
        this.time = performance.now();
        this.timeStarted = this.time;
        this.timeGameStarted = this.time;
        this.currentTick = 0; // TODO
        this.currentEvent = 0;
        this.gameTime = 0;
        this.gameTick = 0;
        // clear input
        this.inputQueue.length = 0;
        // set game state buffer
        const bufferIndex = this.currentEvent % BUFFER_SIZE;
        this.stateBuffer[bufferIndex] = new GameState(this.currentTick, this.currentEvent,
            this.time - this.timeStarted, this.game.deepCopy());
        // force sync
        this.socket.emit('game sync', this.stateBuffer[0]);
    }

    onSync(data: PlayerData) {
        console.log("on SYNC");
        //
        // this.record = null; // TODO implement records
        this.data = data
        //
        this.justResumed = false;
        // init
        this.time = performance.now();
        this.timeStarted = this.time;
        this.timeGameStarted = this.time;
        this.currentTick = 0; // TODO
        this.currentEvent = 0;
        this.gameTime = 0;
        this.gameTick = 0;
        // create brand-new game
        this.game = new Tetris(null);
        this.game.gameOverCallback = (score: number, newRecord: boolean) => this.onGameOver(score, newRecord);
        this.game.scoreUpdateCallback = (score: number, delta: number) => this.onScoreUpdate(score, delta);
        // get user nickname
        this.game.status = data?.getStatus()
        // clear input
        this.inputQueue.length = 0;
        // set game state buffer
        const bufferIndex = this.currentEvent % BUFFER_SIZE;
        this.stateBuffer[bufferIndex] = new GameState(this.currentTick, this.currentEvent,
            this.time - this.timeStarted, this.game.deepCopy());
        // send game state
        // TODO this is awful
        this.socket.emit('game sync', this.stateBuffer[bufferIndex]);
        // if (this.room) {
        //     this.io.to(this.room.room_id.toString()).emit('game update', this.stateBuffer[bufferIndex]);
        // }
    }

    onInput(input: GameInput) {
        console.log(`on input evtId=${input.input.id} evtNo=${input.event} evtTime=${input.time}`);
        //
        // filter out pause and stop events
        if (this.competition && this.onCompetitionViolation && [27, 80, 82].includes(input.input.id)) {
            // drop competition mode
            this.competition = false;
            this.onCompetitionViolation(this.data);
        }
        //
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
        // set client state to not playing
        // for now it is just destruction
    }

    onScoreUpdate(score: number, delta: number) {
        if (this.data?.ru) {
            this.data.ru.ru_last_score = score;
            console.log("onScoreUpdate")
            this.io.to(this.data?.getRoomId()).emit('game score', {
                ru_last_score: score,
                ru_user_id: this.data.ru.ru_user_id
            } );
        }
    }

    onGameOver(score: number, newRecord: boolean) {
        console.log(`GAME OVER new record? ${newRecord} score ${score}`);
        this.socket.emit('game over');
        //
        if (this.competition && this.onCompetitionEnd) {
            this.competition = false;
            this.onCompetitionEnd(this.data, score);
        }
        // TODO FIX THIS!!!
        const gameTime = this.time - this.timeGameStarted;
        this.timeGameStarted = this.time;
        // user is in the room
        (async () => {
            //
            await this.data.makeGameRecord({
                record_score: this.game.score,
                record_time_elapsed: gameTime, // TODO FIX THIS!!!
                record_figures_placed: this.game.placed,
                // TODO dump all game data
            });
            this.io.to(this.data.getRoomId()).emit('room game over', this.data?.ru);
        })();
    }

    process() {
        // game is null - so there is nothing to be processed
        if (!this.game) {
            return;
        }
        // there are no pending messages - ignore
        if (this.inputQueue.length === 0) {
            return;
        }
        console.log(`process`);
        // get current time
        this.time = performance.now();
        //
        let bufferIndex: number;
        while (this.inputQueue.length > 0) {
            const input = this.inputQueue.shift();
            bufferIndex = input.event % BUFFER_SIZE;
            //console.log(`I     ${this.time - this.timeStarted} ms`);
            //console.log(`input ${input.time} ms`);
            console.log(`processing input no ${input.event} "${input.input.id}" ${this.time - this.timeStarted - input.time} ms behind`);
            // TODO check if input is too far away
            // timer event
            //console.log(`game time ${this.gameTime} ms`)
            let gameDelta = (input.time - this.gameTime);
            console.log(`game delta ${gameDelta}`)
            //
            if (this.game.playing && !this.game.paused) {
                const gameTicksSkipped = Math.floor(gameDelta / (this.game.softDrop ?
                    (this.game.tickSpeed / 4) : this.game.tickSpeed));
                if (gameTicksSkipped > 0) {
                    // 1 or more game ticks passed since last update
                    let gameTicksToProcess = 0;
                    if (input.input.id !== 7) { // means that were already somehow skipped at least one 7 event
                        gameTicksToProcess ++;
                    } else {
                        this.gameTick++; // apply effect of 7 event id
                    }
                    if (!this.justResumed) { // means that we need to process all skipped ticks
                        gameTicksToProcess += gameTicksSkipped - 1;
                    }
                    // TODO looks like player is unfair
                    for (let i = 0; i < gameTicksToProcess; ++i) {
                        this.gameTick++;
                        this.game.processEventSilent(7);
                        console.log(`CHEATING at event no ${input.event}`);
                    }
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
        this.socket.emit('game update', this.stateBuffer[bufferIndex]);
    }

}