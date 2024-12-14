/*
MIT License

Copyright (c) 2017 Pavel Dobryakov

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

'use strict';

import './style.css'
import * as dat from 'dat.gui';

import {default as checkerboardFragmentShaderCode} from './shaders/checkerboard.frag';
import {default as textureFragmentShaderCode} from './shaders/texture.frag';
import {default as textureVertexShaderCode} from './shaders/texture.vert';

import { baseVertexShader, compileShader } from './shaders';

import {canvas, gl, ext, resizeCanvas } from './webgl'
import {Program } from './program';
import { generateBuffer, updateKeywords, drawDisplay, initDisplay, createTextureAsync } from './display';

import { initBloomFramebuffers, applyBloom, bloom } from './bloom';
import { initSunraysFramebuffers, applySunrays, sunrays } from './sunrays';
import { splat, splatPointer } from './splat';
import {config} from './config';
import { dye, step, initFluidFramebuffers, velocity } from './fluid';
import { bindColor, generateColor, RgbColor } from './color';
import { pointers } from './canvas';
import {TextureObject} from './display'

// Simulation section

const checkerboardShader = compileShader(gl.FRAGMENT_SHADER, checkerboardFragmentShaderCode);
const textureFragmentShader = compileShader(gl.FRAGMENT_SHADER, textureFragmentShaderCode);
const textureVertexShader = compileShader(gl.VERTEX_SHADER, textureVertexShaderCode);

const checkerboardProgram    = new Program(baseVertexShader, checkerboardShader);
const textureProgram         = new Program(textureVertexShader, textureFragmentShader);

let lastUpdateTime = Date.now();
let colorUpdateTimer = 0.0;
let deltaY = 0.0;

function startGUI () {
    var gui = new dat.GUI({ width: 300 });
    gui.add(config, 'DYE_RESOLUTION', { 'high': 1024, 'medium': 512, 'low': 256, 'very low': 128 }).name('quality').onFinishChange(initFramebuffers);
    gui.add(config, 'SIM_RESOLUTION', { '32': 32, '64': 64, '128': 128, '256': 256 }).name('sim resolution').onFinishChange(initFramebuffers);
    gui.add(config, 'DENSITY_DISSIPATION', 0, 4.0).name('density diffusion');
    gui.add(config, 'VELOCITY_DISSIPATION', 0, 4.0).name('velocity diffusion');
    gui.add(config, 'PRESSURE', 0.0, 1.0).name('pressure');
    gui.add(config, 'CURL', 0, 50).name('vorticity').step(1);
    gui.add(config, 'SPLAT_RADIUS', 0.01, 1.0).name('splat radius');
    gui.add(config, 'SHADING').name('shading').onFinishChange(updateKeywords);
    gui.add(config, 'COLORFUL').name('colorful');

    let bloomFolder = gui.addFolder('Bloom');
    bloomFolder.add(config, 'BLOOM').name('enabled').onFinishChange(updateKeywords);
    bloomFolder.add(config, 'BLOOM_INTENSITY', 0.1, 2.0).name('intensity');
    bloomFolder.add(config, 'BLOOM_THRESHOLD', 0.0, 1.0).name('threshold');

    let sunraysFolder = gui.addFolder('Sunrays');
    sunraysFolder.add(config, 'SUNRAYS').name('enabled').onFinishChange(updateKeywords);
    sunraysFolder.add(config, 'SUNRAYS_WEIGHT', 0.3, 1.0).name('weight');

    let captureFolder = gui.addFolder('Capture');
    captureFolder.addColor(config, 'BACK_COLOR').name('background color');
    captureFolder.add(config, 'TRANSPARENT').name('transparent');

    if (isMobile())
        gui.close();
}

function isMobile () {
    return /Mobi|Android/i.test(navigator.userAgent);
}

function initFramebuffers () {
    initFluidFramebuffers();
    initBloomFramebuffers();
    initSunraysFramebuffers();
}

let flowTexture: TextureObject | null = null;
let dyeTexture: TextureObject | null = null;

function main() {
    if (isMobile()) {
        config.DYE_RESOLUTION = 512;
    }
    if (!ext.supportLinearFiltering) {
        config.DYE_RESOLUTION = 512;
        config.SHADING = false;
        config.BLOOM = false;
        config.SUNRAYS = false;
    }
    
    startGUI();
    updateKeywords();
    initDisplay();
    initFramebuffers();

    flowTexture = createTextureAsync("texture.png")
    dyeTexture = createTextureAsync("dyeTexture.png")

    // multipleSplats(parseInt(Math.random() * 20) + 5);
    
    update();
}

function update () {
    const dt: number = calcDeltaTime();
    if (resizeCanvas())
        initFramebuffers();
    updateColors(dt);
    applyInputs();
    step(dt);
    render();
    requestAnimationFrame(update);
}

function calcDeltaTime (): number {
    let now = Date.now();
    let dt = (now - lastUpdateTime) / 1000;
    dt = Math.min(dt, 0.016666);
    lastUpdateTime = now;
    return dt;
}

function updateColors (dt: number) {
    if (!config.COLORFUL) return;

    colorUpdateTimer += dt * config.COLOR_UPDATE_SPEED;
    if (colorUpdateTimer >= 1) {
        colorUpdateTimer = wrap(colorUpdateTimer, 0, 1);
        pointers.forEach(p => {
            p.color = generateColor();
        });
    }
}

function applyInputs () {
    pointers.forEach(p => {
        if (p.moved) {
            p.moved = false;
            splatPointer(p);
        }
    });
}

function render () {
    drawTexture();
    if (config.BLOOM)
        applyBloom(dye.read, bloom);
    if (config.SUNRAYS) {
        applySunrays(dye.read, dye.write, sunrays);
    }

    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.enable(gl.BLEND);

    if (!config.TRANSPARENT) {
        drawColor(normalizeColor(config.BACK_COLOR));
    } else {
        drawCheckerboard();
    }
    drawDisplay();
}

function drawTexture () {
    // splat(0.5,0.35,0,0,{r:0.1,g:0.1,b:0.1})
    // splat(0.6,1,0,-4,{r:0.9,g:0.1,b:0.2})
    deltaY+=0.00005;

    textureProgram.bind();
    gl.uniform1i(textureProgram.uniforms.uTexture, dyeTexture!.attach(0));
    gl.uniform1i(textureProgram.uniforms.uTarget, dye.read.attach(1));
    gl.uniform2f(textureProgram.uniforms.vDelta, 0.0, deltaY);
    gl.uniform1f(textureProgram.uniforms.offset, 0);
    gl.uniform1f(textureProgram.uniforms.factor, 1);
    generateBuffer(dye.write);
    dye.swap();

    textureProgram.bind();
    gl.uniform1i(textureProgram.uniforms.uTexture, flowTexture!.attach(0));
    gl.uniform1i(textureProgram.uniforms.uTarget, velocity.read.attach(1));
    gl.uniform2f(textureProgram.uniforms.vDelta, 0.0, deltaY);
    gl.uniform1f(textureProgram.uniforms.offset, 0.5);
    gl.uniform1f(textureProgram.uniforms.factor, 300.0);
    generateBuffer(velocity.write);
    velocity.swap();
}

function drawColor (color: RgbColor) {
    bindColor(color);
    generateBuffer(null);
}

function drawCheckerboard () {
    checkerboardProgram.bind();
    gl.uniform1f(checkerboardProgram.uniforms.aspectRatio, canvas.width / canvas.height);
    generateBuffer(null);
}

function normalizeColor (input: RgbColor): RgbColor {
    let output = {
        r: input.r / 255,
        g: input.g / 255,
        b: input.b / 255
    };
    return output;
}

function wrap (value: number, min: number, max: number): number {
    let range = max - min;
    if (range == 0) return min;
    return (value - min) % range + min;
}

main();
