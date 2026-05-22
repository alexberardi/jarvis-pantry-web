// Type-system contract tests for the structured rejection-finding shape
// introduced in roadmap#18. Verified by `tsc --noEmit`. No runtime test
// framework — these are compile-time assertions.

import type {
  Finding,
  ForgeValidation,
  QuickSubmitResult,
  SubmissionStage,
} from "../pantry";

// ── Section A.1: Finding shape matches #18 envelope ──────────────────────

const fullFinding: Finding = {
  reason_code: "static_analysis_disallowed_primitive",
  severity: "error",
  primitive: "eval",
  file: "commands/turn_lights/command.py",
  line: 42,
  snippet: "result = eval(user_input)",
  doc_url:
    "https://docs.jarvisautomation.dev/pantry/rejections#static_analysis_disallowed_primitive",
};
void fullFinding;

// Manifest-level findings have no file/line/snippet/primitive — only
// reason_code, severity, doc_url, and rule-specific extras.
const manifestFinding: Finding = {
  reason_code: "manifest_bad_semver",
  severity: "error",
  value: "abc",
  doc_url:
    "https://docs.jarvisautomation.dev/pantry/rejections#manifest_bad_semver",
};
void manifestFinding;

// Legacy-unstructured wrapper (per #18's dual-shape reader) carries only
// reason_code + severity + message + doc_url.
const legacyFinding: Finding = {
  reason_code: "legacy_unstructured",
  severity: "error",
  message: "Component 'x': missing required method/property: run",
  doc_url: "https://docs.jarvisautomation.dev/pantry/rejections",
};
void legacyFinding;

// Severity is a literal union — not bare string.
const badSeverity: Finding = {
  reason_code: "x",
  // @ts-expect-error severity must be "error" | "warning"
  severity: "info",
  doc_url: "https://docs.jarvisautomation.dev/",
};
void badSeverity;

// ── Section A.2: QuickSubmitResult drops legacy flat-string lists ────────

const quickSubmitNewShape: QuickSubmitResult = {
  submission_id: 1,
  status: "ok",
  command_name: "cmd",
  version: "1.0.0",
  static_analysis: {
    passed: true,
    findings: [],
    warnings_structured: [],
    checks_passed: 8,
  },
  cost_estimate: null,
};
void quickSubmitNewShape;

const quickSubmitLegacyErrors: QuickSubmitResult = {
  submission_id: 1,
  status: "ok",
  command_name: "cmd",
  version: "1.0.0",
  static_analysis: {
    passed: false,
    findings: [],
    warnings_structured: [],
    // @ts-expect-error legacy `errors: string[]` field is gone after #18 hard-cut
    errors: ["something bad"],
    checks_passed: 0,
  },
  cost_estimate: null,
};
void quickSubmitLegacyErrors;

const quickSubmitLegacyDangerous: QuickSubmitResult = {
  submission_id: 1,
  status: "ok",
  command_name: "cmd",
  version: "1.0.0",
  static_analysis: {
    passed: true,
    findings: [],
    warnings_structured: [],
    // @ts-expect-error legacy `dangerous_patterns: string[]` field is gone
    dangerous_patterns: ["eval()"],
    checks_passed: 8,
  },
  cost_estimate: null,
};
void quickSubmitLegacyDangerous;

// ── Section A.3: SubmissionStage uses Finding arrays ─────────────────────

// Stage with new shape (findings and warnings optional — stage may not have
// run yet).
const stageWithFindings: SubmissionStage = {
  status: "ok",
  findings: [],
  warnings: [],
};
void stageWithFindings;

const stageOmitted: SubmissionStage = { status: "pending" };
void stageOmitted;

const stageLegacy: SubmissionStage = {
  status: "ok",
  // @ts-expect-error legacy stage `errors: string[]` is gone
  errors: ["x"],
};
void stageLegacy;

// ── Section A.4: ForgeValidation uses Finding arrays ─────────────────────

const forgeValidationNew: ForgeValidation = {
  passed: true,
  findings: [],
  warnings: [],
};
void forgeValidationNew;

const forgeValidationLegacy: ForgeValidation = {
  passed: true,
  findings: [],
  warnings: [],
  // @ts-expect-error legacy `dangerous_patterns: string[]` field is gone
  dangerous_patterns: [],
};
void forgeValidationLegacy;

// ── Section A.5: reason_codes optional string array on envelopes ─────────

const quickSubmitWithReasonCodes: QuickSubmitResult = {
  submission_id: 1,
  status: "rejected",
  command_name: "cmd",
  version: "1.0.0",
  static_analysis: {
    passed: false,
    findings: [fullFinding],
    warnings_structured: [],
    reason_codes: ["static_analysis_disallowed_primitive"],
    message: "Static analysis failed",
    checks_passed: 7,
  },
  cost_estimate: null,
};
void quickSubmitWithReasonCodes;

// Element type of reason_codes must be string.
const reasonCodes: string[] = quickSubmitWithReasonCodes.static_analysis
  .reason_codes ?? [];
void reasonCodes;
