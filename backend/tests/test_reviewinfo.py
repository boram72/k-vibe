from unittest.mock import MagicMock, patch

from data_repositories import reviewinfo


@patch("data_repositories.reviewinfo.userinfo.get_display_names")
@patch("data_repositories.reviewinfo.get_supabase_client")
def test_get_reviews_attaches_display_name(mock_get_client, mock_get_display_names):
    mock_client = MagicMock()
    mock_client.table.return_value.select.return_value.eq.return_value.order.return_value.execute.return_value.data = [
        {"id": "r1", "place_id": "place-1", "username": "leesw", "rating": 5, "content": "좋아요"},
        {"id": "r2", "place_id": "place-1", "username": "google_123", "rating": 4, "content": "괜찮아요"},
    ]
    mock_get_client.return_value = mock_client
    mock_get_display_names.return_value = {"leesw": "가현", "google_123": None}

    reviews = reviewinfo.get_reviews("place-1")

    assert reviews[0]["display_name"] == "가현"
    assert reviews[1]["display_name"] is None
    mock_get_display_names.assert_called_once()
    assert set(mock_get_display_names.call_args[0][0]) == {"leesw", "google_123"}


@patch("data_repositories.reviewinfo.userinfo.get_display_names")
@patch("data_repositories.reviewinfo.get_supabase_client")
def test_get_reviews_returns_empty_list_without_display_name_lookup(mock_get_client, mock_get_display_names):
    mock_client = MagicMock()
    mock_client.table.return_value.select.return_value.eq.return_value.order.return_value.execute.return_value.data = []
    mock_get_client.return_value = mock_client

    reviews = reviewinfo.get_reviews("place-1")

    assert reviews == []
    mock_get_display_names.assert_called_once_with([])
