export interface RgbColor {
    r: number;
    g: number;
    b: number;
}
export function generateColor () : RgbColor {
    let c = HSVtoRGB(Math.random(), 1.0, 1.0);
    c.r *= 0.15;
    c.g *= 0.15;
    c.b *= 0.15;
    return c;
}

// @ts-expect-error
function HSVtoRGB (h: number, s: number, v: number) : RgbColor {
    let i, f, p, q, t;
    i = Math.floor(h * 6);
    f = h * 6 - i;
    p = v * (1 - s);
    q = v * (1 - f * s);
    t = v * (1 - (1 - f) * s);

    switch (i % 6) {
        case 0: return {r: v, g: t, b: p};
        case 1: return {r: q, g: v, b: p};
        case 2: return {r: p, g: v, b: t};
        case 3: return {r: p, g: q, b: v};
        case 4: return {r: t, g: p, b: v};
        case 5: return {r: v, g: p, b: q};
    }
}
