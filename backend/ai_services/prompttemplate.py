PLACE_NAME_EXTRACTION_FROM_TEXT_PROMPT = """당신은 한국 여행 장소 추천 전문가입니다.
아래는 YouTube 영상의 자막(스크립트)입니다. 이 안에서 실제로 언급되거나 등장하는
한국의 구체적인 여행 스팟 이름을 추출하세요.

## 영상 자막
{text}

## 지시사항
- 실제 한국 여행 장소명을 최대 6개 추출하세요.
- 서울, 부산처럼 넓은 지역명만 있는 항목은 제외하고 구체적인 장소명(카페, 식당, 관광지 등)만 포함하세요.
- 장소명은 실제로 존재하는 정식 명칭을 사용하세요.
- 반드시 장소명 문자열로 이루어진 JSON 배열만 반환하세요. 설명 문장이나 마크다운은 반환하지 마세요.

["성수 카페거리", "경복궁"]
"""

PLACE_NAME_EXTRACTION_FROM_VIDEO_PROMPT = """당신은 한국 여행 장소 추천 전문가입니다.
첨부된 YouTube 영상을 실제로 시청하고, 영상에 등장하는 한국의 구체적인 여행 스팟 이름을
추출하세요.

## 지시사항
- 실제 한국 여행 장소명을 최대 6개 추출하세요.
- 서울, 부산처럼 넓은 지역명만 있는 항목은 제외하고 구체적인 장소명(카페, 식당, 관광지 등)만 포함하세요.
- 장소명은 실제로 존재하는 정식 명칭을 사용하세요.
- 반드시 장소명 문자열로 이루어진 JSON 배열만 반환하세요. 설명 문장이나 마크다운은 반환하지 마세요.

["성수 카페거리", "경복궁"]
"""


def build_place_name_extraction_from_text_prompt(text: str) -> str:
    return PLACE_NAME_EXTRACTION_FROM_TEXT_PROMPT.format(text=text)


def build_place_name_extraction_from_video_prompt() -> str:
    return PLACE_NAME_EXTRACTION_FROM_VIDEO_PROMPT
