import { default as particleVertexShaderCode } from "./shaders/particle.vert";
import { default as particleFragmentShaderCode } from "./shaders/particle.frag";
import { default as particleUpdateShaderCode } from "./shaders/particleUpdate.frag";
import { Program } from "./program";
import { baseVertexShader, compileShader } from "./shaders";
import { ext, gl } from "./webgl";
import { DoubleFramebufferObject } from "./double_fbo";
import { velocity } from "./fluid";

import { scene } from "./scene_manager";

const particleVertexShader = compileShader(gl.VERTEX_SHADER, particleVertexShaderCode);
const particleFragmentShader = compileShader(gl.FRAGMENT_SHADER, particleFragmentShaderCode);
const particleUpdateShader = compileShader(gl.FRAGMENT_SHADER, particleUpdateShaderCode);
const particleProgram = new Program(particleVertexShader, particleFragmentShader);
const particleUpdateProgram = new Program(baseVertexShader, particleUpdateShader);

let particles: DoubleFramebufferObject;

export function initParticles() {
    const texType = ext.floatTexType;
    const rg = ext.formatRG32;
    const filtering = gl.NEAREST;
    let num_particles = scene.entities.particle.length;
    particles = new DoubleFramebufferObject(num_particles, 1, rg.internalFormat, rg.format, texType, filtering);
    console.log(scene.entities.particle.flatMap((obj) => obj.at));
    const particlePositionData = new Float32Array(scene.entities.particle.flatMap((obj) => obj.at));

    // Upload particle data to the texture
    particles.write.attach(0);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, num_particles, 1, rg.format, texType, particlePositionData);

    // const buffer = new Float32Array(num_particles * rg.numComponents);

    // gl.bindFramebuffer(gl.FRAMEBUFFER, particles.write.fbo);
    // gl.readPixels(0, 0, num_particles, 1, rg.format, texType, buffer);
    // gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    // console.log("particles", buffer);
    particles.swap();
}

export function updateParticles(dt: number) {
    gl.disable(gl.BLEND);
    particleUpdateProgram.bind();
    particleUpdateProgram.invoke(particles, {
        uParticles: [particles.read.attach(0)],
        uVelocity: [velocity.read.attach(1)],
        uDeltaTime: [dt],
    });
    particles.swap();
}

function drawParticle(index: number) {
    let spec = scene.entities.particle[index];
    if (!spec) return;
    let color = { r: spec.color[0], g: spec.color[1], b: spec.color[2] };
    particleProgram.bind();
    particleProgram.invoke(scene.objects.particle, {
        color: [color.r, color.g, color.b, 1],
        particleIndex: [index / scene.entities.particle.length],
        uParticles: [particles.read.attach(0)],
    });
}

export function drawParticles() {
    for (let index = 0; index < scene.entities.particle.length; index++) {
        drawParticle(index);
    }
}
