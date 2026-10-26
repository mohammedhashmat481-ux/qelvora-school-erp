import logging
from fastapi import FastAPI, Depends, Request, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional

from middleware.internal_auth import verify_internal_token
from face_engine import face_engine
from vidya_rag import vidya_rag
from question_paper_gen import question_paper_gen

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ai_service")

app = FastAPI(
    title="Qelvora School CRM Private AI Microservice",
    version="1.0.0",
    description="Private AI service handling Face Verification, Vidya AI Tutoring, and Question Paper Generation"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------- Models -----------------
class VerifyFaceRequest(BaseModel):
    current_image: str
    registered_embeddings: List[str] = []

class DetectLivenessRequest(BaseModel):
    image: str

class VidyaChatRequest(BaseModel):
    message: str
    standard: str = "10th"
    subject: str = "General"
    syllabus: str = "CBSE"
    difficulty: str = "Medium"
    language: str = "English"

class GeneratePaperRequest(BaseModel):
    standard: str
    subject: str
    syllabus: str = "CBSE"
    difficulty: str = "Medium"
    topic: Optional[str] = None
    total_marks: int = 80

# ----------------- Routes -----------------
@app.get("/health")
async def health():
    return {"status": "ok", "service": "school-crm-ai-microservice"}

@app.post("/verify-face", dependencies=[Depends(verify_internal_token)])
async def verify_face(req: VerifyFaceRequest):
    return face_engine.verify_face(req.current_image, req.registered_embeddings)

@app.post("/detect-liveness", dependencies=[Depends(verify_internal_token)])
async def detect_liveness(req: DetectLivenessRequest):
    return face_engine.detect_liveness(req.image)

@app.post("/api/vidya/chat", dependencies=[Depends(verify_internal_token)])
async def vidya_chat(req: VidyaChatRequest):
    res = vidya_rag.generate_tutoring_response(
        message=req.message,
        standard=req.standard,
        subject=req.subject,
        syllabus=req.syllabus,
        difficulty=req.difficulty,
        language=req.language
    )
    return {"session_id": "session-101", "reply": res.get("reply")}

@app.post("/api/vidya/explain-concept", dependencies=[Depends(verify_internal_token)])
async def vidya_explain_concept(req: VidyaChatRequest):
    res = vidya_rag.generate_tutoring_response(
        message=f"Explain concept step-by-step: {req.message}",
        standard=req.standard,
        subject=req.subject,
        syllabus=req.syllabus
    )
    return {"reply": res.get("reply")}

@app.post("/api/vidya/solve-math", dependencies=[Depends(verify_internal_token)])
async def vidya_solve_math(req: VidyaChatRequest):
    res = vidya_rag.generate_tutoring_response(
        message=f"Solve math problem step-by-step showing working: {req.message}",
        standard=req.standard,
        subject="Mathematics"
    )
    return {"reply": res.get("reply")}

@app.post("/api/vidya/generate-paper", dependencies=[Depends(verify_internal_token)])
async def generate_paper(req: GeneratePaperRequest):
    return question_paper_gen.generate_paper(
        standard=req.standard,
        subject=req.subject,
        syllabus=req.syllabus,
        difficulty=req.difficulty,
        topic=req.topic,
        total_marks=req.total_marks
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=5000, reload=True)
