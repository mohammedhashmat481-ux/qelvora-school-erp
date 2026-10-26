import express from 'express';
import { prisma, formatLegacyId } from '../db/prisma.js';
import { protect } from '../middleware/authMiddleware.js';
import cache from '../lib/cache.js';

const router = express.Router();
const SETTINGS_CACHE_KEY = 'school:settings';
const SETTINGS_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

router.get('/', protect, async (req, res) => {
  try {
    const cached = cache.get(SETTINGS_CACHE_KEY);
    if (cached) {
      return res.json(cached);
    }

    let settings = await prisma.schoolSettings.findFirst();
    if (!settings) {
      settings = await prisma.schoolSettings.create({
        data: { schoolName: 'Qelvora School CRM' }
      });
    }
    const formatted = formatLegacyId(settings);
    cache.set(SETTINGS_CACHE_KEY, formatted, SETTINGS_CACHE_TTL);
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/', protect, async (req, res) => {
  try {
    const first = await prisma.schoolSettings.findFirst();
    let result;
    if (!first) {
      result = await prisma.schoolSettings.create({ data: req.body });
    } else {
      result = await prisma.schoolSettings.update({
        where: { id: first.id },
        data: req.body
      });
    }
    const formatted = formatLegacyId(result);
    cache.set(SETTINGS_CACHE_KEY, formatted, SETTINGS_CACHE_TTL);
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
