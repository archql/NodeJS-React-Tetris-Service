//
// creates a shader of the given type, uploads the source and
// compiles it.
//
import {mat4, vec4} from 'gl-matrix';
import {FIELD_W} from "./tetris";
import {ServerGameSessionControl} from "../../server/game/reconciliator";

export class GlBuffer {
    #gl = null;
    buffer;
    chunkSize;
    name: string;
    location: GLint;
    type: GLenum;

    constructor(gl, data: number[], attribName: string, chunkSize: number, type: GLenum = gl.STATIC_DRAW) {
        this.#gl = gl;
        this.buffer = gl.createBuffer();
        this.chunkSize = chunkSize;
        this.name = attribName;
        this.type = type;
        this.setData(data);
    }

    setData(data: number[]) {
        const gl = this.#gl;
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), this.type);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
    }

    associateWith(shaderProgram: WebGLProgram) {
        const gl = this.#gl;
        // Bind vertex buffer object
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
        // Get the attribute location
        const coord = gl.getAttribLocation(shaderProgram, this.name);
        // Point an attribute to the currently bound VBO
        gl.vertexAttribPointer(coord, this.chunkSize, gl.FLOAT, false, 0, 0);
        // Enable the attribute
        gl.enableVertexAttribArray(coord);
    }
}

export class GlUniform {
    gl = null;
    value: any;
    name: string;
    method;

    constructor(gl, name: string, value: any, method) {
        this.gl = gl;
        this.name = name;
        this.value = value;
        this.method = method.bind(this.gl);
    }
    associateWith(shaderProgram: WebGLProgram) {
        const gl = this.gl;
        const location = gl.getUniformLocation(shaderProgram, this.name);
        this.method(location, this.value);
    }
}

export class GlUniformMatrix extends GlUniform {
    transpose: boolean;
    constructor(gl, name: string, value: any, method, transpose: boolean = false) {
        super(gl, name, value, method);
        this.transpose = transpose;
    }
    associateWith(shaderProgram: WebGLProgram) {
        const gl = this.gl;
        const location = gl.getUniformLocation(shaderProgram, this.name);
        this.method(location, this.transpose, this.value);
    }
}

type UniformsType = {
    [key: string]: GlUniform;
};
type BuffersType = {
    [key: string]: GlBuffer;
};

export class GlProgramInfo {
    gl = null;
    ctx = null;
    program = null;
    buffers: BuffersType = {};
    uniforms: UniformsType = {};
    strings = [];

    // how much to render
    count = 0;

