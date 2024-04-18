import React, {Fragment} from "react";
import {GlProgramInfo} from "../../game/glutils.ts";
import {mat4, vec3} from 'gl-matrix';
import {FIELD_H, FIELD_W, RECT_MODIFIER, Tetris} from "../../game/tetris.ts";
import {GameTitle} from "./game_title";
import {Canvas} from "@react-three/fiber";
import {ClientGameSessionControl} from "../../game/reconciliator";
import {GameDisplay, ProgressBar, TetrisFigure, TetrisText} from "./sprites";

import {
    Text,
} from "@react-three/drei";

export class GameCanvas extends React.PureComponent {
    constructor(props) {
        super(props)


    }
    componentDidMount() {
        if (!this.props.socket) return
        this.props.socket.on('game sync', this.onGameSync);
        this.props.socket.on('game update', this.onGameUpdate);
        this.props.socket.on('game over', this.onServerGameOver);
        //
        window.addEventListener('keydown', this.onKeyEvent);
        window.addEventListener('keyup', this.onKeyUpEvent);
        // create a game
        const saved = localStorage.getItem('game');
        this.game = saved ? new Tetris(JSON.parse(saved)) : new Tetris();
        this.game.callback = () => { this.forceUpdate() };
        this.session = new ClientGameSessionControl(this.game, this.props.socket);
        // render
        this.forceUpdate()
        // this.onGameStateChanged(this.game.render());
    }
    componentDidUpdate() {
        // TODO
        localStorage.setItem('game', JSON.stringify(this.game));
    }

    componentWillUnmount() {
        if (!this.props.socket) return
        this.props.socket.off('game sync', this.onGameSync);
        this.props.socket.off('game update', this.onGameUpdate);
        this.props.socket.off('game over', this.onServerGameOver);
        //
        window.removeEventListener('keydown', this.onKeyEvent);
        window.removeEventListener('keyup', this.onKeyUpEvent);
        //
        this.session.destroy();
    }

    onKeyEvent = (e) => {
        // TODO process chat
        if (e.keyCode === 27) {
            // tell server that we're leaving the room
            this.props.socket.emit('room leave');
            // reload page TODO show game results
            window.location.reload(false);
        } else {
            this.session.processEvent(e.keyCode);
        }
    }
    onKeyUpEvent = (e) => {
        if (e.keyCode === 16) {
            this.session.processEvent(15);
        }
    }
    onGameSync = (serverState /*: GameState*/) => {
        // reset game state
        this.session.onServerSynced(serverState);
    }
    onGameUpdate = (serverState /*: GameState*/) => {
        this.session.onServerUpdate(serverState);
    }
    onLocalGameOver = () => {
        // set loading true
    }
    onServerGameOver = () => {
        // set loading false
    }

    formatTime(milliseconds) {
        const totalSeconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
        const seconds = (totalSeconds % 60).toString().padStart(2, '0');
        return `${minutes}:${seconds}`;
    }

