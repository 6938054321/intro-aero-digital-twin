const TRIM_TOLERANCE = 1e-6;
const ZERO_TOLERANCE = 1e-12;

function assertFiniteNumber(value, name) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError(`${name} must be a finite number`);
  }
}

export function degreesToRadians(degrees) {
  assertFiniteNumber(degrees, "degrees");
  return (degrees * Math.PI) / 180;
}

// Input: alphaDeg in deg. Output: radians.
export function angleOfAttackToRadians(alphaDeg) {
  return degreesToRadians(alphaDeg);
}

// Inputs: cm0 dimensionless, cmAlphaPerRad in 1/rad, alphaDeg in deg.
// Output: Cm(alpha), dimensionless.
// Sign convention: positive alpha and positive pitching moment are nose-up.
export function pitchingMomentCoefficient(cm0, cmAlphaPerRad, alphaDeg) {
  assertFiniteNumber(cm0, "cm0");
  assertFiniteNumber(cmAlphaPerRad, "cmAlphaPerRad");
  assertFiniteNumber(alphaDeg, "alphaDeg");

  const alphaRad = degreesToRadians(alphaDeg);
  return cm0 + cmAlphaPerRad * alphaRad;
}

// Inputs: cm0 dimensionless, cmAlphaPerRad in 1/rad.
// Output: trim angle in radians, or null when no unique trim exists.
export function trimAngleRadians(cm0, cmAlphaPerRad) {
  assertFiniteNumber(cm0, "cm0");
  assertFiniteNumber(cmAlphaPerRad, "cmAlphaPerRad");

  if (cmAlphaPerRad === 0) {
    return null;
  }

  return -cm0 / cmAlphaPerRad;
}

// Input: trim angle in radians. Output: degrees.
export function radiansToDegrees(radians) {
  assertFiniteNumber(radians, "radians");
  return (radians * 180) / Math.PI;
}

// Inputs: cm0 dimensionless, cmAlphaPerRad in 1/rad.
// Output: trim angle in degrees, or null when no unique trim exists.
export function trimAngleDegrees(cm0, cmAlphaPerRad) {
  const trimRad = trimAngleRadians(cm0, cmAlphaPerRad);
  return trimRad === null ? null : radiansToDegrees(trimRad);
}

// Inputs: cmAlphaPerRad in 1/rad, disturbanceAlphaDeg in deg.
// Output: delta Cm, dimensionless.
export function disturbanceMomentCoefficientChange(
  cmAlphaPerRad,
  disturbanceAlphaDeg,
) {
  assertFiniteNumber(cmAlphaPerRad, "cmAlphaPerRad");
  assertFiniteNumber(disturbanceAlphaDeg, "disturbanceAlphaDeg");

  const disturbanceAlphaRad = degreesToRadians(disturbanceAlphaDeg);
  return cmAlphaPerRad * disturbanceAlphaRad;
}

export function isTrimmed(cm) {
  assertFiniteNumber(cm, "cm");
  return Math.abs(cm) <= TRIM_TOLERANCE;
}

export function classifyDisturbance(
  disturbanceAlphaDeg,
  deltaCm,
) {
  assertFiniteNumber(disturbanceAlphaDeg, "disturbanceAlphaDeg");
  assertFiniteNumber(deltaCm, "deltaCm");

  const disturbanceAlphaRad = degreesToRadians(disturbanceAlphaDeg);
  const product = disturbanceAlphaRad * deltaCm;

  if (product < -ZERO_TOLERANCE) {
    return "restoring";
  }

  if (product > ZERO_TOLERANCE) {
    return "destabilizing";
  }

  return "neutral";
}

export function analyzeTrimResponse({
  cm0,
  cmAlphaPerRad,
  angleOfAttackDeg,
  disturbanceAlphaDeg,
}) {
  assertFiniteNumber(cm0, "cm0");
  assertFiniteNumber(cmAlphaPerRad, "cmAlphaPerRad");
  assertFiniteNumber(angleOfAttackDeg, "angleOfAttackDeg");
  assertFiniteNumber(disturbanceAlphaDeg, "disturbanceAlphaDeg");

  const cm = pitchingMomentCoefficient(
    cm0,
    cmAlphaPerRad,
    angleOfAttackDeg,
  );

  const trimDeg = trimAngleDegrees(cm0, cmAlphaPerRad);

  const deltaCm = disturbanceMomentCoefficientChange(
    cmAlphaPerRad,
    disturbanceAlphaDeg,
  );

  return {
    cm,
    trimAngleDeg: trimDeg,
    trimAvailable: trimDeg !== null,
    trimmed: isTrimmed(cm),
    deltaCm,
    disturbanceTendency: classifyDisturbance(
      disturbanceAlphaDeg,
      deltaCm,
    ),
  };
}

export { TRIM_TOLERANCE, ZERO_TOLERANCE };