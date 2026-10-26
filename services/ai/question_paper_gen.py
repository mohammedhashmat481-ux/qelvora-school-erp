import uuid
import logging
from typing import Dict, Any, Optional
import os

logger = logging.getLogger("question_paper_gen")

try:
    import google.generativeai as genai
    HAS_GENAI = True
except ImportError:
    HAS_GENAI = False

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")

class QuestionPaperGenerator:
    def generate_paper(
        self,
        standard: str,
        subject: str,
        syllabus: str = "CBSE",
        difficulty: str = "Medium",
        topic: Optional[str] = None,
        total_marks: int = 80
    ) -> Dict[str, Any]:
        paper_id = f"QP-{standard.upper()}-{uuid.uuid4().hex[:6].upper()}"
        title = f"{standard} {subject} Assessment Paper ({syllabus})"

        prompt = (
            f"Generate a formal examination paper and answer key for:\n"
            f"- Standard: {standard}\n"
            f"- Subject: {subject}\n"
            f"- Syllabus: {syllabus}\n"
            f"- Topic: {topic or 'Full Syllabus'}\n"
            f"- Total Marks: {total_marks}\n\n"
            f"Format with Section A (MCQs), Section B (Short Answer), Section C (Long Answer)."
        )

        try:
            if HAS_GENAI and GEMINI_API_KEY:
                genai.configure(api_key=GEMINI_API_KEY)
                model = genai.GenerativeModel("gemini-1.5-flash")
                response = model.generate_content(prompt)
                paper_content = response.text if response else "Examination Paper Content"
            else:
                paper_content = (
                    f"### {title}\n"
                    f"**Time Allowed:** 3 Hours | **Maximum Marks:** {total_marks}\n\n"
                    f"#### SECTION A: Multiple Choice Questions (1 Mark Each)\n"
                    f"1. What is the fundamental unit of {subject}?\n"
                    f"   a) Option A  b) Option B  c) Option C  d) Option D\n\n"
                    f"#### SECTION B: Short Answer Questions (3 Marks Each)\n"
                    f"2. Explain the key principles of {topic or 'the core chapter'}.\n\n"
                    f"#### SECTION C: Long Answer Questions (5 Marks Each)\n"
                    f"3. Derive the main formula and discuss real-world applications."
                )

            answer_key = (
                f"### Answer Key for {paper_id}\n\n"
                f"1. Option A (1 Mark)\n"
                f"2. Detailed step-by-step derivation (3 Marks)\n"
                f"3. Comprehensive explanation (5 Marks)"
            )

            return {
                "id": paper_id,
                "title": title,
                "paper": paper_content,
                "answer_key": answer_key,
                "created_at": "2026-09-25T12:00:00Z"
            }
        except Exception as e:
            logger.error(f"Error generating paper: {e}")
            return {
                "id": paper_id,
                "title": title,
                "paper": f"Sample paper for {standard} {subject}",
                "answer_key": "Sample answer key",
                "created_at": "2026-09-25T12:00:00Z",
                "error": str(e)
            }

question_paper_gen = QuestionPaperGenerator()
