import { withRouter } from '../../common/with_router.js';

import React from "react";
import {GlProgramInfo} from "../../game/glutils";
import {mat4} from 'gl-matrix';
import {FIELD_H, FIELD_W, RECT_MODIFIER, Tetris} from "../../game/tetris.ts";
import { io } from 'socket.io-client';
import {ClientGameSessionControl} from "../../game/reconciliator.js";
import type {GameState} from "../../game/server_client_globals.ts";

const vertexShaderSource = `#version 300 es
precision highp float;
 
// an attribute is an input (in) to a vertex shader.
// It will receive data from a buffer
in vec4 a_position;
in vec3 a_color;

uniform float u_pointSize;
uniform mat4 u_modelViewMatrix;
uniform mat4 u_projectionMatrix;

out vec3 v_color;
 
// all shaders have a main function
void main() {
  gl_PointSize = u_pointSize;
  gl_Position = u_projectionMatrix * u_modelViewMatrix * a_position;
  v_color = a_color;
}
`;

const fragmentShaderSource = `#version 300 es
 
// fragment shaders don't have a default precision so we need
// to pick one. highp is a good default. It means "high precision"
precision highp float;
 
// we need to declare an output for the fragment shader
in vec3 v_color;
out vec4 outColor;
 
void main() {
  // Just set the output to a constant reddish-purple
  outColor = vec4(v_color, 1.0);
}
`;
export class Game extends React.Component {

    constructor(props) {
        super(props);
        this.canvasRef = React.createRef();
        this.textCanvasRef = React.createRef();
        this.programInfo = null;
        this.game = null;
        // FPS info
        this.frames = 0;
        this.prevTime = 0;
        // Socket IO connection
        this.socket = io("http://localhost:5000/game", {
            autoConnect: false
        });
    }

    componentDidMount() {
        // open a socket IO connection
        this.socket.connect();
        this.socket.on('connect', this.onConnect);
        this.socket.on('disconnect', this.onDisconnect);
        this.socket.on('error', this.onError);
        this.socket.on('connect_error', this.onConnectError);
        this.socket.on('sync', this.onSync);
        this.socket.on('update', this.onUpdate);
        //
        window.addEventListener('resize', this.resizeCanvas, false);
        window.addEventListener('keydown', this.onKeyEvent);
        //
        const canvas = this.canvasRef.current;
        const textCanvas = this.textCanvasRef.current;
        const gl = canvas.getContext('webgl2');
        const ctx = textCanvas.getContext('2d');
        if (!gl || !ctx) {
            console.error('Unable to initialize WebGL2 or canvas context.');
            return;
        }
        // Create view
        const modelViewMatrix = mat4.create();
        const projectionMatrix = mat4.create();
        // setup GLSL program
        this.programInfo = new GlProgramInfo(gl, ctx);
        this.programInfo.initShaderProgram(vertexShaderSource, fragmentShaderSource);
        // Bind appropriate array buffer to it
        this.programInfo.addBuffer([], "a_position", 2, gl.DYNAMIC_DRAW);
        this.programInfo.addBuffer([], "a_color", 3, gl.DYNAMIC_DRAW);
        this.programInfo.addUniform("u_pointSize", 10.0, gl.uniform1f);
        this.programInfo.addUniformMatrix("u_modelViewMatrix", modelViewMatrix, gl.uniformMatrix4fv);
        this.programInfo.addUniformMatrix("u_projectionMatrix", projectionMatrix, gl.uniformMatrix4fv);
        // create a game
        let saved = localStorage.getItem('game');
        this.game = saved ? new Tetris(this.onGameStateChanged, JSON.parse(saved)) : new Tetris(this.onGameStateChanged);
        this.session = new ClientGameSessionControl(this.game, this.socket);
        // update
        this.resizeCanvas();
        // setup game interval
        // this.interval = setInterval(() => {
        //     this.session.processEvent(7); // timer
        // }, 100);
    }

    componentWillUnmount() {
        clearInterval(this.interval);
        window.removeEventListener('resize', this.resizeCanvas, false);
        window.removeEventListener('keydown', this.onKeyEvent);
        //
        this.socket.off('connect', this.onConnect);
        this.socket.off('disconnect', this.onDisconnect);
        this.socket.off('error', this.onError);
        this.socket.off('connect_error', this.onConnectError);
        this.socket.off('sync', this.onSync);
        this.socket.off('update', this.onUpdate);
    }

