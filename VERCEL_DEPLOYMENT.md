# Vercel Preview Deployment

이 저장소는 루트 아래에 `frontend/`와 `backend/`가 나뉜 구조다. Vercel 프로젝트가 저장소 루트를 기준으로 빌드될 때도 Preview 배포가 실패하지 않도록 루트의 `vercel.json`에서 프론트 빌드 경로를 지정한다.

## 확인할 Vercel 설정

- Root Directory: 저장소 루트
- Install Command: `cd frontend && npm ci`
- Build Command: `cd frontend && npm run build`
- Output Directory: `frontend/dist`

위 값은 `vercel.json`에 포함되어 있으므로, Vercel Dashboard에서 별도 override가 걸려 있다면 override를 지우거나 같은 값으로 맞춘다.

## 프론트 API 환경변수

Vercel Preview/Production에서는 로컬 프록시인 `/backend` 대신 배포된 백엔드 주소를 사용한다.

```text
VITE_API_BASE_URL=https://<render-backend-url>
```

Render 백엔드 주소를 아직 확정하지 않았다면 프론트는 실패 시 로컬 후보 데이터로 동작하지만, 팀 공유 테스트에서는 실제 백엔드 주소를 Vercel 환경변수에 넣는 편이 가장 명확하다.

## 백엔드 AI 환경변수

SNS YouTube 분석은 백엔드에서 Groq를 우선 사용하고, 키가 없거나 응답 파싱에 실패하면 후보 분석으로 내려간다. Render 백엔드 환경변수에 아래 값을 추가한다.

```text
GROQ_API_KEY=gsk_...
```

실제 키는 `.env`나 Render Dashboard에만 넣고 GitHub에는 올리지 않는다.
