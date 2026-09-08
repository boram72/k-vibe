from unittest.mock import patch

from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


@patch("data_repositories.reviewinfo.get_reviews")
def test_list_reviews_returns_repository_data(mock_get_reviews):
    mock_get_reviews.return_value = [
        {
            "id": "r1",
            "place_id": "place-1",
            "username": "leesw",
            "rating": 5,
            "content": "정말 좋았어요",
            "created_at": "2026-09-01T00:00:00+00:00",
        }
    ]

    response = client.get("/reviews/place-1")

    assert response.status_code == 200
    body = response.json()
    assert body == mock_get_reviews.return_value
    mock_get_reviews.assert_called_once_with("place-1")


@patch("data_repositories.reviewinfo.create_review")
def test_create_review_delegates_to_repository(mock_create_review):
    mock_create_review.return_value = {
        "id": "r2",
        "place_id": "place-1",
        "username": "leesw",
        "rating": 4,
        "content": "다시 가고 싶어요",
        "created_at": "2026-09-07T00:00:00+00:00",
    }

    response = client.post(
        "/reviews/place-1",
        json={"username": "leesw", "rating": 4, "content": "다시 가고 싶어요"},
    )

    assert response.status_code == 200
    assert response.json() == mock_create_review.return_value
    mock_create_review.assert_called_once_with("place-1", "leesw", 4, "다시 가고 싶어요")


def test_create_review_rejects_blank_content():
    response = client.post(
        "/reviews/place-1",
        json={"username": "leesw", "rating": 4, "content": "   "},
    )

    assert response.status_code == 400


def test_create_review_rejects_out_of_range_rating():
    response = client.post(
        "/reviews/place-1",
        json={"username": "leesw", "rating": 6, "content": "좋아요"},
    )

    assert response.status_code == 422


@patch("data_repositories.reviewinfo.delete_review")
def test_delete_review_success(mock_delete_review):
    mock_delete_review.return_value = True

    response = client.delete("/reviews/place-1/r2?username=leesw")

    assert response.status_code == 200
    assert response.json() == {"deleted": True}
    mock_delete_review.assert_called_once_with("r2", "leesw")


@patch("data_repositories.reviewinfo.delete_review")
def test_delete_review_not_found(mock_delete_review):
    mock_delete_review.return_value = False

    response = client.delete("/reviews/place-1/unknown?username=leesw")

    assert response.status_code == 404
