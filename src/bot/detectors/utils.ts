/**
 * The unmasked WebGL renderer string, or `null` when WebGL or the debug
 * extension is unavailable or reading it throws. Creates one context and lets
 * it go. Only called once the cheaper clauses already hold.
 */
export function readUnmaskedRenderer(env: detection.Environment): string | null {
  const doc = env.document;
  if (typeof doc?.createElement !== 'function') {
    return null;
  }

  let gl: WebGLRenderingContext | null;
  try {
    const canvas = doc.createElement('canvas');
    gl = (canvas.getContext('webgl') ||
      canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;
  } catch {
    return null;
  }

  if (!gl) {
    return null;
  }

  try {
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (!debugInfo) {
      return null;
    }

    return String(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || '');
  } catch {
    return null;
  }
}
