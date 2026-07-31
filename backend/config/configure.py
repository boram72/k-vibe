# api key 저장 -> git .ignore에 추가
import os

from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
KAKAO_REST_API_KEY = os.getenv("KAKAO_REST_API_KEY")
TOUR_API_KEY = os.getenv("TOUR_API_KEY")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