    constructor(gl, ctx = null) {
        this.gl = gl;
        this.ctx = ctx;
        if (!gl) {
            throw new Error("Gl is not initialized");
        }
    }
    initShaderProgram(vertexShaderSource: string, fragmentShaderSource: string) {
        const gl = this.gl;
        const vertexShader = this.#loadShader(gl.VERTEX_SHADER, vertexShaderSource);
        const fragmentShader = this.#loadShader(gl.FRAGMENT_SHADER, fragmentShaderSource);

        // Create the shader program
        const shaderProgram = gl.createProgram();
        gl.attachShader(shaderProgram, vertexShader);
        gl.attachShader(shaderProgram, fragmentShader);
        gl.linkProgram(shaderProgram);
        //
        gl.deleteShader(vertexShader);
        gl.deleteShader(fragmentShader);

        // If creating the shader program failed, alert

        if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
            alert(
                `Unable to initialize the shader program: ${gl.getProgramInfoLog(
                    shaderProgram
                )}`
            );
            return null;
        }
        this.program = shaderProgram;
        return this.program;
    }

    addBuffer(data: number[], attributeName: string, chunkSize: number, type: GLenum = this.gl.STATIC_DRAW) {
        this.buffers[attributeName] = (new GlBuffer(this.gl, data, attributeName, chunkSize, type));
    }

    addUniform(uniformName: string, value: any, method) {
        this.uniforms[uniformName] = (new GlUniform(this.gl, uniformName, value, method));
    }
    addUniformMatrix(uniformName: string, value: any, method, transpose: boolean = false) {
        this.uniforms[uniformName] = (new GlUniformMatrix(this.gl, uniformName, value, method, transpose));
    }
    addString(name, stringObj: {}) {
        this.strings[name] = (stringObj);
    }

    load() {
        if (!this.program) {
            throw new Error("Shader program is not initialized");
        }
        this.gl.useProgram(this.program);
        for (const [, buffer] of Object.entries(this.buffers)) {
            buffer.associateWith(this.program);
        }
        for (const [, uniform] of Object.entries(this.uniforms)) {
            uniform.associateWith(this.program);
        }
    }

    #loadShader(type, source) {
        const gl = this.gl;
        const shader = gl.createShader(type);

        // Send the source to the shader object
        gl.shaderSource(shader, source);

        // Compile the shader program
        gl.compileShader(shader);

        // See if it compiled successfully
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            alert(
                `An error occurred compiling the shaders: ${gl.getShaderInfoLog(shader)}`
            );
            gl.deleteShader(shader);
            return null;
        }

        return shader;
    }

    drawStrings() {
        //
        const projMatrix = this.uniforms["u_projectionMatrix"].value;
        let textSize = this.uniforms["u_pointSize"].value;
        //
        let MVPMatrix = mat4.create();
        mat4.multiply(MVPMatrix, MVPMatrix, projMatrix);
        //
        textSize = Math.round(textSize);
        this.ctx.textBaseline = "middle";

        this.ctx.font = `700 ${textSize}px Lucida Sans Typewriter`;
        this.ctx.fillStyle = 'white';

        for (const str of this.strings) {
            let clip = vec4.fromValues(str.x, str.y, 0, 1);
            vec4.transformMat4(clip, clip, MVPMatrix);

            let canvasX = (clip[0] / clip[3] + 1) / 2 * this.ctx.canvas.width;
            let canvasY = (1 - clip[1] / clip[3]) / 2 * this.ctx.canvas.height;
            canvasX = Math.round(canvasX);
            canvasY = Math.round(canvasY);

            this.ctx.textAlign = str.align || "left";
            this.ctx.fillText(str.text, canvasX, canvasY);
        }
    }

    text(x: number, y: number, size: number, text: string, align: string = "left") {
        const projMatrix = this.uniforms["u_projectionMatrix"].value;
        //const modelMatrix = this.uniforms["u_modelViewMatrix"].value;

        let MVPMatrix = mat4.create();
        mat4.multiply(MVPMatrix, MVPMatrix, projMatrix);
        let clip = vec4.fromValues(x, y, 0, 1);
        vec4.transformMat4(clip, clip, MVPMatrix);

        let canvasX = (clip[0] / clip[3] + 1) / 2 * this.ctx.canvas.width;
        let canvasY = (1 - clip[1] / clip[3]) / 2 * this.ctx.canvas.height;
        canvasX = Math.round(canvasX);
        canvasY = Math.round(canvasY);

// Draw the text on the canvas
        size = Math.round(size);
        this.ctx.textBaseline = "middle";
        this.ctx.textAlign = align;
        this.ctx.font = `700 ${size}px Lucida Sans Typewriter`;
        this.ctx.fillStyle = 'white';
        this.ctx.fillText(text, canvasX, canvasY);
    }
}
//
// export function addBuffer(programInfo, data: number[], attributeName: string, chunkSize: number, type: GLenum) {
//     const gl = programInfo.gl;
//     const buffer = gl.createBuffer();
//     gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
//     gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), type);
//     gl.bindBuffer(gl.ARRAY_BUFFER, null);
//     programInfo.buffers.push({ glBuffer: buffer, chunkSize: chunkSize, attributeName: attributeName });
// }
//
// export function associateBuffer(gl, shaderProgram, buffer) {
//     // Bind vertex buffer object
//     gl.bindBuffer(gl.ARRAY_BUFFER, buffer.glBuffer);
//     // Get the attribute location
//     const coord = gl.getAttribLocation(shaderProgram, buffer.attributeName);
//     // Point an attribute to the currently bound VBO
//     gl.vertexAttribPointer(coord, buffer.chunkSize, gl.FLOAT, false, 0, 0);
//     // Enable the attribute
//     gl.enableVertexAttribArray(coord);
// }
//
// export function associateBuffers(programInfo, buffers) {
//     for (const buffer of buffers) {
//         associateBuffer(programInfo, buffer);
//     }
// }
//
// export const programInfo = (gl, shaderProgram) => ({
//     gl: gl,
//     program: shaderProgram,
//     buffers: [],
//     uniforms: [],
//     uniformLocations: {
//         pointSize: gl.getUniformLocation(shaderProgram, "pointSize"),
//         projectionMatrix: gl.getUniformLocation(shaderProgram, "projectionMatrix"),
//         modelViewMatrix: gl.getUniformLocation(shaderProgram, "modelViewMatrix"),
//     },
// });