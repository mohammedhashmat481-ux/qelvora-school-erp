import * as tf from '@tensorflow/tfjs';
import * as faceapi from '@vladmandic/face-api/dist/face-api.node-wasm.js';
import ort from 'onnxruntime-node';
import { Jimp } from 'jimp';
import fs from 'fs';
import path from 'path';
import faceConfig from '../config/faceConfig.js';
import logger from '../utils/logger.js';
import { decryptEmbeddings } from '../utils/encryption.js';

let sfaceSession = null;
let modelsLoaded = false;

/**
 * Load face-api.js and SFace ONNX models into memory.
 */
export async function loadModels() {
  if (modelsLoaded) return;
  
  logger.info('Initializing biometric models...');
  try {
    await tf.ready();
    const weightsDir = path.resolve('src/models/face-weights');
    
    // Load face-api.js SSD MobileNet v1 and 68 landmark model
    await faceapi.nets.ssdMobilenetv1.loadFromDisk(weightsDir);
    await faceapi.nets.faceLandmark68Net.loadFromDisk(weightsDir);
    logger.info('face-api.js face detection and landmark models loaded');
    
    // Load SFace ONNX model using onnxruntime-node
    if (!fs.existsSync(faceConfig.recognitionModelPath)) {
      throw new FileNotFoundError(`SFace ONNX model weights not found at ${faceConfig.recognitionModelPath}`);
    }
    sfaceSession = await ort.InferenceSession.create(faceConfig.recognitionModelPath);
    logger.info(`SFace ONNX model loaded. Inputs: ${sfaceSession.inputNames.join(', ')}`);
    
    modelsLoaded = true;
    logger.info('Biometric models initialized successfully.');
  } catch (error) {
    logger.error('Failed to initialize biometric models:', error);
    throw error;
  }
}

/**
 * Helper to calculate Euclidean distance between two 2D points.
 */
function distance2D(p1, p2) {
  return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
}

/**
 * Calculate the Eye Aspect Ratio (EAR) to detect eye blinking.
 */
function calculateEAR(eyePoints) {
  const p1 = eyePoints[0];
  const p2 = eyePoints[1];
  const p3 = eyePoints[2];
  const p4 = eyePoints[3];
  const p5 = eyePoints[4];
  const p6 = eyePoints[5];
  
  const vertical1 = distance2D(p2, p6);
  const vertical2 = distance2D(p3, p5);
  const horizontal = distance2D(p1, p4);
  
  return (vertical1 + vertical2) / (2.0 * horizontal);
}

/**
 * Calculate the Laplacian variance of a grayscale image buffer (for blur/spoof check).
 */
function calculateLaplacianVariance(jimpImg) {
  const width = jimpImg.bitmap.width;
  const height = jimpImg.bitmap.height;
  const pixels = jimpImg.bitmap.data;
  
  // Convert to grayscale
  const gray = new Uint8Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const idx = i * 4;
    gray[i] = Math.round(0.299 * pixels[idx] + 0.587 * pixels[idx+1] + 0.114 * pixels[idx+2]);
  }
  
  // Laplacian kernel: [[0, 1, 0], [1, -4, 1], [0, 1, 0]]
  const laplacian = new Float32Array(width * height);
  let sum = 0;
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      const val = 
        gray[idx - width] + // top
        gray[idx - 1] +     // left
        -4 * gray[idx] +    // center
        gray[idx + 1] +     // right
        gray[idx + width];  // bottom
      laplacian[idx] = val;
      sum += val;
    }
  }
  
  const mean = sum / (width * height);
  let varianceSum = 0;
  for (let i = 0; i < width * height; i++) {
    varianceSum += Math.pow(laplacian[i] - mean, 2);
  }
  
  return varianceSum / (width * height);
}

/**
 * Check skin tone pixel ratio in RGB space.
 */
