import { createFBO, FramebufferObject, resizeFBO } from "./fbo";

export interface DoubleFramebufferObject {
    width: number;
    height: number;
    texelSizeX: number;
    texelSizeY: number;
    read: FramebufferObject;
    write: FramebufferObject;
    swap: () => void;
}

export function createDoubleFBO (w: number, h: number, internalFormat: number, format: number, type: number, param: number): DoubleFramebufferObject {
    let fbo1 = createFBO(w, h, internalFormat, format, type, param);
    let fbo2 = createFBO(w, h, internalFormat, format, type, param);

    return {
        width: w,
        height: h,
        texelSizeX: fbo1.texelSizeX,
        texelSizeY: fbo1.texelSizeY,
        get read () {
            return fbo1;
        },
        set read (value) {
            fbo1 = value;
        },
        get write () {
            return fbo2;
        },
        set write (value) {
            fbo2 = value;
        },
        swap () {
            let temp = fbo1;
            fbo1 = fbo2;
            fbo2 = temp;
        }
    }
}

export function resizeDoubleFBO (target: DoubleFramebufferObject, w: number, h: number, internalFormat: number, format: number, type: number, param: number) : DoubleFramebufferObject {
    if (target.width == w && target.height == h)
        return target;
    target.read = resizeFBO(target.read, w, h, internalFormat, format, type, param);
    target.write = createFBO(w, h, internalFormat, format, type, param);
    target.width = w;
    target.height = h;
    target.texelSizeX = 1.0 / w;
    target.texelSizeY = 1.0 / h;
    return target;
}

