import { describe, expect, it } from "vitest";
import { canConfirmEvidence, changedEvidenceFields, confirmationRemainingMs, formatRemaining } from "../lib/evidenceDrift";

describe("evidence revalidation UI rules", () => {
  const pending = { status: "PENDING_CONFIRMATION" as const, confirmation_eligible_at_ms: 10_000 };

  it("blocks confirmation until the on-chain delay expires", () => {
    expect(confirmationRemainingMs(pending, 4_000)).toBe(6_000);
    expect(canConfirmEvidence(pending, 9_999)).toBe(false);
    expect(canConfirmEvidence(pending, 10_000)).toBe(true);
  });

  it("formats reviewer-friendly countdowns", () => {
    expect(formatRemaining(65 * 60_000)).toBe("1h 5m");
    expect(formatRemaining(0)).toBe("Ready now");
  });

  it("reports material and digest drift between receipts", () => {
    expect(changedEvidenceFields({
      initial: { reason: "MATCH", magnitude_tenths: 48, sha256: "a" },
      confirmation: { reason: "MATCH", magnitude_tenths: 50, sha256: "b" },
      confirmation_attempts: 1, confirmation_eligible_at_ms: 1, confirmed_at_ms: 2,
      drift: "MATERIAL_CHANGE_STILL_ELIGIBLE",
    })).toEqual(["magnitude_tenths", "sha256"]);
  });
});
