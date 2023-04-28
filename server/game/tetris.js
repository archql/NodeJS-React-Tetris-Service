export const FIELD_W = 12;
export const FIELD_H = 23;
export const RECT_MODIFIER = 0.95;

const TOP_LINE = 1;

export function nextRandInt(from, to) {
    from = Math.ceil(from);
    to = Math.floor(to);
    return Math.floor(Math.random() * (to - from + 1) + from); // The maximum is inclusive and the
}

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
        this.rotation = 0;
        this.id = id;
        this.y = -2;
        this.x = nextRandInt(1, FIELD_W - 1);

        this.#generateColor();
        this.from();
    }

    from(id, rotation) {
        this.value = Figure.figArr[id || this.id][rotation || this.rotation];
    }

    rotate(diff) {
        this.rotation = (this.rotation + diff + 4) & 3;
        this.from();
    }

    #generateColor() {
        this.color = 0;
        //Math.floor(Math.random() * max);
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

class Tetris {
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
    score = 0;
    highScore = 0;

    field = new Array(FIELD_W * FIELD_H);

    newGame() {
        this.#initField();
        this.score = 0;
        // get next figure
        this.nextFigures = Figure.genSequence();
        this.nextFigureNumber = 0;
        this.#nextFigure();
    }

    checkOnEnd() {
        const yPos = TOP_LINE * FIELD_W;
        for (let j = yPos + 1; j < yPos + FIELD_W - 1; j++)
        {
            if (this.field[j] !== 0) {
                return true;
            }
        }
        return false;
    }

    #placeFigure() {
        const x = this.currentFigure.x;
        const y = this.currentFigure.y;
        let figure = this.currentFigure.value;

        for (let i = y; i < 4 + y; i++) { // 4 is fig w and h
            if (i < 0) {
                continue;
            }
            const yPos = i * FIELD_W;
            for (let j = x; j < 4 + x; j++) {
                if ((figure & 0x8000) !== 0)
                    this.field[yPos + j] = this.currentFigure.color;
                figure <<= 1;
            }
        }
    }

    #collideFigure() {
        const x = this.currentFigure.x;
        const y = this.currentFigure.y;
        let figure = this.currentFigure.value;

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
    }

    #nextFigure() {
        this.currentFigure = this.nextFigures[this.nextFigureNumber];
        this.nextFigureNumber++;
        if (this.nextFigureNumber >= Figure.figCount) {
            this.nextFigureNumber = 0;
            this.nextFigures = Figure.genSequence();
        }
    }

    #initField() {
        for (let i = 0; i < FIELD_H - 1; ++i) {
            let posY = i * FIELD_H;
            const lastPosY = posY + FIELD_W - 1;
            this.field[posY] = 1;
            this.field[lastPosY] = 1;
            for (let j = posY + 1; j < lastPosY; ++j) {
                this.field[posY] = 0;
            }
        }
        for (let j = (FIELD_H - 1) * FIELD_W; j < FIELD_H * FIELD_W; ++j) {
            this.field[j] = 1;
        }
    }

}