    render() {
        const {user, room, ru } = this.props;
        let timeString = "00:00"
        if (room) {
            timeString = "00:00"
        } else if (this.game) {
            //
            timeString = this.formatTime(this.game?.timePlayed)
        }
        return (
            <Fragment>
                <Canvas orthographic camera={{zoom: this.props.blockSize}}>
                    <ambientLight/>
                    <spotLight
                        position={[0, 0, 5]}
                        intensity={1}
                        penumbra={1}
                    />
                    {
                        this.game &&
                        <group>
                            <group position={[-(FIELD_W - 1) / 2, (FIELD_H - 1) / 2, 0]} scale={[1, -1, 1]}>
                                <GameDisplay
                                    blockSize={this.props.blockSize}
                                    game={this.game}
                                />
                                <ProgressBar
                                    pos={[(FIELD_W - 1) / 2, 0.5, 4]}
                                    width={FIELD_W * 2}
                                    scoreA={this.game.score}
                                    scoreB={0}
                                    scoreMax={3000}
                                />
                            </group>
                            <group position={[-(FIELD_W - 1) / 2, -(FIELD_H - 1) / 2 - 1, 0]}>
                                {room && <group position={[-FIELD_W, -3, 0]}>
                                    <TetrisText
                                        position={[0, FIELD_H, 0]}
                                        text={`Room ${room.room_name}`}
                                        fontSize={1.5}
                                    />
                                    {
                                        room.room_users.map((ru) => (
                                            <group>
                                                <TetrisText
                                                    text={ru.ru_user.user_nickname}
                                                />
                                            </group>
                                        ))
                                    }
                                </group>
                                }
                                <group position={[FIELD_W + 1, -3, 0]}>
                                    <TetrisText
                                        position={[0, FIELD_H, 0]}
                                        text={user.user_nickname ?? "@DEFAULT"}
                                        fontSize={1.5}
                                    />
                                    <TetrisText
                                        position={[0, FIELD_H - 2, 0]}
                                        text={"SCORE:"}
                                    />
                                    <TetrisText
                                        position={[8.5, FIELD_H - 2, 0]}
                                        text={this.game.score.toString()}
                                        color={"yellow"}
                                        anchorX={"right"}
                                    />
                                    <TetrisText
                                        position={[0, FIELD_H - 4, 0]}
                                        text={"NEXT FIGURE"}
                                    />
                                    <group scale={[1, -1, 1]} position={[2, FIELD_H - 6, 0]}>
                                        <TetrisFigure
                                            figure={this.game.nextFigures[this.game.nextFigureNumber]}
                                            xPos={0}
                                            yPos={0}
                                        />
                                    </group>
                                    <TetrisText
                                        position={[0, FIELD_H - 9, 0]}
                                        text={"HELD FIGURE"}
                                    />
                                    <group scale={[1, -1, 1]} position={[2, FIELD_H - 11, 0]}>
                                        <TetrisFigure
                                            figure={this.game.heldFigure}
                                            xPos={0}
                                            yPos={0}
                                        />
                                    </group>
                                </group>
                                <TetrisText
                                    position={[(FIELD_W - 1) / 2, FIELD_H, 4]}
                                    anchorX="center" // default
                                    text={timeString}
                                    fontSize={1.4}
                                    outlineWidth={0.2}
                                />
                                <TetrisText
                                    position={[(FIELD_W - 1) / 2, FIELD_H - 3, 4]}
                                    anchorX="center" // default
                                    text={this.game.playing ? (this.game.paused ? "PAUSED" : "") : "GAME OVER"}
                                    outlineWidth={0.4}
                                    outlineColor={"yellow"}
                                    color={"black"}
                                />
                            </group>
                        </group>
                    }
                </Canvas>
            </Fragment>
        )
    }
}

