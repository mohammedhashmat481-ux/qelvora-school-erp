import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { prisma } from '../../db/prisma.js';
import { extractPdfText, chunkDocumentText, retrieveRelevantChunks } from '../pdf/ragService.js';

// Safe sanitization helper for Windows 1252 PostgreSQL environments
export function sanitizeForDb(text) {
  if (!text) return '';
  return String(text)
    .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
    .replace(/ρ/g, 'rho')
    .replace(/Ω/g, 'Ohm')
    .replace(/θ/g, 'theta')
    .replace(/α/g, 'alpha')
    .replace(/β/g, 'beta')
    .replace(/λ/g, 'lambda')
    .replace(/π/g, 'pi')
    .replace(/₹/g, 'Rs.')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2022]/g, '*')
    .replace(/[^\x00-\x7F]/g, '');
}

/**
 * Compute SHA256 file hash for duplicate detection
 */
export function computeFileHash(bufferOrPath) {
  const buffer = Buffer.isBuffer(bufferOrPath) ? bufferOrPath : fs.readFileSync(bufferOrPath);
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * List & Filter Study Materials from Shared Library
 */
export async function listStudyMaterials({
  schoolId,
  board,
  standard,
  subject,
  documentType,
  search
} = {}) {
  const where = {};

  if (schoolId) where.schoolId = schoolId;
  if (board && board !== 'all') where.board = board;
  if (standard && standard !== 'all') where.standard = standard;
  if (subject && subject !== 'all') where.subject = subject;
  if (documentType && documentType !== 'all') where.documentType = documentType;

  if (search && search.trim()) {
    where.OR = [
      { title: { contains: search.trim(), mode: 'insensitive' } },
      { fileName: { contains: search.trim(), mode: 'insensitive' } },
      { subject: { contains: search.trim(), mode: 'insensitive' } }
    ];
  }

  const materials = await prisma.questionPaperResource.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      schoolId: true,
      title: true,
      board: true,
      academicYear: true,
      standard: true,
      subject: true,
      chapters: true,
      documentType: true,
      fileName: true,
      fileSize: true,
      fileHash: true,
      status: true,
      errorMessage: true,
      metadata: true,
      uploaderName: true,
      uploadedBy: true,
      createdAt: true,
      updatedAt: true
    }
  });

  return materials;
}

/**
 * Upload & Index New Study Material (Shared across Question Paper & Summary Generator)
 */
export async function uploadStudyMaterial({
  file,
  title,
  board = 'CBSE',
  standard = '10th',
  subject = 'Science',
  chapters = [],
  documentType = 'textbook',
  academicYear = '2024-2025',
  user = {},
  schoolId = null
}) {
  if (!file) {
    throw new Error('No PDF file provided for upload.');
  }

  // 1. Compute file hash to detect duplicates
  const fileHash = computeFileHash(file.path);

  // Check if identical document already exists in shared library and is successfully processed
  const existing = await prisma.questionPaperResource.findFirst({
    where: {
      fileHash,
      status: { not: 'failed' },
      ...(schoolId ? { schoolId } : {})
    },
    orderBy: { createdAt: 'desc' }
  });

  if (existing) {
    return {
      isDuplicate: true,
      message: 'This document is already indexed and available in the shared library.',
      data: existing
    };
  }

  const parsedChapters = Array.isArray(chapters)
    ? chapters
    : (typeof chapters === 'string' ? chapters.split(',').map(s => s.trim()).filter(Boolean) : []);

  // 2. Extract text and detect chapters/headings
  let extractionResult;
  let status = 'processed';
  let errorMessage = null;
  let chunks = [];

  try {
    extractionResult = await extractPdfText(file.path);

    if (extractionResult.isScanned) {
      status = 'processed';
      errorMessage = 'Document appears to be scanned or contains minimal digital text. OCR may be required for full grounding.';
    }

    // Chunk text
    chunks = chunkDocumentText(extractionResult.pages, {
      title,
      board,
      standard,
      subject,
      chapter: parsedChapters.join(', ')
    });
  } catch (err) {
    status = 'failed';
    errorMessage = `PDF Extraction error: ${err.message}`;
  }

  // Sanitize text and chunks before storing in DB (protects against WIN-1252 encoding issues)
  const safeTitle = sanitizeForDb(title || file.originalname);
  const safeText = sanitizeForDb(extractionResult?.fullText || '');
  const safeChunks = JSON.parse(sanitizeForDb(JSON.stringify(chunks)));

  const resource = await prisma.questionPaperResource.create({
    data: {
      schoolId: schoolId || user.schoolId || null,
      uploadedBy: user.id || null,
      uploaderName: user.name || 'Teacher',
      title: safeTitle,
      board,
      academicYear,
      standard,
      subject,
      chapters: parsedChapters,
      documentType,
      fileName: file.originalname,
      filePath: file.path,
      fileSize: file.size,
      fileHash,
      status,
      errorMessage,
      extractedText: safeText.slice(0, 50000), // First 50k chars for direct preview
      chunks: safeChunks,
      metadata: {
        totalPages: extractionResult?.totalPages || 1,
        totalChunks: chunks.length,
        isScanned: extractionResult?.isScanned || false,
        uploadedFrom: 'Shared Study Material Library'
      }
    }
  });

  return {
    isDuplicate: false,
    message: 'Study material uploaded and indexed successfully into shared library.',
    data: resource
  };
}

/**
 * Reprocess Failed or Existing Material
 */
export async function reprocessStudyMaterial(id) {
  const resource = await prisma.questionPaperResource.findUnique({ where: { id } });
  if (!resource) {
    throw new Error('Study material not found.');
  }

  if (!fs.existsSync(resource.filePath)) {
    throw new Error('Source PDF file does not exist on server.');
  }

  const extractionResult = await extractPdfText(resource.filePath);
  const chunks = chunkDocumentText(extractionResult.pages, {
    title: resource.title,
    board: resource.board,
    standard: resource.standard,
    subject: resource.subject,
    chapter: resource.chapters.join(', ')
  });

  const safeText = sanitizeForDb(extractionResult.fullText || '');
  const safeChunks = JSON.parse(sanitizeForDb(JSON.stringify(chunks)));

  const updated = await prisma.questionPaperResource.update({
    where: { id },
    data: {
      status: 'processed',
      errorMessage: extractionResult.isScanned ? 'Scanned PDF detected' : null,
      extractedText: safeText.slice(0, 50000),
      chunks: safeChunks,
      metadata: {
        ...(resource.metadata || {}),
        totalPages: extractionResult.totalPages,
        totalChunks: chunks.length,
        isScanned: extractionResult.isScanned,
        reprocessedAt: new Date().toISOString()
      }
    }
  });

  return updated;
}

/**
 * Delete Material from Shared Library
 */
export async function deleteStudyMaterial(id, userId) {
  const resource = await prisma.questionPaperResource.findUnique({ where: { id } });
  if (!resource) {
    throw new Error('Study material not found.');
  }

  // Delete physical file if present
  try {
    if (fs.existsSync(resource.filePath)) {
      fs.unlinkSync(resource.filePath);
    }
  } catch (err) {
    console.warn('Could not remove file from disk:', err.message);
  }

  await prisma.questionPaperResource.delete({ where: { id } });
  return { success: true, message: 'Document removed from shared library.' };
}
