import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import User from '../models/User.js';

const MONGODB_URL = process.env.MONGODB_URL || 'mongodb+srv://rakesh_rk:Rakesh2005@faceauth.jvni6bv.mongodb.net/?appName=faceauth';
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || 'qelvora_school_crm_db';

async function makeAdmin() {
  await mongoose.connect(MONGODB_URL, { dbName: MONGODB_DB_NAME });
  const result = await User.updateMany(
    {},
    { $set: { role: 'admin', isAdmin: true } }
  );
  console.log(`✅ Updated ${result.modifiedCount} users to role 'admin' with isAdmin: true`);
  process.exit(0);
}

makeAdmin();
