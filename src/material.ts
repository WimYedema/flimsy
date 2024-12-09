import { createProgram, getUniforms, Uniforms } from "./program";
import { compileShader } from "./shaders";
import { gl } from "./webgl";

export class Material {
    uniforms: Uniforms;
    programs: WebGLProgram[];
    activeProgram: WebGLProgram|null;

    constructor (private vertexShader: WebGLShader, private fragmentShaderSource: string) {
        // this.vertexShader = vertexShader;
        // this.fragmentShaderSource = fragmentShaderSource;
        this.programs = [];
        this.activeProgram = null;
        this.uniforms = {};
    }

    setKeywords (keywords: string[]) {
        let hash = 0;
        for (let i = 0; i < keywords.length; i++)
            hash += hashCode(keywords[i]);

        let program = this.programs[hash];
        if (program == null)
        {
            let fragmentShader = compileShader(gl.FRAGMENT_SHADER, this.fragmentShaderSource, keywords);
            program = createProgram(this.vertexShader, fragmentShader);
            this.programs[hash] = program;
        }

        if (program == this.activeProgram) return;

        this.uniforms = getUniforms(program);
        this.activeProgram = program;
    }

    bind () {
        gl.useProgram(this.activeProgram);
    }
}

function hashCode (s: string): number{
    if (s.length == 0) return 0;
    let hash = 0;
    for (let i = 0; i < s.length; i++) {
        hash = (hash << 5) - hash + s.charCodeAt(i);
        hash |= 0; // Convert to 32bit integer
    }
    return hash;
};