import { gl } from "./webgl";
import { baseVertexShader } from "./shaders";
import { Material } from "./material";
import { bloom } from "./bloom";
import { dye, velocity } from "./fluid";
import { sunrays } from "./sunrays";
import { config } from "./config";

import { default as displayFragmentShaderCode } from "./shaders/display.frag";
import { FramebufferObject } from "./fbo";
import { scene } from "./scene_manager";

const displayShaderSource = displayFragmentShaderCode;

let ditheringTexture = createTextureAsync("LDR_LLL1_0.png");

const displayMaterial = new Material(baseVertexShader, displayShaderSource);

export interface TextureObject {
    texture: WebGLTexture;
    width: number;
    height: number;
    attach: (id: number) => number;
}

export function initDisplay() {
    // Render a rectangle on which we will display the fluid simulation
    scene.bind();

    if (displayMaterial.activeProgram === null) {
        throw "displayMaterial not activated";
    }
    const positionLocation = gl.getAttribLocation(displayMaterial.activeProgram, "aPosition");
    console.log("aPosition", positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(positionLocation);
}

export function generateBuffer(clear = false) {
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    if (clear) {
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);
    }
    // CHECK_FRAMEBUFFER_STATUS();
    scene.objects.display.draw();
}

// function CHECK_FRAMEBUFFER_STATUS () {
//     let status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
//     if (status != gl.FRAMEBUFFER_COMPLETE)
//         console.trace("Framebuffer error: " + status);
// }

export function updateKeywords() {
    let displayKeywords = [];
    if (config.SHADING) displayKeywords.push("SHADING");
    if (config.BLOOM) displayKeywords.push("BLOOM");
    if (config.SUNRAYS) displayKeywords.push("SUNRAYS");
    displayMaterial.setKeywords(displayKeywords);
}

export function drawDisplay() {
    let width = gl.drawingBufferWidth;
    let height = gl.drawingBufferHeight;

    displayMaterial.bind();
    if (config.SHADING) displayMaterial.uniforms.texelSize.assign(1.0 / width, 1.0 / height);
    displayMaterial.uniforms.uTexture.assign(dye.read.attach(0));
    // displayMaterial.uniforms.uTexture.assign(velocity.read.attach(0));
    if (config.BLOOM) {
        displayMaterial.uniforms.uBloom.assign(bloom.attach(1));
        displayMaterial.uniforms.uDithering.assign(ditheringTexture.attach(2));
        let scale = getTextureScale(ditheringTexture, width, height);
        displayMaterial.uniforms.ditherScale.assign(scale.x, scale.y);
    }
    // TODO: Adjust splat for display offset
    if (config.SUNRAYS) displayMaterial.uniforms.uSunrays.assign(sunrays.attach(3));
    displayMaterial.uniforms.objectPosition.assign(0, 0.1);
    generateBuffer();
}

export function createTextureAsync(url: string): TextureObject {
    let texture = gl.createTexture();
    if (texture === null) {
        throw "Could not create texture";
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
        attach(id: number) {
            gl.activeTexture(gl.TEXTURE0 + id);
            gl.bindTexture(gl.TEXTURE_2D, texture);
            return id;
        },
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

function getTextureScale(texture: TextureObject, width: number, height: number) {
    return {
        x: width / texture.width,
        y: height / texture.height,
    };
}
