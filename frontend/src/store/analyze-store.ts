import { create } from "zustand";
import type { AnalysisResult } from "@/api/analyze";

interface AnalyzeState {
  url: string;
  result: AnalysisResult | null;
  setUrl: (url: string) => void;
  setResult: (result: AnalysisResult) => void;
}

// Keeps the last URL/result in memory across navigation (e.g. Analyze -> Map -> back
// to Analyze) so the user doesn't lose their analysis. Not persisted to localStorage —
// resets on a full page refresh, which is fine for this session-level convenience.
export const useAnalyzeStore = create<AnalyzeState>((set) => ({
  url: "",
  result: null,
  setUrl: (url) => set({ url }),
  setResult: (result) => set({ result }),
}));
