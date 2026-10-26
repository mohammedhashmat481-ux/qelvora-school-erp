import React from 'react';

/**
 * ExamPaperSheet Component
 * Renders authentic, publication-quality Indian School / Board (CBSE / State Board)
 * examination papers, answer keys, and marking schemes matching official standards.
 * Reference: Image 1 (MCQ grid layout) and Image 2 (Section layout, right-aligned marks, centered OR).
 */
export default function ExamPaperSheet({
  paperData,
  activeTab = 'paper',
  schoolName = 'QELVORA SCHOOL CRM'
}) {
  if (!paperData) return null;

  const title = paperData.title || '10TH COMPREHENSIVE EXAMINATION';
  const standard = paperData.standard || '10th';
  const syllabus = paperData.syllabus || paperData.request?.syllabus || 'CBSE';
  const subjects = Array.isArray(paperData.subjects) ? paperData.subjects.join(', ') : (paperData.subject || 'Science');
  const duration = paperData.durationMinutes || paperData.request?.durationMinutes || 180;
  const totalMarks = paperData.totalMarks || paperData.request?.totalMarks || 80;
  const examCode = paperData.id || 'QP-10TH-BOARD';

  const questions = paperData.structuredData?.allQuestions || [];

  // Group questions by section
  const sectionGroups = {
    'A': {
      title: 'SECTION – A (1 mark each)',
      subTitle: 'MULTIPLE CHOICE QUESTIONS',
      marksPerQ: 1,
      questions: questions.filter(q => q.section === 'A')
    },
    'B': {
      title: 'SECTION – B (2 marks each)',
      subTitle: 'VERY SHORT ANSWER TYPE QUESTIONS',
      marksPerQ: 2,
      questions: questions.filter(q => q.section === 'B')
    },
    'C': {
      title: 'SECTION C',
      subTitle: 'Short Answer Type Questions',
      marksPerQ: 3,
      questions: questions.filter(q => q.section === 'C')
    },
    'D': {
      title: 'SECTION D',
      subTitle: 'Long Answer Type Questions',
      marksPerQ: 5,
      questions: questions.filter(q => q.section === 'D')
    },
    'E': {
      title: 'SECTION E',
      subTitle: 'Case-Based / Source-Integrated Units',
      marksPerQ: 4,
      questions: questions.filter(q => q.section === 'E')
    }
  };

  // Helper to determine options layout (horizontal row vs 2x2 grid vs vertical list)
  const renderOptions = (options) => {
    if (!options || !Array.isArray(options) || options.length === 0) return null;
    const letters = ['(a)', '(b)', '(c)', '(d)', '(e)'];
    const maxLen = Math.max(...options.map(o => (o || '').length));

    // Short options: 1-line horizontal row (Image 1 Q1, Q2, Q4, Q5, Q6)
    if (maxLen <= 22 && options.length === 4) {
      return (
        <div className="grid grid-cols-4 gap-2 pt-1 pb-1.5 pl-6 text-[13px] text-slate-800 font-normal">
          {options.map((opt, i) => (
            <div key={i} className="flex items-start gap-1.5">
              <span className="font-semibold text-slate-900">{letters[i]}</span>
              <span>{opt}</span>
            </div>
          ))}
        </div>
      );
    }

    // Medium options: 2-column grid (Image 1 Q3, Q7)
    if (maxLen <= 48 && options.length === 4) {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 pt-1 pb-1.5 pl-6 text-[13px] text-slate-800 font-normal">
          {options.map((opt, i) => (
            <div key={i} className="flex items-start gap-1.5">
              <span className="font-semibold text-slate-900">{letters[i]}</span>
              <span>{opt}</span>
            </div>
          ))}
        </div>
      );
    }

    // Long options: vertical stack
    return (
      <div className="space-y-1 pt-1 pb-1.5 pl-6 text-[13px] text-slate-800 font-normal">
        {options.map((opt, i) => (
          <div key={i} className="flex items-start gap-1.5">
            <span className="font-semibold text-slate-900">{letters[i]}</span>
            <span>{opt}</span>
          </div>
        ))}
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────
  // TAB 1: QUESTION PAPER
  // ─────────────────────────────────────────────────────────────
  if (activeTab === 'paper') {
    return (
      <div className="w-full max-w-4xl mx-auto bg-white p-6 sm:p-12 text-slate-900 font-serif leading-relaxed shadow-xs border border-slate-200 print:shadow-none print:border-none print:p-0 print:max-w-none">
        {/* Paper Header */}
        <div className="text-center pb-3 border-b-2 border-slate-900">
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 uppercase">
            {schoolName}
          </h1>
          <h2 className="text-base sm:text-lg font-bold tracking-wide text-slate-800 uppercase mt-1">
            {title}
          </h2>
        </div>

        {/* Metadata Bar */}
        <div className="py-2.5 border-b border-slate-400 text-xs sm:text-sm font-semibold flex flex-wrap justify-between gap-y-1 text-slate-800">
          <div className="flex gap-4 sm:gap-6 flex-wrap">
            <span><strong>Standard:</strong> {standard}</span>
            <span><strong>Subject(s):</strong> {subjects}</span>
            <span><strong>Board:</strong> {syllabus}</span>
          </div>
          <div className="flex gap-4 sm:gap-6 flex-wrap">
            <span><strong>Time Allowed:</strong> {duration} Mins</span>
            <span><strong>Max. Marks:</strong> {totalMarks}</span>
            <span className="font-mono text-xs"><strong>Code:</strong> {examCode}</span>
          </div>
        </div>

        {/* General Instructions */}
        <div className="py-3 text-xs sm:text-xs text-slate-700 space-y-1 border-b border-slate-300">
          <p className="font-bold uppercase tracking-wider text-slate-900 text-[11px]">
            General Instructions:
          </p>
          <ol className="list-decimal pl-5 space-y-0.5 text-slate-800 leading-normal">
            <li>This question paper comprises five Sections – <strong>A, B, C, D and E</strong>. There are <strong>{questions.length}</strong> questions in the paper.</li>
            <li><strong>Section A</strong> consists of objective multiple choice questions carrying <strong>1 mark</strong> each.</li>
            <li><strong>Section B</strong> consists of very short answer questions carrying <strong>2 marks</strong> each.</li>
            <li><strong>Section C</strong> consists of short answer questions carrying <strong>3 marks</strong> each.</li>
            <li><strong>Section D</strong> consists of long answer / numerical questions carrying <strong>5 marks</strong> each.</li>
            <li><strong>Section E</strong> consists of case-based evaluation units carrying <strong>4 marks</strong> each with sub-questions.</li>
            <li>All questions are compulsory. However, an internal choice in some questions has been provided.</li>
            <li>Use of calculators or electronic devices is strictly prohibited.</li>
          </ol>
        </div>

        {/* Question Sections */}
        <div className="mt-6 space-y-8">
          {Object.entries(sectionGroups).map(([secKey, sec]) => {
            if (!sec.questions || sec.questions.length === 0) return null;
            const secTotalMarks = sec.questions.reduce((sum, q) => sum + (q.marks || sec.marksPerQ), 0);
            const count = sec.questions.length;

            return (
              <div key={secKey} className="break-inside-avoid-page space-y-3">
                {/* Section Header (Centered like Image 1 & 2) */}
                <div className="text-center pt-2">
                  <h3 className="text-sm sm:text-base font-black tracking-wider uppercase underline underline-offset-4 decoration-1">
                    {sec.title}
                  </h3>
                  <div className="flex items-center justify-between text-xs sm:text-sm font-bold text-slate-800 mt-1 px-2">
                    <span className="italic uppercase">
                      {secKey === 'A' ? `${sec.subTitle}. (${secTotalMarks} marks)` : `(${sec.subTitle})`}
                    </span>
                    <span className="font-bold text-slate-900">
                      {secKey !== 'A' ? `(${count}×${sec.marksPerQ}=${secTotalMarks})` : ''}
                    </span>
                  </div>
                </div>

                {/* Section Questions List */}
                <div className="space-y-4 pt-1">
                  {sec.questions.map((q) => {
                    const hasOr = Boolean(q.orQuestion);

                    return (
                      <div key={q.id || q.qNumber} className="break-inside-avoid space-y-1">
                        {/* Question Row (Q Number, Question Text, Right-Aligned Marks) */}
                        <div className="flex items-start justify-between gap-3 text-xs sm:text-[13px] leading-relaxed">
                          <div className="flex items-start gap-2 flex-1">
                            <span className="font-bold text-slate-900 min-w-[24px]">
                              {q.qNumber}.
                            </span>
                            <div className="flex-1 text-slate-900 whitespace-pre-line">
                              {hasOr && <span className="font-bold mr-1.5">(a)</span>}
                              {q.question}
                            </div>
                          </div>
                          <div className="font-bold text-slate-900 text-xs sm:text-sm whitespace-nowrap pl-2">
                            {q.marks || sec.marksPerQ}
                          </div>
                        </div>

                        {/* MCQ Options (If applicable) */}
                        {q.options && renderOptions(q.options)}

                        {/* Internal Choice (OR Question) - Image 2 style */}
                        {hasOr && (
                          <div className="space-y-2 pt-2">
                            <div className="text-center">
                              <span className="font-black text-xs tracking-widest text-slate-900 uppercase">
                                OR
                              </span>
                            </div>
                            <div className="flex items-start justify-between gap-3 text-xs sm:text-[13px] leading-relaxed pl-6">
                              <div className="flex items-start gap-2 flex-1">
                                <span className="font-bold text-slate-900">(b)</span>
                                <div className="flex-1 text-slate-900 whitespace-pre-line">
                                  {q.orQuestion}
                                </div>
                              </div>
                              <div className="font-bold text-slate-900 text-xs sm:text-sm whitespace-nowrap pl-2">
                                {q.marks || sec.marksPerQ}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Paper Footer (Exam Code, Page Number Hexagon, P.T.O.) */}
        <div className="mt-12 pt-3 border-t border-slate-300 flex items-center justify-between text-xs font-bold text-slate-600">
          <span>{examCode}</span>
          <span className="px-2.5 py-0.5 border border-slate-400 rounded-sm font-mono text-[11px]">
            P.T.O.
          </span>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // TAB 2: ANSWER KEY & DETAILED SOLUTIONS
  // ─────────────────────────────────────────────────────────────
  if (activeTab === 'answer') {
    return (
      <div className="w-full max-w-4xl mx-auto bg-white p-6 sm:p-12 text-slate-900 font-serif leading-relaxed shadow-xs border border-slate-200 print:shadow-none print:border-none print:p-0 print:max-w-none">
        <div className="text-center pb-3 border-b-2 border-slate-900">
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 uppercase">
            {schoolName}
          </h1>
          <h2 className="text-base sm:text-lg font-bold tracking-wide text-emerald-800 uppercase mt-1">
            OFFICIAL ANSWER KEY & STEP-BY-STEP SOLUTIONS
          </h2>
          <p className="text-xs text-slate-600 mt-1 font-sans">
            {title} • Code: {examCode} • Maximum Marks: {totalMarks}
          </p>
        </div>

        <div className="mt-6 space-y-6">
          {questions.map((q) => (
            <div key={q.id || q.qNumber} className="border-b border-slate-200 pb-4 space-y-2 break-inside-avoid">
              <div className="flex items-start justify-between gap-3 text-xs sm:text-sm">
                <span className="font-bold text-slate-900">
                  Q{q.qNumber}. [{q.type} • Section {q.section} • {q.marks}M]
                </span>
                <span className="text-xs text-slate-500 font-sans">{q.chapter}</span>
              </div>
              <p className="text-xs text-slate-700 italic">{q.question}</p>

              {q.correctAnswer && (
                <div className="p-2.5 rounded bg-emerald-50/60 border border-emerald-200 text-xs text-emerald-900 font-sans">
                  <strong>Correct Answer: </strong>
                  <span className="font-semibold">{q.correctAnswer}</span>
                </div>
              )}

              {q.explanation && (
                <div className="text-xs sm:text-[13px] text-slate-800 font-sans space-y-1 bg-slate-50/80 p-3 rounded border border-slate-200">
                  <p className="font-bold text-slate-700 text-[11px] uppercase tracking-wider">Step-by-Step Solution & Working:</p>
                  <p className="whitespace-pre-line leading-relaxed">{q.explanation}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // TAB 3: STEP-BY-STEP MARKING SCHEME
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="w-full max-w-4xl mx-auto bg-white p-6 sm:p-12 text-slate-900 font-serif leading-relaxed shadow-xs border border-slate-200 print:shadow-none print:border-none print:p-0 print:max-w-none">
      <div className="text-center pb-3 border-b-2 border-slate-900">
        <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 uppercase">
          {schoolName}
        </h1>
        <h2 className="text-base sm:text-lg font-bold tracking-wide text-blue-900 uppercase mt-1">
          OFFICIAL EVALUATION RUBRIC & MARKING SCHEME
        </h2>
        <p className="text-xs text-slate-600 mt-1 font-sans">
          {title} • Code: {examCode} • Target Marks: {totalMarks}
        </p>
      </div>

      <div className="p-3 my-4 bg-blue-50/70 border border-blue-200 rounded text-xs text-blue-900 font-sans">
        <strong>Evaluation Instructions for Examiners:</strong> Award full credit for correct alternative scientific formulation. Step-wise marks must strictly adhere to the rubric below.
      </div>

      <div className="space-y-5">
        {questions.map((q) => (
          <div key={q.id || q.qNumber} className="border border-slate-200 rounded-lg p-4 space-y-2 break-inside-avoid bg-white">
            <div className="flex items-center justify-between text-xs sm:text-sm font-bold border-b border-slate-100 pb-2">
              <span className="text-slate-900">Question {q.qNumber} ({q.type})</span>
              <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-800 font-mono text-xs">
                Total: {q.marks} Mark{q.marks > 1 ? 's' : ''}
              </span>
            </div>
            <p className="text-xs text-slate-600 italic line-clamp-2">{q.question}</p>
            <div className="text-xs font-sans text-slate-800 bg-slate-50 p-2.5 rounded border border-slate-100 space-y-1">
              <span className="font-bold text-[11px] text-blue-900 uppercase tracking-wider block">Step-Wise Marking Breakdown:</span>
              <p className="whitespace-pre-line leading-relaxed">
                {q.markingCriteria || 'Full marks for complete logical deduction with accurate scientific terminology.'}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
