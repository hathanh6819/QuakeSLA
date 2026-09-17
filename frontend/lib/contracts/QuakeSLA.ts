import { createClient } from "genlayer-js";
import { GENLAYER_CHAIN } from "../genlayer/client";

export interface QuakePolicy {
  action_digest: string;
  agreement_id: string;
  assessment_attempts: number;
  beneficiary: string;
  consumed: number;
  consumed_by: string;
  coverage_end_ms: number;
  coverage_start_ms: number;
  created_at_ms: number;
  credit_unit: string;
  event_id: string;
  executor: string;
  max_lat_e4: number;
  max_lon_e4: number;
  max_credit: number;
  min_lat_e4: number;
  min_lon_e4: number;
  min_magnitude_tenths: number;
  owner: string;
  policy_id: number;
  region: string;
  revision: number;
  service: string;
  status: "ACTIVE" | "UNRESOLVED" | "READY" | "DENIED" | "CONSUMED" | "CANCELLED";
  verdict: "UNASSESSED" | "UNRESOLVED" | "APPROVED" | "DENIED";
}

export interface QuakeEvidence {
  event_id?: string;
  event_time_ms?: number;
  latitude_e4?: number;
  longitude_e4?: number;
  magnitude_tenths?: number;
  place?: string;
  reason: string;
  sha256?: string;
  source?: string;
  status?: string;
  verdict?: string;
  kind?: string;
}

export class QuakeSLAContract {
  private address: `0x${string}`;
  private client: ReturnType<typeof createClient>;

  constructor(address: string, account?: string | null) {
    this.address = address as `0x${string}`;
    this.client = createClient({
      chain: GENLAYER_CHAIN,
      ...(account ? { account: account as `0x${string}` } : {}),
    } as Parameters<typeof createClient>[0]);
  }

  async getPolicyCount(): Promise<number> {
    const value = await this.client.readContract({
      address: this.address,
      functionName: "get_policy_count",
      args: [],
    });
    return Number(value);
  }

  async getPolicy(policyId: number): Promise<QuakePolicy> {
    const value = await this.client.readContract({
      address: this.address,
      functionName: "get_policy",
      args: [policyId],
    });
    return JSON.parse(String(value)) as QuakePolicy;
  }

  async getEvidence(policyId: number): Promise<QuakeEvidence | null> {
    const value = String(await this.client.readContract({
      address: this.address,
      functionName: "get_evidence",
      args: [policyId],
    }));
    return value ? JSON.parse(value) as QuakeEvidence : null;
  }
}
