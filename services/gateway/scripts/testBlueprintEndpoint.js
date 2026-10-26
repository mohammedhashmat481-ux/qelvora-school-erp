import axios from 'axios';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_school_crm_platform_2026';
const token = jwt.sign(
  { id: 'usr_admin_1', role: 'ADMIN', institutionId: 'inst_ink_main' },
  JWT_SECRET,
  { expiresIn: '1h' }
);

const API = 'http://localhost:8000/api';

async function testBlueprintApi() {
  console.log('--- Testing POST /api/paper/plan-blueprint ---');
  try {
    const res = await axios.post(
      `${API}/paper/plan-blueprint`,
      {
        classLevel: '10th',
        syllabus: 'CBSE',
        subjects: ['Science'],
        chaptersBySubject: { Science: ['Electricity', 'Light - Reflection and Refraction'] },
        totalMarks: 50,
        durationMinutes: 120,
        teacherInstructions: 'Give 50% weightage to numerical questions from Electricity and Light',
        distributionMode: 'ai_auto'
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    console.log('Endpoint status:', res.status, res.data.status);
    console.log('Blueprint plan summary:', res.data.data.summary);
    console.log('Blueprint total marks:', res.data.data.totalMarks);
    console.log('Blueprint total questions:', res.data.data.totalQuestions);
    console.log('Blueprint sections count:', res.data.data.sections.length);

    console.log('\n--- Testing POST /api/paper/generate with distributionMode: "ai_auto" (No manual distribution) ---');
    const genRes = await axios.post(
      `${API}/paper/generate`,
      {
        classLevel: '10th',
        syllabus: 'CBSE',
        subjects: ['Science'],
        chaptersBySubject: { Science: ['Electricity'] },
        totalMarks: 20,
        durationMinutes: 45,
        distributionMode: 'ai_auto',
        teacherInstructions: 'Create a quick diagnostic test for Electricity',
        options: {
          includeAnswerKey: true,
          includeSolutions: true,
          includeMarkingScheme: true,
          schoolName: 'INK Test Academy',
          paperTitle: 'Electricity Quick Diagnostic'
        }
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    console.log('Generate status:', genRes.status, genRes.data.status);
    console.log('Generated paper title:', genRes.data.title);
    console.log('Generated total marks:', genRes.data.totalMarks);
    console.log('Generated questions count:', genRes.data.structuredData.allQuestions.length);

    const qSum = genRes.data.structuredData.allQuestions.reduce((s, q) => s + Number(q.marks), 0);
    console.log('Sum of question marks:', qSum);

    if (res.data.status && genRes.data.status && qSum === 20) {
      console.log('\n✓ ENDPOINTS TEST PASSED 100%! Optional distribution and blueprint plan working end-to-end!');
      process.exit(0);
    } else {
      console.error('\n❌ Marks did not match or endpoint returned error!');
      process.exit(1);
    }
  } catch (err) {
    console.error('API Error:', err.response?.data || err.message);
    process.exit(1);
  }
}

testBlueprintApi();
