// EXACT THE SAME CODE AS ON THE CLIENT

export const RANDOM_MAX = 0x7FFFFFFF;
export class Random {

    seed: number;
    prev: number;

    constructor(seed: number, prev: number = undefined) {
        console.log("TETRIS random construct")
        this.seed = seed;
        this.prev = prev ? prev : seed;
    }

    nextRandInt(from: number, to: number) : number {
        //; pseudo random generator (A*x + B) mod N
        let x = this.prev;
        x = (29 * x + 47) & RANDOM_MAX;
        this.prev = x;

        const res = x % (to - from + 1) + from;
        return Number(res);
        // from = Math.ceil(from);
        // to = Math.floor(to);
        // return Math.floor(Math.random() * (to - from + 1) + from); // The maximum is inclusive and the
    }

}

export const FIELD_W = 12;
export const FIELD_H = 23;
export const RECT_MODIFIER = 0.95;

const SPEED_MUL = 0.90;

const INC_EVERY_FIGS = 15; // 2^N-1

const TOP_LINE = 0;

const FIG_START_Y = -1;

const START_TICK_SPEED = 800;

export const COLOR_TABLE = [
    [1-0.071, 1-0.071, 1-0.071],
    [1-0.271, 1-0.271, 1-0.271],
    [1-0.1, 1-0.1, 1-0.1      ],
    [1.0, 1.0, 1.0      ],
    [1.0, 0.5098, 0.0   ], // 4
    [0.0, 0.0, 1.0      ],
    [0.2549, 0.0, 1.0   ],
    [0.5098, 0.0, 1.0   ],
    [0.745, 0.0, 1.0    ],
    [1.0, 0.0, 0.745    ],
    [1.0, 0.0, 0.5098   ],
    [1.0, 0.0, 0.2549   ],
    [1.0, 0.0, 0.0      ],
    [1.0, 0.2549, 0.0   ],
    [1.0, 0.745, 0.0    ],
    [1.0, 1.0, 0.0      ],
    [0.745, 1.0, 0.0    ],
    [0.5098, 1.0, 0.0   ],
    [0.2549, 1.0, 0.0   ],
    [0.0, 1.0, 0.2549   ],
    [0.0, 1.0, 0.5098   ],
    [0.0, 1.0, 0.745    ],
    [0.0, 1.0, 1.0      ],
    [0.0, 0.745, 1.0    ],
    [0.0, 0.5098, 1.0   ],
    [0.0, 0.2549, 1.0   ]
];

export function mergeColors(col1: number, col2: number) {
    if (col1 === 0) return col2;
    if (col2 === 0) return col1;
    if (col1 === 3 || col2 === 3) return 3
    return Math.floor(((col1 - 4) + (col2 - 4)) / 2) + 4
}

export const STATUS_TABLE = Object.freeze({
    offline:               '@OFFLINE',
    connected:             '@ON-LINE',
    registered:            '@REGSTRD',
    rejected:              '@REJCTED',
    keyFail:               '@UUIDERR',
    connLost:              '@CNCLOST',
});

export const FigureType = Object.freeze({
    none: '',
    tnt: 'tnt',
    ghost: 'ghost',
    liquid: 'liquid',
    sand: 'sand',
    border: 'border',
    at(id: number) {
        if (id === null || id === undefined) return id
        return FigureType[Object.keys(FigureType)[id]];
    },
    from(item: string) {
        return Object.keys(FigureType).indexOf(item)
    }
});
export const FigureTypeLength = Object.keys(FigureType).length - 3;
export const FigureGhostId = FigureType.from('ghost')

type BlockType = {
    color: number,
    type: number | undefined,
    score: number
};

type EffectType = {
    type: number,
    score: number,
    color: number,
    delay: number,
}

export class Figure {
    // defines fig number
    id: number;
    // defines rotation 0..3
    rotation: number;
    // defines x pos
    x: number;
    // defines y pos;
    y: number;
    // defines color
    color: number;
    value: number;
    //
    type: number;
    // defines amount of score per block
    score: number;