function getSkinToneRatio(jimpImg) {
  const pixels = jimpImg.bitmap.data;
  let skinPixels = 0;
  const totalPixels = jimpImg.bitmap.width * jimpImg.bitmap.height;
  
  for (let i = 0; i < totalPixels; i++) {
    const idx = i * 4;
    const r = pixels[idx];
    const g = pixels[idx+1];
    const b = pixels[idx+2];
    
    // Standard RGB skin tone heuristic
    if (r > 95 && g > 40 && b > 20 && (Math.max(r, g, b) - Math.min(r, g, b) > 15) && Math.abs(r - g) > 15 && r > g && r > b) {
      skinPixels++;
    }
  }
  
  return skinPixels / totalPixels;
}

/**
 * Extract 68 landmarks and bounding box from base64 image using face-api.js.
 */
async function detectFaceLandmarks(imageBuffer) {
  await loadModels();
  
  const jimpImg = await Jimp.read(imageBuffer);
  const width = jimpImg.bitmap.width;
  const height = jimpImg.bitmap.height;
  const pixels = jimpImg.bitmap.data;
  
  // Convert RGBA buffer to RGB Int32Array for face-api
  const rgbData = new Int32Array(width * height * 3);
  let srcIdx = 0;
  let dstIdx = 0;
  for (let i = 0; i < width * height; i++) {
    rgbData[dstIdx++] = pixels[srcIdx++]; // R
    rgbData[dstIdx++] = pixels[srcIdx++]; // G
    rgbData[dstIdx++] = pixels[srcIdx++]; // B
    srcIdx++; // skip A
  }
  
  const tf = faceapi.tf;
  const tensor = tf.tensor3d(rgbData, [height, width, 3], 'int32');
  
  // Detect single face with landmarks
  const detection = await faceapi.detectSingleFace(tensor).withFaceLandmarks();
  tf.dispose(tensor); // Clean up GPU/WASM memory
  
  if (!detection) return null;
  return { detection, jimpImg };
}

/**
 * Extract SFace embedding vector from base64 image.
 * Includes face alignment & cropping.
 * @param {string} base64Image - Base64 data URI or raw string
 * @param {boolean} strict - Apply quality gates
 * @returns {Promise<Object>} { embedding, livenessInfo, reason }
 */
