# presentation_api 창구 역할: 요청을 받아 위임하고 응답만 반환한다.
# - 회원가입/로그인 요청 -> data_repositories/userinfo.py 호출
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from data_repositories import userinfo

router = APIRouter(prefix="/user", tags=["user"])


class SignupRequest(BaseModel):
    username: str
    nationality: str
    email: str
    password: str


class LoginRequest(BaseModel):
    username: str
    password: str


@router.post("/signup")
def signup(body: SignupRequest):
    try:
        user = userinfo.create_user(body.username, body.nationality, body.email, body.password)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    return {k: v for k, v in user.items() if k != "password"}


@router.post("/login")
def login(body: LoginRequest):
    user = userinfo.get_user(body.username)
    if user is None or user.get("password") != body.password:
        raise HTTPException(status_code=401, detail="아이디 또는 비밀번호가 올바르지 않습니다.")
    return {k: v for k, v in user.items() if k != "password"}
