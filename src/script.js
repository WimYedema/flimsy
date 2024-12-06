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

import {default as colorFragmentShaderCode} from './shaders/color.frag';
import {default as checkerboardFragmentShaderCode} from './shaders/checkerboard.frag';

import { baseVertexShader, compileShader } from './shaders.js';

import {canvas, gl, ext, resizeCanvas } from './webgl.js'
import {Program } from './program.js';
import { generateBuffer, updateKeywords, drawDisplay, initDisplay } from './display.js';

import { initBloomFramebuffers, applyBloom, bloom } from './bloom.js';
import { initSunraysFramebuffers, applySunrays, sunrays } from './sunrays.js';
import { splatPointer, multipleSplats } from './splat.js';
import {config} from './config.js';
import { dye, step, initFluidFramebuffers } from './fluid.js';
import { generateColor } from './color.js';
import { pointers } from './canvas.js';

// Simulation section

const colorShader = compileShader(gl.FRAGMENT_SHADER, colorFragmentShaderCode);
const checkerboardShader = compileShader(gl.FRAGMENT_SHADER, checkerboardFragmentShaderCode);

const colorProgram           = new Program(baseVertexShader, colorShader);
const checkerboardProgram    = new Program(baseVertexShader, checkerboardShader);

let lastUpdateTime = Date.now();
let colorUpdateTimer = 0.0;


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
    initDisplay();
    updateKeywords();
    initFramebuffers();
    // multipleSplats(parseInt(Math.random() * 20) + 5);
    
    update();
}

function update () {
    const dt = calcDeltaTime();
    if (resizeCanvas())
        initFramebuffers();
    updateColors(dt);
    applyInputs();
    step(dt);
    render();
    requestAnimationFrame(update);
}

function calcDeltaTime () {
    let now = Date.now();
    let dt = (now - lastUpdateTime) / 1000;
    dt = Math.min(dt, 0.016666);
    lastUpdateTime = now;
    return dt;
}

function updateColors (dt) {
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

function drawColor (color) {
    colorProgram.bind();
    gl.uniform4f(colorProgram.uniforms.color, color.r, color.g, color.b, 1);
    generateBuffer(null);
}

function drawCheckerboard () {
    checkerboardProgram.bind();
    gl.uniform1f(checkerboardProgram.uniforms.aspectRatio, canvas.width / canvas.height);
    generateBuffer(null);
}

function normalizeColor (input) {
    let output = {
        r: input.r / 255,
        g: input.g / 255,
        b: input.b / 255
    };
    return output;
}

function wrap (value, min, max) {
    let range = max - min;
    if (range == 0) return min;
    return (value - min) % range + min;
}

main();
