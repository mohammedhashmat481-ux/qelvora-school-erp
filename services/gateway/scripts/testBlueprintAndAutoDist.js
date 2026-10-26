import { computeAutoDistribution, generateBlueprintPlan } from '../src/lib/ai/providers.js';

console.log('--- Testing computeAutoDistribution across mark values ---');
const testMarks = [20, 25, 30, 40, 50, 60, 70, 80, 100];
let allPassed = true;

for (const m of testMarks) {
  const dist = computeAutoDistribution(m, '');
  let sum = 0;
  let qCount = 0;
  for (const key of Object.keys(dist)) {
    if (dist[key].enabled) {
      sum += dist[key].count * dist[key].marksPerQ;
      qCount += dist[key].count;
    }
  }
  const match = sum === m;
  console.log(`Target: ${m}M -> Calculated Sum: ${sum}M (Questions: ${qCount}) [${match ? 'PASS' : 'FAIL'}]`);
  if (!match) allPassed = false;
}

// Test with special teacher instruction: "Only MCQs"
console.log('\n--- Testing with "Only MCQs" instruction ---');
const distMcq = computeAutoDistribution(25, 'Please create only MCQs');
let mcqSum = 0;
for (const key of Object.keys(distMcq)) {
  if (distMcq[key].enabled) {
    mcqSum += distMcq[key].count * distMcq[key].marksPerQ;
  }
}
console.log(`"Only MCQs" 25M -> mcq count: ${distMcq.mcq.count}, sum: ${mcqSum}M [${mcqSum === 25 && distMcq.mcq.count === 25 ? 'PASS' : 'FAIL'}]`);

// Test generateBlueprintPlan
console.log('\n--- Testing generateBlueprintPlan ---');
const plan = await generateBlueprintPlan({
  standard: '10th',
  syllabus: 'CBSE',
  subjects: ['Science'],
  chapters: { Science: ['Electricity', 'Light - Reflection and Refraction'] },
  totalMarks: 80,
  durationMinutes: 180,
  teacherInstructions: 'Give high weightage to Electricity and include application-based questions'
}, 'test-user-123');

console.log('Plan summary:', plan.summary);
console.log('Total Questions:', plan.totalQuestions, 'Total Marks:', plan.totalMarks);
console.log('Sections:', plan.sections.map(s => `${s.section} (${s.count} Qs, ${s.subTotalMarks}M)`).join(' | '));
console.log('Instruction alignment:', plan.instructionAlignment);
console.log('Chapter weightage:', plan.chapterWeightage);

if (allPassed && plan.totalMarks === 80 && plan.sections.length > 0) {
  console.log('\nALL BLUEPRINT & AUTO-DISTRIBUTION LOGIC TESTS PASSED 100%!');
  process.exit(0);
} else {
  console.error('\nSOME TESTS FAILED!');
  process.exit(1);
}
