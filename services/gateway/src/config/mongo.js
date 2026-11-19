import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });
dotenv.config();

const MONGODB_URL = process.env.MONGODB_URL || process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/qelvora_school_crm_db';

let isConnected = false;

export const connectMongo = async () => {
  if (isConnected || mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  try {
    console.log(`🔌 Connecting to MongoDB for Expense & Document store at: ${MONGODB_URL}`);
    const conn = await mongoose.connect(MONGODB_URL, {
      serverSelectionTimeoutMS: 5000,
      heartbeatFrequencyMS: 10000
    });

    isConnected = true;
    console.log(`✅ MongoDB Connected successfully to ${conn.connection.host}/${conn.connection.name}`);

    mongoose.connection.on('error', (err) => {
      console.warn('⚠️ MongoDB connection error:', err.message);
      isConnected = false;
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ MongoDB disconnected. Reconnect will be attempted automatically.');
      isConnected = false;
    });

    return conn;
  } catch (err) {
    console.warn(`⚠️ Primary MongoDB connection failed (${err.message}). Expense module will retry automatically.`);
    // Do not crash the gateway if MongoDB is temporarily starting up
    setTimeout(connectMongo, 5000);
    return null;
  }
};

export default connectMongo;
