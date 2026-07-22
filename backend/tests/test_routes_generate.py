from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


def test_generate_route_returns_persona_stops():
    response = client.post(
        "/routes/generate",
        json={"theme": "kpop", "detail": "bts", "start_time": "10:00", "locale": "ko"},
    )

    assert response.status_code == 200
    body = response.json()
    assert len(body["stops"]) == 5
    assert body["stops"][0]["name"] == "남산타워"
    assert body["walkingMinutes"] > 0
    assert body["totalMinutes"] >= body["stayMinutes"]
