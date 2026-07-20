# OAuth 로그인 — 백엔드 중계 방식 연동 요청

**작성일**: 2026-07-20
**대상**: 백엔드 담당자
**배경**: Google/Kakao 로그인 버튼이 지금은 mock(`src/lib/auth.ts`의 `loginWithProvider()`)이라 실제 연결이 안 됩니다. Supabase를 프론트가 직접 호출하는 방식(A) 대신, **백엔드가 OAuth를 중계하는 방식(B)**으로 결정했습니다 — 프론트는 이미 그렇게 설계돼 있음(`getCurrentUser()`/`loginWithProvider()`/`logout()` 내부만 교체하면 되는 구조).

> Apple은 Apple Developer 유료 멤버십이 필요해 제외 — **Google + Kakao 2개만** 대상입니다.

---

## 왜 지금 있는 `/user/login`과 다른 구조가 필요한가

ID/PW 로그인(`/user/signup`, `/user/login`)은 axios POST 한 번으로 끝나지만, OAuth는 **브라우저 전체가 Google/Kakao 로그인 화면으로 이동했다가 돌아오는** 리다이렉트 흐름이라 구조 자체가 다릅니다. 아래 4단계가 필요합니다.

```
① 프론트: 브라우저를 백엔드 /auth/{provider}/start 로 이동시킴 (axios 아님, window.location.href)
② 백엔드: Google/Kakao 로그인 화면으로 리다이렉트
③ 사용자 로그인 완료 → Google/Kakao가 백엔드의 콜백 URL로 리다이렉트 (code 포함)
④ 백엔드: code로 프로필 조회 → user 테이블 upsert → 프론트로 다시 리다이렉트 (신원 정보 포함)
```

---

## 필요한 엔드포인트 2개

### 1. `GET /auth/{provider}/start`

- `{provider}`: `google` | `kakao`
- 쿼리 파라미터: `redirect_uri` — 로그인 끝나고 사용자를 돌려보낼 프론트 URL (예: `http://localhost:5173/auth/callback`)
- 동작: `redirect_uri`를 검증(아래 보안 참고) 후 CSRF 방지용 `state` 값과 함께 서버에 잠시 저장(또는 `state`에 인코딩), Google/Kakao의 OAuth 인증 URL로 302 리다이렉트

### 2. `GET /auth/{provider}/callback?code=...&state=...`

Google/Kakao가 로그인 완료 후 호출하는 URL(각 provider 콘솔에 이 URL을 콜백 URL로 등록해야 함).

- `code`로 provider의 access token 발급 → 프로필(email, name, provider user id) 조회
- `user` 테이블에 upsert (아래 "user 테이블 관련 열린 질문" 참고)
- `state`로 복원한 `redirect_uri`로 302 리다이렉트, 신원 정보를 쿼리 파라미터로 실어 보냄:
  ```
  {redirect_uri}?username={username}&email={email}&provider={provider}
  ```
- 실패 시(사용자가 거부, provider 에러 등):
  ```
  {redirect_uri}?error=oauth_failed
  ```

프론트가 기대하는 응답 필드는 `username`/`email` 두 개뿐입니다 — `/user/signup`이 반환하는 것과 같은 모양(`toAuthUser()`가 이 두 필드만 씀).

---

## 필요한 설정값 (backend/.env, 코드 아님)

```
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
KAKAO_CLIENT_SECRET=        # KAKAO_REST_API_KEY는 이미 있음 — Kakao OAuth에서 이걸 client_id로 재사용 가능한지 확인 필요
BACKEND_PUBLIC_URL=         # 백엔드 자신의 콜백 URL을 만들 때 사용 (예: http://localhost:8000)
```

각 provider 콘솔에서 리다이렉트 URI로 등록해야 하는 값: `{BACKEND_PUBLIC_URL}/auth/{provider}/callback`

---

## 열린 질문 (백엔드에서 결정 필요)

1. **`user.username`을 OAuth 유저는 어떻게 정할지**: ID/PW 가입은 사용자가 직접 입력하지만, OAuth는 그런 입력이 없음. `route_draft_stop`/`saved_places` 등 다른 테이블이 전부 `username`을 FK로 참조하고 있어서, provider별로 고유하고 안정적인 값(예: `google_{provider_user_id}`)을 만들어야 credential 유저와 안 겹칩니다.
2. **`redirect_uri` 검증**: 아무 URL이나 받아서 리다이렉트하면 오픈 리다이렉트 취약점이 됩니다. 이미 `main.py`의 CORS `allow_origins` 목록(로컬/ngrok/vercel)이 있으니, `redirect_uri`의 origin이 그 목록에 있는지만 검증하는 걸 제안합니다.
3. **Kakao의 `client_secret` 필요 여부**: Kakao Developers 콘솔 설정에 따라 선택사항일 수 있음 — 콘솔에서 확인 필요.

---

## 참고 — 프론트가 하게 될 일 (백엔드 작업과 무관, 별도로 진행)

- `loginWithProvider()`가 `window.location.href = "{VITE_API_BASE_URL}/auth/{provider}/start?redirect_uri=..."`로 브라우저 전체를 이동시키도록 변경(현재의 "호출하면 Promise가 바로 끝나는" mock 구조와 다름)
- `/auth/callback` 콜백 전용 페이지/라우트 신규 추가 — `username`/`email`/`error` 쿼리파라미터를 읽어서 로그인 완료 처리
