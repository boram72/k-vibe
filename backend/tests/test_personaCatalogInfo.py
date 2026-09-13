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
    personaCatalogInfo._load_personas.cache_clear()

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
    personaCatalogInfo._load_personas.cache_clear()

    personas = personaCatalogInfo._load_personas()

    assert personas == personaCatalogInfo.PERSONAS


@patch("data_repositories.personaCatalogInfo.get_supabase_client")
def test_load_personas_falls_back_to_hardcoded_when_db_query_fails(mock_get_client):
    mock_get_client.side_effect = RuntimeError("network down")
    personaCatalogInfo._load_personas.cache_clear()

    personas = personaCatalogInfo._load_personas()

    assert personas == personaCatalogInfo.PERSONAS


@patch("data_repositories.personaCatalogInfo.personainfo.get_all_persona_stops", return_value=[])
@patch("data_repositories.personaCatalogInfo.get_supabase_client")
def test_load_personas_is_cached_across_repeated_calls(mock_get_client, _mock_get_stops):
    """resolve_persona_id + get_persona가 한 요청 안에서 _load_personas를 각각 호출해도
    (personaRouteService.generate_route가 실제로 이렇게 함) DB 왕복은 1번만 나가야 한다.
    """
    mock_client = MagicMock()
    mock_client.table.return_value.select.return_value.order.return_value.execute.return_value.data = []
    mock_get_client.return_value = mock_client
    personaCatalogInfo._load_personas.cache_clear()
    personaCatalogInfo._count_stops_by_persona.cache_clear()

    resolved = personaCatalogInfo.resolve_persona_id(persona_id="BTS뷔")
    personaCatalogInfo.get_persona(resolved)
    personaCatalogInfo.list_personas("ko")

    mock_get_client.assert_called_once()


@patch("data_repositories.personaCatalogInfo.personainfo.get_all_persona_stops")
@patch("data_repositories.personaCatalogInfo.get_supabase_client")
def test_list_personas_route_cnt_reflects_actual_persona_stops(mock_get_client, mock_get_stops):
    """persona_catalog엔 개수 컬럼이 없다 — persona 테이블의 실제 스팟 개수를 세서 써야 한다."""
    mock_client = MagicMock()
    mock_client.table.return_value.select.return_value.order.return_value.execute.return_value.data = []
    mock_get_client.return_value = mock_client
    mock_get_stops.return_value = [
        {"name": "BTS뷔", "locationname": "1"},
        {"name": "BTS뷔", "locationname": "2"},
        {"name": "BTS뷔", "locationname": "3"},
        {"name": "아이유", "locationname": "4"},
    ]
    personaCatalogInfo._load_personas.cache_clear()
    personaCatalogInfo._count_stops_by_persona.cache_clear()

    personas = personaCatalogInfo.list_personas("ko")

    assert next(p for p in personas if p["id"] == "BTS뷔")["routeCnt"] == 3
    assert next(p for p in personas if p["id"] == "아이유")["routeCnt"] == 1


@patch("data_repositories.personaCatalogInfo.personainfo.get_all_persona_stops", return_value=[])
@patch("data_repositories.personaCatalogInfo.get_supabase_client")
def test_list_personas_route_cnt_falls_back_to_hardcoded_when_no_stops(mock_get_client, _mock_get_stops):
    mock_client = MagicMock()
    mock_client.table.return_value.select.return_value.order.return_value.execute.return_value.data = []
    mock_get_client.return_value = mock_client
    personaCatalogInfo._load_personas.cache_clear()
    personaCatalogInfo._count_stops_by_persona.cache_clear()

    personas = personaCatalogInfo.list_personas("ko")

    bts = next(p for p in personas if p["id"] == "BTS뷔")
    assert bts["routeCnt"] == len(personaCatalogInfo.PERSONAS["BTS뷔"]["locations"])
