export function nextRandInt(from, to) {
    from = Math.ceil(from);
    to = Math.floor(to);
    return Math.floor(Math.random() * (to - from + 1) + from); // The maximum is inclusive and the
}

export const FIELD_W = 12;
export const FIELD_H = 23;
export const RECT_MODIFIER = 0.95;

const SPEED_MUL = 0.95;

const INC_EVERY_FIGS = 15; // 2^N-1

const TOP_LINE = 1;

const FIG_START_Y = -1;

const START_TICK_SPEED = 1000;

const COLOR_TABLE = [
    [0.0, 0.0, 0.0      ],
    [0.271, 0.271, 0.271],
    [0.1, 0.1, 0.1      ],
    [1.0, 0.5098, 0.0   ],
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

class Figure {
    // defines fig number
    id;
    // defines rotation 0..3
    rotation;
    // defines x pos
    x;
    // defines y pos;
    y;
    // defines color
    color;
    value;

    constructor(id) {
        this.id = id;
        this.toDefaultPos();
        this.#generateColor();

    }

    toDefaultPos() {
        this.rotation = 0;
        this.y = FIG_START_Y;
        this.x = FIELD_W/2 - 2; //nextRandInt(1, FIELD_W - 1);
        this.from();
    }

    from(id, rotation) {
        this.value = Figure.figArr[id || this.id][rotation || this.rotation];
    }

    #generateColor() {
        this.color = nextRandInt(3, COLOR_TABLE.length - 3);
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

    static genSequence() {
        const figCount = Figure.figCount;
        const sequence = [];
        for (let i = 0; i < figCount; i++) {
            sequence.push(new Figure(i));
        }
        // shuffle array
        for (let i = figCount - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [sequence[i], sequence[j]] = [sequence[j], sequence[i]];
        }
        return sequence;
    }
}

export class Tetris {
    // current figure
    currentFigure;
    figPreviewY;
    heldFigure = null;
    nextFigures;
    nextFigureNumber;
    //
    paused = false;
    playing = false;
    softDrop = false;
    held = false;
    score = 0;
    highScore = 0;
    placed = 0;
    tickSpeed = START_TICK_SPEED;

    field = new Array(FIELD_W * FIELD_H);

    callback = null;

    constructor(){
        this.#initialize()
    }

    //############### KEY EVENT ############
    // - processes a key code, stored in key
    // - Special control codes:
    //   - Game update               - 7
    //   - Ignore downward collision - 0 (only for actual figure, not preview)
    processEvent(key: number) {
        if (key === 80) { // 'P'
            this.paused = !this.paused;
        }
        if (key === 82) { // 'R'
            this.#endGame();
            this.playing = true;
            this.paused = true;
        }
        //if ((this.playing === false) || (this.paused === true))
        //    return;
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
            case 18: // shift
                this.softDrop = true;
                break;
        }
        if (this.#collideFigure(fig)) {
            // restore changes
            fig.rotation = rot;
            fig.rotate(0); // apply rotation
            fig.x = xPos;
        }
        if (key === 7) { // update event
            fig.y++;
        }
        // save old Y
        let yPos = fig.y;
        // go down loop
        while (!this.#collideFigure(fig)) {
            fig.y++;
        }
        fig.y--;
        // collided
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

    // returns [vertices, colors]
    render() {
        const renderBuffer = {
            vertices: [],
            colors: [],
            count: 0
        }
        this.#renderFieldInto(renderBuffer);
        this.#renderFigureInto(renderBuffer, this.currentFigure, undefined, this.figPreviewY, 2);
        this.#renderFigureInto(renderBuffer, this.currentFigure);
        this.#renderFigureInto(renderBuffer, this.nextFigures[this.nextFigureNumber], FIELD_W + 3, 2);
        if (this.heldFigure) {
            this.#renderFigureInto(renderBuffer, this.heldFigure, FIELD_W + 3, 2  +  4  +  2);
        }
        return renderBuffer;
    }
    #renderFigureInto(renderBuffer, fig, xPos: number = undefined, yPos: number = undefined, colorId: number = undefined) {
        const x = (xPos !== undefined) ? xPos : fig.x;
        const y = (yPos !== undefined) ? yPos : fig.y;
        let figure = fig.value;
        const color = (colorId !== undefined) ? colorId : fig.color;

        for (let i = y; i < 4 + y; i++) { // 4 is fig w and h
            // if (i < 0) {
            //     continue;
            // }
            for (let j = x; j < 4 + x; j++) {
                if ((figure & 0x8000) !== 0) {
                    renderBuffer.vertices.push(j, i);
                    renderBuffer.colors.push(...COLOR_TABLE[color]);
                    renderBuffer.count++;
                }
                figure <<= 1;
            }
        }
    }
    #renderFieldInto(renderBuffer) {
        for (let i = 0; i < FIELD_H; ++i) {
            const yPos = i * FIELD_W;
            for (let j = 0; j < FIELD_W; ++j) {
                renderBuffer.vertices.push(j, i);
                renderBuffer.colors.push(...COLOR_TABLE[this.field[j + yPos] || 0]);
                renderBuffer.count++;
            }
        }
    }

    #nextFigure() {
        this.currentFigure = this.nextFigures[this.nextFigureNumber];
        this.nextFigureNumber++;
        if (this.nextFigureNumber >= Figure.figCount) {
            this.nextFigureNumber = 0;
            this.nextFigures = Figure.genSequence();
        }
        this.processEvent(0);
    }

    #initField() {
        for (let i = 0; i < FIELD_H - 1; ++i) {
            let posY = i * FIELD_W;
            const lastPosY = posY + FIELD_W - 1;
            this.field[posY] = 1;
            this.field[lastPosY] = 1;
            for (let j = posY + 1; j < lastPosY; ++j) {
                this.field[j] = 0;
            }
        }
        for (let j = (FIELD_H - 1) * FIELD_W; j < FIELD_H * FIELD_W; ++j) {
            this.field[j] = 1;
        }
    }

    #checkOnEnd() {
        const yPos = TOP_LINE * FIELD_W;
        for (let j = yPos + 1; j < yPos + FIELD_W - 1; j++)
        {
            if (this.field[j] !== 0) {
                console.log("checkOnEnd true")
                return true;
            }
        }
        console.log("checkOnEnd false")
        return false;
    }

    #placeFigure(fig: Figure) {
        const x = fig.x;
        const y = fig.y;
        let figure = fig.value;
        const color = fig.color;

        for (let i = y; i < 4 + y; i++) { // 4 is fig w and h
            if (i < 0) {
                continue;
            }
            const yPos = i * FIELD_W;
            for (let j = x; j < 4 + x; j++) {
                if ((figure & 0x8000) !== 0)
                    this.field[yPos + j] = color;
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
                if ((figure & 0x8000) !== 0 && this.field[yPos + j] !== 0)
                    return true;
                figure <<= 1;
            }
        }
        return false;
    }

    #checkOnLine() {
        let scoreBenefit = 0;
        for (let i = 0; i < FIELD_H - 1; i++) {
            let lineChecked = true;
            const yPos = i * FIELD_W;
            let j = yPos + 1;
            while (lineChecked && j < yPos + FIELD_W - 1) {
                lineChecked = this.field[j] !== 0;
                j++;
            }
            if (lineChecked) {
                this.#removeLine(i);
                scoreBenefit++;
            }
        }
        if (scoreBenefit > 0) {
            scoreBenefit = ((2 << scoreBenefit) - 1) << 2;
            this.score += scoreBenefit;
            // TODO Score updated
        }
    }

    #removeLine(lineNumber) {
        for (let y = lineNumber; y > 0; y--) {
            const yPos2 = (y - 1) * FIELD_W;
            const yPos1 = y * FIELD_W;
            for (let j = 1; j < FIELD_W - 1; j++) {
                this.field[yPos1 + j] = this.field[yPos2 + j];
            }
        }
    }

    #endGame() {
        if (this.highScore < this.score) {
            this.highScore = this.score;
            // TODO SEND UPDATE SIG
        }
        this.#initialize();
    }

    #initialize() {
        this.#initField();
        // set game data
        this.score = 0;

        this.playing = true;
        this.paused = true;
        this.softDrop = false;
        this.placed = 0;

        // set fig data
        this.nextFigures = Figure.genSequence();
        this.nextFigureNumber = 0;
        this.figPreviewY = 0;
        this.#nextFigure();
        // reset game speed
        this.tickSpeed = START_TICK_SPEED;
        // reset hold feature
        this.held = false;
        this.heldFigure = null;
    }

}