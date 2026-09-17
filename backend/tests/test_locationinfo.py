from unittest.mock import MagicMock, patch

from data_repositories import locationinfo


@patch("data_repositories.locationinfo.get_supabase_client")
def test_cache_place_detail_uses_update_not_upsert(mock_get_client):
    """upsert는 payload에 없는 NOT NULL 컬럼(name 등) 때문에 이미 존재하는 place_id를
    갱신하려는 경우에도 실패한다(실측: place_id=750982 "이북만두", 이미 location에
    있었는데도 NOT NULL 위반 에러 발생). update만 사용해 이 문제를 피해야 한다."""
    mock_client = MagicMock()
    mock_get_client.return_value = mock_client

    locationinfo.cache_place_detail(
        "750982",
        {
            "phone": "02-776-7361",
            "businessHours": "[평일]\n- 11:00~21:00",
            "overview": "서울시청 뒷골목에 위치한 이북만두는...",
            "tags": ["한식"],
        },
    )

    mock_client.table.return_value.upsert.assert_not_called()
    mock_client.table.return_value.update.assert_called_once()
    update_payload = mock_client.table.return_value.update.call_args[0][0]
    assert update_payload["phone"] == "02-776-7361"
    assert update_payload["business_hours"] == "[평일]\n- 11:00~21:00"
    assert update_payload["overview"] == "서울시청 뒷골목에 위치한 이북만두는..."
    assert update_payload["tags"] == ["한식"]
    assert "detail_cached_at" in update_payload
    assert "name" not in update_payload
    mock_client.table.return_value.update.return_value.eq.assert_called_once_with("place_id", "750982")
    mock_client.table.return_value.update.return_value.eq.return_value.execute.assert_called_once()


@patch("data_repositories.locationinfo.get_supabase_client")
def test_cache_place_detail_handles_missing_row_without_error(mock_get_client):
    """update가 0건 매칭돼도(place_id가 location에 없는 경우) 에러 없이 조용히 끝나야 한다."""
    mock_client = MagicMock()
    mock_client.table.return_value.update.return_value.eq.return_value.execute.return_value.data = []
    mock_get_client.return_value = mock_client

    locationinfo.cache_place_detail("no-such-place", {"phone": None, "businessHours": None, "overview": None, "tags": []})

    mock_client.table.return_value.update.return_value.eq.return_value.execute.assert_called_once()
