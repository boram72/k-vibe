import axios from "axios";
import { create } from "zustand";
import { fetchAnalysis, type AnalysisResult } from "@/api/analyze";
import { getCannedAnalysis } from "@/blocks/analyze/popular-videos.data";
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
  // 성공/실패 이후 전역 완료 토스트(analysis-completion-toast.tsx)를 아직 안
  // 봤는지. true면 토스트를 안 띄움 — 결과를 보러 가거나 닫기를 누르면 true로.
  completionSeen: boolean;
  setUrl: (url: string) => void;
  clearResult: () => void;
  // URL까지 전부 지우고 처음(idle) 화면으로 되돌리는 "초기화" 버튼용 — 분석
  // 상태가 이 store에 있어서 라우트를 이동해도 유지되기 때문에(아래 startAnalysis
  // 주석), 뒤로가기/메뉴 재탭만으로는 결과 화면에서 못 빠져나와 추가했다(사용자
  // 요청). 분석이 도는 중이었다면 그 결과는 버린다(currentRunId 참고).
  reset: () => void;
  // 2026-09: 분석을 컴포넌트에 묶인 react-query useMutation 대신 이 store의
  // 액션으로 옮겼다 — 여기서 시작한 fetch Promise는 AnalyzePage가 언마운트
  // (다른 탭/홈으로 이동)돼도 계속 진행되고, 끝나면 store 상태만 갱신하므로
  // 어느 화면에 있든 진행률·완료 배너가 반영된다(사용자 요청: "다른 탭이나
  // 홈을 볼 수 있게").
  startAnalysis: (targetUrl: string, locale: Locale) => void;
  // "이 유튜브를 많이 검색해요" 카드(popular-videos.tsx) 6개 전용 — 무료 AI
  // 토큰을 아끼려고 실제 /analyze를 호출하지 않고 popular-videos.data.ts에
  // 저장된 데이터를 반환한다. 다만 바로 뜨면 저장된 데이터 티가 나서(사용자
  // 지적) startAnalysis와 동일한 체감 진행률 애니메이션을 몇 초 보여준 뒤
  // 완료 처리한다. videoId가 canned 목록에 없으면 아무 것도 하지 않음 —
  // 호출부(AnalyzePage)가 미리 isCannedAnalysisVideo로 걸러준다.
  startCannedAnalysis: (videoId: string, locale: Locale) => void;
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

// canned(popular-videos) 경로 전용 — 실제 응답을 기다리는 게 아니라 정해진
// 시간(CANNED_DELAY_MS) 뒤에 무조건 완료 처리한다. 실제 분석이 약 14초 걸렸던
// 것과 다르게, 여기선 0%에서 100%까지 8초 동안 선형으로 채운다(사용자 요청:
// "8초안에 0부터 100까지 프로그래스바 올라가도록"). startAnalysis의 점근
// 곡선(절대 100%에 안 닿는 방식)과 달리 정확한 완료 시점이 정해져 있어
// 선형이 더 자연스럽다.
const CANNED_DELAY_MS = 8000;
const CANNED_PROGRESS_TICK_MS = 100;

// startAnalysis/startCannedAnalysis가 시작될 때마다, 그리고 reset()에서도
// 올린다 — 각 실행이 끝나는 시점에 자기 번호가 아직 현재 번호인지 확인해서,
// 초기화된 뒤에 뒤늦게 도착한 옛 분석 결과가 방금 비운 화면을 다시 채우지
// 못하게(그리고 그 사이 새로 시작한 분석의 타이머를 끄지 못하게) 한다.
let currentRunId = 0;

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
  reset: () => {
    currentRunId++;
    stopProgressTimer();
    set({
      url: "",
      result: null,
      status: "idle",
      progress: 0,
      errorKind: null,
      completionSeen: true,
    });
  },

  startAnalysis: (targetUrl, locale) => {
    if (get().status === "running") return; // 이미 하나 도는 중이면 중복 실행 방지
    stopProgressTimer();
    const runId = ++currentRunId;

    const startedAt = Date.now();
    set({ status: "running", progress: 2, errorKind: null, completionSeen: true });

    progressTimer = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const next = PROGRESS_CAP * (1 - Math.pow(0.5, elapsed / PROGRESS_HALF_LIFE_MS));
      set({ progress: Math.round(next) });
    }, 400);

    fetchAnalysis(targetUrl, locale)
      .then((data) => {
        if (runId !== currentRunId) return; // 그 사이 초기화됨 — 옛 결과는 버린다
        stopProgressTimer();
        set({ status: "success", progress: 100, result: data, completionSeen: false });
      })
      .catch((err) => {
        if (runId !== currentRunId) return;
        stopProgressTimer();
        set({
          status: "error",
          progress: 0,
          errorKind: isTimeoutError(err) ? "timeout" : "generic",
          completionSeen: false,
        });
      });
  },

  startCannedAnalysis: (videoId, locale) => {
    if (get().status === "running") return;
    const canned = getCannedAnalysis(videoId, locale);
    if (!canned) return;
    stopProgressTimer();
    const runId = ++currentRunId;

    const startedAt = Date.now();
    set({ status: "running", progress: 2, errorKind: null, completionSeen: true });

    progressTimer = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const next = Math.min(99, (elapsed / CANNED_DELAY_MS) * 100);
      set({ progress: Math.round(next) });
    }, CANNED_PROGRESS_TICK_MS);

    setTimeout(() => {
      if (runId !== currentRunId) return;
      stopProgressTimer();
      set({
        status: "success",
        progress: 100,
        result: { videoId, source: "popular", ...canned },
        completionSeen: false,
      });
    }, CANNED_DELAY_MS);
  },

  acknowledgeCompletion: () => set({ completionSeen: true }),
}));
