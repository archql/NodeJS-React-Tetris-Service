import {Tetris} from "./tetris.js";

export const BUFFER_SIZE = 1024;
export const TPS = 30;

export class GameInput {
    // defines the tick when input was received (based on the TPS value)
    tick: number
    // defines the absolute number of the input in queue of inputs starting from the very
    // first one
    event: number
    // defines the time in ms since the game started
    time: number
    input: any
    constructor(tick: number, event: number, time: number, input) {
        this.tick = tick;
        this.event = event;
        this.time = time;
        this.input = input;
    }
}

export class GameState {
    // defines the tick when corresponding input was received (based on the TPS value)
    tick: number
    // defines the absolute number of the input in queue of inputs starting from the very
    // first one
    event: number
    time: number
    // defines the game state which were produced by the input
    state: Tetris

    constructor(tick: number, event: number, time: number, state) {
        this.tick = tick;
        this.event = event;
        this.time = time;
        this.state = state; // create a copy of passed state
    }
}