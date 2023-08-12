import React from "react";
import {GlProgramInfo} from "../../game/glutils.ts";
import {mat4, vec3} from 'gl-matrix';
import {FIELD_H, FIELD_W, RECT_MODIFIER} from "../../game/tetris.ts";

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
  outColor = vec4(v_color, 1.0);
}
`;
export class GameCanvas extends React.PureComponent {

    constructor(props) {
        super(props);
        this.canvasRef = React.createRef();
        this.textCanvasRef = React.createRef();
        this.programInfo = null;
        this.renderBuffers = {};
        // FPS info
        this.frames = 0;
        this.prevTime = 0;
        this.fps = 0;
    }

    componentDidMount() {
        window.addEventListener('resize', this.resizeCanvas, false);
        // get links
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
        this.programInfo.addUniform("u_pointSize", 10.0, gl.uniform1f, (v) => v);
        this.programInfo.addUniformMatrix("u_modelViewMatrix", modelViewMatrix, gl.uniformMatrix4fv, (v) => mat4.clone(v));
        this.programInfo.addUniformMatrix("u_projectionMatrix", projectionMatrix, gl.uniformMatrix4fv, (v) => mat4.clone(v));
        // update
        this.resizeCanvas();
        //
        this.props.set(this.renderBuffers, this.repaint);
    }

    componentDidUpdate(prevProps, prevState, snapshot) {
        console.log("CANVAS RERENDER!")
    }

    repaint = () => {
        requestAnimationFrame(this.drawScene);
    }

    componentWillUnmount() {
        window.removeEventListener('resize', this.resizeCanvas, false);
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

    drawScene = () => {
        //
        console.log("draw scene()")
        //
        const time = Date.now();
        this.frames++;
        if (time > this.prevTime + 1000) {
            this.fps = Math.round( ( this.frames * 1000 ) / ( time - this.prevTime ) );
            this.prevTime = time;
            this.frames = 0;

            console.info('FPS: ', this.fps);
        }
        this.programInfo.strings.push(
            {
                x: FIELD_W + 8,
                y: 0,
                text: `FPS ${String(this.fps).padStart(4, ' ')}`,
                color: 'white'
            }
        );

        const gl = this.programInfo.gl;
        const ctx = this.programInfo.ctx;
        //
        ctx.clearRect(0, 0, this.canvasRef.current.width, this.canvasRef.current.height);
        //
        gl.clearColor(0.071, 0.071, 0.071, 1.0); // Clear to black, fully opaque
        gl.clearDepth(1.0); // Clear everything
        gl.enable(gl.DEPTH_TEST); // Enable depth testing
        gl.depthFunc(gl.LEQUAL); // Near things obscure far things
        // Clear the canvas
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        // Set the view port
        gl.viewport(0, 0, this.canvasRef.current.width, this.canvasRef.current.height);

        // TODO foreach renderbuffer call this vvv
        for (const [, value] of Object.entries(this.renderBuffers)) {
            // save uniforms
            this.programInfo.push();
            // set new uniforms
            this.programInfo.uniforms["u_pointSize"].value *= value.scale;
            const mat = this.programInfo.uniforms["u_projectionMatrix"].value;
            mat4.translate(mat, mat, vec3.fromValues(value.x, value.y, 0.0));
            mat4.scale(mat, mat, vec3.fromValues(value.scale, value.scale, 1.0));
            this.programInfo.uniforms["u_projectionMatrix"].value = mat;
            // load data of the buffer
            this.programInfo.strings = value.strings;
            this.programInfo.buffers["a_position"].setData(value.vertices);
            this.programInfo.buffers["a_color"].setData(value.colors);
            this.programInfo.count = value.count;
            // Use the combined shader program object
            this.programInfo.load();
            //
            gl.drawArrays(gl.POINTS, 0, this.programInfo.count);
            //
            this.programInfo.drawStrings();
            //
            this.programInfo.pop();
        }
        // TODO test fps
        this.programInfo.strings = [
            {
                x: FIELD_W + 8,
                y: 0,
                text: `FPS ${String(this.fps).padStart(4, ' ')}`,
                color: 'white'
            }
        ];
        this.programInfo.drawStrings();
    }

    render() {
        return (
            <React.Fragment>
                <canvas ref={this.canvasRef}
                        tabIndex="0"
                        style={{
                            width: "100%",
                            height: "100%",
                            position: "absolute",
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
                            zIndex: 10
                        }}
                >
                </canvas>
            </React.Fragment>
        );
    }

}