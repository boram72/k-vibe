from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


def test_docent_returns_script_when_audio_file_is_not_available():
    response = client.get("/docent/경복궁", params={"language": "ko"})

    assert response.status_code == 200
    body = response.json()
    assert body["name"] == "경복궁"
    assert body["language"] == "korean"
    assert body["script"]
