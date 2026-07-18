# K-Vibe 프로젝트 — 팀 공유용 한눈에 보기

> 비개발자 팀원에게 "이 프로젝트가 어떻게 생겼고 어떻게 동작하는지" 설명하기 위한 문서입니다.
> 코드 한 줄 없이도 이해할 수 있도록 비유 위주로 작성했습니다.
>
> 💡 아래 도표는 [Mermaid](https://mermaid.live) 문법입니다. VSCode에서는 그대로 미리보기가 뜨고,
> GitHub에 올리면 자동으로 그림으로 렌더링됩니다. 슬라이드에 이미지로 넣고 싶다면 코드 블록 안의
> 내용을 통째로 복사해서 https://mermaid.live 에 붙여넣으면 PNG로 다운로드할 수 있습니다.

---

## 1. 이 앱은 무엇인가 (한 줄 요약)

**외국인 관광객을 위한 K-Culture 여행 앱.** 
"어디 갈지 추천받기 → 내 일정에 담기 → 일정대로 다니기"가 핵심 흐름이고, 
추천을 받는 방법이 4가지(지도 둘러보기 / SNS 영상 분석 / AI 테마 추천 / 주변 편의시설 찾기) 있다고 보면 됩니다.

---

## 2. 앱 동작 시나리오 (사용자가 실제로 하는 일)

```mermaid
flowchart TD
    Start(["📱 앱 실행"]) --> Home["🏠 홈 화면<br/>인기 검색어 + 추천 피드"]

    Home --> Map
    Home --> Analyze
    Home --> Persona
    Home --> Radar
    Home --> Profile

    subgraph 추천받는_4가지_방법[" "]
        Map["🗺️ 지도 둘러보기<br/>주변 추천 장소를 카테고리별로 탐색"]
        Analyze["📹 SNS 영상 분석<br/>유튜브·인스타 링크 넣으면<br/>영상에 나온 장소를 찾아줌"]
        Persona["✨ AI 테마 추천<br/>여행 테마(카페투어/사진맛집 등) 선택하면<br/>반나절 코스를 자동으로 짜줌"]
        Radar["📍 주변 편의시설<br/>화장실·ATM·약국 등을<br/>반경 내에서 찾기"]
    end

    Map -- "장소 클릭 → 상세보기" --> MapDetail["저장하기 ❤️ / 내 루트에 추가 ➕"]
    Analyze -- "분석 결과 카드" --> AnalyzeDetail["지도에서 보기 / 내 루트에 추가 ➕"]
    Persona -- "테마→취향→확인" --> PersonaDetail["코스 자동 생성 → 내 루트에 추가 ➕"]
    Radar -- "시설 클릭" --> RadarDetail["앱 내 지도로 이동 / 구글맵 외부 이동"]

    MapDetail --> Route
    AnalyzeDetail --> Route
    PersonaDetail --> Route

    Route["🧳 내 루트<br/>담은 장소들의 일정표<br/>(순서 변경·시간 자동계산·완료체크·공유)"]

    Profile["👤 프로필<br/>로그인(구글/애플/카카오)<br/>저장한 장소 · 내 루트 진행상황"]
    Route -. "진행 상황 동기화" .-> Profile
    Profile -. "이어서 보기" .-> Route

    Route --> Travel(["🚶 실제로 그 일정대로 여행<br/>장소 도착마다 완료 체크"])
```

**핵심 포인트**: 지도/SNS분석/AI추천 3개 화면은 "추천받는 방법"만 다를 뿐, 결국 전부
**"내 루트"** 화면 하나로 모입니다. 즉 사용자 입장에선 "어떤 방법으로 찾았든 결국 한 곳(내 루트)에
모아서 일정처럼 관리한다"가 이 앱의 본질입니다.

---

## 3. 폴더 구조와 각 폴더의 역할

`src/` 안에 있는 폴더들을 "건축"에 비유하면 이렇습니다.

| 폴더 | 비유 | 실제 역할 |
|------|------|----------|
| `pages/` | **완성된 7개의 방(화면)** | 사용자가 실제로 보는 화면 단위. 홈/지도/SNS분석/AI추천/내루트/주변시설/프로필 |
| `blocks/` | **방을 채우는 가구(조립 부품)** | 화면 하나를 구성하는 카드, 목록, 버튼 묶음 등 — 여러 화면이 같은 가구를 재사용하기도 함 |
| `components/ui/` | **가구를 만드는 기본 자재(못, 나사, 판자)** | 버튼/카드 틀처럼 가장 작은 기본 부품. 외부 도구(shadcn)가 자동으로 만들어준 것이라 직접 수정 안 함 |
| `api/` | **외부와 연락하는 창구(전화 상담원)** | 서버(백엔드)에 "장소 목록 줘" 같은 요청을 보내고 응답을 받아오는 곳. 서버가 아직 없을 땐 미리 준비된 가짜 데이터로 대신 응답 |
| `lib/` | **눈에 안 보이는 계산 담당 직원** | 화면엔 안 나오지만 "도보 몇 분 걸리는지 계산", "즐겨찾기 저장" 같은 로직 모음 |
| `store/` | **여러 방이 공유하는 게시판** | 다크모드 on/off처럼 여러 화면이 동시에 알아야 하는 정보를 붙여두는 곳 |
| `types/` | **서류 양식** | "장소 데이터는 이름·주소·좌표가 있어야 한다" 같은 데이터의 정해진 모양 |
| `messages/` | **번역기** | 한국어/영어/일본어/중국어 4개 언어의 화면 문구 모음 |
| `router/` | **안내 데스크** | 주소창의 URL을 보고 "이 손님은 몇 호실(어느 화면)로 안내할지" 결정 |
| `assets/` | **로고·아이콘 보관함** | 로고 이미지 등 |

### 파일 간 관계 (누가 누구를 불러 쓰는가)

**기준(출발점)은 `pages/`입니다.** "화면이 필요한 부품을 가져다 쓴다"는 한 방향으로만 읽으면 됩니다 —
아래로 내려갈수록 더 작고 공통적인 부품이고, 화살표는 항상 **위(화면) → 아래(부품/도구)** 로만 흐릅니다.
(`router/`/`messages/`는 모든 화면에 걸쳐 쓰이는 보조 도구라 다이어그램에서는 빼고 위 표로만 설명합니다.)

```mermaid
flowchart TD
    subgraph S1["1층 · 화면"]
        Pages["📦 pages/ (기준)<br/>화면 7개 — 여기서 출발"]
    end

    subgraph S2["2층 · 화면을 조립하는 부품"]
        Blocks["blocks/<br/>가구"]
    end

    subgraph S3["3층 · 화면·부품이 공통으로 쓰는 도구"]
        UI["components/ui/<br/>기본 자재"]
        Lib["lib/<br/>계산 담당"]
        Api["api/<br/>외부 연락 창구"]
        Store["store/<br/>공유 게시판"]
    end

    subgraph S4["4층 · 모두가 따르는 공통 규격"]
        Types["types/<br/>서류 양식"]
    end

    Pages --> Blocks
    Pages --> Lib
    Pages --> Api
    Pages --> Store

    Blocks --> UI
    Blocks --> Lib
    Blocks --> Store

    UI --> Types
    Lib --> Types
    Api --> Types
```

즉 작은 부품(`lib/`, `types/`, `components/ui/`)은 자기를 누가 쓰는지 전혀 모르고, 화면(`pages/`)이
필요한 부품들을 가져다 조립하는 구조입니다. 그래서 부품 하나를 고쳐도 영향 범위가 예측 가능합니다.
(참고: `blocks/` 안에서도 큰 부품이 작은 부품을 가져다 쓰는 경우가 있습니다 — 예를 들어 지도 화면의
"장소 목록" 부품이 "카테고리 필터" 부품을 안에 품고 있는 식. 같은 층 안에서의 재사용이라 위 도표에서는
생략했습니다.)

### 실제 예시 — 7개 화면 전부 살펴보기

화면 본체(`pages/`) 하나만 보면 안 되고, 이렇게 여러 부품이 조립돼서 만들어진다는 걸 보여드리는
예시입니다. 7개 화면 전부 똑같은 패턴(화면 → 조립부품 + 데이터창구 + 계산담당)으로 만들어져
있습니다.

---
#### ① 홈 (`LandingPage`)


```mermaid
flowchart LR
    LandingPage["pages/LandingPage.tsx<br/>(홈 화면 본체)"]

    LandingPage --> HomeFeed["blocks/landing/home-feed.tsx<br/>추천 피드"]
    LandingPage --> Trending["blocks/landing/trending-keywords.tsx<br/>인기 검색어"]
    LandingPage --> TopBar["blocks/layout/top-bar.tsx 등<br/>공통 헤더·메뉴"]
    LandingPage --> HelpStore0["store/page-help-store.ts<br/>도움말 내용 등록"]

    HomeFeed --> PlaceCard["blocks/common/place-card.tsx<br/>장소 카드"]
    HomeFeed --> PersonaChip["blocks/landing/persona-chip.tsx<br/>개인화 칩"]
    HomeFeed --> FetchHomePlaces["api/places.ts<br/>추천 장소 데이터 요청"]
    HomeFeed --> PersonaPref["lib/persona-preference.ts<br/>내 취향 기억하기"]

    Trending --> FetchTrending["api/trending.ts<br/>인기 검색어 데이터 요청"]
```

---
#### ② 지도 (`MapPage`)

```mermaid
flowchart LR
    MapPage["pages/MapPage.tsx<br/>(지도 화면 본체)"]

    MapPage --> MapCanvas["blocks/map/map-canvas.tsx<br/>실제 지도 그리기"]
    MapPage --> SpotList["blocks/map/spot-list-panel.tsx<br/>검색+필터+장소목록"]
    MapPage --> DetailSheet["blocks/map/place-detail-sheet.tsx<br/>장소 클릭 시 상세창"]

    MapPage --> FetchPlaces["api/places.ts<br/>주변 장소 데이터 요청"]
    MapPage --> Location["lib/use-current-location.ts<br/>내 위치 가져오기"]
    MapPage --> SavedPlaces["lib/saved-places.ts<br/>저장 목록 읽기/쓰기"]
    MapPage --> HelpStore1["store/page-help-store.ts<br/>도움말 버튼 내용 등록"]

    SpotList --> CategoryFilter["blocks/map/category-filter.tsx<br/>카테고리 칩"]
    SpotList --> Loading1["blocks/common/loading-skeleton.tsx<br/>로딩 중 표시"]
    DetailSheet --> RouteDraft1["lib/route-draft.ts<br/>내 루트에 담기"]
```

---
#### ③ SNS 영상 분석 (`AnalyzePage`)

```mermaid
flowchart LR
    AnalyzePage["pages/AnalyzePage.tsx<br/>(SNS 분석 화면 본체)"]

    AnalyzePage --> UrlInput["blocks/analyze/url-input-card.tsx<br/>URL 입력+썸네일"]
    AnalyzePage --> AnalyzeLoading["blocks/analyze/analysis-loading.tsx<br/>분석 중 애니메이션"]
    AnalyzePage --> ResultList["blocks/analyze/analysis-result-list.tsx<br/>결과 카드 목록"]

    AnalyzePage --> FetchAnalyze["api/analyze.ts<br/>영상→장소 분석 요청"]
    AnalyzePage --> RouteDraft2["lib/route-draft.ts<br/>내 루트에 담기"]
    AnalyzePage --> AnalyzeStore["store/analyze-store.ts<br/>분석결과 기억<br/>(다른 화면 갔다와도 유지)"]

    UrlInput --> Youtube["lib/youtube.ts<br/>영상 링크 해석"]
```

---
#### ④ AI 테마 추천 (`PersonaPage`)

```mermaid
flowchart LR
    PersonaPage["pages/PersonaPage.tsx<br/>(AI 추천 화면 본체)"]

    PersonaPage --> ThemeStep["blocks/persona/theme-step.tsx<br/>① 테마 선택"]
    PersonaPage --> DetailStep["blocks/persona/detail-step.tsx<br/>② 취향 선택"]
    PersonaPage --> ConfirmStep["blocks/persona/confirm-step.tsx<br/>③ 확인"]
    PersonaPage --> RouteResult["blocks/persona/route-result.tsx<br/>생성된 코스 결과"]

    PersonaPage --> FetchRoutes["api/routes.ts<br/>코스 자동생성 요청"]
    PersonaPage --> RouteDraft3["lib/route-draft.ts<br/>내 루트에 담기"]
    PersonaPage --> PersonaPref2["lib/persona-preference.ts<br/>취향 저장→홈 추천에 반영"]

    RouteResult --> CrowdBadge["blocks/common/crowd-badge.tsx<br/>혼잡도 표시"]
```

---
#### ⑤ 주변 편의시설 (`RadarPage`)

```mermaid
flowchart LR
    RadarPage["pages/RadarPage.tsx<br/>(주변 편의시설 화면 본체)"]

    RadarPage --> RadiusSlider["blocks/radar/radius-slider.tsx<br/>반경 설정"]
    RadarPage --> FilterTabs["blocks/radar/facility-filter-tabs.tsx<br/>화장실·ATM 등 필터"]
    RadarPage --> RadarMapPreview["blocks/radar/radar-map-preview.tsx<br/>주변 미니지도"]
    RadarPage --> FacilityList["blocks/radar/facility-list.tsx<br/>시설 목록"]

    RadarPage --> FetchFacilities["api/facilities.ts<br/>주변 시설 데이터 요청"]
    RadarPage --> CurrentLocation["lib/use-current-location.ts<br/>내 위치 가져오기"]

    FacilityList --> FacilityCard["blocks/radar/facility-card.tsx<br/>시설 카드 1개"]
```

---
#### ⑥ 내 루트 (`RoutePage`)

```mermaid
flowchart LR
    RoutePage["pages/RoutePage.tsx<br/>(내 루트 화면 본체)"]

    RoutePage --> MiniMap["blocks/route/route-mini-map.tsx<br/>내 루트 미니지도"]
    RoutePage --> LocationCheck["blocks/route/route-location-check.tsx<br/>다음 장소까지 거리"]
    RoutePage --> StopList["blocks/route/route-stop-list.tsx<br/>일정 목록(드래그 정렬)"]

    RoutePage --> RouteDraft4["lib/route-draft.ts<br/>저장된 루트 불러오기"]
    RoutePage --> RouteSchedule["lib/route-schedule.ts<br/>도착시간 자동 계산"]
    RoutePage --> RouteShare["lib/route-share.ts<br/>공유 링크 만들기"]
    RoutePage --> ProgressStore["store/route-progress-store.ts<br/>완료 체크<br/>(프로필과 공유)"]

    StopList --> StopCard["blocks/route/route-stop-card.tsx<br/>장소 카드 1개"]
    StopList --> DayDivider["blocks/route/day-divider.tsx<br/>'1일차' 구분선"]
```

---
#### ⑦ 프로필 (`ProfilePage`)

```mermaid
flowchart LR
    ProfilePage["pages/ProfilePage.tsx<br/>(프로필 화면 본체)"]

    ProfilePage --> ProfileHeader["blocks/profile/profile-header.tsx<br/>아바타+이름+통계"]
    ProfilePage --> SavedGrid["blocks/profile/saved-places-grid.tsx<br/>저장한 장소 모음"]
    ProfilePage --> RouteCard["blocks/profile/current-route-card.tsx<br/>진행중인 루트 요약"]
    ProfilePage --> Settings["blocks/profile/settings-list.tsx<br/>언어·알림 설정"]
    ProfilePage --> LoginModal["blocks/profile/login-modal.tsx<br/>로그인 팝업"]

    SavedGrid --> SavedPlacesLib["lib/saved-places.ts<br/>저장 목록 읽기/쓰기"]
    RouteCard --> ProgressStore2["store/route-progress-store.ts<br/>루트 화면과 진행상황 공유"]
```

---

## 4. 발표 팁

- 2번(시나리오 플로우맵)을 먼저 보여주면서 **"앱이 뭘 하는지"**를 설명하고,
- 그다음 3번(폴더 구조)으로 넘어가서 **"그 화면들이 코드상으로 어떻게 나뉘어 있는지"**를 설명하는 순서를 추천합니다.
- "내 루트가 모든 추천 기능의 종착지"라는 한 문장이 이 앱 전체를 설명하는 가장 쉬운 한 줄입니다.
