import type { EvidenceHistory, QuakeEvidence, QuakePolicy } from "./contracts/QuakeSLA";

export const confirmationRemainingMs = (policy: Pick<QuakePolicy, "status" | "confirmation_eligible_at_ms">, nowMs: number) =>
  policy.status === "PENDING_CONFIRMATION" ? Math.max(0, policy.confirmation_eligible_at_ms - nowMs) : 0;

export const canConfirmEvidence = (policy: Pick<QuakePolicy, "status" | "confirmation_eligible_at_ms">, nowMs: number) =>
  policy.status === "PENDING_CONFIRMATION" && confirmationRemainingMs(policy, nowMs) === 0;

export const formatRemaining = (remainingMs: number) => {
  if (remainingMs <= 0) return "Ready now";
  const totalMinutes = Math.ceil(remainingMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
};

export const changedEvidenceFields = (history: EvidenceHistory) => {
  const first = history.initial;
  const second = history.confirmation;
  if (!first || !second) return [];
  const fields: (keyof QuakeEvidence)[] = ["magnitude_tenths", "event_time_ms", "latitude_e4", "longitude_e4", "status", "sha256"];
  return fields.filter((field) => first[field] !== second[field]);
};