export async function extractEmbedding(base64Image, strict = true) {
  try {
    const base64Str = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;
    const buffer = Buffer.from(base64Str, 'base64');
    
    const faceData = await detectFaceLandmarks(buffer);
    if (!faceData) {
      return { embedding: null, reason: 'No face detected in the image.' };
    }
    
    const { detection, jimpImg } = faceData;
    const landmarks = detection.landmarks;
    const box = detection.detection.box;
    
    // Quality Checks (Strict Mode)
    if (strict) {
      // 1. Detection confidence
      if (detection.detection.score < 0.5) {
        return { embedding: null, reason: 'Face detection score is too low.' };
      }
      
      // 2. Blur Check (Laplacian Variance)
      const laplacianVar = calculateLaplacianVariance(jimpImg);
      if (laplacianVar < 8.0) {
        return { embedding: null, reason: 'Image is too blurry. Please stay still.' };
      }
      
      // 3. Skin Tone check (reject black/white prints)
      const skinRatio = getSkinToneRatio(jimpImg);
      if (skinRatio < 0.05) {
        return { embedding: null, reason: 'Invalid skin-tone distribution.' };
      }
    }
    
    // Extract standard eye points to calculate rotation angle
    const leftEyePts = landmarks.getLeftEye();
    const rightEyePts = landmarks.getRightEye();
    
    const leftEye = leftEyePts.reduce((acc, p) => ({ x: acc.x + p.x / 6, y: acc.y + p.y / 6 }), { x: 0, y: 0 });
    const rightEye = rightEyePts.reduce((acc, p) => ({ x: acc.x + p.x / 6, y: acc.y + p.y / 6 }), { x: 0, y: 0 });
    
    // Alignment Rotation
    const dy = rightEye.y - leftEye.y;
    const dx = rightEye.x - leftEye.x;
    const angle = Math.atan2(dy, dx) * (180 / Math.PI); // degrees
    
    // Align face, crop bounding box, and resize to 112x112 standard SFace input
    const alignedJimp = jimpImg.clone();
    alignedJimp.rotate(-angle);
    
    // Calculate adjusted crop box coords after rotation
    const padW = box.width * 0.15;
    const padH = box.height * 0.15;
    const cropX = Math.max(0, box.x - padW);
    const cropY = Math.max(0, box.y - padH);
    const cropW = Math.min(jimpImg.bitmap.width - cropX, box.width + 2 * padW);
    const cropH = Math.min(jimpImg.bitmap.height - cropY, box.height + 2 * padH);
    
    alignedJimp.crop({ x: cropX, y: cropY, w: cropW, h: cropH });
    alignedJimp.resize({ w: 112, h: 112 });
    
    const facePixels = alignedJimp.bitmap.data; // RGBA
    
    // Format BGR planar Float32Array for SFace ONNX
    const bgrFloatData = new Float32Array(1 * 3 * 112 * 112);
    let bOffset = 0;
    let gOffset = 112 * 112;
    let rOffset = 2 * 112 * 112;
    
    let idx = 0;
    for (let i = 0; i < 112 * 112; i++) {
      const r = facePixels[idx++];
      const g = facePixels[idx++];
      const b = facePixels[idx++];
      idx++; // skip alpha
      
      bgrFloatData[bOffset++] = b;
      bgrFloatData[gOffset++] = g;
      bgrFloatData[rOffset++] = r;
    }
    
    // Run SFace Session inference
    const inputTensor = new ort.Tensor('float32', bgrFloatData, [1, 3, 112, 112]);
    const inputName = sfaceSession.inputNames[0];
    const outputName = sfaceSession.outputNames[0];
    
    const feeds = { [inputName]: inputTensor };
    const outputMap = await sfaceSession.run(feeds);
    const embeddingFloatArray = outputMap[outputName].data; // 128 elements
    
    const embedding = Array.from(embeddingFloatArray);
    
    // Liveness landmarks data
    const nose = landmarks.getNose()[3]; // nose tip
    const mouthL = landmarks.getMouth()[0];
    const mouthR = landmarks.getMouth()[6];
    
    const livenessInfo = {
      ear: (calculateEAR(leftEyePts) + calculateEAR(rightEyePts)) / 2.0,
      rotationRatio: distance2D(nose, leftEye) / (distance2D(nose, rightEye) || 1.0),
      verticalRatio: distance2D(nose, { x: (leftEye.x + rightEye.x)/2, y: (leftEye.y + rightEye.y)/2 }) / (distance2D(nose, { x: (mouthL.x + mouthR.x)/2, y: (mouthL.y + mouthR.y)/2 }) || 1.0)
    };
    
    return { embedding, livenessInfo, reason: 'OK' };
  } catch (error) {
    logger.error('Embedding extraction failed:', error);
    return { embedding: null, reason: `Biometric failure: ${error.message}` };
  }
}

/**
 * Extract embeddings from a batch of 4 images (during user registration).
 * Includes liveness evaluation.
 * @param {Array<string>} base64Images - 4 base64 images
 * @returns {Promise<Object>} { embeddings, isLive, reason }
 */
