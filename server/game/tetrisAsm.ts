import struct from "cstruct";
import {FIELD_H, FIELD_W, STATUS_TABLE, Tetris} from "./tetris.ts";
import {GameInput, GameState} from "./server_client_globals.ts";

const TetrisStruct = struct`
    uint8 nick[8];
    uint8 max_score_str[6];
    uint8 cur_score_str[6];
    int32 randomSeed;
    int32 randomPrevNumber;
    uint8 blocks_arr[${FIELD_W * FIELD_H}];
    uint16 GameCurFig;
    uint16 GameCurFigColor;
    uint16 GameCurFigRotation;
    uint16 GameCurFigNumber;

    uint16 GameNextFig;
    uint16 GameNextFigNumber[7];
    uint16 GameNextFigCtr;

    int16 GameFigX;
    int16 GameFigY;
    int16 GameFigPreviewY;
    uint16 GameTickSpeed;
    uint32 GameTicksPlayed;
    uint16 GameScore;
    uint16 GameHighScore;
    uint16 GamePlaying;
    uint16 GamePause;
    uint16 GameFigsPlaced;
    uint16 GameHeld;
    uint16 GameHeldFigNum;
    uint16 GameHeldFig;
    uint16 GameMusicOff;
    uint16 GameSoftDrop;
    
    uint16 ClientState;
`
//uint32 GameVersionInfo;
//uint32 GameVersionCode;
const InputStruct = struct`
    uint32 id;
`
const GameInputStruct = struct`
    int32 tick;
    uint32 event;
    uint32 time;
    ${InputStruct} input;
`
const GameStateStruct = struct`
    int32 tick;
    uint32 event;
    uint32 time;
    ${TetrisStruct} state;
`

const LeaderboardEntryStruct = struct`
    uint8 strPlace[3];
    uint8 nick[8];
    uint8 strScore[6];
    uint8 empty[11];
    int16 score;
    int16 place;
`
const LeaderboardStruct = struct`
    ${LeaderboardEntryStruct} lines[16];
`

//; LB LINE STRUCT = [17 bytes Info = {place str - 3}{nick - 8}{score - 6}][ empty (11) ][is cur usr? (0)][4 bytes - prio prd {score - 2}{place - 2}]

/*
    // current figure
    currentFigure: Figure;
    figPreviewY: number;
    heldFigure = null;
    nextFigures: Figure[];
    nextFigureNumber: number;
    //
    paused: boolean = false;
    playing: boolean = false;
    softDrop: boolean = false;
    held: boolean = false;
    score: number = 0;
    highScore: number = 0;
    placed: number = 0;
    tickSpeed: number = START_TICK_SPEED;

    field: number[] = new Array(FIELD_W * FIELD_H);

    callback: (buffer: RenderBuffer) => void = null;
    gameOverCallback: (score: number, newRecord: boolean) => void = null;

    status = "offline"

    random: Random = null;

    name: string = "@DEFAULT"
 */
export function inputFromBuffer(buffer: Buffer): GameInput {
    return GameInputStruct.read(buffer);
}