    constructor(id: number, prototype: any = undefined) {
        if (prototype instanceof Random) {
            this.id = id;
            this.toDefaultPos();
            this.#generateColor(prototype);
            this.#generateType(prototype);
            this.#generateScore(prototype);
        } else if (prototype) {
            Object.assign(this, prototype);
        } else {
            this.id = id;
            this.toDefaultPos();
            this.#generateColor(new Random(0));
        }
    }

    toDefaultPos() {
        this.rotation = 0;
        this.y = FIG_START_Y;
        this.x = FIELD_W/2 - 2; //nextRandInt(1, FIELD_W - 1);
        this.from();
    }

    from(id: number = undefined, rotation: number = undefined) {
        this.value = Figure.figArr[id || this.id][rotation || this.rotation];
    }

    #generateType(random: Random) {
        // TODO
        this.type = random.nextRandInt(0, FigureTypeLength - 1);
        // this.type = FigureType.from('ghost')
    }

    #generateScore(random: Random) {
        // TODO
        this.score = 1
    }

    #generateColor(random: Random) {
        this.color = random.nextRandInt(4, COLOR_TABLE.length - 4);
    }

    rotate(diff) {
        this.rotation = (this.rotation + diff + 4) & 3;
        this.from();
    }

    static figArr = [
        [0b0110_0110_0000_0000, 0b0110_0110_0000_0000, 0b0110_0110_0000_0000, 0b0110_0110_0000_0000], // O
        [0b0000_1111_0000_0000, 0b0010_0010_0010_0010, 0b0000_0000_1111_0000, 0b0100_0100_0100_0100], // I
        [0b1000_1110_0000_0000, 0b0110_0100_0100_0000, 0b0000_1110_0010_0000, 0b0100_0100_1100_0000], // J
        [0b0010_1110_0000_0000, 0b0100_0100_0110_0000, 0b0000_1110_1000_0000, 0b1100_0100_0100_0000], // L
        [0b0110_1100_0000_0000, 0b0100_0110_0010_0000, 0b0000_0110_1100_0000, 0b1000_1100_0100_0000], // S
        [0b1100_0110_0000_0000, 0b0010_0110_0100_0000, 0b0000_1100_0110_0000, 0b0100_1100_1000_0000], // Z
        [0b0100_1110_0000_0000, 0b0100_0110_0100_0000, 0b0000_1110_0100_0000, 0b0100_1100_0100_0000]  // T
    ]
    static figCount = Figure.figArr.length;

    static genSequence(random: Random) {
        const figCount = Figure.figCount;
        const sequence = [];
        for (let i = 0; i < figCount; i++) {
            sequence.push(new Figure(i, random));
        }
        // shuffle array
        for (let i = figCount - 1; i > 0; i--) {
            const j = random.nextRandInt(0, i);
            [sequence[i], sequence[j]] = [sequence[j], sequence[i]];
        }
        return sequence;
    }
}

export class Tetris {
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
    //
    timePlayed: number;

    field: readonly BlockType[] = Array.from({ length: FIELD_W * FIELD_H }, () => ({
        type: 0,
        color: 0,
        score: 0
    }));

    effects: readonly EffectType[] = Array.from({ length: FIELD_W * FIELD_H }, () => ({
        type: 0,
        score: 0,
        color: 0,
        delay: 0
    }));

    // render callback
    renderCallback: () => void = null;
    gameOverCallback: (score: number, newRecord: boolean) => void = null;
    scoreUpdateCallback: (score: number, delta: number) => void = null;

    status = "offline"

    random: Random = null;

    name: string = "@DEFAULT"

    deepCopy() {
        const clone = JSON.parse(JSON.stringify(this));
        // clear callbacks (they are different)
        clone.renderCallback = null;
        clone.gameOverCallback = null;
        clone.scoreUpdateCallback = null;
        clone.effects = null;
        return clone;
    }

    initializeFrom(seed: number) {
        //this.#endGame(); TODO mk it silent or ???
        this.#initialize(seed);
    }

