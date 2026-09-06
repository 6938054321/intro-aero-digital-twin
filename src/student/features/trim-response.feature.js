import {
  analyzeTrimResponse,
  pitchingMomentCoefficient,
} from "../physics/trim-response.js";

const REQUIRED_CAPABILITY_ID = "loads.pitch.component-sum";
const REQUIRED_CAPABILITY_VERSION = 1;

const INPUT_KEYS = [
  "cm0",
  "cmAlphaPerRad",
  "angleOfAttackDeg",
  "disturbanceAlphaDeg",
];

function hasRequiredCapability(capabilityContext) {
  return Boolean(
    capabilityContext?.[REQUIRED_CAPABILITY_ID],
  );
}

function hasOwn(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

function validateAircraftInputs(aircraft) {
  if (!aircraft || typeof aircraft !== "object") {
    throw new TypeError("aircraft must be an object");
  }

  for (const key of INPUT_KEYS) {
    if (!hasOwn(aircraft, key)) {
      throw new TypeError(`Missing required aircraft input: ${key}`);
    }
  }
}

function numericalCase() {
  const inputs = {
    cm0: 0.04,
    cmAlphaPerRad: -0.8,
    angleOfAttackDeg: 2.86,
    disturbanceAlphaDeg: 2.0,
  };

  const expected = {
    cm: 6.68980662663446e-5,
    trimAngleDeg: 2.864788975654116,
    deltaCm: -0.02792526803190927,
  };

  const result = analyzeTrimResponse(inputs);
  const tolerance = 1e-6;

  return {
    id: "numerical-reference",
    title: "Section 8 numerical reference",
    inputs,
    expected: {
      cm: expected.cm,
      trimAngleDeg: expected.trimAngleDeg,
      deltaCm: expected.deltaCm,
      trimmed: false,
      disturbanceTendency: "restoring",
    },
    passed:
      Math.abs(result.cm - expected.cm) <= tolerance &&
      Math.abs(result.trimAngleDeg - expected.trimAngleDeg) <= tolerance &&
      Math.abs(result.deltaCm - expected.deltaCm) <= tolerance &&
      result.trimmed === false &&
      result.disturbanceTendency === "restoring",
    tolerance,
    note:
      "The rounded 2.86 deg selected angle is slightly away from the exact trim angle.",
  };
}

function behavioralCase() {
  const baseInputs = {
    cm0: 0.04,
    cmAlphaPerRad: -0.8,
    angleOfAttackDeg: 2.86,
    disturbanceAlphaDeg: 2.0,
  };

  const changedInputs = {
    ...baseInputs,
    cmAlphaPerRad: -1.6,
  };

  const base = analyzeTrimResponse(baseInputs);
  const changed = analyzeTrimResponse(changedInputs);

  return {
    id: "behavioral-slope-change",
    title: "Slope magnitude behavioral response",
    inputs: {
      base: baseInputs,
      changed: changedInputs,
    },
    expected:
      "Increasing |Cm_alpha| from 0.8 to 1.6 1/rad halves the trim-angle magnitude and doubles |delta_Cm| while retaining the negative delta_Cm sign.",
    passed:
      Math.abs(changed.trimAngleDeg) < Math.abs(base.trimAngleDeg) &&
      Math.abs(Math.abs(changed.trimAngleDeg) - 1.432394487827058) <= 1e-6 &&
      Math.abs(
        Math.abs(changed.deltaCm) - 2 * Math.abs(base.deltaCm),
      ) <= 1e-6 &&
      Math.sign(changed.deltaCm) === -1,
  };
}

function boundaryCase() {
  const inputs = {
    cm0: 0.04,
    cmAlphaPerRad: 0,
    angleOfAttackDeg: 5.0,
    disturbanceAlphaDeg: 2.0,
  };

  const result = analyzeTrimResponse(inputs);
  const tolerance = 1e-12;

  return {
    id: "zero-slope-boundary",
    title: "Zero-slope boundary",
    inputs,
    expected: {
      cm: 0.04,
      trimAngleDeg: "not available",
      deltaCm: 0,
      disturbanceTendency: "neutral",
    },
    passed:
      Math.abs(result.cm - 0.04) <= tolerance &&
      result.trimAngleDeg === null &&
      Math.abs(result.deltaCm) <= tolerance &&
      result.disturbanceTendency === "neutral",
    tolerance,
    note:
      "A zero slope gives no unique trim angle and must not cause division by zero.",
  };
}

function buildPlot(cm0, cmAlphaPerRad, selectedAngleDeg) {
  const startDeg = -10;
  const endDeg = 10;
  const stepDeg = 1;

  const points = [];

  for (let angleDeg = startDeg; angleDeg <= endDeg; angleDeg += stepDeg) {
    points.push({
      x: angleDeg,
      y: pitchingMomentCoefficient(cm0, cmAlphaPerRad, angleDeg),
    });
  }

  if (!points.some((point) => point.x === selectedAngleDeg)) {
    points.push({
      x: selectedAngleDeg,
      y: pitchingMomentCoefficient(
        cm0,
        cmAlphaPerRad,
        selectedAngleDeg,
      ),
    });
    points.sort((a, b) => a.x - b.x);
  }

  return {
    id: "cm-alpha",
    title: "Cm–alpha relationship",
    xAxis: {
      label: "Angle of attack",
      unit: "deg",
    },
    yAxis: {
      label: "Pitching-moment coefficient",
      unit: "",
    },
    series: [
      {
        id: "cm",
        label: "Cm(alpha)",
        points,
      },
    ],
    regions: [],
    referenceLines: [
      {
        id: "trim-line",
        label: "Cm = 0",
        axis: "y",
        value: 0,
      },
    ],
  };
}

export const feature = {
  contractVersion: 4,
  id: "trim-response",
  title: "Live Cm–alpha relationship and trim",
  description:
    "Evaluates the simplified linear pitching-moment relationship, trim angle, and small-disturbance tendency.",
  category: "Stability · Student feature",
  learningMode: "concept",
  topicId: "stability",
  inputKeys: INPUT_KEYS,
  requiresCapabilities: [
    {
      id: REQUIRED_CAPABILITY_ID,
      version: REQUIRED_CAPABILITY_VERSION,
    },
  ],
  providesCapabilities: [
    {
      id: "stability.pitch.cm-alpha",
      version: 1,
    },
  ],
  assumptions: [
    "The Cm–alpha relationship is linear over the investigated range.",
    "The model is quasi-static and represents a small disturbance about the selected condition.",
    "Cm0 and Cm_alpha represent the same aircraft configuration and flight condition.",
    "Positive pitching moment and positive angle of attack are nose-up.",
  ],
  validityLimits: [
    "Do not use the linear relationship at stall, at large angle of attack, or where aerodynamic coefficients are strongly nonlinear.",
    "The model does not calculate a time history, damping, control motion, or handling quality.",
    "A restoring tendency is not proof of acceptable safety, controllability, or flightworthiness.",
    "The calculated trim angle is meaningful only when the linear model remains valid at that angle.",
  ],
  simulation: {
    display: "analysis-only",
    durationS: 1,
    initialState: {},
    controls: {},
    disturbance: {},
  },

  analyze(aircraft, capabilityContext) {
    validateAircraftInputs(aircraft);

    const requiredCapabilityAvailable =
      hasRequiredCapability(capabilityContext);

    if (!requiredCapabilityAvailable) {
  return {
    results: [
      {
        id: "capabilityStatus",
        label: "Required capability",
        value: "not available",
        unit: "",
        precision: 0,
        emphasis: true,
      },
    ],
    verificationCases: [
      {
        id: "required-capability",
        title: "Required capability availability",
        expected:
          "Stage 4 remains locked when loads.pitch.component-sum version 1 is unavailable.",
        passed: requiredCapabilityAvailable === false,
      },
    ],
    decision: {
      question:
        "At the selected angle of attack, is the simplified pitching-moment model trimmed, and does a small angle-of-attack disturbance create a restoring moment tendency?",
      interpretation:
        "The Stage 4 analysis is locked until the required loads.pitch.component-sum capability, version 1 or later, is available.",
      status: "caution",
    },
    plots: [],
    scene: null,
  };
}

    const analysis = analyzeTrimResponse(aircraft);

    const results = [
      {
        id: "cm-alpha",
        label: "Cm(alpha)",
        value: analysis.cm,
        unit: "",
        precision: 6,
        emphasis: true,
      },
      {
        id: "trim-angle",
        label: "Trim angle",
        value:
          analysis.trimAngleDeg === null
            ? "not available"
            : analysis.trimAngleDeg,
        unit: analysis.trimAngleDeg === null ? "" : "deg",
        precision: 4,
      },
      {
        id: "delta-cm",
        label: "Delta Cm",
        value: analysis.deltaCm,
        unit: "",
        precision: 6,
      },
      {
        id: "trimmed",
        label: "Selected condition",
        value: analysis.trimmed ? "trimmed" : "not trimmed",
        unit: "",
        precision: 0,
      },
      {
        id: "disturbance-tendency",
        label: "Disturbance tendency",
        value: analysis.disturbanceTendency,
        unit: "",
        precision: 0,
      },
    ];

    const verificationCases = [
      numericalCase(),
      behavioralCase(),
      boundaryCase(),
    ];

    let interpretation;

    if (analysis.trimmed && analysis.disturbanceTendency === "restoring") {
      interpretation =
        "The selected condition is trimmed within the stated numerical tolerance, and the small disturbance has a restoring tendency in this simplified linear model.";
    } else if (
      analysis.trimmed &&
      analysis.disturbanceTendency === "neutral"
    ) {
      interpretation =
        "The selected condition is trimmed within the stated numerical tolerance, while the disturbance response is neutral in this simplified model.";
    } else if (
      analysis.trimmed &&
      analysis.disturbanceTendency === "destabilizing"
    ) {
      interpretation =
        "The selected condition is trimmed within the stated numerical tolerance, but the disturbance has a destabilizing tendency in this simplified model.";
    } else {
      interpretation =
        "The selected condition is not trimmed within the stated numerical tolerance; the disturbance classification is based only on the linear quasi-static model.";
    }

    return {
      results,
      verificationCases,
      decision: {
        question:
          "At the selected angle of attack, is the simplified pitching-moment model trimmed, and does a small angle-of-attack disturbance create a restoring moment tendency?",
        interpretation,
        status: analysis.disturbanceTendency === "destabilizing"
          ? "caution"
          : "pass",
      },
      plots: [
        buildPlot(
          aircraft.cm0,
          aircraft.cmAlphaPerRad,
          aircraft.angleOfAttackDeg,
        ),
      ],
      scene: null,
    };
  },
};

export const model = {
  kind: "derived",

  evaluate(runtimeContext) {
    const aircraft = runtimeContext?.aircraft;

    if (!aircraft) {
      throw new TypeError("runtimeContext.aircraft is required");
    }

    const analysis = analyzeTrimResponse(aircraft);

    return {
      values: {
        cmAlpha: analysis.cm,
        trimAngleDeg: analysis.trimAngleDeg,
        deltaCm: analysis.deltaCm,
        trimmed: analysis.trimmed,
        disturbanceTendency: analysis.disturbanceTendency,
      },
    };
  },
};