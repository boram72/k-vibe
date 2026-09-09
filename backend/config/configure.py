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

# Google/Kakao OAuth 로그인 중계(OAUTH_INTEGRATION_REQUEST.md 참고).
# KAKAO_REST_API_KEY는 Kakao OAuth의 client_id로 그대로 재사용한다(콘솔에 이미 등록됨).
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
KAKAO_CLIENT_SECRET = os.getenv("KAKAO_CLIENT_SECRET")
BACKEND_PUBLIC_URL = os.getenv("BACKEND_PUBLIC_URL")

# main.py CORS allow_origins와 /auth/{provider}/start의 redirect_uri 오픈 리다이렉트
# 검증이 같은 화이트리스트를 공유해야 해서(OAUTH_INTEGRATION_REQUEST.md 열린 질문 2)
# 여기서 공용으로 관리한다.
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://192.168.219.113:5173",
    "https://unlegalised-theresia-answeringly.ngrok-free.dev",
    "https://k-vibe-psi.vercel.app",
]
