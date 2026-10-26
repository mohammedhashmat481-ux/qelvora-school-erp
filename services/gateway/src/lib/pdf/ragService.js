import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { PDFParse } = require('pdf-parse');

/**
 * Clean and normalize extracted text
 */
function cleanText(text) {
  if (!text) return '';
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Extract text from PDF buffer preserving page numbers
 */
export async function extractPdfText(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`PDF file not found at path: ${filePath}`);
  }

  if (filePath.endsWith('.txt')) {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return {
      pages: [{ pageNumber: 1, text: cleanText(raw), charCount: raw.length }],
      fullText: cleanText(raw),
      totalPages: 1,
      isScanned: false
    };
  }

  const buffer = fs.readFileSync(filePath);
  const parser = new PDFParse({ data: buffer });
  
  try {
    await parser.load();
    const parsed = await parser.getText();
    const pages = parsed.pages || [];
    
    const extractedPages = [];
    let fullText = '';

    for (let i = 0; i < pages.length; i++) {
      const pageNum = pages[i].num || (i + 1);
      const pageContent = cleanText(pages[i].text || '');
      extractedPages.push({
        pageNumber: pageNum,
        text: pageContent
      });
      fullText += `\n--- Page ${pageNum} ---\n` + pageContent;
    }

    fullText = fullText.trim();

    // Check if document has little or no text (scanned PDF)
    const isScanned = fullText.replace(/--- Page \d+ ---/g, '').trim().length < 50;

    return {
      success: true,
      totalPages: pages.length || 1,
      isScanned,
      pages: extractedPages,
      fullText
    };
  } finally {
    try {
      await parser.destroy();
    } catch (_) {}
  }
}

/**
 * Split extracted pages into search chunks with metadata
 */
export function chunkDocumentText(pages, metadata = {}) {
  const chunks = [];
  const chunkSize = 1000;
  const chunkOverlap = 200;

  let chunkIndex = 0;

  for (const page of pages) {
    const pageNum = page.pageNumber;
    const text = page.text;
    if (!text || text.length < 20) continue;

    // Detect section or chapter headings in page text
    const lines = text.split('\n');
    let currentHeading = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (/^(chapter|section|unit|topic|part)\s+\d+[:.]?/i.test(line) || (/^[A-Z0-9\s–-]{4,50}$/.test(line) && line.length > 5 && line.length < 50)) {
        currentHeading = line;
      }
    }

    let start = 0;
    while (start < text.length) {
      const end = Math.min(start + chunkSize, text.length);
      const chunkText = text.slice(start, end).trim();

      if (chunkText.length > 30) {
        chunks.push({
          chunkIndex: chunkIndex++,
          pageNumber: pageNum,
          heading: currentHeading || (metadata.title || `Page ${pageNum}`),
          chapter: metadata.chapter || '',
          text: chunkText
        });
      }

      if (end >= text.length) break;
      start += (chunkSize - chunkOverlap);
    }
  }

  return chunks;
}

/**
 * Search and retrieve relevant chunks from matching resources for RAG
 */
export function retrieveRelevantChunks({
  resources = [],
  selectedChapters = [],
  maxChunksPerSubject = 8
}) {
  if (!resources || resources.length === 0) {
    return {
      chunks: [],
      sourcesSummary: [],
      contextText: ''
    };
  }

  const selectedLowerChapters = selectedChapters.map(c => c.toLowerCase());
  const scoredChunks = [];
  const sourcesSummary = [];

  for (const res of resources) {
    sourcesSummary.push({
      id: res.id,
      title: res.title,
      documentType: res.documentType,
      standard: res.standard,
      subject: res.subject,
      academicYear: res.academicYear,
      chapters: res.chapters || []
    });

    const chunks = Array.isArray(res.chunks) ? res.chunks : [];
    
    for (const chunk of chunks) {
      const chunkTextLower = (chunk.text || '').toLowerCase();
      const chunkHeadingLower = (chunk.heading || '').toLowerCase();
      
      let score = 1; // base score

      // Prioritize chunks matching selected chapters
      for (const ch of selectedLowerChapters) {
        if (chunkTextLower.includes(ch)) score += 5;
        if (chunkHeadingLower.includes(ch)) score += 10;
        // Check keywords in chapter title
        const words = ch.split(/\s+/).filter(w => w.length > 3);
        for (const w of words) {
          if (chunkTextLower.includes(w)) score += 2;
        }
      }

      // Boost previous year papers for question pattern grounding
      if (res.documentType === 'previous_year_paper') {
        score += 3;
      }
      if (res.documentType === 'marking_scheme') {
        score += 2;
      }

      scoredChunks.push({
        score,
        documentTitle: res.title,
        documentType: res.documentType,
        academicYear: res.academicYear,
        pageNumber: chunk.pageNumber,
        heading: chunk.heading,
        chapter: chunk.chapter || res.chapters?.join(', ') || '',
        text: chunk.text
      });
    }
  }

  // Sort descending by score and take top chunks
  scoredChunks.sort((a, b) => b.score - a.score);
  const topChunks = scoredChunks.slice(0, maxChunksPerSubject);

  // Build grounded prompt context
  let contextText = '';
  if (topChunks.length > 0) {
    contextText = '### GROUNDED REFERENCE SOURCE TEXTBOOKS & PREVIOUS YEAR PAPERS:\n\n';
    topChunks.forEach((c, idx) => {
      contextText += `[SOURCE ${idx + 1}: ${c.documentTitle} | Type: ${c.documentType} | Page: ${c.pageNumber}${c.academicYear ? ' | Year: ' + c.academicYear : ''}]\n`;
      contextText += `${c.text}\n\n`;
    });
  }

  return {
    chunks: topChunks,
    sourcesSummary,
    contextText
  };
}
