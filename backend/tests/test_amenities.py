from unittest.mock import patch

import pytest

from externelAPI_services import amenities


@patch("externelAPI_services.amenities.kakaomap.search_category_nearby")
def test_find_nearby_amenities_merges_all_categories_when_none_given(mock_search):
    def fake_search(lat, lng, radius, category_group_code):
        return [{"id": category_group_code, "distance": 100.0}]

    mock_search.side_effect = fake_search

    result = amenities.find_nearby_amenities(37.5, 127.0)

    assert mock_search.call_count == 3
    assert {item["category"] for item in result} == {"convenience_store", "pharmacy", "bank_atm"}


@patch("externelAPI_services.amenities.kakaomap.search_category_nearby")
def test_find_nearby_amenities_filters_single_category(mock_search):
    mock_search.return_value = [{"id": "1", "distance": 50.0}]

    result = amenities.find_nearby_amenities(37.5, 127.0, category="pharmacy")

    mock_search.assert_called_once_with(37.5, 127.0, 1000, "PM9")
    assert result == [{"id": "1", "distance": 50.0, "category": "pharmacy"}]


@patch("externelAPI_services.amenities.kakaomap.search_category_nearby")
def test_find_nearby_amenities_sorts_by_distance(mock_search):
    def fake_search(lat, lng, radius, category_group_code):
        return {
            "CS2": [{"id": "far", "distance": 500.0}],
            "PM9": [{"id": "near", "distance": 50.0}],
            "BK9": [{"id": "mid", "distance": 200.0}],
        }[category_group_code]

    mock_search.side_effect = fake_search

    result = amenities.find_nearby_amenities(37.5, 127.0)

    assert [item["id"] for item in result] == ["near", "mid", "far"]


def test_find_nearby_amenities_raises_on_unknown_category():
    with pytest.raises(ValueError, match="지원하지 않는 카테고리"):
        amenities.find_nearby_amenities(37.5, 127.0, category="restroom")
