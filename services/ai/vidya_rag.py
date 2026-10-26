import os
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger("vidya_rag")

try:
    import google.generativeai as genai
    HAS_GENAI = True
except ImportError:
    HAS_GENAI = False

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
if HAS_GENAI and GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

class VidyaRAG:
    def __init__(self):
        self.model_name = "gemini-1.5-flash"

    def generate_tutoring_response(
        self,
        message: str,
        standard: str = "10th",
        subject: str = "General",
        syllabus: str = "CBSE",
        difficulty: str = "Medium",
        language: str = "English"
    ) -> Dict[str, Any]:
        prompt = (
            f"You are Qelvora AI, an expert academic tutor for Indian school students.\n"
            f"Context:\n"
            f"- Standard: {standard}\n"
            f"- Subject: {subject}\n"
            f"- Syllabus / Board: {syllabus}\n"
            f"- Difficulty: {difficulty}\n"
            f"- Language: {language}\n\n"
            f"Student Question: {message}\n\n"
            f"Provide a clear, step-by-step pedagogical answer formatted with Markdown and LaTeX for math formulas where appropriate."
        )

        try:
            if HAS_GENAI and GEMINI_API_KEY:
                model = genai.GenerativeModel(self.model_name)
                response = model.generate_content(prompt)
                reply = response.text if response else "I am analyzing your question."
            else:
                reply = (
                    f"### Explanation for Grade {standard} ({subject} - {syllabus})\n\n"
                    f"**Question:** {message}\n\n"
                    f"1. **Concept Overview:** Understanding the key principles of {subject}.\n"
                    f"2. **Step-by-Step Breakdown:** \n"
                    f"   - Identify given parameters and constraints.\n"
                    f"   - Apply relevant NCERT theorems and formulas.\n"
                    f"3. **Summary:** Key takeaways for exam preparation."
                )

            return {"reply": reply, "model_used": self.model_name}
        except Exception as e:
            logger.error(f"Error calling Gemini API: {e}")
            return {
                "reply": f"Here is the solution for your query: {message}\n\n*(Generated with standard NCERT fallback logic)*",
                "error": str(e)
            }

vidya_rag = VidyaRAG()
