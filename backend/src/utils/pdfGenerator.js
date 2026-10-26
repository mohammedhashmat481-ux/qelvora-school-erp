import PDFDocument from 'pdfkit';

/**
 * Generate a PDF document buffer for a question paper using pdfkit.
 * @param {string} title - The title of the exam paper
 * @param {string} paperMarkdown - Markdown of the question paper
 * @param {string} answerKeyMarkdown - Markdown of the answer key
 * @param {string} pattern - 'Standard' or 'Techno'
 * @param {Object} requestData - Input generation parameters
 * @returns {Promise<Buffer>} Generated PDF bytes
 */
export function buildPdf(title, paperMarkdown, answerKeyMarkdown, pattern = 'Standard', requestData = {}) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', err => reject(err));

      // ── Header Title ──
      doc.fontSize(18).font('Helvetica-Bold').fillColor('#0f172a').text(title, { align: 'center' });
      doc.moveDown(0.4);

      // Centered Date / Metadata
      const currentDateStr = new Date().toLocaleDateString('en-GB'); // dd-mm-yyyy
      doc.fontSize(10).font('Helvetica').fillColor('#475569');
      
      if (pattern === 'Techno') {
        doc.text(`Examination Date: ${currentDateStr}`, { align: 'center' });
      } else {
        doc.text(`Date of Exam: ${currentDateStr}  |  Duration: ${requestData.duration_minutes || 180} min  |  Max Marks: ${requestData.total_marks || 80}`, { align: 'center' });
      }
      doc.moveDown(1);
      doc.fillColor('#000000');

      // ── Tables for Techno Pattern ──
      if (pattern === 'Techno' && requestData) {
        // Table 1: Syllabus Coverage
        doc.fontSize(13).font('Helvetica-Bold').text('Syllabus Coverage');
        doc.moveDown(0.4);

        const syllabusRows = [
          ['Subject / Track', 'Syllabus / Focus Topic'],
          ['Mathematics Track - A', requestData.math_track_a_topic || 'General Algebra & Numbers'],
          ['Mathematics Track - B', requestData.math_track_b_topic || 'General Arithmetic & Mensuration'],
          ['Physics', requestData.physics_topic || 'General Force & Light'],
          ['Chemistry', requestData.chemistry_topic || 'General Matter & Changes']
        ];

        let y = doc.y;
        syllabusRows.forEach((row, rowIndex) => {
          const isHeader = rowIndex === 0;
          doc.font(isHeader ? 'Helvetica-Bold' : 'Helvetica').fontSize(9);
          
          doc.text(row[0], 55, y, { width: 140 });
          doc.text(row[1], 205, y, { width: 335 });
          
          y = doc.y + 6;
          doc.moveTo(50, y).lineTo(540, y).strokeColor('#cbd5e1').lineWidth(0.5).stroke();
          y += 10;
        });
        doc.y = y;
        doc.moveDown(1);

        // Table 2: Marks Distribution
        doc.fontSize(13).font('Helvetica-Bold').text('Question & Marks Distribution');
        doc.moveDown(0.4);

        const totalQ = requestData.mcq_count || 60;
        const totalM = requestData.total_marks || 60;
        const qPerSec = Math.floor(totalQ / 4);
        const fbtPerSec = Math.floor(qPerSec / 3);
        const straightPerSec = qPerSec - fbtPerSec;
        
        const marksPerSec = Math.floor((qPerSec * totalM) / totalQ);
        const marksLastSec = totalM - 3 * marksPerSec;

        const distRows = [
          ['Subject / Section', 'Straight Objective', 'FBT Pattern', 'Total Questions', 'Total Marks'],
          ['Mathematics Track - A', `${straightPerSec} (Q1-${straightPerSec})`, `${fbtPerSec}`, `${qPerSec}`, `${marksPerSec}`],
          ['Mathematics Track - B', `${straightPerSec}`, `${fbtPerSec}`, `${qPerSec}`, `${marksPerSec}`],
          ['Physics', `${straightPerSec}`, `${fbtPerSec}`, `${qPerSec}`, `${marksPerSec}`],
          ['Chemistry', `${straightPerSec}`, `${totalQ - 3 * qPerSec - straightPerSec}`, `${qPerSec}`, `${marksLastSec}`],
          ['Total', `${4 * straightPerSec}`, `${totalQ - 4 * straightPerSec}`, `${totalQ}`, `${totalM}`]
        ];

        y = doc.y;
        distRows.forEach((row, rowIndex) => {
          const isHeader = rowIndex === 0;
          const isTotal = rowIndex === distRows.length - 1;
          doc.font(isHeader || isTotal ? 'Helvetica-Bold' : 'Helvetica').fontSize(9);
          
          doc.text(row[0], 55, y, { width: 140 });
          doc.text(row[1], 200, y, { width: 100, align: 'center' });
          doc.text(row[2], 305, y, { width: 70, align: 'center' });
          doc.text(row[3], 380, y, { width: 80, align: 'center' });
          doc.text(row[4], 465, y, { width: 70, align: 'center' });
          
          y = doc.y + 6;
          doc.moveTo(50, y).lineTo(540, y).strokeColor('#cbd5e1').lineWidth(0.5).stroke();
          y += 10;
        });
        doc.y = y;
        doc.moveDown(1.5);
      }

      // ── Main Content Parsing ──
      const addMarkdownText = (text) => {
        if (!text) return;
        const lines = text.split('\n');
        
        lines.forEach(line => {
          const trimmed = line.trim();
          if (!trimmed) {
            doc.moveDown(0.3);
            return;
          }
          
          if (trimmed.startsWith('## ')) {
            doc.moveDown(0.6);
            doc.fontSize(12).font('Helvetica-Bold').fillColor('#0f172a').text(trimmed.substring(3));
            doc.moveDown(0.3);
          } else if (trimmed.startsWith('# ')) {
            doc.moveDown(0.6);
            doc.fontSize(14).font('Helvetica-Bold').fillColor('#0f172a').text(trimmed.substring(2));
            doc.moveDown(0.3);
          } else if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
            doc.fontSize(10).font('Helvetica').fillColor('#1e293b').text(`•  ${trimmed.substring(2)}`, { indent: 15 });
          } else if (/^\d+\.\s/.test(trimmed)) {
            doc.fontSize(10).font('Helvetica').fillColor('#1e293b').text(trimmed, { indent: 10 });
          } else {
            doc.fontSize(10).font('Helvetica').fillColor('#334155').text(trimmed);
          }
        });
      };

      addMarkdownText(paperMarkdown);
      
      // Page break for Answer Key
      if (answerKeyMarkdown && answerKeyMarkdown.trim()) {
        doc.addPage();
        doc.fontSize(18).font('Helvetica-Bold').fillColor('#0f172a').text('Answer Key', { align: 'center' });
        doc.moveDown(1);
        addMarkdownText(answerKeyMarkdown);
      }

      doc.end();
    } catch (e) {
      reject(e);
    }
  });
}
