import {GameInput, GameState} from "./server_client_globals.ts";
import {BUFFER_SIZE, TPS} from "./server_client_globals.ts";
import {Tetris} from "./tetris.ts";
import {STATUS_TABLE} from "./tetris.ts";
import {Record, sequelize} from "../bin/db.js";
import {DataTypes, QueryTypes} from "sequelize";

export class ServerGameSessionControl {
    // Database user
    record = null;
    user = null;
    game = null;
    socket;
    io;

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

    constructor(socket, io, user, record) { // happens on connection
        this.io = io;
        this.socket = socket;
        this.user = user;
        this.record = record;
    }

    static async getLeaderboard() {
        // TODO send leaderboard
        const topRecordsQuery = `
            SELECT u.user_nickname, r.user_max_score, u.user_id
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

    onSync(usr, rcd) {
        console.log("on SYNC");
        //
        this.user = usr;
        this.record = rcd;
        //
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
        this.game.gameOverCallback = (score: number, newRecord: boolean) => this.onGameOver(score, newRecord);
        // get user nickname
        if (this.user) {
            this.game.name = this.user.user_nickname || "@DEFAULT";
            this.game.status = "registered";
            if (this.record) {
                this.game.highScore = this.record.record_score;
            }
        } else {
            this.game.name = "@DEFAULT";
            this.game.status = "connected";
        }
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

    onGameOver(score: number, newRecord: boolean) {
        console.log(`GAME OVER new record? ${newRecord} score ${score}`);
        this.socket.emit('game over');
        if (this.user && this.user.user_nickname && newRecord) {
            (async () => {
                // create new record (TODO mk screenshot)
                const record = await Record.create({
                    record_user_id: this.user.user_id,
                    record_score: this.game.score,
                    record_time_elapsed: {
                        type: DataTypes.INTEGER,
                        allowNull: false,
                        unsigned: true
                    },
                    record_figures_placed: {
                        type: DataTypes.INTEGER,
                        allowNull: false,
                        unsigned: true
                    },
                });
                // set record
                if (record) {
                    //
                    this.record = record;
                    this.game.highScore = this.record.record_score;
                    // send update packet
                    // TODO
                    // send leaderboard update (TODO deep compare)
                    const leaderboard = await ServerGameSessionControl.getLeaderboard();
                    // console.log("leaderboard");
                    // console.log(record);
                    // console.log(leaderboard);
                    //this.socket.emit('leaderboard', leaderboard);
                    //console.log(this.io);
                    // TODO costili
                    this.socket.emit('leaderboard', leaderboard);
                    this.socket.broadcast.emit('leaderboard', leaderboard);
                }
            })();
        }
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