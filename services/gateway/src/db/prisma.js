import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

/**
 * Ensures contract compatibility with legacy Mongoose documents by attaching `_id` alias
 * to any object or array of objects returned by Prisma queries.
 */
export function formatLegacyId(data) {
  if (!data) return data;

  if (Array.isArray(data)) {
    return data.map((item) => formatLegacyId(item));
  }

  if (typeof data === 'object' && data !== null) {
    const formatted = { ...data };
    if (formatted.id && !formatted._id) {
      formatted._id = formatted.id;
    }
    // Recursively process nested objects
    for (const key of Object.keys(formatted)) {
      if (typeof formatted[key] === 'object' && formatted[key] !== null) {
        formatted[key] = formatLegacyId(formatted[key]);
      }
    }
    return formatted;
  }

  return data;
}

export default prisma;
