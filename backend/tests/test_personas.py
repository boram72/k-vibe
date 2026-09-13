from unittest.mock import patch

from fastapi.testclient import TestClient

from data_repositories import personaCatalogInfo
from main import app

client = TestClient(app)


@patch("data_repositories.personaCatalogInfo.personainfo.get_all_persona_stops", return_value=[])
@patch("data_repositories.personaCatalogInfo.get_supabase_client", side_effect=RuntimeError("no db in tests"))
def test_list_personas_returns_k_content_selector_data(_mock_get_client, _mock_get_stops):
    personaCatalogInfo._load_personas.cache_clear()
    personaCatalogInfo._count_stops_by_persona.cache_clear()

    response = client.get("/personas?locale=ko")

    assert response.status_code == 200
    body = response.json()
    assert [persona["id"] for persona in body] == [
        "BTS뷔", "아이유", "제니", "장원영", "코르티스 성현", "투어스 신유",
    ]
    assert body[0]["label"] == "BTS뷔"
    assert body[0]["routeCnt"] == 5
    assert body[0]["profileImg"].startswith("https://")
    assert body[0]["moods"] == ["탁트인", "전통있는", "여유로운"]
