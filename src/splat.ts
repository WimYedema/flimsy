import { canvas, gl } from "./webgl";
import { baseVertexShader, compileShader } from "./shaders";
import { Program } from "./program";
import { generateColor, RgbColor } from "./color";
import { dye, velocity } from "./fluid";
import { config } from "./config";

import { default as splatFragmentShaderCode } from "./shaders/splat.frag";
import { pointerPrototype } from "./pointer";

const splatShader = compileShader(gl.FRAGMENT_SHADER, splatFragmentShaderCode);

const splatProgram = new Program(baseVertexShader, splatShader);

export function splatPointer(pointer: pointerPrototype) {
    let dx = pointer.deltaX * config.SPLAT_FORCE;
    let dy = pointer.deltaY * config.SPLAT_FORCE;
    splat(pointer.texcoordX, pointer.texcoordY, dx, dy, pointer.color);
}

export function multipleSplats(amount: number) {
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

export function splat(x: number, y: number, dx: number, dy: number, color: RgbColor) {
    const aspectRatio = canvas.width / canvas.height;
    const radius = correctRadius(config.SPLAT_RADIUS / 100.0);

    splatProgram.bind();
    splatProgram.invoke(velocity, {
        uTarget: [velocity.read.attach(0)],
        aspectRatio: [aspectRatio],
        point: [x, y],
        color: [dx, dy, 0.0],
        radius: [radius],
    });
    velocity.swap();

    splatProgram.bind();
    splatProgram.invoke(dye, {
        uTarget: [dye.read.attach(0)],
        color: [color.r, color.g, color.b],
    });
    dye.swap();
}

function correctRadius(radius: number): number {
    let aspectRatio = canvas.width / canvas.height;
    if (aspectRatio > 1) radius *= aspectRatio;
    return radius;
}
