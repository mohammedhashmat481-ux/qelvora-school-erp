import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const MONGODB_URL = process.env.MONGODB_URL || 'mongodb+srv://rakesh_rk:Rakesh2005@faceauth.jvni6bv.mongodb.net/?appName=faceauth';
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || 'qelvora_school_crm_db';
const LOCAL_URL = 'mongodb://127.0.0.1:27017/qelvora_school_crm_db';

async function checkConnection() {
  console.log('=== DATABASE CONNECTION STATUS CHECK ===\n');
  console.log(`Configured MONGODB_URL: ${MONGODB_URL.replace(/:([^@]+)@/, ':****@')}`);
  console.log(`Configured Database Name: ${MONGODB_DB_NAME}\n`);

  try {
    console.log('Connecting to Primary URL (Atlas)...');
    const conn = await mongoose.connect(MONGODB_URL, {
      dbName: MONGODB_DB_NAME,
      serverSelectionTimeoutMS: 5000
    });
    
    const host = conn.connection.host;
    console.log(`\n✅ STATUS: CONNECTED TO CLOUD MONGODB ATLAS!`);
    console.log(`- Connected Host: ${host}`);
    console.log(`- Database Name: ${conn.connection.name}`);
    console.log(`- Connection Type: MONGODB ATLAS (Cloud Database)`);

    const adminDb = conn.connection.db.admin();
    const serverStatus = await adminDb.ping();
    console.log(`- Latency / Ping: OK (${JSON.stringify(serverStatus)})`);

    await mongoose.disconnect();
  } catch (atlasErr) {
    console.log(`\n❌ Primary Atlas Connection Failed: ${atlasErr.message}`);
    console.log('\nTesting Fallback Local MongoDB (127.0.0.1:27017)...');
    try {
      const localConn = await mongoose.connect(LOCAL_URL, {
        dbName: MONGODB_DB_NAME,
        serverSelectionTimeoutMS: 3000
      });
      console.log(`\n⚠️ STATUS: CONNECTED TO LOCAL MONGODB (FALLBACK)!`);
      console.log(`- Connected Host: ${localConn.connection.host}`);
      console.log(`- Database Name: ${localConn.connection.name}`);
      console.log(`- Connection Type: LOCAL MONGODB (127.0.0.1)`);
      await mongoose.disconnect();
    } catch (localErr) {
      console.log(`\n❌ Local Connection Failed: ${localErr.message}`);
    }
  }

  process.exit(0);
}

checkConnection();
