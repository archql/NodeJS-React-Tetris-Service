import {GameInput, GameState} from "./server_client_globals.js";
import {BUFFER_SIZE, TPS} from "./server_client_globals.js";
import {Tetris} from "./tetris.js";
import {Record, RoomUser, sequelize} from "../bin/db.js";
import {QueryTypes} from "sequelize";
import {bufferFromState, leaderboardToBuffer} from "./tetrisAsm.js";

export class ServerGameSessionControl {
    // Database user
    record = null;
    user = null;
    game = null;
    room = null;
    socket;
    io;

    // competition mode does not allow pause or stop
    competition: boolean = false;
    onCompetitionViolation: (user: any, room: any) => void;
    onCompetitionEnd: (user: any, room: any, score: number) => void;

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

    constructor(socket, io, user, record, room) { // happens on connection
        this.io = io;
        this.socket = socket;
        this.user = user;
        this.record = record;
        this.room = room;
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

    startCompetition(seed: number,
                     onCompetitionViolation: (user: any, room: any) => void,
                     onCompetitionEnd: (user: any, room: any, score: number) => void)
    {
        this.game.initializeFrom(seed);
        this.game.paused = false;
        // !! set callbacks only after game restart
        this.competition = true;
        this.onCompetitionViolation = onCompetitionViolation;
        this.onCompetitionEnd = onCompetitionEnd;
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
        //
        console.log("startCompetition b4")
        // force sync
        this.socket.emit('sync', this.stateBuffer[0]);
        if (this.room) {
            this.io.to(this.room.room_id.toString()).emit('update', this.stateBuffer[0]);
        }
        //
        console.log("startCompetition af")
    }

    onSync(usr, rcd, room) {
        console.log("on SYNC");
        //
        this.user = usr;
        this.record = rcd;
        this.room = room;
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
        // get user nickname
        if (this.user) {
            this.game.name = this.user.user_nickname || "@DEFAULT";
            if (!this.user.error) {
                this.game.status = "registered";
                if (this.record) {
                    this.game.highScore = this.record.record_score;
                }
            } else {
                this.game.status = "rejected";
            }
        } else {
            this.game.name = "@DEFAULT";
            this.game.status = "connected";
        }
        // clear input
        this.inputQueue.length = 0;
        // set game state buffer
        const bufferIndex = this.currentEvent % BUFFER_SIZE;
        this.stateBuffer[bufferIndex] = new GameState(this.currentTick, this.currentEvent,
            this.time - this.timeStarted, this.game.deepCopy());
        // send game state
        // TODO this is awful
        this.socket.emit('sync', this.stateBuffer[bufferIndex]);
        if (this.room) {
            this.io.to(this.room.room_id.toString()).emit('update', this.stateBuffer[bufferIndex]);
        }
    }

    onInput(input: GameInput) {
        console.log(`on input evtId=${input.input.id} evtNo=${input.event} evtTime=${input.time}`);
        //
        // filter out pause and stop events
        if (this.competition && this.onCompetitionViolation && [27, 80, 82].includes(input.input.id)) {
            // drop competition mode
            this.competition = false;
            this.onCompetitionViolation(this.user, this.room);
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

    onGameOver(score: number, newRecord: boolean) {
        console.log(`GAME OVER new record? ${newRecord} score ${score}`);
        this.socket.emit('game over');
        //
        if (this.competition && this.onCompetitionEnd) {
            this.competition = false;
            this.onCompetitionEnd(this.user, this.room, score);
        }
        // TODO FIX THIS!!!
        const gameTime = this.time - this.timeGameStarted;
        this.timeGameStarted = this.time;
        if (this.room) {
            // user is in the room
            (async () => {
                const ru = await RoomUser.findOne({
                    where: {
                        ru_user_id: this.user.user_id,
                        ru_room_id: parseInt(this.room)
                    }
                })
                // @ts-ignore
                ru.ru_last_score = score;
                // @ts-ignore
                if (ru.ru_max_score < score) {
                    // @ts-ignore
                    ru.ru_max_score = score;
                }
                await ru.save();
                //
                // TODO send info about score
                this.io.to(this.room).emit('room game over', ru);
            })();
        }
        if (this.user && this.user.user_nickname && newRecord) {
            (async () => {
                // create new record (TODO mk screenshot)
                const record = await Record.create({
                    record_user_id: this.user.user_id,
                    record_score: this.game.score,
                    record_time_elapsed: gameTime, // TODO FIX THIS!!!
                    record_figures_placed: this.game.placed
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
                    this.io.emit('leaderboard', leaderboard);
                }
            })();
        }
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
        let bufferIndex;
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

        // TODO this is awful
        if (this.room) {
            this.io.to(this.room).emit('update', this.stateBuffer[bufferIndex]);
        } else {
            this.socket.emit('update', this.stateBuffer[bufferIndex]);
        }

        //this.socket.emit('update', this.stateBuffer[bufferIndex]);
        // TODO
        //this.socket.emit('updX', bufferFromState(this.stateBuffer[bufferIndex]));
        //console.log(this.stateBuffer[bufferIndex])
    }

}