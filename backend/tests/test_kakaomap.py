from unittest.mock import MagicMock, patch

import pytest

from externelAPI_services import kakaomap


def _mock_response(payload: dict) -> MagicMock:
    response = MagicMock()
    response.json.return_value = payload
    response.raise_for_status.return_value = None
    return response


@patch("externelAPI_services.kakaomap.KAKAO_REST_API_KEY", "test-key")
@patch("externelAPI_services.kakaomap.httpx.get")
def test_search_category_nearby_returns_parsed_list(mock_get):
    mock_get.return_value = _mock_response(
        {
            "documents": [
                {
                    "id": "123",
                    "place_name": "GS25 테스트점",
                    "road_address_name": "서울특별시 용산구 후암로35길 39",
                    "address_name": "서울특별시 용산구 후암동 1",
                    "x": "126.9761522655",
                    "y": "37.5497617088",
                    "distance": "150",
                    "phone": "02-1234-5678",
                    "category_group_code": "CS2",
                }
            ],
            "meta": {"is_end": True},
        }
    )

    result = kakaomap.search_category_nearby(37.568477, 126.981611, 1000, "CS2")

    assert result == [
        {
            "id": "123",
            "name": "GS25 테스트점",
            "address": "서울특별시 용산구 후암로35길 39",
            "latitude": 37.5497617088,
            "longitude": 126.9761522655,
            "distance": 150.0,
            "tel": "02-1234-5678",
            "categoryGroupCode": "CS2",
        }
    ]
    called_params = mock_get.call_args.kwargs["params"]
    assert called_params["category_group_code"] == "CS2"
    assert called_params["x"] == 126.981611
    assert called_params["y"] == 37.568477
    assert called_params["radius"] == 1000
    called_headers = mock_get.call_args.kwargs["headers"]
    assert called_headers["Authorization"] == "KakaoAK test-key"


@patch("externelAPI_services.kakaomap.KAKAO_REST_API_KEY", "test-key")
@patch("externelAPI_services.kakaomap.httpx.get")
def test_search_category_nearby_stops_after_is_end(mock_get):
    mock_get.return_value = _mock_response({"documents": [], "meta": {"is_end": True}})

    kakaomap.search_category_nearby(37.5, 127.0, 1000, "PM9")

    assert mock_get.call_count == 1


@patch("externelAPI_services.kakaomap.KAKAO_REST_API_KEY", "test-key")
@patch("externelAPI_services.kakaomap.httpx.get")
def test_search_category_nearby_paginates_until_is_end(mock_get):
    page1 = _mock_response({"documents": [{"id": "1", "place_name": "a"}], "meta": {"is_end": False}})
    page2 = _mock_response({"documents": [{"id": "2", "place_name": "b"}], "meta": {"is_end": True}})
    mock_get.side_effect = [page1, page2]

    result = kakaomap.search_category_nearby(37.5, 127.0, 1000, "BK9")

    assert len(result) == 2
    assert mock_get.call_count == 2


@patch("externelAPI_services.kakaomap.KAKAO_REST_API_KEY", "test-key")
@patch("externelAPI_services.kakaomap.httpx.get")
def test_search_category_nearby_caps_radius_at_20km(mock_get):
    mock_get.return_value = _mock_response({"documents": [], "meta": {"is_end": True}})

    kakaomap.search_category_nearby(37.5, 127.0, 50000, "CS2")

    called_params = mock_get.call_args.kwargs["params"]
    assert called_params["radius"] == 20000


@patch("externelAPI_services.kakaomap.KAKAO_REST_API_KEY", None)
def test_search_category_nearby_raises_when_api_key_missing():
    with pytest.raises(RuntimeError, match="KAKAO_REST_API_KEY"):
        kakaomap.search_category_nearby(37.5, 127.0, 1000, "CS2")
