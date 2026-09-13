from unittest.mock import MagicMock, patch

from data_repositories import userinfo


@patch("data_repositories.userinfo.get_supabase_client")
def test_update_display_name_returns_updated_row(mock_get_client):
    mock_client = MagicMock()
    mock_client.table.return_value.update.return_value.eq.return_value.execute.return_value.data = [
        {"username": "gahyun", "display_name": "가현"}
    ]
    mock_get_client.return_value = mock_client

    result = userinfo.update_display_name("gahyun", "가현")

    assert result == {"username": "gahyun", "display_name": "가현"}
    mock_client.table.return_value.update.assert_called_once_with({"display_name": "가현"})
    mock_client.table.return_value.update.return_value.eq.assert_called_once_with("username", "gahyun")


@patch("data_repositories.userinfo.get_supabase_client")
def test_update_display_name_returns_none_when_user_missing(mock_get_client):
    mock_client = MagicMock()
    mock_client.table.return_value.update.return_value.eq.return_value.execute.return_value.data = []
    mock_get_client.return_value = mock_client

    result = userinfo.update_display_name("nobody", "가현")

    assert result is None
