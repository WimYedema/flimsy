import { gl, ext, getResolution } from "./webgl";
import { DoubleFramebufferObject } from "./double_fbo";
import { FramebufferObject } from "./fbo";
import { config } from "./config";
import { compileShader, baseVertexShader } from "./shaders";
import { Program } from "./program";

import { default as clearFragmentShaderCode } from "./shaders/clear.frag";
import { default as advectionFragmentShaderCode } from "./shaders/advection.frag";
import { default as divergenceFragmentShaderCode } from "./shaders/divergence.frag";
import { default as curlFragmentShaderCode } from "./shaders/curl.frag";
import { default as vorticityFragmentShaderCode } from "./shaders/vorticity.frag";
import { default as pressureFragmentShaderCode } from "./shaders/pressure.frag";
import { default as gradientFragmentShaderCode } from "./shaders/gradient.frag";

export let dye: DoubleFramebufferObject;
export let velocity: DoubleFramebufferObject;
export let divergence: FramebufferObject;
export let curl: FramebufferObject;
export let pressure: DoubleFramebufferObject;

const clearShader = compileShader(gl.FRAGMENT_SHADER, clearFragmentShaderCode);

const advectionShader = compileShader(
    gl.FRAGMENT_SHADER,
    advectionFragmentShaderCode,
    ext.supportLinearFiltering ? null : ["MANUAL_FILTERING"],
);

const divergenceShader = compileShader(gl.FRAGMENT_SHADER, divergenceFragmentShaderCode);
const curlShader = compileShader(gl.FRAGMENT_SHADER, curlFragmentShaderCode);
const vorticityShader = compileShader(gl.FRAGMENT_SHADER, vorticityFragmentShaderCode);
const pressureShader = compileShader(gl.FRAGMENT_SHADER, pressureFragmentShaderCode);
const gradientSubtractShader = compileShader(gl.FRAGMENT_SHADER, gradientFragmentShaderCode);

const clearProgram = new Program(baseVertexShader, clearShader);
const advectionProgram = new Program(baseVertexShader, advectionShader);
const divergenceProgram = new Program(baseVertexShader, divergenceShader);
const curlProgram = new Program(baseVertexShader, curlShader);
const vorticityProgram = new Program(baseVertexShader, vorticityShader);
const pressureProgram = new Program(baseVertexShader, pressureShader);
const gradienSubtractProgram = new Program(baseVertexShader, gradientSubtractShader);

export function initFluidFramebuffers() {
    let simRes = getResolution(config.SIM_RESOLUTION);
    let dyeRes = getResolution(config.DYE_RESOLUTION);

    const texType = ext.halfFloatTexType;
    const rgba = ext.formatRGBA;
    const rg = ext.formatRG;
    const r = ext.formatR;
    const filtering = ext.supportLinearFiltering ? gl.LINEAR : gl.NEAREST;

    gl.disable(gl.BLEND);

    if (dye == null)
        dye = new DoubleFramebufferObject(
            dyeRes.width,
            dyeRes.height,
            rgba.internalFormat,
            rgba.format,
            texType,
            filtering,
        );
    else dye = dye.resize(dyeRes.width, dyeRes.height, rgba.internalFormat, rgba.format, texType, filtering);

    if (velocity == null)
        velocity = new DoubleFramebufferObject(
            simRes.width,
            simRes.height,
            rg.internalFormat,
            rg.format,
            texType,
            filtering,
        );
    else velocity = velocity.resize(simRes.width, simRes.height, rg.internalFormat, rg.format, texType, filtering);

    divergence = new FramebufferObject(simRes.width, simRes.height, r.internalFormat, r.format, texType, gl.NEAREST);
    curl = new FramebufferObject(simRes.width, simRes.height, r.internalFormat, r.format, texType, gl.NEAREST);
    pressure = new DoubleFramebufferObject(
        simRes.width,
        simRes.height,
        r.internalFormat,
        r.format,
        texType,
        gl.NEAREST,
    );
}

export function step(dt: number) {
    gl.disable(gl.BLEND);

    curlProgram.bind();
    curlProgram.invoke(curl, {
        texelSize: [velocity.texelSizeX, velocity.texelSizeY],
        uVelocity: [velocity.read.attach(0)],
    });

    vorticityProgram.bind();
    vorticityProgram.invoke(velocity, {
        texelSize: [velocity.texelSizeX, velocity.texelSizeY],
        uVelocity: [velocity.read.attach(0)],
        uCurl: [curl.attach(1)],
        curl: [config.CURL],
        dt: [dt],
    });
    velocity.swap();

    divergenceProgram.bind();
    divergenceProgram.invoke(divergence, {
        texelSize: [velocity.texelSizeX, velocity.texelSizeY],
        uVelocity: [velocity.read.attach(0)],
    });

    clearProgram.bind();
    clearProgram.invoke(pressure, {
        uTexture: [pressure.read.attach(0)],
        value: [config.PRESSURE],
    });
    pressure.swap();

    pressureProgram.bind();
    for (let i = 0; i < config.PRESSURE_ITERATIONS; i++) {
        pressureProgram.invoke(pressure, {
            texelSize: [velocity.texelSizeX, velocity.texelSizeY],
            uDivergence: [divergence.attach(0)],
            uPressure: [pressure.read.attach(1)],
        });
        pressure.swap();
    }

    gradienSubtractProgram.bind();
    gradienSubtractProgram.invoke(velocity, {
        texelSize: [velocity.texelSizeX, velocity.texelSizeY],
        uPressure: [pressure.read.attach(0)],
        uVelocity: [velocity.read.attach(1)],
    });
    velocity.swap();

    let advectionArgs = {
        texelSize: [velocity.texelSizeX, velocity.texelSizeY],
        uVelocity: [velocity.read.attach(0)],
        dt: [dt],
        dissipation: [config.VELOCITY_DISSIPATION],
    };
    if (!ext.supportLinearFiltering) {
        advectionArgs.dyeTexelSize = [velocity.texelSizeX, velocity.texelSizeY];
    }
    advectionProgram.bind();
    advectionProgram.invoke(velocity, {
        ...advectionArgs,
        uSource: [velocity.read.attach(0)],
    });
    velocity.swap();

    advectionProgram.invoke(dye, {
        ...advectionArgs,
        uSource: [dye.read.attach(1)],
    });
    dye.swap();
}
