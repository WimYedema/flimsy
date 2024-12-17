export const canvas: HTMLCanvasElement = document.getElementsByTagName('canvas')[0];

type WebGL = WebGLRenderingContext|WebGL2RenderingContext;
interface ColorFormat {
    internalFormat: number;
    format: number;
    numComponents: number;
}
interface WebGLContext {
    gl: WebGL, 
    ext: {
        formatRGBA: ColorFormat;
        formatRG: ColorFormat;
        formatR: ColorFormat;
        formatRG32: ColorFormat;
        halfFloatTexType: number;
        floatTexType: number;
        supportLinearFiltering: boolean;
    }
}
export const {gl, ext}: WebGLContext = getWebGLContext(canvas);

export interface Resolution {
    width: number;
    height: number;
}

export function resizeCanvas () {
    let width = scaleByPixelRatio(canvas.clientWidth);
    let height = scaleByPixelRatio(canvas.clientHeight);
    if (canvas.width != width || canvas.height != height) {
        canvas.width = width;
        canvas.height = height;
        return true;
    }
    return false;
}

export function scaleByPixelRatio (input: number) : number {
    let pixelRatio = window.devicePixelRatio || 1;
    return Math.floor(input * pixelRatio);
}

export function getResolution (resolution: number) : Resolution {
    let aspectRatio = gl.drawingBufferWidth / gl.drawingBufferHeight;
    if (aspectRatio < 1)
        aspectRatio = 1.0 / aspectRatio;

    let min = Math.round(resolution);
    let max = Math.round(resolution * aspectRatio);

    if (gl.drawingBufferWidth > gl.drawingBufferHeight)
        return { width: max, height: min };
    else
        return { width: min, height: max };
}

function getWebGLContext (canvas: HTMLCanvasElement): WebGLContext {
    const params = { alpha: true, depth: false, stencil: false, antialias: false, preserveDrawingBuffer: false };

    let gl: WebGL;
    let halfFloat;
    let oes_float;
    let supportLinearFiltering: boolean;
    let halfFloatTexType;
    let floatTexType;
    let formatRGBA;
    let formatRG;
    let formatRG32;
    let formatR;

    // @ts-expect-error
    let webgl2: WebGL2RenderingContext|null = canvas.getContext('webgl2', params);

    if (webgl2!==null)
    {
        webgl2.getExtension('EXT_color_buffer_float');
        supportLinearFiltering = webgl2.getExtension('OES_texture_float_linear')!==null;

        halfFloatTexType = webgl2.HALF_FLOAT;
        floatTexType = webgl2.FLOAT;
        formatRGBA = getWebGL2SupportedFormat(webgl2, 4, webgl2.RGBA16F, webgl2.RGBA, halfFloatTexType);
        formatRG = getWebGL2SupportedFormat(webgl2, 2, webgl2.RG16F, webgl2.RG, halfFloatTexType);
        formatR = getWebGL2SupportedFormat(webgl2, 1, webgl2.R16F, webgl2.RED, halfFloatTexType);
        formatRG32 = getWebGL2SupportedFormat(webgl2, 2, webgl2.RG32F, webgl2.RG, floatTexType);
        gl = webgl2;
    }
    else
    {
        // @ts-expect-error
        let webgl: WebGLRenderingContext|null = canvas.getContext('webgl', params) || canvas.getContext('experimental-webgl', params);
        if (webgl===null) {
            throw "No WebGL or WebGL2";
        }
        supportLinearFiltering = webgl.getExtension('OES_texture_half_float_linear')!==null;
        halfFloat = webgl.getExtension('OES_texture_half_float');
        if (halfFloat===null) {
            throw "Missing extension OES_texture_half_float"
        }
        halfFloatTexType = halfFloat.HALF_FLOAT_OES;
        oes_float = webgl.getExtension('OES_texture_float');
        if (oes_float===null) {
            throw "Missing extension OES_texture_float"
        }
        floatTexType = webgl.FLOAT;
        formatRGBA = getWebGLSupportedFormat(webgl, 4, webgl.RGBA, webgl.RGBA, halfFloatTexType);
        formatRG = getWebGLSupportedFormat(webgl, 4, webgl.RGBA, webgl.RGBA, halfFloatTexType);
        formatR = getWebGLSupportedFormat(webgl, 4, webgl.RGBA, webgl.RGBA, halfFloatTexType);
        formatRG32 = getWebGLSupportedFormat(webgl, 4, webgl.RGBA, webgl.RGBA, floatTexType);
        gl = webgl;
    }

    // ga('send', 'event', isWebGL2 ? 'webgl2' : 'webgl', formatRGBA == null ? 'not supported' : 'supported');

    gl.clearColor(0.0, 0.0, 0.0, 1.0);

    return {
        gl,
        ext: {
            formatRGBA,
            formatRG,
            formatR,
            formatRG32,
            halfFloatTexType,
            floatTexType,
            supportLinearFiltering
        }
    };
}

function getWebGL2SupportedFormat (gl: WebGL2RenderingContext, numComponents: number, internalFormat: number, format: number, type: number): ColorFormat
{
    if (!supportRenderTextureFormat(gl, internalFormat, format, type))
    {
        switch (internalFormat)
        {
            case gl.R16F:
                return getWebGL2SupportedFormat(gl, 2, gl.RG16F, gl.RG, type);
            case gl.RG16F:
                return getWebGL2SupportedFormat(gl, 4, gl.RGBA16F, gl.RGBA, type);
            default:
                throw "Cannot find usable color format"
        }
    }

    return {
        internalFormat,
        format,
        numComponents
    }
}

function getWebGLSupportedFormat (gl: WebGLRenderingContext, numComponents: number, internalFormat: number, format: number, type: number): ColorFormat
{
    if (!supportRenderTextureFormat(gl, internalFormat, format, type))
    {
        throw "Cannot find usable color format"
    }

    return {
        internalFormat,
        format,
        numComponents
    }
}

function supportRenderTextureFormat (gl: WebGL, internalFormat: number, format: number, type: number): boolean {
    let texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, 4, 4, 0, format, type, null);

    let fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

    let status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    return status == gl.FRAMEBUFFER_COMPLETE;
}