    constructor(/*renderCallback: (buffer: RenderBuffer) => void,*/ prototype = undefined){
        if (prototype) {
            this.constructFromPrototype(prototype);
        } else {
            this.#initialize();
        }
        // this.callback = renderCallback;
    }
    constructFromPrototype(prototype) {
        // console.log("AAA constructFromPrototype")
        // preserve callbacks functions
        const callback = this.renderCallback;
        const gameOverCallback = this.gameOverCallback;
        const scoreUpdateCallback = this.scoreUpdateCallback;
        const effects = this.effects;
        //
        Object.assign(this, prototype);
        // convert figures to objects too
        this.currentFigure = this.currentFigure && new Figure(undefined, this.currentFigure);
        this.heldFigure = this.heldFigure && new Figure(undefined, this.heldFigure);
        for (let i = 0; i < this.nextFigures.length; ++i) {
            this.nextFigures[i] = this.nextFigures[i] && new Figure(undefined, this.nextFigures[i]);
        }
        // setup random
        // console.log("TETRIS construct from prototype")
        this.random = new Random(this.random.seed, this.random.prev);
        // setup callbacks back
        this.renderCallback = callback;
        this.gameOverCallback = gameOverCallback;
        this.scoreUpdateCallback = scoreUpdateCallback;
        this.effects = effects;
        // safesty check for effects
        if (this.effects[0] === undefined) {
            this.#initEffects()
        }
    }

    //############### KEY EVENT ############
    // - processes a key code, stored in key
    // - then calls render
    // - Special control codes:
    //   - Game update               - 7 (undefined in VK table)
    //   - Ignore downward collision - 0 (only for actual figure, not preview)
    //   - Shift key up              - 15 (undefined in VK table)
    processEvent(key: number) {
        this.processEventSilent(key);
        this.renderCallback && this.renderCallback();
    }

    //############### KEY EVENT ############
    // - processes a key code, stored in key
    // - Special control codes:
    //   - Game update               - 7
    //   - Ignore downward collision - 0 (only for actual figure, not preview)
    processEventSilent(key: number) {
        // console.log(`TETRIS processEventSilent ${key}`)
        if (key === 27) { // ESC
            this.#endGame();
            this.paused = false;
            return;
        }
        if (key === 82) { // 'R'
            this.#endGame();
            this.#initialize();
            return;
        }
        if (this.playing === false)
            return;
        if (key === 80) { // 'P'
            this.paused = !this.paused;
            return;
        }
        if (key === 15) { // shift up
            this.softDrop = false;
            return;
        }
        if (this.paused === true)
            return;
        if (key === 16) {// shift
            this.softDrop = true;
            return;
        }
        if (!this.held && key === 72) // 'H', buffer used
        {
            this.held = true;
            [this.currentFigure, this.heldFigure] = [this.heldFigure, this.currentFigure];
            if (!this.currentFigure) {
                this.#nextFigure();
            } else {
                this.currentFigure.toDefaultPos();
            }
        }
        // store data b4 changes
        let fig = this.currentFigure;
        const xPos = fig.x;
        const rot = fig.rotation;
        switch (key) {
            case 38: // ^
                fig.rotate(-1);
                break;
            case 40: // v
                fig.rotate(+1);
                break;
            case 37: // <
                fig.x--;
                break;
            case 39: // >
                fig.x++;
                break;
        }
        if (this.#collideFigure(fig)) {
            // restore changes
            fig.rotation = rot;
            fig.rotate(0); // apply rotation
            fig.x = xPos;
        }
        if (key === 7) { // update event
            this.timePlayed += this.tickSpeed;
            fig.y++;
            this.#processFieldEffects();
        }
        // save old Y
        let yPos = fig.y;
        // go down loop
        if (!(this.softDrop && fig.type === FigureGhostId)) {
            while (!this.#collideFigure(fig)) {
                fig.y++;
            }
            fig.y--;
        } else if (this.#collideFigure(fig)) {
            fig.y--;
        }
        // collided
        if (this.softDrop && key === 7) {
            this.score += 1;
            this.scoreUpdateCallback && this.scoreUpdateCallback(this.score, 1)
        }
        if (key === 32 && fig.y !== yPos) {
            const benefit = (fig.y - yPos) * 2
            this.score += benefit;
            this.scoreUpdateCallback && this.scoreUpdateCallback(this.score, benefit)
        }
        if (key !== 0 && (key === 32 || fig.y < yPos)) // collision hard
        {
            this.#placeFigure(fig);
            if (this.#checkOnEnd()){
                this.#endGame();
            } else {
                this.held = false;
                this.placed++;
                this.#checkOnLine();
                this.#nextFigure();

                if ((this.placed & INC_EVERY_FIGS) === 0) {
                    this.tickSpeed *= SPEED_MUL;
                }
            }
        } else {
            [yPos, fig.y] = [fig.y, yPos];
            this.figPreviewY = yPos;
        }
    }

