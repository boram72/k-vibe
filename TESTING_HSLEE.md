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

로컬 개발에서는 `VITE_API_BASE_URL=/backend`와 `frontend/vite.config.ts` proxy를 통해 `localhost:8000` 백엔드로 연결된다.

다른 백엔드 포트로 테스트할 때는 프론트 실행 전에 프록시 대상만 바꿀 수 있다.

```bash
VITE_PROXY_BACKEND_URL=http://127.0.0.1:8001 npm run dev -- --host 127.0.0.1 --port 5174
```

Windows PowerShell:

```powershell
$env:VITE_PROXY_BACKEND_URL = 'http://127.0.0.1:8001'
npm run dev -- --host 127.0.0.1 --port 5174
```

## 4. 기능 확인 순서

1. `/ko/persona`에서 BTS뷔, 아이유, 제니, 장원영 중 하나를 선택
2. 생성 결과에서 `루트에 추가`
3. `/ko/route`에서 오디오 가이드 버튼 확인
4. `/ko/analyze`에서 YouTube 예시 URL 분석
5. 분석 결과를 지도 또는 루트에 추가

## 5. 이번 연결 범위

- `POST /routes/generate`: 페르소나 기반 루트 생성
- `GET /personas`: K-콘텐츠 페르소나 선택 목록
- `POST /analyze`: YouTube URL 백엔드 분석 흐름
- `GET /docent/{name}`: 장소별 도슨트 음성 URL 또는 안내 스크립트 조회
