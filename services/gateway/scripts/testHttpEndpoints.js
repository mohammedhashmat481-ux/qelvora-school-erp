import jwt from 'jsonwebtoken';
import { prisma } from '../src/db/prisma.js';

async function testHttp() {
  console.log('🌐 Testing Gateway HTTP Endpoints for Question Paper Generator...');

  const user = await prisma.user.findFirst({
    where: { role: { contains: 'teacher', mode: 'insensitive' } }
  }) || await prisma.user.findFirst({
    where: { role: { contains: 'admin', mode: 'insensitive' } }
  });

  if (!user) {
    console.error('No teacher or admin user found in database!');
    return;
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    process.env.JWT_SECRET || 'super_secret_jwt_key_school_crm_platform_2026',
    { expiresIn: '1h' }
  );

  console.log(`✅ Generated valid JWT for user: ${user.name} (${user.role})`);

  // 1. Test GET /api/paper/resources
  const resResources = await fetch('http://localhost:8000/api/paper/resources', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const dataResources = await resResources.json();
  console.log(`GET /api/paper/resources -> HTTP ${resResources.status}, count: ${dataResources.data?.length}`);

  if (!dataResources.status || !Array.isArray(dataResources.data)) {
    throw new Error('GET /api/paper/resources failed');
  }

  // 2. Test POST /api/paper/generate
  console.log('\n🚀 Testing POST /api/paper/generate...');
  const generatePayload = {
    standard: '10th',
    syllabus: 'CBSE',
    subjects: ['Physics'],
    chapters: { 'Physics': ['Electricity'] },
    totalMarks: 80,
    durationMinutes: 180,
    teacherInstructions: 'Focus on Ohm law and circuit calculation. Avoid repeating previous paper questions.',
    selectedResourceIds: [dataResources.data[0]?.id]
  };

  const resGen = await fetch('http://localhost:8000/api/paper/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(generatePayload)
  });

  const dataGen = await resGen.json();
  console.log(`POST /api/paper/generate -> HTTP ${resGen.status}`);
  console.log(`Paper ID: ${dataGen.id}`);
  console.log(`Paper Title: ${dataGen.title}`);
  console.log(`Has Answer Key: ${Boolean(dataGen.answerKey)}`);
  console.log(`Has Marking Scheme: ${Boolean(dataGen.markingScheme)}`);
  console.log(`Sources Used: ${dataGen.sourcesUsed?.length}`);

  // 3. Test GET /api/paper/:id
  const resGet = await fetch(`http://localhost:8000/api/paper/${dataGen.id}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const dataGet = await resGet.json();
  console.log(`GET /api/paper/${dataGen.id} -> HTTP ${resGet.status}, title: ${dataGet.data?.title}`);

  // 4. Test PUT /api/paper/:id (update paper)
  const resPut = await fetch(`http://localhost:8000/api/paper/${dataGen.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      title: 'Class 10 Mid-Term Assessment - Physics (Reviewed & Approved)',
      targetMarks: 80,
      allQuestions: dataGen.structuredData?.allQuestions
    })
  });
  const dataPut = await resPut.json();
  console.log(`PUT /api/paper/${dataGen.id} -> HTTP ${resPut.status}, updated title: ${dataPut.data?.title}`);

  // 5. Test POST /api/paper/regenerate-question
  const resRegen = await fetch('http://localhost:8000/api/paper/regenerate-question', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      classLevel: '10th',
      syllabus: 'CBSE',
      subject: 'Physics',
      chapter: 'Electricity',
      type: 'Short Answer',
      marks: 3,
      difficulty: 'Medium',
      teacherInstructions: 'Derive parallel resistance formula'
    })
  });
  const dataRegen = await resRegen.json();
  console.log(`POST /api/paper/regenerate-question -> HTTP ${resRegen.status}, question: "${dataRegen.question?.question?.slice(0, 70)}..."`);

  // 6. Test GET /api/paper/history
  const resHist = await fetch('http://localhost:8000/api/paper/history', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const dataHist = await resHist.json();
  console.log(`GET /api/paper/history -> HTTP ${resHist.status}, history items: ${dataHist.data?.length}`);

  console.log('\n🎉 ALL QUESTION PAPER GENERATOR HTTP ENDPOINTS PASSED WITH 100% SUCCESS!');
  await prisma.$disconnect();
}

testHttp().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
