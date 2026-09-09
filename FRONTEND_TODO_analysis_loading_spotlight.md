# 프론트 TODO: SNS 분석 버튼 클릭 시 로딩 스팟라이트 팝업 연결

**작성일**: 2026-09-09
**대상**: SNS 분석기(AnalyzePage) 담당자
**배경**: PR #38에서 전체화면 로딩 팝업 컴포넌트(`AnalysisLoadingSpotlight`)를 새로 만들어뒀습니다. 실제 분석이 최대 1분 가까이 걸릴 수 있어서(Gemini 영상 분석 + Render 무료 인스턴스 콜드스타트), 지루하지 않게 이목을 끄는 전체화면 팝업으로 설계했습니다. 다만 **AnalyzePage에는 일부러 연결하지 않고 독립 컴포넌트로만 남겨뒀습니다** — 실제 연결은 SNS 분석기를 담당하시는 분이 해주시면 됩니다.

## 컴포넌트 사용법

`frontend/src/blocks/analyze/analysis-loading-spotlight.tsx`, props 없음:

```tsx
import { AnalysisLoadingSpotlight } from '@/blocks/analyze/analysis-loading-spotlight'
```

부모가 "요청 전송 시점~응답 도착 시점"에만 조건부로 마운트하면 그게 곧 열림/닫힘입니다(자체 `open` prop이나 타이머로 닫는 로직 없음 — 순수하게 마운트 여부로만 동작).

## 대상 파일 및 요청 사항

`frontend/src/pages/AnalyzePage.tsx`:

```tsx
const mutation = useMutation({
  mutationFn: (targetUrl: string) => fetchAnalysis(targetUrl, i18n.language as Locale),
  onSuccess: (data) => setResult(data),
})
```

`useMutation`의 `mutation.isPending`은 정확히 "요청을 보낸 시점부터 응답이 온 시점(성공이든 실패든)까지"와 일치합니다 — React Query가 성공/실패 상관없이 응답이 오면 `isPending`을 `false`로 바꿔주기 때문에, 요청하신 "성공/실패 관계없이 응답 오면 팝업 끄기"가 이 조건 하나로 그대로 구현됩니다. 별도 분기 처리 필요 없습니다.

**추가할 부분** (import + 렌더 한 줄):

```tsx
import { AnalysisLoadingSpotlight } from '@/blocks/analyze/analysis-loading-spotlight'
```

```tsx
{mutation.isPending && <AnalysisLoadingSpotlight />}
```

## 기존 `AnalysisLoading`(인라인 체크리스트형)과의 관계

현재 `{mutation.isPending && <AnalysisLoading />}` 줄이 이미 있습니다. 새 컴포넌트는 전체화면 팝업이라 마운트되면 기존 인라인 로딩을 화면상 완전히 덮어버려서, 같이 둬도 기존 것은 안 보이게 됩니다. **기존 줄은 지우고 새 컴포넌트로 교체하는 걸 권장**드리지만, 최종 판단은 담당자분께 맡깁니다(둘 다 필요하다고 보시면 그대로 유지하셔도 무방).

## 검증 체크리스트
- [ ] "스팟 분석" 버튼 클릭 즉시 팝업이 뜨는지
- [ ] 성공 응답 시 팝업이 사라지고 결과 목록이 보이는지
- [ ] 실패 응답 시(네트워크 에러 등)에도 팝업이 사라지고 기존 에러 UI가 보이는지
- [ ] `npx tsc --noEmit` / `npx eslint src` 클린 유지
