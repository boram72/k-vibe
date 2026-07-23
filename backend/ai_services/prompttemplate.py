SPOT_EXTRACTION_PROMPT = """당신은 한국 여행 장소 추천 전문가입니다.
아래 YouTube 영상 정보에서 등장하거나 강하게 유추할 수 있는 한국의 실제 여행 스팟을 추출하세요.

## 영상 제목
{title}

## 지시사항
- 실제 한국 여행 장소를 최대 6개 추출하세요.
- 서울, 부산처럼 넓은 지역명만 있는 항목은 제외하고 구체적인 장소명을 우선하세요.
- 각 장소의 category는 cafe, restaurant, landmark, park, shopping, culture, nature, other 중 하나입니다.
- confidence는 0.0~1.0 숫자입니다.
- lat, lng는 해당 장소의 실제 위도/경도 좌표입니다. 한국 내 실제 좌표를 소수점 4자리 이상으로 반환하세요.
- reason은 왜 이 장소로 판단했는지 짧게 설명하세요.
- 반드시 JSON 배열만 반환하세요. 설명 문장이나 마크다운은 반환하지 마세요.

[
  {{"name":"장소명","category":"cafe","confidence":0.9,"reason":"제목에서 성수 카페가 언급됨","lat":37.5447,"lng":127.0564}}
]
"""


def build_spot_extraction_prompt(title: str) -> str:
    return SPOT_EXTRACTION_PROMPT.format(title=title)
