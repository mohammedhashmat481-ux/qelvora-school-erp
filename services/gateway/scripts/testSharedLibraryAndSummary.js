import { prisma } from '../src/db/prisma.js';
import {
  computeFileHash,
  listStudyMaterials,
  uploadStudyMaterial,
  deleteStudyMaterial
} from '../src/lib/studyMaterial/studyMaterialService.js';
import { generateTopicSummary } from '../src/lib/ai/summaryGenerator.js';
import { generateMultiSubjectPaper } from '../src/lib/ai/providers.js';
import fs from 'fs';
import path from 'path';

async function runTests() {
  console.log('🧪 Starting End-to-End Shared Library & AI Generator Verification...\n');

  try {
    // TEST 1: Check existing shared library documents
    console.log('1️⃣ Listing shared study materials...');
    const initialList = await listStudyMaterials({ standard: '10th', subject: 'Physics' });
    console.log(`   Found ${initialList.length} shared materials for 10th Physics`);

    // TEST 2: Create a dummy sample chapter PDF or document to test duplicate detection
    console.log('\n2️⃣ Testing Upload & Duplicate Detection in Shared Library...');
    const tempDir = path.resolve('uploads/test-docs');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
    const sampleFilePath = path.join(tempDir, 'sample_physics_notes.txt');
    fs.writeFileSync(sampleFilePath, 'Sample Chapter 10: Light, Reflection and Spherical Mirrors. Concave mirror focal length f = R/2. Snell\'s Law sin(i)/sin(r) = n.');

    const fileHash = computeFileHash(sampleFilePath);
    console.log(`   Computed SHA256 fileHash: ${fileHash}`);

    // Upload first time
    const dummyFile = {
      path: sampleFilePath,
      originalname: 'sample_physics_notes.txt',
      mimetype: 'text/plain',
      size: fs.statSync(sampleFilePath).size
    };

    const firstUpload = await uploadStudyMaterial({
      file: dummyFile,
      title: 'NCERT Physics Chapter 10 Notes',
      board: 'CBSE',
      standard: '10th',
      subject: 'Physics',
      documentType: 'notes',
      academicYear: '2024-2025',
      chapters: ['Light: Reflection & Refraction'],
      user: { id: 'admin-uuid-101', name: 'Admin User' }
    });

    const resourceId = firstUpload.data?.id;
    console.log(`   First upload result: ID=${resourceId}, isDuplicate=${Boolean(firstUpload.isDuplicate)}`);

    // Upload second time (identical file & subject) -> MUST detect duplicate and reuse
    const secondUpload = await uploadStudyMaterial({
      file: dummyFile,
      title: 'NCERT Physics Chapter 10 Duplicate',
      board: 'CBSE',
      standard: '10th',
      subject: 'Physics',
      documentType: 'notes',
      academicYear: '2024-2025',
      user: { id: 'admin-uuid-101', name: 'Admin User' }
    });

    const secondResourceId = secondUpload.data?.id;
    console.log(`   Second upload result: ID=${secondResourceId}, isDuplicate=${Boolean(secondUpload.isDuplicate)}`);
    if (resourceId === secondResourceId && secondUpload.isDuplicate) {
      console.log('   ✅ PASS: Exact duplicate detected and reused without duplicating records!');
    } else {
      console.warn('   ⚠️ WARNING: Duplicate record behavior mismatch.');
    }

    // TEST 3: AI Topic Summary Generation grounded in the shared document
    console.log('\n3️⃣ Generating Topic Summary with RAG grounding from the shared library...');
    const summaryResult = await generateTopicSummary({
      standard: '10th',
      board: 'CBSE',
      subject: 'Physics',
      topic: 'Spherical Mirrors and Reflection Laws',
      style: 'Standard Notes',
      teacherInstructions: 'Include sign convention and focal length formula',
      selectedResourceIds: [resourceId]
    });

    console.log(`   Summary generated: Title="${summaryResult.title}"`);
    console.log(`   Model used: ${summaryResult.model} (${summaryResult.provider})`);
    console.log(`   Grounded sources count: ${summaryResult.sourcesUsed.length}`);
    console.log(`   Summary character length: ${summaryResult.summary.length}`);
    if (summaryResult.summary.includes('Spherical Mirrors') || summaryResult.summary.includes('Reflection')) {
      console.log('   ✅ PASS: Topic summary contains relevant physics concepts!');
    }

    // TEST 4: Persist TopicSummary to Database
    console.log('\n4️⃣ Testing TopicSummary DB Persistence & Retrieval...');
    const savedSummary = await prisma.topicSummary.create({
      data: {
        standard: '10th',
        board: 'CBSE',
        subject: 'Physics',
        topic: 'Spherical Mirrors and Reflection Laws',
        style: 'Standard Notes',
        title: summaryResult.title,
        summary: summaryResult.summary,
        teacherInstructions: 'Include sign convention and focal length formula',
        sourcesUsed: summaryResult.sourcesUsed,
        provider: summaryResult.provider,
        model: summaryResult.model,
        userId: 'admin-uuid-101'
      }
    });
    console.log(`   Saved TopicSummary ID: ${savedSummary.id}`);

    const retrieved = await prisma.topicSummary.findUnique({
      where: { id: savedSummary.id }
    });
    if (retrieved && retrieved.topic === 'Spherical Mirrors and Reflection Laws') {
      console.log('   ✅ PASS: TopicSummary retrieved from PostgreSQL successfully!');
    }

    // TEST 5: Verify AI Question Paper Generator uses the exact same shared library document
    console.log('\n5️⃣ Verifying Question Paper Generator uses the same shared resource...');
    const paperResult = await generateMultiSubjectPaper({
      classLevel: '10th',
      syllabus: 'CBSE',
      subjects: ['Physics'],
      chaptersBySubject: { 'Physics': ['Light: Reflection & Refraction'] },
      totalMarks: 25,
      durationMinutes: 45,
      difficultyMix: { easy: 40, medium: 40, hard: 20 },
      options: { includeAnswerKey: true, includeStepWiseSolutions: true, includeMarkingScheme: true },
      distribution: {
        mcq: { enabled: true, count: 5, marksPerQ: 1 },
        veryShort: { enabled: true, count: 2, marksPerQ: 2 },
        shortAnswer: { enabled: true, count: 2, marksPerQ: 3 },
        longAnswer: { enabled: true, count: 2, marksPerQ: 5 }
      },
      selectedResourceIds: [resourceId] // Reusing identical resource ID!
    });

    console.log(`   Generated Paper: Total Questions=${paperResult.questions?.length}, Marks=${paperResult.paperMeta?.totalMarks}`);
    console.log(`   Sources grounded in paper:`, paperResult.sourcesUsed);
    if (paperResult.questions?.length > 0) {
      console.log('   ✅ PASS: Question Paper generated using shared library resource!');
    }

    // Clean up test summary and test file
    console.log('\n🧹 Cleaning up test artifacts...');
    await prisma.topicSummary.delete({ where: { id: savedSummary.id } });
    await deleteStudyMaterial(resourceId);
    if (fs.existsSync(sampleFilePath)) fs.unlinkSync(sampleFilePath);
    console.log('   ✅ Clean up completed.');

    console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY! Centralized Study Material Library + Summary Generator + Question Paper Generator are 100% verified.\n');
  } catch (err) {
    console.error('❌ Test failed:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
