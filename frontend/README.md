# K-Vibe — K-Culture Travel App (Frontend)

K-Culture 관광 앱 프론트엔드. 한국을 방문하는 외국인 관광객을 위한 서비스.

> **원본 프로젝트**: `k-vibe-tracker` (Next.js 14 monorepo) 에서 프론트엔드만 완전 분리·리팩토링한 버전.  
> 백엔드와 **API로만 통신** — 백엔드를 교체해도 API 스펙만 맞으면 그대로 동작합니다.

---

## Tech Stack

| 역할 | 기술 |
|------|------|
| Framework | Vite 8 + React 19 + TypeScript 6 |
| UI | shadcn/ui (base-nova style) |
| Styling | Tailwind CSS v4 |
| Routing | React Router v7 |
| i18n | react-i18next (ko / en / ja / zh) |
| State | Zustand v5 |
| Server State | TanStack React Query v5 |
| HTTP | axios |
| Icons | lucide-react |
| Map | react-kakao-maps-sdk (Kakao Maps JS SDK) |
| DnD | @dnd-kit/core + @dnd-kit/sortable |

---

## Pages

| Route | 기능 |
|-------|------|
| `/:locale` | 홈 피드 — 트렌딩 장소, 개인화 칩 |
| `/:locale/map` | 지도 검색 — Kakao Maps 실시간 탐색 |
| `/:locale/analyze` | SNS Spot Analyzer — YouTube/SNS 영상 속 장소 추출 |
| `/:locale/persona` | AI 루트 위저드 — 테마·디테일 선택 → 맞춤 루트 생성 |
| `/:locale/route` | 내 루트 — 드래그 재정렬, 완료 체크, 미니맵, 도슨트 |
| `/:locale/radar` | 시설 레이더 — 반경 슬라이더로 주변 시설 탐색 |
| `/:locale/profile` | 프로필 — OAuth 로그인, 저장 장소, 현재 루트 |

지원 locale: `ko` · `en` · `ja` · `zh`

---

## Getting Started

```bash
# 의존성 설치
npm install

# 환경 변수 설정
cp .env.example .env
# .env 파일에 실제 키 입력

# 개발 서버 실행
npm run dev
```

### 환경 변수

```env
VITE_API_BASE_URL=       # 백엔드 API 서버 URL
VITE_SUPABASE_URL=       # Supabase 프로젝트 URL
VITE_SUPABASE_ANON_KEY=  # Supabase anon key
VITE_KAKAO_MAP_KEY=      # Kakao Maps JavaScript API Key
```

> **키 없이도 실행 가능**: `VITE_API_BASE_URL` 없으면 mock 데이터로 자동 폴백, `VITE_KAKAO_MAP_KEY` 없으면 퍼센트 좌표 미리보기로 자동 폴백.

---

## Key Features

### 지도 (MapPage)
- Kakao Maps SDK 실시간 인터랙티브 지도
- 카테고리 다중 필터 + 검색 + 저장한 장소만 보기
- 장소 클릭 시 지도 카메라 이동, 상세 시트(모바일)/다이얼로그(데스크탑)
- 모바일 스와이프로 목록 패널 열기/닫기

### SNS 분석 (AnalyzePage)
- YouTube / Instagram URL 입력 → AI 분석 → 장소 후보 목록
- 개별 장소를 루트에 추가하거나 전체를 한 번에 추가

### 페르소나 루트 (PersonaPage)
- 테마(6개) → 디테일(4개) 선택 → 맞춤 루트 자동 생성
- 생성된 루트를 내 루트에 병합 (기존 스팟 유지)
- 페르소나 생성 스팟에만 도슨트(Headphones) 버튼 표시

### 내 루트 (RoutePage)
- @dnd-kit 드래그 앤 드롭 재정렬
- 완료 체크 (Zustand 전역 동기화 — ProfilePage와 실시간 공유)
- SVG 미니맵 (드래그 pan 지원), Google Maps 길찾기 연동
- 루트 공유 URL (`?route=` base64url 인코딩)

### 시설 레이더 (RadarPage)
- 반경 슬라이더(5단계) + 9개 시설 타입 필터
- 미니맵 핀 클릭 → 앱 내 지도 이동

---

## Project Structure

```
src/
├── api/           # axios 클라이언트 + mock 폴백 (client.ts의 withFallback())
├── blocks/        # 기능 블록 (페이지별 조합 단위)
│   ├── layout/    # AppLayout, TopBar, BottomNav, SidebarNav
│   ├── common/    # CrowdBadge, PlaceCard, ErrorBoundary
│   ├── map/       # MapCanvas, SpotListPanel, PlaceDetailSheet
│   ├── analyze/   # URLInputCard, AnalysisResultList
│   ├── persona/   # DetailStep, ConfirmStep, RouteResult, DocentPlayer
│   ├── route/     # RouteMiniMap, RouteStopList, RouteStopCard
│   ├── radar/     # RadarMapPreview, FacilityCard, FacilityList
│   └── profile/   # ProfileHeader, SavedPlacesGrid, CurrentRouteCard
├── lib/           # 공통 유틸, 훅, localStorage 헬퍼
├── pages/         # 페이지 컴포넌트 (상태 보유 + 블록 조립)
├── store/         # Zustand 스토어 (theme, sidebar, analyze, route-progress 등)
├── types/         # 공유 타입 (Place, Facility, RouteTheme)
└── messages/      # i18n JSON (ko / en / ja / zh)
```

---

## Mock Data & API Fallback

`VITE_API_BASE_URL`이 설정되지 않거나 API 호출이 실패하면 `src/api/client.ts`의 `withFallback()`이 자동으로 mock 데이터를 반환합니다. 개발 환경에서 백엔드 없이도 모든 기능을 체험할 수 있습니다.

---

## License

Private project. All rights reserved.
