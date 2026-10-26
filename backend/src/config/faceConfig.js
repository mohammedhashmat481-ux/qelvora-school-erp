import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const _BASE_DIR = path.resolve(__dirname, '../../');

let GEMINI_KEY = process.env.EMERGENT_LLM_KEY
  || process.env.GEMINI_API_KEY
  || process.env.GOOGLE_API_KEY
  || process.env.GEMINI_KEY;

if (GEMINI_KEY && GEMINI_KEY.startsWith("QVEu")) {
  try {
    GEMINI_KEY = Buffer.from(GEMINI_KEY, 'base64').toString('utf-8');
  } catch (e) {
    console.error('Failed to decode base64 GEMINI_KEY:', e.message);
  }
}

export const faceConfig = {
  // Biometric settings
  similarityThreshold: parseFloat(process.env.FACE_SIMILARITY_THRESHOLD || '0.40'),
  minViewsMatched: 2,
  
  // Model weights files
  detectionModelPath: path.join(_BASE_DIR, 'app', 'models', 'weights', 'face_detection_yunet_2023mar.onnx'),
  recognitionModelPath: path.join(_BASE_DIR, 'app', 'models', 'weights', 'face_recognition_sface_2021dec.onnx'),
  
  // Encryption keys (AES-256-GCM)
  encryptionSecret: process.env.EMBEDDING_ENCRYPTION_KEY || 'default_secret_key_change_me_in_prod',
  
  // Rate limiting settings
  maxFailedAttempts: 5,
  lockDurationMs: 15 * 60 * 1000, // 15 minutes
  
  // Gemini settings
  geminiApiKey: GEMINI_KEY,
  geminiModels: ['gemini-2.5-flash-lite', 'gemini-2.0-flash-lite', 'gemini-2.0-flash', 'gemini-1.5-flash']
};

export default faceConfig;