    #nextFigure() {
        this.currentFigure = new Figure(undefined, this.nextFigures[this.nextFigureNumber]);
        this.nextFigureNumber++;
        if (this.nextFigureNumber >= Figure.figCount) {
            this.nextFigureNumber = 0;
            this.nextFigures = Figure.genSequence(this.random);
        }
        this.processEventSilent(0);
    }

    #initField() {
        for (let i = 0; i < FIELD_H - 1; ++i) {
            let posY = i * FIELD_W;
            const lastPosY = posY + FIELD_W - 1;
            Object.assign(this.field[posY], {color: 1, type: FigureType.from('border'), score: 0});
            Object.assign(this.field[lastPosY], {color: 1, type: FigureType.from('border'), score: 0});
            for (let j = posY + 1; j < lastPosY; ++j) {
                Object.assign(this.field[j], {color: 0, type: 0, score: 0});
            }
        }
        for (let j = (FIELD_H - 1) * FIELD_W; j < FIELD_H * FIELD_W; ++j) {
            Object.assign(this.field[j], {color: 1, type: FigureType.from('border'), score: 0});
        }
    }

    #initEffects () {
        console.log("AAAA #initEffects")
        for (let i = 0; i < FIELD_H; ++i) {
            let posY = i * FIELD_W;
            for (let j = 0; j < FIELD_W / 3; ++j) {
                // TODO
                // Object.assign(this.effects[posY + j], {type: 4, score: 0, color: 0, delay: i * 0.02})
                Object.assign(this.effects[j], {type: 0, score: 0, color: 0, delay: 0})
            }
        }
    }

    #checkOnEnd() {
        const yPos = TOP_LINE * FIELD_W;
        for (let j = yPos + 1; j < yPos + FIELD_W - 1; j++)
        {
            if (this.field[j].color !== 0) {
                return true;
            }
        }
        return false;
    }

    #placeFigure(fig: Figure) {
        let figure = fig.value;
        const {x, y, color, type, score} = fig;

        for (let i = y; i < 4 + y; i++) { // 4 is fig w and h
            if (i < 0) {
                continue;
            }
            const yPos = i * FIELD_W;
            for (let j = x; j < 4 + x; j++) {
                if ((figure & 0x8000) !== 0) {
                    this.#mergeBlock({
                        color: color,
                        type: type,
                        score: score
                    }, this.field[yPos + j])
                    if (this.field[yPos + j].score > 1) {
                        this.effects[yPos + j].type = 5 // merge
                        this.effects[yPos + j].score = this.field[yPos + j].score // line clear
                        this.effects[yPos + j].color = this.field[yPos + j].color
                    }
                }
                figure <<= 1;
            }
        }
    }

    #collideFigure(fig: Figure) {
        const x = fig.x;
        const y = fig.y;
        let figure = fig.value;

        for (let i = y; i < 4 + y; i++) { // 4 is fig w and h
            if (i < 0) {
                continue;
            }
            const yPos = i * FIELD_W;
            for (let j = x; j < 4 + x; j++) {
                if ((figure & 0x8000) !== 0 && (this.#checkBlockCollide(this.field[yPos + j], fig.type) || i >= FIELD_H - 1))
                    return true;
                figure <<= 1;
            }
        }
        return false;
    }

    #checkOnLine() {
        let scoreBenefit = 0;
        let linesChecked = 0;
        for (let i = 0; i < FIELD_H - 1; i++) {
            let lineChecked = true;
            const yPos = i * FIELD_W;
            let j = yPos + 1;
            while (lineChecked && j < yPos + FIELD_W - 1) {
                lineChecked = this.field[j].color !== 0;
                j++;
            }
            if (lineChecked) {
                scoreBenefit += this.#removeLine(i);
                linesChecked += 1
            }
        }
        if (scoreBenefit > 0) {
            scoreBenefit = scoreBenefit << linesChecked;
            this.score += scoreBenefit;
            this.scoreUpdateCallback && this.scoreUpdateCallback(this.score, scoreBenefit)
        }
    }

    #removeLine(lineNumber: number): number {
        let scoreBenefit = 0;
        for (let j = 1; j < FIELD_W - 1; j++) {
            const index = lineNumber * FIELD_W + j;
            this.effects[index].type = 1 // line clear
            this.effects[index].score = this.field[index].score // line clear
            this.effects[index].color = this.field[index].color
            scoreBenefit += this.field[index].score
        }
        for (let y = lineNumber; y > 0; y--) {
            const yPos2 = (y - 1) * FIELD_W;
            const yPos1 = y * FIELD_W;
            for (let j = 1; j < FIELD_W - 1; j++) {
                Object.assign(this.field[yPos1 + j], this.field[yPos2 + j])
            }
        }
        return scoreBenefit;
    }

    #endGame() {
        //
        console.log("TETRIS END GAME #####################")
        const newRecord = this.highScore < this.score;
        this.gameOverCallback && this.gameOverCallback(this.score, newRecord);
        if (newRecord) {
            this.highScore = this.score;
        }
        //
        this.playing = false;
    }

    #initialize(seed: number = null) {
        this.#initField();
        this.#initEffects();
        // set game data
        this.score = 0;

        this.playing = true;
        this.paused = true;
        this.softDrop = false;
        this.placed = 0;
        //
        this.timePlayed = 0;
        // generate new random seed
        this.random = new Random(seed || Math.floor(Math.random() * RANDOM_MAX));

        // set fig data
        this.nextFigures = Figure.genSequence(this.random);
        this.nextFigureNumber = 0;
        this.figPreviewY = FIG_START_Y;
        this.#nextFigure();
        // reset game speed
        this.tickSpeed = START_TICK_SPEED;
        // reset hold feature
        this.held = false;
        this.heldFigure = null;
    }

    #processFieldEffects() {
        console.log("TETRIS #processFieldEffects()")
        let changes = false
        for (let y = FIELD_H - 1; y >= 0; --y) {
            let posY = y * FIELD_W;
            for (let x = FIELD_W - 1; x >= 0;--x) {
                const block = this.field[posY + x]
                switch (FigureType.at(block.type)) {
                    case 'liquid': {
                        // check left-right-down neighbours
                        if (y >= FIELD_H - 1) {
                            this.#killBlock(block)
                        } else {
                            // first check down
                            let tmp = this.field[posY + x + FIELD_W]
                            if (!this.#moveBlock(block, tmp)) {
                                // check left right
                                let rng = this.random.nextRandInt(0, 1);
                                let l = (x > 1) ? this.field[posY + x + FIELD_W - 1] : null
                                let r = (x < FIELD_W - 1) ? this.field[posY + x + FIELD_W + 1] : null
                                if (r && l) {
                                    if (rng) {
                                        if (this.#moveBlock(block, r)) {
                                            changes = true;
                                            break
                                        }
                                    } else {
                                        if (this.#moveBlock(block, l)) {
                                            changes = true;
                                            break
                                        } else {
                                            l = null
                                        }
                                    }
                                }
                                if (l) {
                                    changes = this.#moveBlock(block, l)
                                } else if (r) {
                                    changes = this.#moveBlock(block, r)
                                }
                            } else {
                                changes = true
                            }
                        }

                    } break;
                    case 'sand': {
                        if (y >= FIELD_H - 1) {
                            this.#killBlock(block)
                        } else {
                            changes = this.#moveBlock(block, this.field[posY + x + FIELD_W])
                        }
                    } break;
                    case 'tnt': {
                        changes = true;
                        // explode
                        let scoreBenefit = 0;
                        scoreBenefit += this.#explodeBlock(this.field[posY + x], true)
                        scoreBenefit += this.#explodeBlock(this.field[posY + x + 1])
                        scoreBenefit += this.#explodeBlock(this.field[posY + x - 1])
                        scoreBenefit += this.#explodeBlock(this.field[posY + x - FIELD_W])
                        scoreBenefit += this.#explodeBlock(this.field[posY + x + FIELD_W])

                        this.effects[posY + x].type = 2 // line clear
                        this.effects[posY + x].score = scoreBenefit // line clear
                        this.effects[posY + x].color = 12 // red

                        this.score += scoreBenefit;
                        this.scoreUpdateCallback && this.scoreUpdateCallback(this.score, scoreBenefit)
                    } break;
                    // case '': {
                    //     if (block.color < 3) break;
                    //     //console.log("TETRIS #moveBlock ", block.color )
                    //     if (y >= FIELD_H - 1) {
                    //         this.#killBlock(block)
                    //     } else {
                    //         //console.log("TETRIS #moveBlock")
                    //         this.#moveBlock(block, this.field[posY + x + FIELD_W])
                    //     }
                    // } break;
                }
            }
        }
        if (!changes) {
            console.log("TETRIS No changes")
            this.#checkOnLine()
        }
    }

    #checkBlockCollide(block: BlockType, type: number) {
         return (block.type !== FigureGhostId && type !== FigureGhostId && block.color !== 0) || block.type === FigureType.from('border');
    }

    #canMoveBlock(from: BlockType, to: BlockType) {

    }

    #moveBlock(from: BlockType, to: BlockType) {
        console.log(`TETRIS #moveBlock {${from.color} ${from.type}} {${to.color} ${to.type}}`)
        if (to.color === 0) {
            Object.assign(to, from)
            this.#nullifyBlock(from)
            return true;
        }
        else if (to.type === FigureGhostId) {
            // TODO merge
            to.score += from.score
            to.color = mergeColors(to.color, from.color)
            to.type = from.type !== FigureGhostId ? from.type : 0
            this.#nullifyBlock(from)
            return true
        }
        else if (from.type === FigureGhostId) {
            // TODO merge
            to.score += from.score
            to.color = mergeColors(to.color, from.color)
            this.#nullifyBlock(from)
            return true
        }
        else if (to.type === FigureType.from('liquid') && from.type !== FigureType.from('liquid')) {
            console.log("TETRIS exchange")
            // exchange
            const temp = Object.assign({}, to);
            Object.assign(to, from)
            Object.assign(from, temp)
            return true
        }
        return false
    }

    #mergeBlock(from: BlockType, to: BlockType) {
        console.log(`TETRIS #mergeBlock {${from.color} ${from.type}} {${to.color} ${to.type}}`)
        // to.color defines if it keeps ghost prop
        from.color = mergeColors(to.color, from.color)
        if (from.type === FigureGhostId /* && to.color */) {
            from.type = to.type !== FigureGhostId ? to.type : 0
        }
        from.score += to.score;
        Object.assign(to, from)
    }

    #nullifyBlock(block: BlockType) {
        if (!block) return
        block.color = 0
        block.type = 0
        block.score = 0
    }

    #explodeBlock (block: BlockType, self: boolean = false): number {
        if (!block || block.type === FigureType.from('border') || (block.type === FigureType.from('tnt') && !self)) return 0
        const score = block.score; // Save score
        this.#nullifyBlock(block);
        return score;
    }

    #killBlock(block: BlockType): number {
        // TODO kill score
        const score = block.score; // Save score
        this.#nullifyBlock(block)
        return -score
    }
}