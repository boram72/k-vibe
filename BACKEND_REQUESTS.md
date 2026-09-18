# 백엔드 수정 요청 모음

**대상**: 백엔드 담당자
**설명**: 프론트엔드 작업 중 발견된 백엔드 수정 필요 사항을 모아두는 문서. 새 요청이 생기면 아래에 이어서 추가(기존 항목은 그대로 두고 append). 기존에 주제별로 따로 있던 `OAUTH_INTEGRATION_REQUEST.md`/`I18N_JA_ZH_TRANSLATION_REQUEST.md`는 이미 작성된 별도 문서라 그대로 두고, **이후 새로 생기는 요청은 이 문서 하나로 모음**.

---

현재 대기 중인 요청 없음 — 이전에 등록됐던 1~5번 항목(display_name 컬럼/`/user/display-name` 엔드포인트, `/personas/places` 페르소나 3명 데이터 누락, `/places?locale=en|ja|zh` 카테고리 매핑, `/places/{content_id}` defaultYN/overviewYN 파라미터 오류, `/routes/generate` 크래시), 6번 항목(리뷰 수정 `PATCH /reviews/{place_id}/{review_id}` 엔드포인트 부재)까지 전부 해결 완료(PR #83/#85 등, 6번은 이번 PR에서 해결).
