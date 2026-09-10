# SNS 분석기 결과 캐시(Redis 호환 저장소, 예: Render Key Value) 조회·저장.
# - business_services/snsAnalysisService.py 에서만 호출.
# - key: analyze:{video_id}:{locale}, value: 분석 결과 JSON 문자열, TTL 30일.
#   Gemini 영상분석이 느리고(요청당 15~60초) 무료 티어 일일 할당량이 있어,
#   한 번 나온 실제 분석 결과를 재사용한다.
# - REDIS_URL 미설정이거나 연결 실패 시에도 분석 자체는 계속 동작해야 하므로,
#   여기서 나는 예외는 호출부가 잡아 "캐시 미스"로 취급한다.
import json

from config.dependency import get_redis_client

_KEY_PREFIX = "analyze"
# 영상 내용은 안 바뀌지만, 잘못 뽑힌 결과가 영구 고정되지 않도록 상한을 둔다
# (만료되면 다음 요청에서 재분석 -> 재저장).
_TTL_SECONDS = 30 * 24 * 60 * 60


def _key(video_id: str, locale: str) -> str:
    return f"{_KEY_PREFIX}:{video_id}:{locale}"


def get_cached_result(video_id: str, locale: str) -> dict | None:
    raw = get_redis_client().get(_key(video_id, locale))
    return json.loads(raw) if raw else None


def save_result(video_id: str, locale: str, result: dict) -> None:
    get_redis_client().setex(
        _key(video_id, locale),
        _TTL_SECONDS,
        json.dumps(result, ensure_ascii=False),
    )
