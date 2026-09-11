import axios from "axios";
import { create } from "zustand";
import { fetchAnalysis, type AnalysisResult } from "@/api/analyze";
import type { Locale } from "@/i18n";

export type AnalyzeStatus = "idle" | "running" | "success" | "error";
export type AnalyzeErrorKind = "timeout" | "generic";

interface AnalyzeState {
  url: string;
  result: AnalysisResult | null;
  status: AnalyzeStatus;
  // 0-100, 실제 서버 진행률 신호가 없는 단일 요청/응답 구조라 시간 기반으로
  // 점근적으로 오르는 가짜 값(startAnalysis 참고). 완료 시 100으로 마무리.
  progress: number;
  errorKind: AnalyzeErrorKind | null;
  // 성공/실패 이후 전역 완료 배너(analysis-completion-banner.tsx)를 아직 안
  // 봤는지. true면 배너를 안 띄움 — 결과를 보러 가거나 닫기를 누르면 true로.
  completionSeen: boolean;
  setUrl: (url: string) => void;
  clearResult: () => void;
  // 2026-09: 분석을 컴포넌트에 묶인 react-query useMutation 대신 이 store의
  // 액션으로 옮겼다 — 여기서 시작한 fetch Promise는 AnalyzePage가 언마운트
  // (다른 탭/홈으로 이동)돼도 계속 진행되고, 끝나면 store 상태만 갱신하므로
  // 어느 화면에 있든 진행률·완료 배너가 반영된다(사용자 요청: "다른 탭이나
  // 홈을 볼 수 있게").
  startAnalysis: (targetUrl: string, locale: Locale) => void;
  acknowledgeCompletion: () => void;
}

// setInterval 핸들을 store 밖(모듈 스코프)에 둬서, 이 store를 구독하는 컴포넌트가
// 몇 개든 타이머는 항상 하나만 돈다.
let progressTimer: ReturnType<typeof setInterval> | null = null;

function stopProgressTimer() {
  if (progressTimer !== null) {
    clearInterval(progressTimer);
    progressTimer = null;
  }
}

// 92%에서 점근(절대 100%에 안 닿음) — 실제 응답이 오면 그때 100%로 마무리한다.
// analysis-loading-spotlight.tsx(#38)가 쓰던 것과 같은 "체감 진행률" 공식을
// 재사용하되, 타임아웃이 90초 -> 120초로 늘어난 만큼 반감기도 맞춰 늘렸다.
const PROGRESS_CAP = 92;
const PROGRESS_HALF_LIFE_MS = 25000;

function isTimeoutError(err: unknown): boolean {
  return axios.isAxiosError(err) && err.code === "ECONNABORTED";
}

export const useAnalyzeStore = create<AnalyzeState>((set, get) => ({
  url: "",
  result: null,
  status: "idle",
  progress: 0,
  errorKind: null,
  completionSeen: true,
  setUrl: (url) => set({ url }),
  clearResult: () =>
    set({ result: null, status: "idle", progress: 0, errorKind: null }),

  startAnalysis: (targetUrl, locale) => {
    if (get().status === "running") return; // 이미 하나 도는 중이면 중복 실행 방지
    stopProgressTimer();

    const startedAt = Date.now();
    set({ status: "running", progress: 2, errorKind: null, completionSeen: true });

    progressTimer = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const next = PROGRESS_CAP * (1 - Math.pow(0.5, elapsed / PROGRESS_HALF_LIFE_MS));
      set({ progress: Math.round(next) });
    }, 400);

    fetchAnalysis(targetUrl, locale)
      .then((data) => {
        stopProgressTimer();
        set({ status: "success", progress: 100, result: data, completionSeen: false });
      })
      .catch((err) => {
        stopProgressTimer();
        set({
          status: "error",
          progress: 0,
          errorKind: isTimeoutError(err) ? "timeout" : "generic",
          completionSeen: false,
        });
      });
  },

  acknowledgeCompletion: () => set({ completionSeen: true }),
}));
