
export const BUFFER_SIZE = 1024;
export const TPS = 30;

export class GameInput {
    tick: number
    event: number
    input: any
    constructor(tick: number, event: number, input) {
        this.tick = tick;
        this.event = event;
        this.input = input;
    }
}

export class GameState {
    tick: number
    event: number
    state: {}

    constructor(tick, state) {
        this.tick = tick;
        this.state = state;
    }
}

// //shared
// currentTick;
// timer;
// minTimeBetweenTicks;
//
//
// // client specific
// inputBuffer = new Array(BUFFER_SIZE);
// stateBuffer = new Array(BUFFER_SIZE);
// lastClientProcessedState: GameState;
// lastServerProcessedState: GameState;
//
// // server specific
// inputQueue = [];
// stateBuffer = new Array(BUFFER_SIZE);
//
// // Servers OnTick
// onTick() {
//     if (this.inputQueue.length === 0) {
//         return;
//     }
//     while (this.inputQueue.length > 0) {
//         const input = this.inputQueue.shift();
//         const bufferIndex = input.tick % BUFFER_SIZE;
//         const gameState = new GameState(input.tick);
//         gameState.state = /*CALL GAME PROCESS ON input.input*/ null;
//         this.stateBuffer[bufferIndex] = gameState;
//     }
//     // update client
//     // send the last processed state
// }
//
// // clients on tick
// onTickk() {
//     // check if server & client are synced
//     if (lastClientProcessedState != lastServerProcessedState) // TODO deep comparison
//     {
//         this.reconcile();
//     }
//     //
//     const bufferIndex = .tick % BUFFER_SIZE;
//     this.inputBuffer[bufferIndex] = new GameInput(.tick, .input);
//     this.stateBuffer[bufferIndex] = new GameState(.tick, /*CALL GAME PROCESS ON input.input*/);
//     // send to server
// }
//
// reconcile() {
//     this.lastClientProcessedState = this.lastServerProcessedState;
//     const serverBufferIndex = this.lastServerProcessedState.tick % BUFFER_SIZE;
//     //
//     console.log("reconciliation");
//     // reset problematic point
//     this.stateBuffer[serverBufferIndex] = this.lastServerProcessedState.state;
//     // resimulate all ticks up to the current
//     let tickToProcess = this.lastServerProcessedState.tick + 1;
//     while (tickToProcess < this.currentTick) {
//         const bufIndex = tickToProcess % BUFFER_SIZE;
//         /*PROCESS THIS*/ this.inputBuffer[bufIndex];
//         this.stateBuffer[bufIndex] = /*new state*/;
//
//         tickToProcess++;
//     }
//
// }
// // Clients update
// onInput() {
//     // store input somewhere
//     timer += passedTimeFromLastOnInput;
//
//     while (timer > tickDeltaTime) {
//         timer -= dt;
//         onTickk();
//         tick++;
//     }
// }