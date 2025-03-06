import { gl } from "./webgl";
import { baseVertexShader, compileShader } from "./shaders";
import { default as copyFragmentShaderCode } from "./shaders/copy.frag";
import { Program } from "./program";
import { scene } from "./scene_manager";

const copyShader = compileShader(gl.FRAGMENT_SHADER, copyFragmentShaderCode);
const copyProgram = new Program(baseVertexShader, copyShader, "copy");

export class FramebufferObject {
    texture: WebGLTexture;
    fbo: WebGLFramebuffer;
    width: number;
    height: number;
    texelSizeX: number;
    texelSizeY: number;

    constructor(
        w: number,
        h: number,
        public internalFormat: number,
        public format: number,
        public type: number,
        public param: number,
    ) {
        gl.activeTexture(gl.TEXTURE0);
        this.texture = gl.createTexture();
        if (this.texture === null) {
            throw "Could not create texture";
        }
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, param);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, param);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, w, h, 0, format, type, null);

        this.fbo = gl.createFramebuffer();
        if (this.fbo === null) {
            throw "Could not create framebuffer";
        }
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.texture, 0);
        gl.viewport(0, 0, w, h);
        gl.clear(gl.COLOR_BUFFER_BIT);

        this.width = w;
        this.height = h;
        this.texelSizeX = 1.0 / w;
        this.texelSizeY = 1.0 / h;
    }

    attach(id: number): number {
        gl.activeTexture(gl.TEXTURE0 + id);
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        return id;
    }

    applyProgram() {
        gl.viewport(0, 0, this.width, this.height);
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
        // The use of the display object is a bit of a hack, but it works
        scene.objects.display.draw();
    }

    resize(w: number, h: number, mode: "copy" | "clear" = "copy"): FramebufferObject {
        if (this.width == w && this.height == h) return this;
        this.width = w;
        this.height = h;
        let newFBO = new FramebufferObject(w, h, this.internalFormat, this.format, this.type, this.param);
        if (mode == "copy") {
            copyProgram.bind();
            copyProgram.uniforms.uTexture.assign(this.attach(0));
            newFBO.applyProgram();
        }
        return newFBO;
    }
}
