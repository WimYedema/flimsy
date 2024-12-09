import { canvas } from "./webgl";
import { generateColor, RgbColor } from "./color";

// export function pointerPrototype () {
//     this.id = -1;
//     this.texcoordX = 0;
//     this.texcoordY = 0;
//     this.prevTexcoordX = 0;
//     this.prevTexcoordY = 0;
//     this.deltaX = 0;
//     this.deltaY = 0;
//     this.down = false;
//     this.moved = false;
//     this.color = [30, 0, 300];
// }
export class pointerPrototype {
    public id: number;
    public texcoordX: number;
    public texcoordY: number;
    public prevTexcoordX: number;
    public prevTexcoordY: number;
    public deltaX: number;
    public deltaY: number;
    public down: boolean;
    public moved: boolean;
    public color: RgbColor;

    constructor() {
        this.id = -1;
        this.texcoordX = 0;
        this.texcoordY = 0;
        this.prevTexcoordX = 0;
        this.prevTexcoordY = 0;
        this.deltaX = 0;
        this.deltaY = 0;
        this.down = false;
        this.moved = false;
        this.color = {r:30, g:0, b:300};
    }
}

export function updatePointerDownData (pointer: pointerPrototype, id: number, posX: number, posY: number) {
    pointer.id = id;
    pointer.down = true;
    pointer.moved = false;
    pointer.texcoordX = posX / canvas.width;
    pointer.texcoordY = 1.0 - posY / canvas.height;
    pointer.prevTexcoordX = pointer.texcoordX;
    pointer.prevTexcoordY = pointer.texcoordY;
    pointer.deltaX = 0;
    pointer.deltaY = 0;
    pointer.color = generateColor();
}

export function updatePointerMoveData (pointer: pointerPrototype, posX: number, posY: number) {
    pointer.prevTexcoordX = pointer.texcoordX;
    pointer.prevTexcoordY = pointer.texcoordY;
    pointer.texcoordX = posX / canvas.width;
    pointer.texcoordY = 1.0 - posY / canvas.height;
    pointer.deltaX = correctDeltaX(pointer.texcoordX - pointer.prevTexcoordX);
    pointer.deltaY = correctDeltaY(pointer.texcoordY - pointer.prevTexcoordY);
    pointer.moved = Math.abs(pointer.deltaX) > 0 || Math.abs(pointer.deltaY) > 0;
}

export function updatePointerUpData (pointer: pointerPrototype) {
    pointer.down = false;
}

function correctDeltaX (delta: number) : number {
    let aspectRatio = canvas.width / canvas.height;
    if (aspectRatio < 1) delta *= aspectRatio;
    return delta;
}

function correctDeltaY (delta: number) : number {
    let aspectRatio = canvas.width / canvas.height;
    if (aspectRatio > 1) delta /= aspectRatio;
    return delta;
}
