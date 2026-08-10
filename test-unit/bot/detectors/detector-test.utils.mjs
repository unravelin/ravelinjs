/**
 * @param {Record<string, unknown>} [overrides]
 * @returns {detection.Environment}
 */
export function makeEnv(overrides = {}) {
  const { document: documentOverrides, ...rest } = overrides;
  return {
    navigator: {
      userAgent: 'Mozilla/5.0 Chrome/120.0.0.0',
      plugins: { length: 1 },
      languages: ['en'],
    },
    outerWidth: 1920,
    outerHeight: 1080,
    document: {
      createElement: () => ({ getContext: () => null }),
      ...documentOverrides,
    },
    ...rest,
  };
}
