import {default as baseVertexShaderCode} from './shaders/base.vert';
import {gl} from './webgl'
export const baseVertexShader = compileShader(gl.VERTEX_SHADER, baseVertexShaderCode);

export function compileShader (type: GLenum, source: string, keywords?: null|string[]): WebGLShader {
    source = addKeywords(source, keywords);

    const shader: WebGLShader|null = gl.createShader(type);
    if (shader===null) {
        throw "Failed to compile WebGL shader"
    }
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
        console.trace(gl.getShaderInfoLog(shader));

    return shader;
};

function addKeywords (source: string, keywords?: null|string[]) : string {
    if (keywords == null) return source;
    let keywordsString = '';
    keywords.forEach(keyword => {
        keywordsString += '#define ' + keyword + '\n';
    });
    return keywordsString + source;
}

