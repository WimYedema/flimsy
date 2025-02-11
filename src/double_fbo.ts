import { FramebufferObject } from "./fbo";
import { gl } from "./webgl";

export class DoubleFramebufferObject {
    texelSizeX: number;
    texelSizeY: number;
    private fbo1: FramebufferObject;
    private fbo2: FramebufferObject;

    constructor(w: number, h: number, internalFormat: number, format: number, type: number, param: number) {
        this.fbo1 = new FramebufferObject(w, h, internalFormat, format, type, param);
        this.fbo2 = new FramebufferObject(w, h, internalFormat, format, type, param);
        this.texelSizeX = this.fbo1.texelSizeX;
        this.texelSizeY = this.fbo1.texelSizeY;
    }

    get width() {
        return this.fbo1.width;
    }
    get height() {
        return this.fbo1.height;
    }
    get read() {
        return this.fbo1;
    }

    set read(value) {
        this.fbo1 = value;
    }

    get write() {
        return this.fbo2;
    }

    set write(value) {
        this.fbo2 = value;
    }

    swap() {
        let temp = this.fbo1;
        this.fbo1 = this.fbo2;
        this.fbo2 = temp;
    }

    generateBuffer() {
        this.write.generateBuffer();
    }

    resize(w: number, h: number): DoubleFramebufferObject {
        if (this.width == w && this.height == h) return this;
        this.read = this.read.resize(w, h, "copy");
        this.write = this.write.resize(w, h, "clear");
        this.texelSizeX = 1.0 / w;
        this.texelSizeY = 1.0 / h;
        return this;
    }
}
