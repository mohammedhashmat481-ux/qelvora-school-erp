/**
 * paperExport.js
 * Comprehensive export engine for Question Papers, Answer Keys & Marking Schemes.
 * Supports:
 *  1. Microsoft Word (.doc) with authentic CBSE examination layout (tables, fonts, right-aligned marks)
 *  2. Clean Plain Text (.txt) without raw markdown (#, **, &nbsp;)
 *  3. Printable PDF / Web Print sheet
 */

/**
 * Clean markdown markup and HTML entities from text
 */
export function cleanMarkdownText(str = '') {
  if (!str) return '';
  return str
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/<[^>]*>/g, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^#+\s+/gm, '')
    .trim();
}

/**
 * Generate Microsoft Word (.doc) Document HTML String
 */
export function generateWordDocumentHtml(paperData, activeTab = 'paper') {
  const title = paperData.title || '10TH COMPREHENSIVE EXAMINATION';
  const schoolName = paperData.schoolName || 'QELVORA SCHOOL CRM';
  const standard = paperData.standard || paperData.classLevel || '10th';
  const board = paperData.syllabus || paperData.board || 'CBSE';
  const subjects = Array.isArray(paperData.subjects) ? paperData.subjects.join(', ') : (paperData.subject || 'Science');
  const duration = paperData.durationMinutes || 180;
  const totalMarks = paperData.totalMarks || 80;
  const examCode = paperData.id || `QP-${standard.toUpperCase()}-${Math.floor(100000 + Math.random() * 900000)}`;

  const questions = paperData.structuredData?.allQuestions || [];

  let bodyContent = '';

  if (activeTab === 'paper') {
    // 1. Header Box
    bodyContent += `
      <div style="text-align: center; margin-bottom: 12pt;">
        <div style="font-size: 15pt; font-weight: bold; text-transform: uppercase; color: #1E3A8A; font-family: 'Arial', sans-serif; letter-spacing: 0.5pt;">
          ${schoolName}
        </div>
        <div style="font-size: 12.5pt; font-weight: bold; margin-top: 3pt; font-family: 'Arial', sans-serif;">
          ${title} (${board})
        </div>
      </div>

      <table style="width: 100%; border-top: 1.5pt solid #000; border-bottom: 1.5pt solid #000; margin-bottom: 10pt; font-size: 10pt; font-family: 'Times New Roman', serif;">
        <tr>
          <td style="padding: 3pt 0;"><strong>Standard / Class:</strong> ${standard}</td>
          <td style="padding: 3pt 0;"><strong>Subject:</strong> ${subjects}</td>
          <td style="padding: 3pt 0; text-align: right;"><strong>Board:</strong> ${board}</td>
        </tr>
        <tr>
          <td style="padding: 3pt 0;"><strong>Time Allowed:</strong> ${duration} Minutes</td>
          <td style="padding: 3pt 0;"><strong>Maximum Marks:</strong> ${totalMarks} Marks</td>
          <td style="padding: 3pt 0; text-align: right;"><strong>Exam Code:</strong> ${examCode}</td>
        </tr>
      </table>

      <div style="margin-bottom: 12pt; font-size: 9.5pt; font-family: 'Times New Roman', serif; background-color: #fbfbfb; border: 0.5pt solid #ccc; padding: 6pt 10pt;">
        <div style="font-weight: bold; text-transform: uppercase; margin-bottom: 3pt; font-size: 9.5pt;">General Instructions:</div>
        <ol style="margin: 0; padding-left: 18pt; line-height: 1.4;">
          <li>This question paper comprises five Sections &ndash; <strong>A, B, C, D and E</strong>.</li>
          <li><strong>Section A</strong> consists of objective multiple choice questions carrying <strong>1 mark</strong> each.</li>
          <li><strong>Section B</strong> consists of very short answer questions carrying <strong>2 marks</strong> each.</li>
          <li><strong>Section C</strong> consists of short answer questions carrying <strong>3 marks</strong> each.</li>
          <li><strong>Section D</strong> consists of long answer questions carrying <strong>5 marks</strong> each.</li>
          <li><strong>Section E</strong> consists of case-based / source-integrated questions carrying <strong>4 marks</strong> each with sub-parts.</li>
          <li>All questions are compulsory. However, an internal choice in some questions has been provided.</li>
          <li>Use of calculators or electronic devices is strictly prohibited.</li>
        </ol>
      </div>
    `;

    // 2. Sections & Questions
    if (questions.length > 0) {
      const sections = ['A', 'B', 'C', 'D', 'E'];
      const sectionInfo = {
        'A': { title: 'SECTION &ndash; A (1 mark each)', sub: 'MULTIPLE CHOICE QUESTIONS' },
        'B': { title: 'SECTION &ndash; B (2 marks each)', sub: 'VERY SHORT ANSWER TYPE QUESTIONS' },
        'C': { title: 'SECTION &ndash; C (3 marks each)', sub: 'SHORT ANSWER TYPE QUESTIONS' },
        'D': { title: 'SECTION &ndash; D (5 marks each)', sub: 'LONG ANSWER TYPE QUESTIONS' },
        'E': { title: 'SECTION &ndash; E (4 marks each)', sub: 'CASE-BASED / SOURCE-INTEGRATED ASSESSMENT' }
      };

      sections.forEach(secKey => {
        const secQuestions = questions.filter(q => q.section === secKey);
        if (secQuestions.length === 0) return;

        const info = sectionInfo[secKey] || { title: `SECTION &ndash; ${secKey}`, sub: '' };
        const secMarks = secQuestions.reduce((sum, q) => sum + (q.marks || 1), 0);

        bodyContent += `
          <div style="text-align: center; margin-top: 14pt; margin-bottom: 2pt;">
            <div style="font-size: 11pt; font-weight: bold; text-transform: uppercase; text-decoration: underline; font-family: 'Times New Roman', serif;">
              ${info.title}
            </div>
            <div style="font-size: 9pt; font-style: italic; color: #444; margin-top: 1pt;">
              ${info.sub} (${secMarks} Marks)
            </div>
          </div>
        `;

        secQuestions.forEach(q => {
          bodyContent += `
            <table style="width: 100%; border-collapse: collapse; margin-top: 6pt; margin-bottom: 3pt; font-family: 'Times New Roman', serif; font-size: 10.5pt; page-break-inside: avoid;">
              <tr>
                <td style="width: 28pt; vertical-align: top; font-weight: bold;">
                  ${q.qNumber}.
                </td>
                <td style="vertical-align: top; text-align: justify; padding-right: 10pt; line-height: 1.35;">
                  ${cleanMarkdownText(q.question)}
                </td>
                <td style="width: 32pt; vertical-align: top; text-align: right; font-weight: bold; white-space: nowrap;">
                  [${q.marks || 1}]
                </td>
              </tr>
            </table>
          `;

          // MCQ Options Table (Clean 4-column or 2-column grid without borders)
          if (q.options && Array.isArray(q.options) && q.options.length > 0) {
            const letters = ['(a)', '(b)', '(c)', '(d)', '(e)'];
            const maxLen = Math.max(...q.options.map(o => (o || '').length));

            if (maxLen <= 22 && q.options.length === 4) {
              bodyContent += `
                <table style="width: 100%; border-collapse: collapse; margin-left: 28pt; margin-bottom: 5pt; font-family: 'Times New Roman', serif; font-size: 10pt;">
                  <tr>
                    <td style="width: 25%; padding: 1pt 4pt;"><strong>${letters[0]}</strong> ${cleanMarkdownText(q.options[0])}</td>
                    <td style="width: 25%; padding: 1pt 4pt;"><strong>${letters[1]}</strong> ${cleanMarkdownText(q.options[1])}</td>
                    <td style="width: 25%; padding: 1pt 4pt;"><strong>${letters[2]}</strong> ${cleanMarkdownText(q.options[2])}</td>
                    <td style="width: 25%; padding: 1pt 4pt;"><strong>${letters[3]}</strong> ${cleanMarkdownText(q.options[3])}</td>
                  </tr>
                </table>
              `;
            } else if (maxLen <= 48 && q.options.length === 4) {
              bodyContent += `
                <table style="width: 100%; border-collapse: collapse; margin-left: 28pt; margin-bottom: 5pt; font-family: 'Times New Roman', serif; font-size: 10pt;">
                  <tr>
                    <td style="width: 50%; padding: 1.5pt 4pt;"><strong>${letters[0]}</strong> ${cleanMarkdownText(q.options[0])}</td>
                    <td style="width: 50%; padding: 1.5pt 4pt;"><strong>${letters[1]}</strong> ${cleanMarkdownText(q.options[1])}</td>
                  </tr>
                  <tr>
                    <td style="width: 50%; padding: 1.5pt 4pt;"><strong>${letters[2]}</strong> ${cleanMarkdownText(q.options[2])}</td>
                    <td style="width: 50%; padding: 1.5pt 4pt;"><strong>${letters[3]}</strong> ${cleanMarkdownText(q.options[3])}</td>
                  </tr>
                </table>
              `;
            } else {
              bodyContent += `
                <div style="margin-left: 28pt; margin-bottom: 5pt; font-family: 'Times New Roman', serif; font-size: 10pt;">
                  ${q.options.map((opt, i) => `
                    <div style="padding: 1pt 0;"><strong>${letters[i]}</strong> ${cleanMarkdownText(opt)}</div>
                  `).join('')}
                </div>
              `;
            }
          }

          // Centered OR Choice
          if (q.orQuestion) {
            bodyContent += `
              <div style="text-align: center; font-weight: bold; margin: 5pt 0; font-size: 10pt; letter-spacing: 1pt; font-family: 'Times New Roman', serif;">
                OR
              </div>
              <table style="width: 100%; border-collapse: collapse; margin-bottom: 4pt; font-family: 'Times New Roman', serif; font-size: 10.5pt; page-break-inside: avoid;">
                <tr>
                  <td style="width: 28pt; vertical-align: top;">&nbsp;</td>
                  <td style="vertical-align: top; text-align: justify; padding-right: 10pt; line-height: 1.35;">
                    ${cleanMarkdownText(q.orQuestion)}
                  </td>
                  <td style="width: 32pt; vertical-align: top; text-align: right; font-weight: bold; white-space: nowrap;">
                    [${q.marks || 1}]
                  </td>
                </tr>
              </table>
            `;
          }
        });
      });
    } else {
      // Fallback if structuredData was not present (render sanitized raw text)
      const rawText = paperData.paper || '';
      bodyContent += `<pre style="font-family: 'Times New Roman', serif; font-size: 10pt; white-space: pre-wrap; line-height: 1.4;">${cleanMarkdownText(rawText)}</pre>`;
    }
  } else if (activeTab === 'answer') {
    // Answer Key Tab
    bodyContent += `
      <div style="text-align: center; margin-bottom: 12pt;">
        <div style="font-size: 14pt; font-weight: bold; text-transform: uppercase; color: #1E3A8A; font-family: 'Arial', sans-serif;">
          ${schoolName}
        </div>
        <div style="font-size: 12pt; font-weight: bold; margin-top: 2pt;">
          COMPLETE ANSWER KEY & STEP-BY-STEP SOLUTIONS
        </div>
        <div style="font-size: 10pt; color: #555; margin-top: 2pt;">
          ${standard} &bull; ${subjects} &bull; ${board} &bull; ${title}
        </div>
      </div>
      <hr style="border: 0.5pt solid #000; margin-bottom: 12pt;" />
    `;

    if (questions.length > 0) {
      questions.forEach(q => {
        bodyContent += `
          <div style="margin-bottom: 8pt; font-family: 'Times New Roman', serif; font-size: 10pt; page-break-inside: avoid;">
            <div>
              <strong>Q${q.qNumber}.</strong>
              <span style="font-style: italic; color: #555;">(${q.type || 'Question'} &ndash; ${q.marks || 1} Mark${(q.marks || 1) > 1 ? 's' : ''})</span>
            </div>
            ${q.correctAnswer ? `<div style="margin-top: 2pt; color: #047857;"><strong>Correct Answer:</strong> <strong>${cleanMarkdownText(q.correctAnswer)}</strong></div>` : ''}
            ${q.explanation ? `<div style="margin-top: 2pt; line-height: 1.35;"><strong>Solution:</strong> ${cleanMarkdownText(q.explanation)}</div>` : ''}
          </div>
        `;
      });
    } else {
      const raw = paperData.answer_key || paperData.answerKey || '';
      bodyContent += `<pre style="font-family: 'Times New Roman', serif; font-size: 10pt; white-space: pre-wrap;">${cleanMarkdownText(raw)}</pre>`;
    }
  } else {
    // Marking Scheme Tab
    bodyContent += `
      <div style="text-align: center; margin-bottom: 12pt;">
        <div style="font-size: 14pt; font-weight: bold; text-transform: uppercase; color: #1E3A8A; font-family: 'Arial', sans-serif;">
          ${schoolName}
        </div>
        <div style="font-size: 12pt; font-weight: bold; margin-top: 2pt;">
          OFFICIAL STEP-BY-STEP MARKING SCHEME & RUBRIC
        </div>
        <div style="font-size: 10pt; color: #555; margin-top: 2pt;">
          ${standard} &bull; ${subjects} &bull; ${board} &bull; Total Marks: ${totalMarks}
        </div>
      </div>
      <hr style="border: 0.5pt solid #000; margin-bottom: 12pt;" />
    `;

    if (questions.length > 0) {
      bodyContent += `
        <table style="width: 100%; border-collapse: collapse; font-family: 'Times New Roman', serif; font-size: 9.5pt; margin-top: 6pt;">
          <thead>
            <tr style="background-color: #f1f5f9; border-top: 1pt solid #000; border-bottom: 1pt solid #000;">
              <th style="padding: 4pt; text-align: left; width: 40pt;">Q.No</th>
              <th style="padding: 4pt; text-align: left;">Evaluation Step & Expected Response Criteria</th>
              <th style="padding: 4pt; text-align: right; width: 50pt;">Marks</th>
            </tr>
          </thead>
          <tbody>
            ${questions.map(q => `
              <tr style="border-bottom: 0.5pt solid #e2e8f0; page-break-inside: avoid;">
                <td style="padding: 4pt; vertical-align: top; font-weight: bold;">Q${q.qNumber}</td>
                <td style="padding: 4pt; vertical-align: top; line-height: 1.3;">
                  <div><strong>Answer:</strong> ${cleanMarkdownText(q.correctAnswer || 'Valid response')}</div>
                  <div style="color: #475569; margin-top: 2pt;">${cleanMarkdownText(q.explanation || 'Award full credit for correct derivation.')}</div>
                </td>
                <td style="padding: 4pt; vertical-align: top; text-align: right; font-weight: bold;">[${q.marks || 1}]</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    } else {
      const raw = paperData.marking_scheme || paperData.markingScheme || '';
      bodyContent += `<pre style="font-family: 'Times New Roman', serif; font-size: 10pt; white-space: pre-wrap;">${cleanMarkdownText(raw)}</pre>`;
    }
  }

  // Complete Word-compatible HTML Document wrapper
  return `
    <html xmlns:o="urn:schemas-microsoft-com:office:office"
          xmlns:w="urn:schemas-microsoft-com:office:word"
          xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8">
      <title>${title}</title>
      <!--[if gte mso 9]>
      <xml>
      <w:WordDocument>
        <w:View>Print</w:View>
        <w:Zoom>100</w:Zoom>
        <w:DoNotOptimizeForBrowser/>
      </w:WordDocument>
      </xml>
      <![endif]-->
      <style>
        @page Section1 {
          size: 210mm 297mm; /* A4 */
          margin: 1.8cm 1.8cm 1.8cm 1.8cm;
          mso-header-margin: 36pt;
          mso-footer-margin: 36pt;
          mso-paper-source: 0;
        }
        div.Section1 {
          page: Section1;
        }
        body {
          font-family: 'Times New Roman', Times, serif;
          font-size: 11pt;
          color: #000;
          background-color: #ffffff;
        }
      </style>
    </head>
    <body>
      <div class="Section1">
        ${bodyContent}
      </div>
    </body>
    </html>
  `;
}

