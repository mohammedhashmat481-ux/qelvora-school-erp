import { prisma } from '../src/db/prisma.js';
import { retrieveRelevantChunks } from '../src/lib/pdf/ragService.js';
import { generateMultiSubjectPaper, enforceExactMarks } from '../src/lib/ai/providers.js';

async function test() {
  console.log('🧪 Testing Knowledge Library RAG Retrieval & AI Generation...');

  const resources = await prisma.questionPaperResource.findMany({
    where: { standard: '10th', subject: 'Physics' }
  });
  console.log(`✅ Found ${resources.length} resources for Class 10 Physics in Knowledge Library.`);

  const retrieval = retrieveRelevantChunks({
    resources,
    selectedChapters: ['Electricity', 'Light – Reflection and Refraction'],
    maxChunksPerSubject: 6
  });

  console.log(`✅ Retrieved ${retrieval.chunks.length} top ranked chunks.`);
  console.log(`📄 Sources used:\n`, retrieval.sourcesSummary.map(s => ` - [${s.documentType}] ${s.title}`).join('\n'));
  console.log(`\n🔍 Context preview snippet:\n${retrieval.contextText.slice(0, 250)}...\n`);

  // Test paper generation with teacher instructions & RAG
  const teacherInstructions = 'Give high weightage to Ohm’s Law numericals and parallel resistance circuits. Follow official CBSE Board exam pattern.';

  const paperResult = await generateMultiSubjectPaper({
    standard: '10th',
    syllabus: 'CBSE',
    subjects: ['Physics'],
    chapters: { 'Physics': ['Electricity', 'Light – Reflection and Refraction'] },
    pattern: 'Standard Custom Pattern',
    totalMarks: 80,
    durationMinutes: 180,
    questionDistribution: {
      mcq: { enabled: true, count: 16, marksPerQ: 1 },
      assertionReason: { enabled: true, count: 4, marksPerQ: 1 },
      veryShort: { enabled: true, count: 6, marksPerQ: 2 },
      shortAnswer: { enabled: true, count: 7, marksPerQ: 3 },
      longAnswer: { enabled: true, count: 3, marksPerQ: 5 },
      caseBased: { enabled: true, count: 3, marksPerQ: 4 }
    },
    teacherInstructions,
    groundedContext: retrieval.contextText,
    selectedResources: retrieval.sourcesSummary
  }, 'test-user-id');

  console.log('✅ Paper Generated Successfully!');
  console.log(`Title: ${paperResult.title}`);
  console.log(`Provider: ${paperResult.provider} (${paperResult.model})`);
  console.log(`Total Questions: ${paperResult.structuredData?.allQuestions?.length}`);
  
  const questionMarksSum = (paperResult.structuredData?.allQuestions || []).reduce((s, q) => s + q.marks, 0);
  console.log(`Target Marks: 80 | Actual Questions Marks Sum: ${questionMarksSum}`);

  if (questionMarksSum === 80) {
    console.log('🎯 DETERMINISTIC MARKS VALIDATION PASSED: Exactly 80 Marks!');
  } else {
    console.error(`❌ MARKS MISMATCH: Expected 80 but got ${questionMarksSum}`);
  }

  console.log(`\n📜 Question Paper Length: ${paperResult.paper.length} chars`);
  console.log(`🔑 Answer Key Length: ${paperResult.answerKey.length} chars`);
  console.log(`📋 Marking Scheme Length: ${paperResult.markingScheme.length} chars`);

  await prisma.$disconnect();
}

test().catch(console.error);
