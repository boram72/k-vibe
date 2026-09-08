from urllib.parse import parse_qs, urlparse

import httpx


def extract_youtube_video_id(url: str) -> str | None:
    parsed = urlparse(url)
    host = parsed.hostname or ""
    if host == "youtu.be":
        return parsed.path.strip("/") or None
    if host.endswith("youtube.com"):
        if parsed.path == "/watch":
            return parse_qs(parsed.query).get("v", [None])[0]
        for prefix in ("/shorts/", "/embed/"):
            if parsed.path.startswith(prefix):
                return parsed.path.removeprefix(prefix).split("/")[0]
    return None


def fetch_youtube_title(url: str) -> str:
    try:
        response = httpx.get(
            "https://www.youtube.com/oembed",
            params={"url": url, "format": "json"},
            timeout=4,
        )
        response.raise_for_status()
        data = response.json()
        title = data.get("title")
        return title if isinstance(title, str) else ""
    except Exception:
        return ""


def fetch_youtube_transcript(video_id: str) -> str:
    try:
        from youtube_transcript_api import YouTubeTranscriptApi

        transcript = YouTubeTranscriptApi().fetch(video_id, languages=["ko", "en"])
        return " ".join(snippet.text for snippet in transcript.snippets)
    except Exception:
        return ""
