import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import User from '../models/User.js';
import Teacher from '../models/Teacher.js';
import { getTeacherDashboard } from '../controllers/dashboardController.js';

const MONGODB_URL = process.env.MONGODB_URL || 'mongodb+srv://rakesh_rk:Rakesh2005@faceauth.jvni6bv.mongodb.net/?appName=faceauth';
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || 'qelvora_school_crm_db';

async function testDashboard() {
  await mongoose.connect(MONGODB_URL, { dbName: MONGODB_DB_NAME });
  const user = await User.findOne({});
  const req = { user };
  const res = {
    status: (code) => ({
      json: (result) => {
        console.log('--- DASHBOARD RESULT (code ' + code + ') ---', result);
        process.exit(0);
      }
    }),
    json: (result) => {
      console.log('--- DASHBOARD SUCCESS RESULT ---');
      console.log('Metrics:', result.data?.metrics);
      console.log('Pending Leaves:', result.data?.pendingLeaves?.length);
      console.log('Historic Leaves:', result.data?.historicLeaves?.length);
      console.log('Current Period:', result.data?.currentPeriod);
      console.log('Today Timetable:', result.data?.todayTimetable?.length);
      process.exit(0);
    }
  };

  await getTeacherDashboard(req, res);
}

testDashboard();
