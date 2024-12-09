import {gl} from './webgl'
import { baseVertexShader, compileShader } from './shaders';
import {default as copyFragmentShaderCode} from './shaders/copy.frag';
import { Program } from './program';
import { generateBuffer } from './display';

const copyShader = compileShader(gl.FRAGMENT_SHADER, copyFragmentShaderCode);
const copyProgram = new Program(baseVertexShader, copyShader, "copy");

export interface FramebufferObject {
    texture: WebGLTexture;
    fbo: WebGLFramebuffer;
    width: number;
    height: number;
    texelSizeX: number;
    texelSizeY: number;
    attach: (id: number) => number;
}

export function createFBO (w: number, h: number, internalFormat: number, format: number, type: number, param: number) : FramebufferObject {
    gl.activeTexture(gl.TEXTURE0);
    let texture = gl.createTexture();
    if (texture===null) {
        throw "Could not create texture"
    }
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, param);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, param);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, w, h, 0, format, type, null);

    let fbo = gl.createFramebuffer();
    if (fbo===null) {
        throw "Could not create framebuffer"
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    gl.viewport(0, 0, w, h);
    gl.clear(gl.COLOR_BUFFER_BIT);

    let texelSizeX = 1.0 / w;
    let texelSizeY = 1.0 / h;

    return {
        texture,
        fbo,
        width: w,
        height: h,
        texelSizeX,
        texelSizeY,
        attach (id: number): number {
            gl.activeTexture(gl.TEXTURE0 + id);
            gl.bindTexture(gl.TEXTURE_2D, texture);
            return id;
        }
    };
}

export function resizeFBO (target: FramebufferObject, w: number, h: number, internalFormat: number, format: number, type: number, param: number) : FramebufferObject{
    let newFBO = createFBO(w, h, internalFormat, format, type, param);
    copyProgram.bind();
    gl.uniform1i(copyProgram.uniforms.uTexture, target.attach(0));
    generateBuffer(newFBO);
    return newFBO;
}

