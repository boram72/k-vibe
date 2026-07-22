from unittest.mock import MagicMock, patch

import pytest

from externelAPI_services import tourAPI


def _mock_response(payload: dict) -> MagicMock:
    response = MagicMock()
    response.json.return_value = payload
    response.raise_for_status.return_value = None
    return response


def test_find_area_signgu_code_matches_known_region():
    result = tourAPI.find_area_signgu_code("서울특별시", "용산구")
    assert result == {"areaCd": "11", "signguCd": "11170"}


def test_find_area_signgu_code_returns_none_when_unmatched():
    assert tourAPI.find_area_signgu_code("존재하지않는시도", "존재하지않는구") is None


@patch("externelAPI_services.tourAPI.TOUR_API_KEY", "test-key")
@patch("externelAPI_services.tourAPI.kakaomap.reverse_geocode")
@patch("externelAPI_services.tourAPI.httpx.get")
def test_find_related_attractions_returns_parsed_list(mock_get, mock_reverse_geocode):
    mock_reverse_geocode.return_value = {"areaNm": "서울특별시", "signguNm": "용산구"}
    mock_get.return_value = _mock_response(
        {
            "response": {
                "body": {
                    "items": {
                        "item": [
                            {
                                "tAtsCd": "tats-001",
                                "tAtsNm": "남산타워",
                                "rlteTatsCd": "abc123",
                                "rlteTatsNm": "명동성당",
                                "rlteRegnNm": "서울특별시",
                                "rlteSignguNm": "중구",
                                "rlteCtgryLclsNm": "관광지",
                                "rlteCtgryMclsNm": "문화관광",
                                "rlteCtgrySclsNm": "종교성지",
                                "rlteRank": "1",
                            }
                        ]
                    }
                }
            }
        }
    )

    result = tourAPI.find_related_attractions(latitude=37.55, longitude=126.99)

    assert result == [
        {
            "attractionContentId": "tats-001",
            "attractionName": "남산타워",
            "relatedContentId": "abc123",
            "relatedName": "명동성당",
            "relatedAreaName": "서울특별시",
            "relatedSignguName": "중구",
            "categoryLarge": "관광지",
            "categoryMedium": "문화관광",
            "categorySmall": "종교성지",
            "rank": 1,
        }
    ]
    called_params = mock_get.call_args.kwargs["params"]
    assert called_params["areaCd"] == "11"
    assert called_params["signguCd"] == "11170"


@patch("externelAPI_services.tourAPI.TOUR_API_KEY", "test-key")
@patch("externelAPI_services.tourAPI.kakaomap.reverse_geocode")
def test_find_related_attractions_returns_empty_when_region_unmatched(mock_reverse_geocode):
    mock_reverse_geocode.return_value = {"areaNm": "알수없음", "signguNm": "알수없음"}

    result = tourAPI.find_related_attractions(latitude=37.55, longitude=126.99)

    assert result == []


@patch("externelAPI_services.tourAPI.TOUR_API_KEY", "test-key")
@patch("externelAPI_services.tourAPI.kakaomap.reverse_geocode")
@patch("externelAPI_services.tourAPI.httpx.get")
def test_find_related_attractions_falls_back_to_last_month_when_current_month_empty(
    mock_get, mock_reverse_geocode
):
    mock_reverse_geocode.return_value = {"areaNm": "서울특별시", "signguNm": "용산구"}
    empty_response = _mock_response({"response": {"body": {"items": ""}}})
    filled_response = _mock_response(
        {
            "response": {
                "body": {
                    "items": {
                        "item": {
                            "tAtsNm": "남산타워",
                            "rlteTatsCd": "abc123",
                            "rlteTatsNm": "명동성당",
                            "rlteRank": "1",
                        }
                    }
                }
            }
        }
    )
    mock_get.side_effect = [empty_response, filled_response]

    result = tourAPI.find_related_attractions(latitude=37.55, longitude=126.99)

    assert len(result) == 1
    assert mock_get.call_count == 2


@patch("externelAPI_services.tourAPI.TOUR_API_KEY", None)
def test_find_related_attractions_raises_when_api_key_missing():
    with pytest.raises(RuntimeError, match="TOUR_API_KEY"):
        tourAPI.find_related_attractions(latitude=37.5, longitude=127.0)


@patch("externelAPI_services.tourAPI.TOUR_API_KEY", "test-key")
@patch("externelAPI_services.tourAPI.httpx.get")
def test_find_nearby_places_returns_parsed_list(mock_get):
    mock_get.return_value = _mock_response(
        {
            "response": {
                "body": {
                    "items": {
                        "item": [
                            {
                                "contentid": "126508",
                                "contenttypeid": "12",
                                "title": "경복궁",
                                "addr1": "서울 종로구 사직로 161",
                                "mapx": "126.9770",
                                "mapy": "37.5796",
                                "firstimage": "https://example.com/img.jpg",
                                "dist": "1234.5",
                            },
                            {
                                # 여행코스는 단일 지점이 아니라 제외되어야 함
                                "contentid": "999999",
                                "contenttypeid": "25",
                                "title": "제외되는 여행코스",
                                "mapx": "126.9",
                                "mapy": "37.5",
                            },
                            {
                                # 좌표 없는 항목은 제외되어야 함
                                "contentid": "888888",
                                "contenttypeid": "39",
                                "title": "좌표없는 식당",
                            },
                        ]
                    }
                }
            }
        }
    )

    result = tourAPI.find_nearby_places(latitude=37.5796, longitude=126.977)

    assert result == [
        {
            "id": "126508",
            "name": "경복궁",
            "category": "culture",
            "address": "서울 종로구 사직로 161",
            "lat": 37.5796,
            "lng": 126.977,
            "imageUrl": "https://example.com/img.jpg",
            "distanceM": 1234,
            "tags": [],
        }
    ]
    called_params = mock_get.call_args.kwargs["params"]
    assert called_params["mapX"] == 126.977
    assert called_params["mapY"] == 37.5796


@patch("externelAPI_services.tourAPI.TOUR_API_KEY", None)
def test_find_nearby_places_raises_when_api_key_missing():
    with pytest.raises(RuntimeError, match="TOUR_API_KEY"):
        tourAPI.find_nearby_places(latitude=37.5, longitude=127.0)
