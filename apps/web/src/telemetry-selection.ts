export function toggleTelemetrySelection(
  current: string[],
  id: string,
  maximum = 3,
): string[] {
  if (current.includes(id)) {
    return current.length === 1
      ? current
      : current.filter((item) => item !== id);
  }
  return current.length >= maximum ? current : [...current, id];
}
