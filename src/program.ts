import { gl } from "./webgl";
import { compileShader } from "./shaders";

type UniformFunction = (location: WebGLUniformLocation, ...values: any[]) => void;

const POSITION_ATTRIBUTE_LOCATION = 0;

const uniformFunctions: { [key: number]: { [key: number]: UniformFunction } } = {
    [gl.FLOAT]: {
        1: gl.uniform1f.bind(gl),
        2: gl.uniform2f.bind(gl),
        3: gl.uniform3f.bind(gl),
        4: gl.uniform4f.bind(gl),
    },
    [gl.INT]: {
        1: gl.uniform1i.bind(gl),
        2: gl.uniform2i.bind(gl),
        3: gl.uniform3i.bind(gl),
        4: gl.uniform4i.bind(gl),
    },
    [gl.FLOAT_VEC2]: {
        1: gl.uniform2f.bind(gl),
    },
    [gl.FLOAT_VEC3]: {
        1: gl.uniform3f.bind(gl),
    },
    [gl.FLOAT_VEC4]: {
        1: gl.uniform4f.bind(gl),
    },
    [gl.INT_VEC2]: {
        1: gl.uniform2i.bind(gl),
    },
    [gl.INT_VEC3]: {
        1: gl.uniform3i.bind(gl),
    },
    [gl.INT_VEC4]: {
        1: gl.uniform4i.bind(gl),
    },
    [gl.SAMPLER_2D]: {
        1: gl.uniform1i.bind(gl),
    },
};

export class Uniform {
    location: WebGLUniformLocation | null;
    activeUniform: WebGLActiveInfo;
    uniformFunction: UniformFunction;

    constructor(location: WebGLUniformLocation | null, activeUniform: WebGLActiveInfo) {
        this.location = location;
        this.activeUniform = activeUniform;

        if (this.location === null) {
            throw `Uniform location for ${this.activeUniform.name} is null`;
        }

        const typeFunctions = uniformFunctions[this.activeUniform.type];
        if (!typeFunctions) {
            throw `Invalid uniform type for ${this.activeUniform.name}: (0x${this.activeUniform.type.toString(16)}, ${this.activeUniform.size})`;
        }

        this.uniformFunction = typeFunctions[this.activeUniform.size];
        if (!this.uniformFunction) {
            throw `Invalid uniform size for ${this.activeUniform.name}: ${this.activeUniform.size}`;
        }
    }

    assign(...values: any[]) {
        if (this.location === null) {
            throw `Uniform location for ${this.activeUniform.name} is null`;
        }
        this.uniformFunction(this.location, ...values);
    }
}

export interface Uniforms {
    [key: string]: Uniform;
}

export interface Framebuffer {
    applyProgram(): void;
}

export class Program {
    program: WebGLProgram;
    uniforms: Uniforms;

    constructor(
        vertexShader: WebGLShader,
        fragmentShader: WebGLShader,
        public name: string = "",
    ) {
        this.name = name;
        this.program = createProgram(vertexShader, fragmentShader);
        this.uniforms = getUniforms(this.program);
    }

    bind() {
        gl.useProgram(this.program);
    }

    invoke(framebuffer: Framebuffer, uniformAssignments: { [key: string]: any[] }) {
        for (const [name, values] of Object.entries(uniformAssignments)) {
            if (this.uniforms[name]) {
                this.uniforms[name].assign(...values);
            } else {
                throw `${this.name}: Uniform ${name} not found`;
            }
        }
        framebuffer.applyProgram();
    }

    static initRendering() {
        gl.vertexAttribPointer(POSITION_ATTRIBUTE_LOCATION, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(POSITION_ATTRIBUTE_LOCATION);
    }
}

export function createProgram(vertexShader: WebGLShader, fragmentShader: WebGLShader): WebGLProgram {
    let program = gl.createProgram();
    if (program === null) {
        throw "Could not create program";
    }
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    // Bind attribute location before linking the program
    gl.bindAttribLocation(program, POSITION_ATTRIBUTE_LOCATION, "aPosition");

    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) console.trace(gl.getProgramInfoLog(program));

    return program;
}

export function getUniforms(program: WebGLProgram): Uniforms {
    let uniforms: Uniforms = {};
    let uniformCount = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < uniformCount; i++) {
        let activeUniform = gl.getActiveUniform(program, i);
        if (activeUniform === null) {
            throw "Failed to get active uniform";
        }
        let uniformName = activeUniform.name;
        uniforms[uniformName] = new Uniform(gl.getUniformLocation(program, uniformName), activeUniform);
    }
    return uniforms;
}

export function createProgramWithKeywords(
    vertexShader: WebGLShader,
    fragmentShaderSource: string,
    keywords: string[],
): Program {
    let fragmentShader = compileShader(gl.FRAGMENT_SHADER, fragmentShaderSource, keywords);
    return new Program(vertexShader, fragmentShader);
}
