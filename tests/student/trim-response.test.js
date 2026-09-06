import { describe, expect, it } from "vitest";

import {
  analyzeTrimResponse,
  classifyDisturbance,
  disturbanceMomentCoefficientChange,
  isTrimmed,
  pitchingMomentCoefficient,
  trimAngleDegrees,
} from "../../src/student/physics/trim-response.js";

describe("trim-response physics", () => {
  it("matches the Section 8 numerical reference case", () => {
    const result = analyzeTrimResponse({
      cm0: 0.04,
      cmAlphaPerRad: -0.8,
      angleOfAttackDeg: 2.86,
      disturbanceAlphaDeg: 2.0,
    });

    expect(result.cm).toBeCloseTo(6.68980662663446e-5, 6);
    expect(result.trimAngleDeg).toBeCloseTo(2.864788975654116, 6);
    expect(result.deltaCm).toBeCloseTo(-0.02792526803190927, 6);
    expect(result.trimmed).toBe(false);
    expect(result.disturbanceTendency).toBe("restoring");
  });

  it("decreases trim-angle magnitude and doubles disturbance magnitude when slope magnitude doubles", () => {
    const base = analyzeTrimResponse({
      cm0: 0.04,
      cmAlphaPerRad: -0.8,
      angleOfAttackDeg: 2.86,
      disturbanceAlphaDeg: 2.0,
    });

    const changed = analyzeTrimResponse({
      cm0: 0.04,
      cmAlphaPerRad: -1.6,
      angleOfAttackDeg: 2.86,
      disturbanceAlphaDeg: 2.0,
    });

    expect(Math.abs(changed.trimAngleDeg)).toBeCloseTo(
      1.432394487827058,
      6,
    );

    expect(Math.abs(changed.trimAngleDeg)).toBeLessThan(
      Math.abs(base.trimAngleDeg),
    );

    expect(Math.abs(changed.deltaCm)).toBeCloseTo(
      2 * Math.abs(base.deltaCm),
      6,
    );

    expect(changed.deltaCm).toBeLessThan(0);
  });

  it("handles zero slope without dividing by zero", () => {
    const result = analyzeTrimResponse({
      cm0: 0.04,
      cmAlphaPerRad: 0,
      angleOfAttackDeg: 5.0,
      disturbanceAlphaDeg: 2.0,
    });

    expect(result.cm).toBeCloseTo(0.04, 12);
    expect(result.trimAngleDeg).toBeNull();
    expect(result.deltaCm).toBeCloseTo(0, 12);
    expect(result.trimmed).toBe(false);
    expect(result.disturbanceTendency).toBe("neutral");
  });

  it("classifies a positive disturbance with negative slope as restoring", () => {
    const deltaCm = disturbanceMomentCoefficientChange(-0.8, 2.0);

    expect(deltaCm).toBeLessThan(0);
    expect(classifyDisturbance(2.0, deltaCm)).toBe("restoring");
  });

  it("classifies a positive disturbance with positive slope as destabilizing", () => {
    const deltaCm = disturbanceMomentCoefficientChange(0.8, 2.0);

    expect(deltaCm).toBeGreaterThan(0);
    expect(classifyDisturbance(2.0, deltaCm)).toBe("destabilizing");
  });

  it("classifies zero disturbance as neutral", () => {
    const deltaCm = disturbanceMomentCoefficientChange(-0.8, 0);

    expect(deltaCm).toBeCloseTo(0, 12);
    expect(classifyDisturbance(0, deltaCm)).toBe("neutral");
  });

  it("identifies trim using the required tolerance", () => {
    expect(isTrimmed(1e-6)).toBe(true);
    expect(isTrimmed(-1e-6)).toBe(true);
    expect(isTrimmed(1.000001e-6)).toBe(false);
  });

  it("returns the correct trim angle for the reference aircraft", () => {
    expect(trimAngleDegrees(0.04, -0.8)).toBeCloseTo(
      2.864788975654116,
      6,
    );
  });

  it("uses the selected angle in degrees and produces a finite Cm value", () => {
    const cm = pitchingMomentCoefficient(0.04, -0.8, 2.86);

    expect(Number.isFinite(cm)).toBe(true);
    expect(cm).toBeCloseTo(6.68980662663446e-5, 6);
  });
});