export async function extractMultiple(base64Images) {
  if (!base64Images || base64Images.length < 4) {
    return { embeddings: null, isLive: false, reason: 'Registration requires exactly 4 frames.' };
  }
  
  const embeddings = [];
  const livenessRecords = [];
  
  for (let i = 0; i < base64Images.length && embeddings.length < 4; i++) {
    // Use strict=false for registration — the UI already confirms face detection
    const res = await extractEmbedding(base64Images[i], false);
    if (!res.embedding) {
      logger.warn(`[REGISTER] Frame ${i+1} skipped: ${res.reason}`);
      // If we still have more frames to try, continue
      if (i < base64Images.length - 1) continue;
      // If we don't have enough embeddings, fail
      if (embeddings.length < 1) {
        return { embeddings: null, isLive: false, reason: `No usable face frames captured. Last error: ${res.reason}` };
      }
    } else {
      embeddings.push(res.embedding);
      if (res.livenessInfo) livenessRecords.push(res.livenessInfo);
    }
  }
  
  // Need at least 1 valid embedding to proceed
  if (embeddings.length === 0) {
    return { embeddings: null, isLive: false, reason: 'No valid face embeddings could be extracted.' };
  }
  
  // Evaluate Active Liveness: Blinking and Head Rotation
  // 1. Blinking check (EAR should vary due to eye closure/blink)
  const ears = livenessRecords.map(r => r.ear);
  const minEar = Math.min(...ears);
  const maxEar = Math.max(...ears);
  const earDelta = maxEar - minEar;
  
  // 2. Head Rotation (pupil-to-nose ratio variance)
  const rotations = livenessRecords.map(r => r.rotationRatio);
  const minRot = Math.min(...rotations);
  const maxRot = Math.max(...rotations);
  const rotDelta = maxRot - minRot;
  
  // Static image detection
  let isLive = true;
  let livenessReason = 'Liveness checks passed';
  
  if (earDelta < 0.02 && rotDelta < 0.03 && process.env.NODE_ENV === 'production') {
    isLive = false; // Zero facial variance - likely a printed photo or static mock
    livenessReason = 'Biometric check failed: Static photo detected.';
  }
  
  return { embeddings, isLive, reason: livenessReason };
}

/**
 * Compute cosine similarity between two 128-d vectors.
 */
export function computeCosineSimilarity(a, b) {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < 128; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const norm = Math.sqrt(normA) * Math.sqrt(normB);
  return norm > 0 ? dot / norm : 0;
}

/**
 * Compare live embedding against stored encrypted templates (SFace cosine match).
 * @param {Array<number>} liveEmbedding - 128-d live vector
 * @param {Array<string>} storedEncryptedTemplates - List of encrypted templates
 * @returns {Object} { isMatch, score }
 */
export function compareEmbeddings(liveEmbedding, storedEncryptedTemplates) {
  try {
    const storedEmbeddings = decryptEmbeddings(storedEncryptedTemplates);
    let viewsPassed = 0;
    const scores = [];
    
    storedEmbeddings.forEach((stored, idx) => {
      const score = computeCosineSimilarity(liveEmbedding, stored);
      scores.push(score);
      
      const passed = score >= faceConfig.similarityThreshold;
      if (passed) {
        viewsPassed++;
      }
      logger.info(`  Stored template comparison view[${idx}] score: ${score.toFixed(4)} (${passed ? 'PASS' : 'FAIL'})`);
    });
    
    const avgScore = scores.reduce((sum, s) => sum + s, 0) / (scores.length || 1);
    const minRequired = Math.min(faceConfig.minViewsMatched, storedEmbeddings.length);
    const isMatch = viewsPassed >= minRequired;
    
    return { isMatch, score: avgScore };
  } catch (error) {
    logger.error('Biometric comparison failed:', error);
    return { isMatch: false, score: 0 };
  }
}

/**
 * Check if registration embeddings match any existing user's face templates
 */
export function findMatchingUser(regEmbeddings, allUsers) {
  for (const user of allUsers) {
    if (!user.face_embeddings || user.face_embeddings.length === 0) continue;
    try {
      const decryptedStored = decryptEmbeddings(user.face_embeddings);
      for (const reg of regEmbeddings) {
        for (const stored of decryptedStored) {
          const score = computeCosineSimilarity(reg, stored);
          if (score >= faceConfig.similarityThreshold) {
            return user; // Found matching user
          }
        }
      }
    } catch (err) {
      logger.error(`Error comparing registration face against user ${user._id}:`, err);
    }
  }
  return null;
}
