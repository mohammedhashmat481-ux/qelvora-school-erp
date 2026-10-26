import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { protect, allowTeacherAndAdmin } from '../middleware/authMiddleware.js';
import {
  listStudyMaterials,
  uploadStudyMaterial,
  reprocessStudyMaterial,
  deleteStudyMaterial
} from '../lib/studyMaterial/studyMaterialService.js';
import { prisma } from '../db/prisma.js';

const router = express.Router();

// Multer storage configuration for shared study materials
const uploadDir = path.resolve('uploads/study-materials');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const cleanBase = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    cb(null, `mat_${Date.now()}_${cleanBase}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 150 * 1024 * 1024 }, // 150 MB max limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf' || path.extname(file.originalname).toLowerCase() === '.pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only educational PDF documents are supported at this time.'));
    }
  }
});

const handleMaterialUpload = (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          status: false,
          message: 'File size exceeds 150MB limit. Please upload a PDF under 150MB.'
        });
      }
      return res.status(400).json({ status: false, message: `Upload error: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ status: false, message: err.message });
    }
    next();
  });
};

/**
 * GET /api/study-materials - List all shared study materials
 */
router.get('/', protect, allowTeacherAndAdmin, async (req, res) => {
  try {
    const { board, standard, subject, documentType, search } = req.query;
    const schoolId = req.user?.schoolId || null;

    const materials = await listStudyMaterials({
      schoolId,
      board,
      standard,
      subject,
      documentType,
      search
    });

    return res.json({ status: true, data: materials, count: materials.length });
  } catch (err) {
    return res.status(500).json({ status: false, message: err.message });
  }
});

/**
 * POST /api/study-materials/upload - Upload a reference PDF into shared library
 */
router.post('/upload', protect, allowTeacherAndAdmin, handleMaterialUpload, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ status: false, message: 'Please attach a valid PDF file.' });
    }

    const {
      title,
      board = 'CBSE',
      standard = '10th',
      subject = 'Science',
      chapters = '',
      documentType = 'textbook',
      academicYear = '2024-2025'
    } = req.body;

    const result = await uploadStudyMaterial({
      file: req.file,
      title: title || req.file.originalname,
      board,
      standard,
      subject,
      chapters,
      documentType,
      academicYear,
      user: req.user,
      schoolId: req.user?.schoolId
    });

    return res.json({
      status: true,
      message: result.message,
      isDuplicate: result.isDuplicate,
      data: result.data
    });
  } catch (err) {
    return res.status(500).json({ status: false, message: err.message });
  }
});

/**
 * GET /api/study-materials/:id/download - Download study material PDF
 */
router.get('/:id/download', protect, allowTeacherAndAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const resource = await prisma.questionPaperResource.findUnique({ where: { id } });

    if (!resource || !fs.existsSync(resource.filePath)) {
      return res.status(404).json({ status: false, message: 'Document file not found on server.' });
    }

    return res.download(resource.filePath, resource.fileName);
  } catch (err) {
    return res.status(500).json({ status: false, message: err.message });
  }
});

/**
 * POST /api/study-materials/:id/reprocess - Reprocess extraction & chunking
 */
router.post('/:id/reprocess', protect, allowTeacherAndAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await reprocessStudyMaterial(id);
    return res.json({ status: true, message: 'Study material reprocessed successfully.', data: updated });
  } catch (err) {
    return res.status(500).json({ status: false, message: err.message });
  }
});

/**
 * DELETE /api/study-materials/:id - Delete study material from shared library
 */
router.delete('/:id', protect, allowTeacherAndAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await deleteStudyMaterial(id, req.user?.id);
    return res.json({ status: true, message: result.message });
  } catch (err) {
    return res.status(500).json({ status: false, message: err.message });
  }
});

export default router;
