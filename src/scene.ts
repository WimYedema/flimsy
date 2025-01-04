import { gl } from "./webgl";

interface GlObjectMap {
    [id: string]: GlObject;
}

interface ObjectSpec {
    object: string;
    at: number[];
    color: number[];
}

interface EntitySpec {
    entity: string;
    objects: ObjectSpec[];
}

interface GlSpec {
    vertices: number[][];
    objects: {
        [id: string]: {
            indices: number[];
        };
    };
    canvas: EntitySpec[];
}

function mergeSpecs(...specs: GlSpec[]): GlSpec {
    let result: GlSpec = {
        vertices: specs.flatMap((spec) => spec.vertices),
        objects: {},
        canvas: specs.flatMap((spec) => spec.canvas),
    };
    let start = 0;
    for (const spec of specs) {
        for (const [key, obj] of new Map(Object.entries(spec.objects))) {
            result.objects[key] = {
                indices: obj.indices.map((v) => v + start),
            };
        }
        start += spec.vertices.length;
    }
    return result;
}

interface Entities {
    [id: string]: ObjectSpec[];
}

class GlObject {
    constructor(
        public index: number,
        public length: number,
    ) {}

    draw(): void {
        gl.drawElements(gl.TRIANGLES, this.length, gl.UNSIGNED_SHORT, this.index);
    }
}

export class Scene {
    vertices: Float32Array;
    indices: Uint16Array;
    objects: GlObjectMap;
    entities: Entities;

    constructor(...specs: GlSpec[]) {
        const spec = mergeSpecs(...specs);
        console.log(spec);
        this.vertices = new Float32Array(spec.vertices.flat());
        const flattenedIndices = Object.values(spec.objects).flatMap((item) => item.indices);
        this.indices = new Uint16Array(flattenedIndices);
        this.objects = {};

        let start = 0;
        for (const [key, value] of new Map(Object.entries(spec.objects))) {
            this.objects[key] = new GlObject(start * Uint16Array.BYTES_PER_ELEMENT, value.indices.length);
            start += value.indices.length;
        }
        this.entities = {};
        for (const entitySpec of spec.canvas) {
            if (!this.entities[entitySpec.entity]) {
                this.entities[entitySpec.entity] = [];
            }
            this.entities[entitySpec.entity] = [...this.entities[entitySpec.entity], ...entitySpec.objects];
        }
    }
    bind(): void {
        gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
        gl.bufferData(gl.ARRAY_BUFFER, this.vertices, gl.STATIC_DRAW);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.indices, gl.STATIC_DRAW);
    }
}
