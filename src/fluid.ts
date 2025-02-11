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
    curlProgram.uniforms.texelSize.assign(velocity.texelSizeX, velocity.texelSizeY);
    curlProgram.uniforms.uVelocity.assign(velocity.read.attach(0));
    curl.generateBuffer();

    vorticityProgram.bind();
    vorticityProgram.uniforms.texelSize.assign(velocity.texelSizeX, velocity.texelSizeY);
    vorticityProgram.uniforms.uVelocity.assign(velocity.read.attach(0));
    vorticityProgram.uniforms.uCurl.assign(curl.attach(1));
    vorticityProgram.uniforms.curl.assign(config.CURL);
    vorticityProgram.uniforms.dt.assign(dt);
    velocity.generateBuffer();
    velocity.swap();

    divergenceProgram.bind();
    divergenceProgram.uniforms.texelSize.assign(velocity.texelSizeX, velocity.texelSizeY);
    divergenceProgram.uniforms.uVelocity.assign(velocity.read.attach(0));
    divergence.generateBuffer();

    clearProgram.bind();
    clearProgram.uniforms.uTexture.assign(pressure.read.attach(0));
    clearProgram.uniforms.value.assign(config.PRESSURE);
    pressure.generateBuffer();
    pressure.swap();

    pressureProgram.bind();
    pressureProgram.uniforms.texelSize.assign(velocity.texelSizeX, velocity.texelSizeY);
    pressureProgram.uniforms.uDivergence.assign(divergence.attach(0));
    for (let i = 0; i < config.PRESSURE_ITERATIONS; i++) {
        pressureProgram.uniforms.uPressure.assign(pressure.read.attach(1));
        pressure.generateBuffer();
        pressure.swap();
    }

    gradienSubtractProgram.bind();
    gradienSubtractProgram.uniforms.texelSize.assign(velocity.texelSizeX, velocity.texelSizeY);
    gradienSubtractProgram.uniforms.uPressure.assign(pressure.read.attach(0));
    gradienSubtractProgram.uniforms.uVelocity.assign(velocity.read.attach(1));
    velocity.generateBuffer();
    velocity.swap();

    advectionProgram.bind();
    advectionProgram.uniforms.texelSize.assign(velocity.texelSizeX, velocity.texelSizeY);
    if (!ext.supportLinearFiltering)
        advectionProgram.uniforms.dyeTexelSize.assign(velocity.texelSizeX, velocity.texelSizeY);
    let velocityId = velocity.read.attach(0);
    advectionProgram.uniforms.uVelocity.assign(velocityId);
    advectionProgram.uniforms.uSource.assign(velocityId);
    advectionProgram.uniforms.dt.assign(dt);
    advectionProgram.uniforms.dissipation.assign(config.VELOCITY_DISSIPATION);
    velocity.generateBuffer();
    velocity.swap();

    if (!ext.supportLinearFiltering) advectionProgram.uniforms.dyeTexelSize.assign(dye.texelSizeX, dye.texelSizeY);
    advectionProgram.uniforms.uVelocity.assign(velocity.read.attach(0));
    advectionProgram.uniforms.uSource.assign(dye.read.attach(1));
    advectionProgram.uniforms.dissipation.assign(config.DENSITY_DISSIPATION);
    dye.generateBuffer();
    dye.swap();
}
