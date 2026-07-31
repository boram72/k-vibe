# hslee 테스트 안내

이 브랜치는 `boram72/k-vibe`의 통합 구조를 기준으로 작업하고, 테스트 공유는 `hslee1026/k-vibe-tracker` 원격의 별도 브랜치로 진행한다.

## 1. 환경변수

실제 키는 GitHub에 올리지 않는다. 아래 파일을 각자 로컬에 만든다.

```text
frontend/.env
backend/.env
```

예시 파일:

```text
frontend/.env.example
backend/.env.example
```

YouTube SNS 분석을 Groq로 확인하려면 `backend/.env`에 `GROQ_API_KEY`를 추가한다. 키가 없으면 로컬 후보 분석으로 동작한다.

## 2. 백엔드 실행

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

확인:

```text
http://localhost:8000/health
http://localhost:8000/docs
```

## 3. 프론트 실행

```bash
cd frontend
npm install
npm run dev
```

확인:

```text
http://localhost:5173/ko
http://localhost:5173/ko/persona
http://localhost:5173/ko/analyze
http://localhost:5173/ko/route
```

로컬 개발에서는 반드시 `http://localhost:5173`으로 확인한다. Kakao Maps JavaScript 키의 로컬 허용 도메인이 `localhost:5173` 기준이라 `127.0.0.1`이나 다른 포트로 열면 지도 타일이 뜨지 않을 수 있다.

`VITE_API_BASE_URL=/backend`와 `frontend/vite.config.ts` proxy를 통해 `localhost:8000` 백엔드로 연결된다.

다른 백엔드 포트로 테스트할 때는 프론트 실행 전에 프록시 대상만 바꿀 수 있다. 단, 지도까지 함께 확인하려면 Kakao 개발자 콘솔의 JavaScript 허용 도메인도 같은 호스트/포트로 맞춘다.

```bash
VITE_PROXY_BACKEND_URL=http://127.0.0.1:8001 npm run dev
```

Windows PowerShell:

```powershell
$env:VITE_PROXY_BACKEND_URL = 'http://127.0.0.1:8001'
npm run dev
```

## 4. 기능 확인 순서

기존 루트 데이터가 남아 있으면 `/ko/route`에서 `루트 초기화` 후 테스트하면 결과를 더 쉽게 볼 수 있다.

1. `/ko` 홈에서 주변 K-스팟과 트렌딩 키워드가 표시되는지 확인
2. `/ko/map`에서 Kakao 지도 타일과 주변 스팟 목록이 표시되는지 확인
3. `/ko/persona`에서 BTS뷔, 아이유, 제니, 장원영 중 하나를 선택
4. 생성 결과에서 `루트에 추가`
5. `/ko/route`에서 루트 미니맵이 Kakao 지도 위에 번호 핀과 경로선을 표시하는지 확인
6. `/ko/analyze`에서 YouTube 예시 URL 분석
7. 분석 결과에서 `루트에 모두 추가`
8. `/ko/route` 루트 미니맵에 Kakao 지도 타일이 뜨는지 확인
9. `/ko/radar`에서 편의시설 목록과 레이더 미리보기가 표시되는지 확인

## 5. 이번 연결 범위

- `POST /routes/generate`: 페르소나 기반 루트 생성
- `GET /personas`: K-콘텐츠 페르소나 선택 목록
- `POST /analyze`: YouTube URL 백엔드 분석 흐름
- `GET /docent/{name}`: 장소별 도슨트 음성 URL 또는 안내 스크립트 조회
- `POST /docent/{name}/voice`: TTS 음성 생성 요청 진입점. provider 미설정 시 `tts-pending`으로 응답
- `GET /places`: 홈/지도 주변 스팟 조회
- `GET /trending`: 홈 트렌딩 키워드 조회
- `GET /amenities`: 편의시설 레이더 조회

## 6. 2026-07-23 확인 결과

- 홈(`/ko`): `/places`, `/trending` 백엔드 연결 확인. 콘솔 경고 없음.
- 지도(`/ko/map`): Kakao 지도 타일 렌더링 확인. 주변 스팟 목록 표시.
- SNS 분석(`/ko/analyze`): YouTube 예시 URL 분석 시 `Groq AI` 결과 표시 확인.
- SNS 분석 `지도에서 모두 보기`: `/ko/map`으로 넘긴 분석 장소가 Kakao 지도 타일 위에 표시되는 것 확인.
- SNS 분석 `루트에 모두 추가`: `/ko/route` 루트 미니맵에 Kakao 지도 타일, 번호 핀, 경로선 표시 확인.
- 내 루트(`/ko/route`) `지도에서 보기`: 저장된 전체 루트를 `/ko/map`으로 넘길 때 모든 루트 장소를 기준으로 지도 범위가 맞춰지는 것 확인. 번호 핀/도보 길찾기 외부 링크는 Google Maps를 유지한다.
- 페르소나(`/ko/persona`): BTS뷔 선택 후 5개 방문지 루트 생성 확인.
- 편의시설 레이더(`/ko/radar`): 기본 위치 기준 편의시설 목록과 레이더 미리보기 표시 확인.

## 7. 기능 연결 상태

- 유튜브 영상분석: 프론트 `src/api/analyze.ts`에서 백엔드 `POST /analyze`를 호출한다. 백엔드는 `presentation_api/analyze.py`가 요청을 받고, `business_services/snsAnalysisService.py`가 흐름을 조율한다. YouTube 제목 조회는 `externelAPI_services/youtube.py`, Groq 호출은 `ai_services/groq_client.py`, 프롬프트는 `ai_services/prompttemplate.py`, 기본 후보 매칭은 `data_repositories/analysisCandidateInfo.py`로 분리했다.
- 페르소나 루트: 프론트 `src/api/personas.ts`에서 백엔드 `GET /personas`, `POST /routes/generate`를 호출한다. 백엔드는 `presentation_api/personas.py`, `presentation_api/routes.py`가 요청을 받고, `business_services/personaRouteService.py`가 DB/기본 카탈로그를 조율한다. 페르소나/장소 기본 카탈로그는 `data_repositories/personaCatalogInfo.py`, 이동시간과 스케줄 계산은 `business_services/routingService.py`로 분리했다.
- 도슨트/TTS: 프론트 `src/api/docent.ts`에서 백엔드 `GET /docent/{name}`를 호출한다. 백엔드는 `presentation_api/playDocentVoice.py`가 요청을 받고, `business_services/docentService.py`가 저장된 음성 URL 조회와 스크립트 반환을 조율한다. TTS 생성 요청 진입점은 `POST /docent/{name}/voice`이고, 생성 흐름은 `business_services/createDocentVoice.py`, 외부 TTS 어댑터는 `externelAPI_services/tts.py`, 저장된 음성 URL 조회/업데이트는 `data_repositories/docentinfo.py`로 분리했다.
