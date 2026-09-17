import { describe, expect, it } from "vitest";
import { isConfirmedSuccess, transactionFailureLabel } from "../lib/genlayer/transactionStatus";

describe("transaction status classification", () => {
  it("requires explicit SDK success and a successful execution result", () => {
    expect(isConfirmedSuccess({ phase: "finalized", statusName: "FINALIZED", executionResultName: "FINISHED_WITH_RETURN", successful: true })).toBe(true);
    expect(isConfirmedSuccess({ phase: "finalized", statusName: "FINALIZED", executionResultName: "FINISHED_WITH_RETURN" })).toBe(false);
    expect(isConfirmedSuccess({ phase: "finalized", statusName: "FINALIZED", executionResultName: "FINISHED_WITH_ERROR", successful: false })).toBe(false);
    expect(isConfirmedSuccess({ phase: "decided", statusName: "UNDETERMINED", executionResultName: "FINISHED_WITH_RETURN", successful: false })).toBe(false);
  });

  it("gives actionable terminal-state labels", () => {
    expect(transactionFailureLabel({ phase: "finalized", executionResultName: "FINISHED_WITH_ERROR" })).toBe("Contract execution failed");
    expect(transactionFailureLabel({ phase: "decided", statusName: "UNDETERMINED" })).toBe("Validator result is undetermined");
    expect(transactionFailureLabel({ phase: "decided", statusName: "VALIDATORS_TIMEOUT" })).toBe("Consensus timed out");
    expect(transactionFailureLabel({ phase: "decided", statusName: "CANCELED" })).toBe("Transaction was canceled");
  });
});