/**
 * Generate Clean Plain Text (.txt) Document String
 */
export function generateCleanPlainText(paperData, activeTab = 'paper') {
  const title = paperData.title || '10TH COMPREHENSIVE EXAMINATION';
  const schoolName = paperData.schoolName || 'QELVORA SCHOOL CRM';
  const standard = paperData.standard || paperData.classLevel || '10th';
  const board = paperData.syllabus || paperData.board || 'CBSE';
  const subjects = Array.isArray(paperData.subjects) ? paperData.subjects.join(', ') : (paperData.subject || 'Science');
  const duration = paperData.durationMinutes || 180;
  const totalMarks = paperData.totalMarks || 80;
  const examCode = paperData.id || `QP-${standard.toUpperCase()}-${Math.floor(100000 + Math.random() * 900000)}`;

  const questions = paperData.structuredData?.allQuestions || [];

  const divider = '='.repeat(78);
  const thinDivider = '-'.repeat(78);

  let out = '';

  if (activeTab === 'paper') {
    out += `${divider}\n`;
    out += `${centerText(schoolName, 78)}\n`;
    out += `${centerText(`${title} (${board})`, 78)}\n`;
    out += `${divider}\n\n`;

    out += `Standard: ${standard.padEnd(16)} Subject: ${subjects.padEnd(20)} Board: ${board}\n`;
    out += `Time: ${`${duration} Minutes`.padEnd(20)} Max Marks: ${`${totalMarks} Marks`.padEnd(16)} Exam Code: ${examCode}\n`;
    out += `${thinDivider}\n\n`;

    out += `GENERAL INSTRUCTIONS:\n`;
    out += `1. This question paper comprises five Sections - A, B, C, D and E.\n`;
    out += `2. Section A consists of objective multiple choice questions carrying 1 mark each.\n`;
    out += `3. Section B consists of very short answer questions carrying 2 marks each.\n`;
    out += `4. Section C consists of short answer questions carrying 3 marks each.\n`;
    out += `5. Section D consists of long answer questions carrying 5 marks each.\n`;
    out += `6. Section E consists of case-based evaluation units carrying 4 marks each.\n`;
    out += `7. All questions are compulsory. An internal choice has been provided in some questions.\n`;
    out += `8. Use of calculators or electronic devices is strictly prohibited.\n\n`;
    out += `${thinDivider}\n\n`;

    if (questions.length > 0) {
      const sections = ['A', 'B', 'C', 'D', 'E'];
      const sectionInfo = {
        'A': 'SECTION - A (1 mark each) - MULTIPLE CHOICE QUESTIONS',
        'B': 'SECTION - B (2 marks each) - VERY SHORT ANSWER TYPE QUESTIONS',
        'C': 'SECTION - C (3 marks each) - SHORT ANSWER TYPE QUESTIONS',
        'D': 'SECTION - D (5 marks each) - LONG ANSWER TYPE QUESTIONS',
        'E': 'SECTION - E (4 marks each) - CASE-BASED ASSESSMENT'
      };

      sections.forEach(secKey => {
        const secQuestions = questions.filter(q => q.section === secKey);
        if (secQuestions.length === 0) return;

        out += `\n${centerText(sectionInfo[secKey] || `SECTION - ${secKey}`, 78)}\n`;
        out += `${centerText(`(${secQuestions.reduce((s, q) => s + (q.marks || 1), 0)} Marks)`, 78)}\n\n`;

        secQuestions.forEach(q => {
          const qPrefix = `${q.qNumber}. `;
          const marksTag = `[${q.marks || 1}]`;
          const qText = cleanMarkdownText(q.question);
          
          out += `${qPrefix}${qText}   ${marksTag}\n`;

          if (q.options && Array.isArray(q.options) && q.options.length > 0) {
            const letters = ['(a)', '(b)', '(c)', '(d)'];
            const maxLen = Math.max(...q.options.map(o => (o || '').length));

            if (maxLen <= 18 && q.options.length === 4) {
              out += `   ${letters[0]} ${q.options[0].padEnd(16)} ${letters[1]} ${q.options[1].padEnd(16)} ${letters[2]} ${q.options[2].padEnd(16)} ${letters[3]} ${q.options[3]}\n`;
            } else if (maxLen <= 35 && q.options.length === 4) {
              out += `   ${letters[0]} ${q.options[0].padEnd(34)} ${letters[1]} ${q.options[1]}\n`;
              out += `   ${letters[2]} ${q.options[2].padEnd(34)} ${letters[3]} ${q.options[3]}\n`;
            } else {
              q.options.forEach((opt, idx) => {
                out += `   ${letters[idx] || '•'} ${cleanMarkdownText(opt)}\n`;
              });
            }
          }

          if (q.orQuestion) {
            out += `\n${centerText('OR', 78)}\n\n`;
            out += `   ${cleanMarkdownText(q.orQuestion)}   ${marksTag}\n`;
          }

          out += `\n`;
        });
      });
    } else {
      out += cleanMarkdownText(paperData.paper || '');
    }
  } else if (activeTab === 'answer') {
    out += `${divider}\n`;
    out += `${centerText(schoolName, 78)}\n`;
    out += `${centerText(`ANSWER KEY & COMPLETE SOLUTIONS: ${title}`, 78)}\n`;
    out += `${divider}\n\n`;

    if (questions.length > 0) {
      questions.forEach(q => {
        out += `Q${q.qNumber} (${q.type || 'Q'} - ${q.marks || 1}M):\n`;
        if (q.correctAnswer) out += `  Correct Answer: ${cleanMarkdownText(q.correctAnswer)}\n`;
        if (q.explanation) out += `  Solution: ${cleanMarkdownText(q.explanation)}\n`;
        out += `\n`;
      });
    } else {
      out += cleanMarkdownText(paperData.answer_key || paperData.answerKey || '');
    }
  } else {
    out += `${divider}\n`;
    out += `${centerText(schoolName, 78)}\n`;
    out += `${centerText(`OFFICIAL MARKING SCHEME: ${title}`, 78)}\n`;
    out += `${divider}\n\n`;

    if (questions.length > 0) {
      questions.forEach(q => {
        out += `Q${q.qNumber} [${q.marks || 1} Mark${(q.marks || 1) > 1 ? 's' : ''}]:\n`;
        out += `  Evaluation: ${cleanMarkdownText(q.correctAnswer || 'Correct response')}\n`;
        out += `  Rubric: ${cleanMarkdownText(q.explanation || 'Full credit for valid derivation')}\n\n`;
      });
    } else {
      out += cleanMarkdownText(paperData.marking_scheme || paperData.markingScheme || '');
    }
  }

  return out;
}

function centerText(text, width = 78) {
  if (!text) return '';
  const pad = Math.max(0, Math.floor((width - text.length) / 2));
  return ' '.repeat(pad) + text;
}

/**
 * Triggers file download in browser
 */
export function downloadFile(content, filename, mimeType = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
