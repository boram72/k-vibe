from unittest.mock import MagicMock, patch

import httpx

from externelAPI_services import searchGoogle


def _mock_response(payload: dict) -> MagicMock:
    response = MagicMock()
    response.json.return_value = payload
    response.raise_for_status.return_value = None
    return response


@patch("externelAPI_services.searchGoogle.GOOGLE_MAPS_API_KEY", "test-key")
@patch("externelAPI_services.searchGoogle.httpx.get")
def test_get_opening_hours_returns_weekday_text_on_success(mock_get):
    find_place_response = _mock_response({"status": "OK", "candidates": [{"place_id": "abc123"}]})
    details_response = _mock_response(
        {
            "status": "OK",
            "result": {"opening_hours": {"weekday_text": ["월요일: 09:00~18:00", "화요일: 휴무"]}},
        }
    )
    mock_get.side_effect = [find_place_response, details_response]

    result = searchGoogle.get_opening_hours("경복궁", "서울 종로구")

    assert result == "월요일: 09:00~18:00\n화요일: 휴무"
    assert mock_get.call_count == 2


@patch("externelAPI_services.searchGoogle.GOOGLE_MAPS_API_KEY", "test-key")
@patch("externelAPI_services.searchGoogle.httpx.get")
def test_get_opening_hours_returns_none_when_find_place_status_not_ok(mock_get):
    mock_get.return_value = _mock_response({"status": "ZERO_RESULTS", "candidates": []})

    result = searchGoogle.get_opening_hours("존재하지않는장소")

    assert result is None
    assert mock_get.call_count == 1


@patch("externelAPI_services.searchGoogle.GOOGLE_MAPS_API_KEY", "test-key")
@patch("externelAPI_services.searchGoogle.httpx.get")
def test_get_opening_hours_returns_none_when_quota_exceeded(mock_get):
    """OVER_QUERY_LIMIT(일일 무료크레딧/하드캡 소진)도 예외 없이 None으로 통일된다."""
    find_place_response = _mock_response({"status": "OK", "candidates": [{"place_id": "abc123"}]})
    details_response = _mock_response({"status": "OVER_QUERY_LIMIT"})
    mock_get.side_effect = [find_place_response, details_response]

    result = searchGoogle.get_opening_hours("경복궁")

    assert result is None


@patch("externelAPI_services.searchGoogle.GOOGLE_MAPS_API_KEY", "test-key")
@patch("externelAPI_services.searchGoogle.httpx.get")
def test_get_opening_hours_returns_none_when_no_opening_hours_field(mock_get):
    find_place_response = _mock_response({"status": "OK", "candidates": [{"place_id": "abc123"}]})
    details_response = _mock_response({"status": "OK", "result": {}})
    mock_get.side_effect = [find_place_response, details_response]

    assert searchGoogle.get_opening_hours("경복궁") is None


@patch("externelAPI_services.searchGoogle.GOOGLE_MAPS_API_KEY", None)
def test_get_opening_hours_returns_none_when_api_key_missing():
    assert searchGoogle.get_opening_hours("경복궁") is None


@patch("externelAPI_services.searchGoogle.GOOGLE_MAPS_API_KEY", "test-key")
def test_get_opening_hours_returns_none_without_name():
    assert searchGoogle.get_opening_hours("") is None


@patch("externelAPI_services.searchGoogle.GOOGLE_MAPS_API_KEY", "test-key")
@patch("externelAPI_services.searchGoogle.httpx.get")
def test_get_opening_hours_returns_none_on_request_exception(mock_get):
    mock_get.side_effect = httpx.ConnectError("network down")

    assert searchGoogle.get_opening_hours("경복궁") is None
