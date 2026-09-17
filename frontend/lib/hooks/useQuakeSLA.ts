"use client";

import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getContractAddress } from "../genlayer/client";
import { useWallet } from "../genlayer/wallet";
import { QuakeSLAContract } from "../contracts/QuakeSLA";

export function useQuakeContract() {
  const { address } = useWallet();
  const contractAddress = getContractAddress();
  return useMemo(
    () => contractAddress ? new QuakeSLAContract(contractAddress, address) : null,
    [contractAddress, address],
  );
}

export function usePolicyCount() {
  const contract = useQuakeContract();
  return useQuery({
    queryKey: ["quake-policy-count"],
    queryFn: () => contract!.getPolicyCount(),
    enabled: !!contract,
    refetchInterval: 15000,
  });
}

export function usePolicy(policyId: number) {
  const contract = useQuakeContract();
  return useQuery({
    queryKey: ["quake-policy", policyId],
    queryFn: async () => ({
      policy: await contract!.getPolicy(policyId),
      evidence: await contract!.getEvidence(policyId),
    }),
    enabled: !!contract && policyId > 0,
    retry: false,
  });
}

export function useRefreshQuakeData() {
  const client = useQueryClient();
  return () => {
    void client.invalidateQueries({ queryKey: ["quake-policy-count"] });
    void client.invalidateQueries({ queryKey: ["quake-policy"] });
  };
}

