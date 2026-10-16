import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export const useConfig = () => useQuery({ queryKey: ["config"], queryFn: async () => (await api.get("/config")).data, staleTime: 60_000 }).data;

export const useCats = () => {
  const c = useConfig();
  return useMemo(() => Object.fromEntries((c?.categories || []).map((x) => [x.slug, x])), [c]);
};

export const useSections = () => {
  const c = useConfig();
  return useMemo(() => Object.fromEntries((c?.sections || []).map((x) => [x.slug, x])), [c]);
};

export const askLogin = () => window.dispatchEvent(new CustomEvent("cfp-login"));