// const vertexShaderSource = `#version 300 es
// precision highp float;
//
// // an attribute is an input (in) to a vertex shader.
// // It will receive data from a buffer
// in vec4 a_position;
// in vec3 a_color;
//
// uniform float u_pointSize;
// uniform mat4 u_modelViewMatrix;
// uniform mat4 u_projectionMatrix;
//
// out vec3 v_color;
//
// // all shaders have a main function
// void main() {
//   gl_PointSize = u_pointSize;
//   gl_Position = u_projectionMatrix * u_modelViewMatrix * a_position;
//   v_color = a_color;
// }
// `;
//
// const fragmentShaderSource = `#version 300 es
//
// // fragment shaders don't have a default precision so we need
// // to pick one. highp is a good default. It means "high precision"
// precision highp float;
//
// // we need to declare an output for the fragment shader
// in vec3 v_color;
// out vec4 outColor;
//
// void main() {
//   outColor = vec4(v_color, 1.0);
// }
// `;
// export class GameCanvas extends React.PureComponent {
//
//     constructor(props) {
//         super(props);
//         this.canvasRef = React.createRef();
//         this.textCanvasRef = React.createRef();
//         this.programInfo = null;
//         this.renderBuffers = {};
//         // FPS info
//         this.frames = 0;
//         this.prevTime = 0;
//         this.fps = 0;
//     }
//
//     componentDidMount() {
//         window.addEventListener('resize', this.resizeCanvas, false);
//         // get links
//         const canvas = this.canvasRef.current;
//         const textCanvas = this.textCanvasRef.current;
//         const gl = canvas.getContext('webgl2');
//         const ctx = textCanvas.getContext('2d');
//         if (!gl || !ctx) {
//             console.error('Unable to initialize WebGL2 or canvas context.');
//             return;
//         }
//         // Create view
//         const modelViewMatrix = mat4.create();
//         const projectionMatrix = mat4.create();
//         // setup GLSL program
//         this.programInfo = new GlProgramInfo(gl, ctx);
//         this.programInfo.initShaderProgram(vertexShaderSource, fragmentShaderSource);
//         // Bind appropriate array buffer to it
//         this.programInfo.addBuffer([], "a_position", 2, gl.DYNAMIC_DRAW);
//         this.programInfo.addBuffer([], "a_color", 3, gl.DYNAMIC_DRAW);
//         this.programInfo.addUniform("u_pointSize", 10.0, gl.uniform1f, (v) => v);
//         this.programInfo.addUniformMatrix("u_modelViewMatrix", modelViewMatrix, gl.uniformMatrix4fv, (v) => mat4.clone(v));
//         this.programInfo.addUniformMatrix("u_projectionMatrix", projectionMatrix, gl.uniformMatrix4fv, (v) => mat4.clone(v));
//         // update
//         this.resizeCanvas();
//         //
//         this.props.set(this.renderBuffers, this.repaint);
//     }
//
//     componentDidUpdate(prevProps, prevState, snapshot) {
//         console.log("CANVAS RERENDER!")
//     }
//
//     repaint = () => {
//         requestAnimationFrame(this.drawScene);
//     }
//
//     componentWillUnmount() {
//         window.removeEventListener('resize', this.resizeCanvas, false);
//     }
//
//     resizeCanvas = () => {
//         const canvas = this.canvasRef.current;
//         const textCanvas = this.textCanvasRef.current;
//         if (!canvas || !textCanvas) {
//             return;
//         }
//         //
//         textCanvas.width = window.innerWidth;
//         textCanvas.height = window.innerHeight;
//         //
//         canvas.width = window.innerWidth;
//         canvas.height = window.innerHeight;
//         // calculate point size
//         const pointSize = canvas.height / (FIELD_H + 1);
//         this.programInfo.uniforms["u_pointSize"].value = pointSize * RECT_MODIFIER;
//         const fieldW = canvas.width / (pointSize + 1);
//         // setup projections
//         const projectionMatrix = this.programInfo.uniforms["u_projectionMatrix"].value;
//         mat4.ortho(projectionMatrix, -1, fieldW, FIELD_H, -1, -1.0, 1000.0);
//         this.programInfo.uniforms["u_projectionMatrix"].value = projectionMatrix;
//         // rerender
//         requestAnimationFrame(this.drawScene);
//     }
//
//     drawScene = () => {
//         //
//         console.log("draw scene()")
//         //
//         const time = Date.now();
//         this.frames++;
//         if (time > this.prevTime + 1000) {
//             this.fps = Math.round( ( this.frames * 1000 ) / ( time - this.prevTime ) );
//             this.prevTime = time;
//             this.frames = 0;
//
//             console.info('FPS: ', this.fps);
//         }
//
//         const gl = this.programInfo.gl;
//         const ctx = this.programInfo.ctx;
//         //
//         ctx.clearRect(0, 0, this.canvasRef.current.width, this.canvasRef.current.height);
//         //
//         gl.clearColor(0.071, 0.071, 0.071, 1.0); // Clear to black, fully opaque
//         gl.clearDepth(1.0); // Clear everything
//         gl.enable(gl.DEPTH_TEST); // Enable depth testing
//         gl.depthFunc(gl.LEQUAL); // Near things obscure far things
//         // Clear the canvas
//         gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
//         // Set the view port
//         gl.viewport(0, 0, this.canvasRef.current.width, this.canvasRef.current.height);
//
//         // TODO foreach renderbuffer call this vvv
//         for (const [, value] of Object.entries(this.renderBuffers)) {
//             // save uniforms
//             this.programInfo.push();
//             // set new uniforms
//             this.programInfo.uniforms["u_pointSize"].value *= value.scale;
//             const mat = this.programInfo.uniforms["u_projectionMatrix"].value;
//             mat4.translate(mat, mat, vec3.fromValues(value.x, value.y, 0.0));
//             mat4.scale(mat, mat, vec3.fromValues(value.scale, value.scale, 1.0));
//             this.programInfo.uniforms["u_projectionMatrix"].value = mat;
//             // load data of the buffer
//             this.programInfo.strings = value.strings;
//             this.programInfo.buffers["a_position"].setData(value.vertices);
//             this.programInfo.buffers["a_color"].setData(value.colors);
//             this.programInfo.count = value.count;
//             // Use the combined shader program object
//             this.programInfo.load();
//             //
//
//             gl.drawArrays(gl.POINTS, 0, this.programInfo.count);
//             //
//             this.programInfo.drawStrings();
//             //
//             this.programInfo.pop();
//         }
//         // TODO test fps
//         this.programInfo.strings = [
//             {
//                 x: FIELD_W + 1,
//                 y: 0,
//                 text: `FPS ${String(this.fps).padStart(4, ' ')}`,
//                 color: 'white'
//             }
//         ];
//         this.programInfo.drawStrings();
//     }
//
//     render() {
//         return (
//             <React.Fragment>
//                 <canvas ref={this.canvasRef}
//                         tabIndex="0"
//                         style={{
//                             width: "100%",
//                             height: "100%",
//                             position: "absolute",
//                         }}
//                 >
//                 </canvas>
//                 <canvas ref={this.textCanvasRef}
//                         style={{
//                             width: "100%",
//                             height: "100%",
//                             backgroundColor: "transparent",
//                             position: "absolute",
//                             left: 0,
//                             top: 0,
//                             zIndex: 10
//                         }}
//                 >
//                 </canvas>
//             </React.Fragment>
//         );
//     }
//
// }