    resizeCanvas = () => {
        const canvas = this.canvasRef.current;
        const textCanvas = this.textCanvasRef.current;
        if (!canvas || !textCanvas) {
            return;
        }
        //
        textCanvas.width = window.innerWidth;
        textCanvas.height = window.innerHeight;
        //
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        // calculate point size
        const pointSize = canvas.height / (FIELD_H + 1);
        this.programInfo.uniforms["u_pointSize"].value = pointSize * RECT_MODIFIER;
        const fieldW = canvas.width / (pointSize + 1);
        // setup projections
        const projectionMatrix = this.programInfo.uniforms["u_projectionMatrix"].value;
        mat4.ortho(projectionMatrix, -1, fieldW, FIELD_H, -1, -1.0, 1000.0);
        this.programInfo.uniforms["u_projectionMatrix"].value = projectionMatrix;
        // rerender
        requestAnimationFrame(this.drawScene);
    }

    onGameStateChanged = (data) => {
        // render game
        this.programInfo.strings = data.strings;
        this.programInfo.buffers["a_position"].setData(data.vertices);
        this.programInfo.buffers["a_color"].setData(data.colors);
        this.programInfo.count = data.count;
        // save state
        localStorage.setItem('game', JSON.stringify(this.game));
        // draw
        requestAnimationFrame(this.drawScene);
    }

    drawScene = () => {
        const time = Date.now();
        this.frames++;
        if (time > this.prevTime + 1000) {
            let fps = Math.round( ( this.frames * 1000 ) / ( time - this.prevTime ) );
            this.prevTime = time;
            this.frames = 0;

            console.info('FPS: ', fps);
        }

        const gl = this.programInfo.gl;
        const ctx = this.programInfo.ctx;
        //
        ctx.clearRect(0, 0, this.canvasRef.current.width, this.canvasRef.current.height);
        //
        gl.clearColor(0.0, 0.0, 0.0, 1.0); // Clear to black, fully opaque
        gl.clearDepth(1.0); // Clear everything
        gl.enable(gl.DEPTH_TEST); // Enable depth testing
        gl.depthFunc(gl.LEQUAL); // Near things obscure far things
        // Clear the canvas
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        // Set the view port
        gl.viewport(0, 0, this.canvasRef.current.width, this.canvasRef.current.height);

        // Use the combined shader program object
        this.programInfo.load();
        //
        gl.drawArrays(gl.POINTS, 0, this.programInfo.count);
        //
        this.programInfo.drawStrings();
        // const textSize = this.programInfo.uniforms["u_pointSize"].value;
        // this.programInfo.text(FIELD_W + 4, 2  +  4  +  1, textSize, "HELD FIGURE", "center");
        // this.programInfo.text(FIELD_W + 4, 1, textSize, "NEXT FIGURE", "center");
        // this.programInfo.text(FIELD_W + 3, 2 + 4 + 6 + 2, textSize, `${String(this.game.score).padStart(6, ' ')}`);
        // this.programInfo.text(FIELD_W + 3, 2 + 4 + 6 + 3, textSize, `${String(this.game.highScore).padStart(6, ' ')}`);
    }

    onKeyEvent = (e) => {
        //console.log("key event " + e.keyCode);
        this.session.processEvent(e.keyCode);
    }

    onConnect = () => {
        console.log("onConnect");
        this.session.sync();
    }
    onDisconnect = () => {
        console.log("onDisconnect");
    }
    onError = () => {
        console.log("onError");
    }
    onConnectError = (e) => {
        console.log("onConnectError " + e);
    }
    onSync = (serverState: GameState) => {
        console.log("onSync");
        this.session.onServerSynced(serverState);
    }
    onUpdate = (serverState: GameState) => {
        console.log("onUpdate");
        console.log(serverState);
        this.session.onServerUpdate(serverState);
    }

    render() {
        return (
            <React.Fragment>
            <canvas ref={this.canvasRef}
                    tabIndex="0"
                    style={{
                        width: "100%",
                        height: "100%",
                    }}
            >
            </canvas>
            <canvas ref={this.textCanvasRef}
                    style={{
                        width: "100%",
                        height: "100%",
                        backgroundColor: "transparent",
                        position: "absolute",
                        left: 0,
                        top: 0,
                        zIndex: 10,
                    }}
                    >
            </canvas>
            <button style={{
                position:'fixed',
                width:60,
                height:60,
                bottom:40,
                right:40,
                backgroundColor:'#0C9',
                color:'#FFF',
                borderRadius:50,
                textAlign:'center'
            }}
            >

            </button>
            </React.Fragment>
        );
    }


}

export const GameRouted = withRouter(Game);