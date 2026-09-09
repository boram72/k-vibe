# ja/zh 로케일 번역 누락 — 백엔드 수정 요청

**작성일**: 2026-09-09
**대상**: 백엔드 담당자
**배경**: `TrendingKeywords`(홈 화면) 키워드가 유일하게 다국어가 적용 안 되는 항목이라 출처를 확인하던 중 발견. `/trending`은 애초에 다국어 구조 자체가 없고, personas/route 결과는 다국어 구조는 있지만 **실제로는 `ja`/`zh` 요청에도 영어가 나가고 있음**을 확인함.

---

## 1. `/trending` — 다국어 구조 자체가 없음

- `backend/presentation_api/trending.py`가 `locale` 파라미터를 아예 받지 않고, 한국어 문자열 리스트를 하드코딩해서 그대로 리턴:
  ```python
  @router.get("")
  def get_trending_keywords():
      return ["인생네컷", "코인노래방", "방탈출", "성수 카페", "홍대 빈티지"]
  ```
- `schema.sql`에도 관련 테이블 없음 — DB 경유 없이 코드에 박혀있는 값.
- 프론트(`frontend/src/api/trending.ts`)도 동일한 5개 문자열을 mock 폴백으로 그대로 들고 있어서, 백엔드가 죽어도 살아도 항상 한국어만 나옴.

**요청**: `personas`처럼 `locale: str = "ko"` 쿼리 파라미터를 받아서 4개 언어(`ko`/`en`/`ja`/`zh`) 중 하나를 리턴하도록 변경. 지금 키워드가 5개뿐이라 번역 작업량은 크지 않음.

---

## 2. personas / route 결과 — `ja`/`zh` 요청에도 영어가 나감

`backend/data_repositories/personaCatalogInfo.py`:
```python
def pick_text(text: dict, locale: str) -> str:
    return text["ko"] if locale == "ko" else text["en"]

def pick_tags(tags: dict, locale: str) -> list[str]:
    return tags["ko"] if locale == "ko" else tags["en"]
```
`backend/business_services/routingService.py`에도 동일한 패턴이 그대로 있음(line 31).

즉 지금 로직은 **"한국어면 한국어, 그 외엔 전부 영어"** 이고, `PERSONAS`/`LOCATIONS` 데이터 자체에도 각 항목의 `label`/`description`/`moods`에 `ko`/`en` 키만 있고 `ja`/`zh` 키가 존재하지 않음(`data_repositories/personaCatalogInfo.py` 전체 확인함).

**영향**: 실제 배포 환경에서 백엔드가 정상 응답 중이라면, 일본어/중국어 사용자는 지금 이 순간에도 조용히 영어 텍스트를 받고 있을 가능성이 높음(에러가 안 나서 눈에 안 띔).

**참고 — 번역 재사용 가능**: 프론트엔드의 mock 폴백 데이터(`frontend/src/api/personas.ts`의 `PERSONA_FALLBACKS`)에는 이미 실제 일본어/중국어 번역이 들어가 있음(백엔드가 죽었을 때만 쓰이는 데이터라 실사용자는 못 보고 있었음). 예:
```ts
description: {
  ko: '전망, 궁궐, 익선동·성수 감성을 잇는 서울 하루 성지순례 코스.',
  en: 'A Seoul day route linking views, palace scenery, Ikseon-dong, and Seongsu.',
  ja: '展望、宮殿、益善洞・聖水の雰囲気をつなぐソウル1日コース。',
  zh: '串联观景、宫殿、益善洞与圣水氛围的首尔一日路线。',
},
```
백엔드가 이 파일의 페르소나 목록과 얼마나 겹치는지 대조해보면, 새로 번역할 필요 없이 이 값들을 그대로 `PERSONAS`/`LOCATIONS`에 이식할 수 있는 항목이 상당수 있을 것으로 보임(전체 일치 여부는 백엔드 쪽에서 데이터 대조 필요 — 프론트 mock은 페르소나 카드용 데이터라 개별 장소(LOCATIONS) 단위 번역까지 커버하는지는 별도 확인 필요).

**요청**: `pick_text`/`pick_tags`가 `ja`/`zh`도 각각 구분해서 리턴하도록 수정 + `PERSONAS`/`LOCATIONS` 데이터에 `ja`/`zh` 키 추가.

---

## 우선순위 / 난이도

새 아키텍처가 필요한 변경은 아님 — 기존 `ko`/`en` 2-way 분기를 4-way로 넓히고 데이터에 필드를 채우는 수준. 다만 로케일 데이터 필드 개수가 늘어나는 만큼 번역 리소스(사람 손 번역 또는 위 프론트 mock 재사용)가 필요함.
