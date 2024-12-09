import {gl} from './webgl'

export interface Uniforms {
    [key: string]: WebGLUniformLocation|null;
};

export class Program {
    program: WebGLProgram;
    uniforms: Uniforms;

    constructor (vertexShader: WebGLShader, fragmentShader: WebGLShader, public name: string ="") {
        this.name = name;
        this.program = createProgram(vertexShader, fragmentShader);
        this.uniforms = getUniforms(this.program);
    }

    bind () {
        gl.useProgram(this.program);
    }
}

export function createProgram (vertexShader: WebGLShader, fragmentShader: WebGLShader): WebGLProgram {
    let program = gl.createProgram();
    if (program===null) {
        throw "Could not create program"
    }
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS))
        console.trace(gl.getProgramInfoLog(program));

    return program;
}

export function getUniforms (program: WebGLProgram) : Uniforms {
    let uniforms: Uniforms = {};
    let uniformCount = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < uniformCount; i++) {
        let activeUniform = gl.getActiveUniform(program, i);
        if (activeUniform===null) {
            throw "Failed to get active uniform"
        }
        let uniformName = activeUniform.name;
        uniforms[uniformName] = gl.getUniformLocation(program, uniformName);
    }
    return uniforms;
}
