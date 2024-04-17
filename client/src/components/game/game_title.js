import React, {Component, Fragment, Suspense} from "react";
import {nextRandInt, TetrisFigure, TitlePrompt} from "./sprites";
import {
    COLOR_TABLE,
    FIELD_H,
    FIELD_W,
    Figure,
    FigureType,
    FigureTypeLength,
    Random,
    RANDOM_MAX
} from "../../game/tetris";

export class GameTitle extends Component {

    constructor(props) {
        super(props);

        this.random = new Random(Math.floor(Math.random() * RANDOM_MAX))
        this.state = {
            fallingFigures: {arr: []},
        }
        // generate random figure sequence position
        const width = window.innerWidth / this.props.blockSize;
        const height = window.innerHeight / this.props.blockSize;
        const figWidth = Math.floor(width / 4) + 2;
        const figHeight = Math.floor(height / 4) + 2;
        const absMaxFigures = figWidth * figHeight;
        //
        this.maxFigures = absMaxFigures * this.props.fillRate; // by coefficient
        this.fieldWidth = Math.round(width) - 1;
        this.ffHeight = figHeight * 4;
        //
        const sequence = Array.from(Array(absMaxFigures).keys())
        // shuffle array
        for (let i = absMaxFigures - 1; i > 0; i--) {
            const j = nextRandInt(0, i);
            [sequence[i], sequence[j]] = [sequence[j], sequence[i]];
        }
        // choose N first positions
        const arr = this.state.fallingFigures.arr;
        for (let i = 0; i < this.maxFigures; i++) {
            const pos = sequence[i]
            const y = pos % figHeight;
            const x = Math.floor(pos / figHeight);
            const fig = new Figure(nextRandInt(0, Figure.figCount - 1), this.random)
            fig.x = x * 4;
            fig.y = y * 4;
            fig.rotate(nextRandInt(0, 4))
            fig.rotate(1)
            fig.type = Object.keys(FigureType)[nextRandInt(0, FigureTypeLength - 1)]
            arr.push(fig)
        }
    }

    // componentDidUpdate(prevProps, prevState, snapshot) {
    //  TODO problem on width height update
    // }

    componentDidMount() {
        //
        this.timer = setInterval(() => {
            //
            const arr = this.state.fallingFigures.arr;
            //
            arr.forEach((f) => {
                if (f.y > this.ffHeight - 1) {
                    f.rotate(nextRandInt(0, 4))
                    f.color = nextRandInt(4, COLOR_TABLE.length - 4);
                    f.y = 0
                }
                f.y ++;
            })
            //
            this.setState({
                fallingFigures: {...this.state.fallingFigures}
            })
        }, this.props.delay); // Adjust the speed of falling as needed
    }
    componentWillUnmount() {
        clearInterval(this.timer);
    }

    render() {
        return (
            <Fragment>
                <TitlePrompt
                    text="PLAY"
                    fontSize={3}
                    onCLick={this.props.onClick}
                />
                <Suspense fallback={null}>
                    <mesh position={[-this.fieldWidth / 2, FIELD_H / 2, 0]} scale={[1, -1, 1]}>
                    {this.state.fallingFigures.arr.map((figure, index) => (
                        <TetrisFigure
                            key={index}
                            figure={figure}
                            zPos={-5}
                        />
                    ))}
                    </mesh>
                </Suspense>
            </Fragment>
        );
    }


}