# api key 저장 -> git .ignore에 추가
import os

from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
KAKAO_REST_API_KEY = os.getenv("KAKAO_REST_API_KEY")
TOUR_API_KEY = os.getenv("TOUR_API_KEY")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
# 2026-09: SNS 분석기 AI 폴백 체인(Groq -> Gemini -> OpenAI -> 규칙기반 워커) 중
# Gemini/OpenAI 단계에 사용. 키가 없으면 각 client.complete()가 빈 문자열을 반환해
# 자동으로 다음 단계로 넘어가므로, 둘 다 선택사항(비워둬도 정상 동작).
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