export function bufferFromState(state: GameState): Buffer {
    const tetris: Tetris = state.state;
    const tetrisData = {
        nick: Array.from(tetris.name).map((s) => {return s.charCodeAt(0);}),
        // DUPLICATED !!!
        cur_score_str: Array.from(`${String(tetris.score).padStart(6, ' ')}`).map((s) => {return s.charCodeAt(0);}),
        max_score_str: Array.from(`${String(tetris.highScore).padStart(6, ' ')}`).map((s) => {return s.charCodeAt(0);}),
        randomSeed: tetris.random.seed,
        randomPrevNumber: tetris.random.prev,
        blocks_arr: tetris.field,
        GameCurFig: tetris.currentFigure.value,
        GameCurFigColor: tetris.currentFigure.color,
        GameCurFigRotation: tetris.currentFigure.rotation,
        GameCurFigNumber: tetris.currentFigure.id,
        GameNextFig: tetris.nextFigures[tetris.nextFigureNumber].value,
        GameNextFigNumber: tetris.nextFigures.map(function (f) { // TODO
            return f.id
        }),
        GameNextFigCtr: tetris.nextFigureNumber,
        GameFigX: tetris.currentFigure.x,
        GameFigY: tetris.currentFigure.y,
        GameFigPreviewY: tetris.figPreviewY,
        GameTickSpeed: tetris.tickSpeed,
        GameTicksPlayed: 0, // ??
        GameScore: tetris.score,
        GameHighScore: tetris.highScore,
        GamePlaying: tetris.playing,
        GamePause: tetris.paused,
        GameFigsPlaced: tetris.placed,
        GameHeld: tetris.held,
        GameHeldFigNum: tetris.heldFigure ? tetris.heldFigure.id : 0,
        GameHeldFig: tetris.heldFigure ? tetris.heldFigure.value : 0,
        GameMusicOff: false, // ?
        GameSoftDrop: tetris.softDrop,
        ClientState: Math.max(Object.keys(STATUS_TABLE).indexOf(tetris.status), 0)
    }
    const data = {
        tick: state.tick,
        event: state.event,
        time: state.time,
        state: tetrisData
    }
    return GameStateStruct.write(data);
}

export function leaderboardToBuffer(leaderboard: any[]) {
    // TODO
    const lb = leaderboard.map((record, index) => {
        return {
            strPlace: Array.from(`#${(index + 1).toString(16).toUpperCase()}`).map((s) => {
                return s.charCodeAt(0);
            }),
            nick: Array.from(String(record.user_nickname)).map((s) => {
                return s.charCodeAt(0);
            }),
            strScore: Array.from(`${String(record.user_max_score).padStart(6, ' ')}`).map((s) => {
                return s.charCodeAt(0);
            }),
            empty: [0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0],
            score: record.user_max_score,
            place: index
        };
    });
    const desiredSize = 16 - lb.length;
    for (let i = 0; i < desiredSize; i++) {
        lb.push({
            strPlace: [0x0, 0x0, 0x0],
            nick: [0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0],
            strScore: [0x0, 0x0, 0x0, 0x0, 0x0, 0x0],
            empty: [0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0],
            score: 0,
            place: 0
        });
    }
    return LeaderboardStruct.write({lines: lb});
}


export function tetrisToBuffer(tetris:  Tetris): Buffer {
    const data = {
        nick: Array.from(tetris.name),
        // DUPLICATED !!!
        cur_score_str: Array.from(`${String(tetris.score).padStart(6, ' ')}`),
        max_score_str: Array.from(`${String(tetris.highScore).padStart(6, ' ')}`),
        randomSeed: tetris.random.seed,
        randomPrevNumber: tetris.random.prev,
        blocks_arr: tetris.field,
        GameCurFig: tetris.currentFigure.value,
        GameCurFigColor: tetris.currentFigure.color,
        GameCurFigRotation: tetris.currentFigure.rotation,
        GameCurFigNumber: tetris.currentFigure.id,
        GameNextFig: tetris.nextFigures[tetris.nextFigureNumber].value,
        GameNextFigNumber: tetris.nextFigures.map(function (f) { // TODO
            return f.id
        }),
        GameNextFigCtr: tetris.nextFigureNumber,
        GameFigX: tetris.currentFigure.x,
        GameFigY: tetris.currentFigure.y,
        GameFigPreviewY: tetris.figPreviewY,
        GameTickSpeed: tetris.tickSpeed,
        GameTicksPlayed: 0, // ??
        GameScore: tetris.score,
        GameHighScore: tetris.highScore,
        GamePlaying: tetris.playing,
        GamePause: tetris.paused,
        GameFigsPlaced: tetris.placed,
        GameHeld: tetris.held,
        GameHeldFigNum: tetris.heldFigure ? tetris.heldFigure.id : 0,
        GameHeldFig: tetris.heldFigure ? tetris.heldFigure.value : 0,
        GameMusicOff: false, // ?
        GameSoftDrop: tetris.softDrop,
    }
    return TetrisStruct.write(data);
}