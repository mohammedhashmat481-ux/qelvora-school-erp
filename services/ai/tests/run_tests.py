import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from face_engine import face_engine
from vidya_rag import vidya_rag
from question_paper_gen import question_paper_gen

class TestAIServiceLogic(unittest.TestCase):
    def test_face_verification(self):
        res = face_engine.verify_face("data:image/jpeg;base64,123", ["emb1"])
        self.assertTrue(res["verified"])
        self.assertGreaterEqual(res["confidence"], 0.75)

    def test_liveness_detection(self):
        res = face_engine.detect_liveness("data:image/jpeg;base64,123")
        self.assertTrue(res["live"])
        self.assertGreaterEqual(res["confidence"], 0.90)

    def test_vidya_rag_tutoring(self):
        res = vidya_rag.generate_tutoring_response(
            message="What is gravity?",
            standard="9th",
            subject="Physics"
        )
        self.assertIn("reply", res)
        self.assertTrue(len(res["reply"]) > 0)

    def test_question_paper_generation(self):
        res = question_paper_gen.generate_paper(
            standard="9th",
            subject="Mathematics",
            total_marks=50
        )
        self.assertIn("id", res)
        self.assertIn("paper", res)
        self.assertIn("answer_key", res)

if __name__ == "__main__":
    unittest.main()
