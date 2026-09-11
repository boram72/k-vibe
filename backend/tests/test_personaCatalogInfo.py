from unittest.mock import MagicMock, patch

from data_repositories import personaCatalogInfo


@patch("data_repositories.personaCatalogInfo.get_supabase_client")
def test_load_personas_uses_db_rows_when_available(mock_get_client):
    mock_client = MagicMock()
    mock_client.table.return_value.select.return_value.order.return_value.execute.return_value.data = [
        {
            "id": "BTS뷔",
            "label_en": "BTS V (DB)",
            "badge": "V2",
            "profile_img": "https://example.com/v.jpg",
            "theme": "kpop",
            "description_ko": "DB 설명",
            "description_en": "DB description",
            "moods_ko": ["새로운"],
            "moods_en": ["New"],
            "display_order": 1,
        },
    ]
    mock_get_client.return_value = mock_client

    personas = personaCatalogInfo._load_personas()

    assert personas["BTS뷔"]["label"] == {"ko": "BTS뷔", "en": "BTS V (DB)"}
    assert personas["BTS뷔"]["badge"] == "V2"
    assert personas["BTS뷔"]["description"] == {"ko": "DB 설명", "en": "DB description"}
    assert personas["BTS뷔"]["moods"] == {"ko": ["새로운"], "en": ["New"]}
    # locations(경로 정거장 이름)는 DB 테이블에 없으므로 하드코딩 폴백 값을 그대로 유지해야 한다.
    assert personas["BTS뷔"]["locations"] == personaCatalogInfo.PERSONAS["BTS뷔"]["locations"]


@patch("data_repositories.personaCatalogInfo.get_supabase_client")
def test_load_personas_falls_back_to_hardcoded_when_db_empty(mock_get_client):
    mock_client = MagicMock()
    mock_client.table.return_value.select.return_value.order.return_value.execute.return_value.data = []
    mock_get_client.return_value = mock_client

    personas = personaCatalogInfo._load_personas()

    assert personas == personaCatalogInfo.PERSONAS


@patch("data_repositories.personaCatalogInfo.get_supabase_client")
def test_load_personas_falls_back_to_hardcoded_when_db_query_fails(mock_get_client):
    mock_get_client.side_effect = RuntimeError("network down")

    personas = personaCatalogInfo._load_personas()

    assert personas == personaCatalogInfo.PERSONAS
