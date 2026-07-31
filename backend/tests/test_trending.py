from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


def test_trending_keywords_returns_home_keywords():
    response = client.get("/trending")

    assert response.status_code == 200
    body = response.json()
    assert "성수 카페" in body
    assert len(body) >= 5
