export const reducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;
export function sheetSnap(offset, velocity, height) {
  const anchors = [0, height * 0.38, height * 0.7];
  const projected = offset + velocity * 180;
  return anchors.reduce(
    (best, n) =>
      Math.abs(n - projected) < Math.abs(best - projected) ? n : best,
    0,
  );
}
export function rubberBand(value, min, max) {
  return value < min
    ? min + (value - min) * 0.22
    : value > max
      ? max + (value - max) * 0.22
      : value;
}
export const fluidEase = "cubic-bezier(.18,.84,.22,1)";
