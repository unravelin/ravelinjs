export function getIds(indicators: detection.Indicator[]): string[] {
  return indicators.map(indicator => indicator.id);
}
