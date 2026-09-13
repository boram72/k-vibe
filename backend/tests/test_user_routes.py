from unittest.mock import patch

from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


@patch("data_repositories.userinfo.update_display_name")
def test_update_display_name_success(mock_update_display_name):
    mock_update_display_name.return_value = {
        "username": "gahyun",
        "nationality": "KR",
        "email": "gahyun@example.com",
        "password": "secret",
        "display_name": "가현",
    }

    response = client.post("/user/display-name", json={"username": "gahyun", "display_name": "가현"})

    assert response.status_code == 200
    body = response.json()
    assert body["display_name"] == "가현"
    assert "password" not in body
    mock_update_display_name.assert_called_once_with("gahyun", "가현")


@patch("data_repositories.userinfo.update_display_name")
def test_update_display_name_returns_404_when_user_not_found(mock_update_display_name):
    mock_update_display_name.return_value = None

    response = client.post("/user/display-name", json={"username": "nobody", "display_name": "가현"})

    assert response.status_code == 404
