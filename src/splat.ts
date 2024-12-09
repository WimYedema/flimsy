import { canvas, gl } from './webgl';
import { baseVertexShader, compileShader } from './shaders';
import { Program } from './program';
import { generateBuffer } from './display';
import { generateColor, RgbColor } from './color';
import { dye, velocity } from './fluid';
import { config } from "./config";

import {default as splatFragmentShaderCode} from './shaders/splat.frag';
import { pointerPrototype } from './pointer';

const splatShader = compileShader(gl.FRAGMENT_SHADER, splatFragmentShaderCode);

const splatProgram           = new Program(baseVertexShader, splatShader);

export function splatPointer (pointer: pointerPrototype) {
    let dx = pointer.deltaX * config.SPLAT_FORCE;
    let dy = pointer.deltaY * config.SPLAT_FORCE;
    splat(pointer.texcoordX, pointer.texcoordY, dx, dy, pointer.color);
}

export function multipleSplats (amount: number) {
    for (let i = 0; i < amount; i++) {
        const color = generateColor();
        color.r *= 10.0;
        color.g *= 10.0;
        color.b *= 10.0;
        const x = Math.random();
        const y = Math.random();
        const dx = 1000 * (Math.random() - 0.5);
        const dy = 1000 * (Math.random() - 0.5);
        splat(x, y, dx, dy, color);
    }
}

function splat (x: number, y: number, dx: number, dy: number, color: RgbColor) {
    splatProgram.bind();
    gl.uniform1i(splatProgram.uniforms.uTarget, velocity.read.attach(0));
    gl.uniform1f(splatProgram.uniforms.aspectRatio, canvas.width / canvas.height);
    gl.uniform2f(splatProgram.uniforms.point, x, y);
    gl.uniform3f(splatProgram.uniforms.color, dx, dy, 0.0);
    gl.uniform1f(splatProgram.uniforms.radius, correctRadius(config.SPLAT_RADIUS / 100.0));
    generateBuffer(velocity.write);
    velocity.swap();

    gl.uniform1i(splatProgram.uniforms.uTarget, dye.read.attach(0));
    gl.uniform3f(splatProgram.uniforms.color, color.r, color.g, color.b);
    generateBuffer(dye.write);
    dye.swap();
}

function correctRadius (radius: number) : number {
    let aspectRatio = canvas.width / canvas.height;
    if (aspectRatio > 1)
        radius *= aspectRatio;
    return radius;
}
