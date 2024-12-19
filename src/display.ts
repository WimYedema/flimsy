import { gl } from "./webgl";
import { baseVertexShader } from "./shaders";
import { Material } from "./material";
import { bloom } from "./bloom";
import { dye, velocity } from "./fluid";
import { sunrays } from "./sunrays";
import { config } from "./config";

import {default as displayFragmentShaderCode} from './shaders/display.frag';
import { FramebufferObject } from "./fbo";
import { bindColor, colorProgram } from "./color";
import { bindParticle } from "./particle";

const displayShaderSource = displayFragmentShaderCode;

let ditheringTexture = createTextureAsync('LDR_LLL1_0.png');

const displayMaterial = new Material(baseVertexShader, displayShaderSource);

const vertices = new Float32Array([
    // display
    -1, -1, 
    -1, 1, 
    1, 1, 
    1, -1,
    // particle
    0.5*0.025, 0.2887*0.025,
    -0.5*0.025, 0.2887*0.025,
    0.0*0.025, -0.5774*0.025
]);
const indices = new Uint16Array([
    // display
    0, 1, 2, 0, 2, 3, 
    // particle
    4, 5, 6]);
const objects = {
    display: {
        index: 0*Uint16Array.BYTES_PER_ELEMENT, 
        length: 6,
    },
    particle: {
        index: 6*Uint16Array.BYTES_PER_ELEMENT,
        length: 3,
    }
};

export interface TextureObject {
    texture: WebGLTexture;
    width: number;
    height: number;
    attach: (id: number) => number;
}

export function initDisplay() {
    // Render a rectangle on which we will display the fluid simulation
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

    if (displayMaterial.activeProgram===null) {
        throw "displayMaterial not activated"
    }
    const positionLocation = gl.getAttribLocation(displayMaterial.activeProgram, 'aPosition');
    console.log("aPosition", positionLocation)
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(positionLocation);
}

export function generateBuffer(target: FramebufferObject|null, clear = false)  {
    if (target == null)
    {
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }
    else
    {
        gl.viewport(0, 0, target.width, target.height);
        gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
    }
    if (clear)
    {
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);
    }
    // CHECK_FRAMEBUFFER_STATUS();
    gl.drawElements(gl.TRIANGLES, objects.display.length, gl.UNSIGNED_SHORT, objects.display.index);
}

// function CHECK_FRAMEBUFFER_STATUS () {
//     let status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
//     if (status != gl.FRAMEBUFFER_COMPLETE)
//         console.trace("Framebuffer error: " + status);
// }

export function updateKeywords () {
    let displayKeywords = [];
    if (config.SHADING) displayKeywords.push("SHADING");
    if (config.BLOOM) displayKeywords.push("BLOOM");
    if (config.SUNRAYS) displayKeywords.push("SUNRAYS");
    displayMaterial.setKeywords(displayKeywords);
}

export function drawDisplay () {
    let width = gl.drawingBufferWidth;
    let height = gl.drawingBufferHeight;

    displayMaterial.bind();
    if (config.SHADING)
        gl.uniform2f(displayMaterial.uniforms.texelSize, 1.0 / width, 1.0 / height);
    // gl.uniform1i(displayMaterial.uniforms.uTexture, velocity.read.attach(0));
    gl.uniform1i(displayMaterial.uniforms.uTexture, dye.read.attach(0));
    if (config.BLOOM) {
        gl.uniform1i(displayMaterial.uniforms.uBloom, bloom.attach(1));
        gl.uniform1i(displayMaterial.uniforms.uDithering, ditheringTexture.attach(2));
        let scale = getTextureScale(ditheringTexture, width, height);
        gl.uniform2f(displayMaterial.uniforms.ditherScale, scale.x, scale.y);
    }
    if (config.SUNRAYS)
        gl.uniform1i(displayMaterial.uniforms.uSunrays, sunrays.attach(3));
    // TODO: Adjust splat for display offset
    gl.uniform2f(displayMaterial.uniforms.objectPosition, 0, 0.1);
    generateBuffer(null);

    for (let index = 0; index < NUM_PARTICLES; index++) {
        bindParticle(index);
        gl.drawElements(gl.TRIANGLES, objects.particle.length, gl.UNSIGNED_SHORT, objects.particle.index);
    }
}

export function createTextureAsync (url: string) : TextureObject {
    let texture = gl.createTexture();
    if (texture===null) {
        throw "Could not create texture"
    }
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, 1, 1, 0, gl.RGB, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255]));

    let obj: TextureObject = {
        texture,
        width: 1,
        height: 1,
        attach (id: number) {
            gl.activeTexture(gl.TEXTURE0 + id);
            gl.bindTexture(gl.TEXTURE_2D, texture);
            return id;
        }
    };

    let image = new Image();
    image.onload = () => {
        obj.width = image.width;
        obj.height = image.height;
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
    };
    image.src = url;

    return obj;
}

function getTextureScale (texture: TextureObject, width: number, height: number) {
    return {
        x: width / texture.width,
        y: height / texture.height
    };
}
