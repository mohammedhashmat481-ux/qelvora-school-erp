from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

SECRET_HEADER = {"x-internal-ai-secret": "internal_shared_secret_school_crm_ai_service_token"}

def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"

def test_unauthorized_access():
    response = client.post("/verify-face", json={"current_image": "test_b64"})
    assert response.status_code == 401

def test_verify_face_authorized():
    response = client.post(
        "/verify-face",
        headers=SECRET_HEADER,
        json={"current_image": "data:image/jpeg;base64,123", "registered_embeddings": ["emb1"]}
    )
    assert response.status_code == 200
    assert "verified" in response.json()

def test_vidya_chat_authorized():
    response = client.post(
        "/api/vidya/chat",
        headers=SECRET_HEADER,
        json={"message": "What is Newton's First Law?", "standard": "9th", "subject": "Physics"}
    )
    assert response.status_code == 200
    assert "reply" in response.json()

def test_generate_paper_authorized():
    response = client.post(
        "/api/vidya/generate-paper",
        headers=SECRET_HEADER,
        json={"standard": "9th", "subject": "Mathematics", "total_marks": 50}
    )
    assert response.status_code == 200
    assert "id" in response.json()
    assert "paper" in response.json()
