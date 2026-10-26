import EmbeddedPostgres from 'embedded-postgres';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Load environment variables
dotenv.config({ path: path.join(rootDir, '.env') });

async function main() {
  const dbPort = parseInt(process.env.DB_PORT || '5435', 10);
  const dbName = process.env.DB_NAME || 'qelvora_school_crm';
  const dbDirName = process.env.DB_DIR || '.postgres-school-data';

  console.log(`⚡ Initializing Local Embedded PostgreSQL Database Server (Port ${dbPort})...`);
  
  const dataDirPath = path.join(rootDir, dbDirName);
  if (!fs.existsSync(dataDirPath)) {
    fs.mkdirSync(dataDirPath, { recursive: true });
  }

  if (process.platform === 'linux' && process.getuid && process.getuid() === 0) {
    try {
      execSync(`id -u postgres >/dev/null 2>&1 || useradd -r -s /bin/bash postgres`, { stdio: 'ignore' });
      execSync(`chown -R postgres:postgres "${dataDirPath}" && chmod 700 "${dataDirPath}"`, { stdio: 'ignore' });
    } catch (_) {}
  }

  const pg = new EmbeddedPostgres({
    databaseDir: dataDirPath,
    port: dbPort,
    user: 'postgres',
    password: 'postgres',
    dbName: dbName,
    persistent: true
  });

  try {
    await pg.initialise();
  } catch (initErr) {
    // If already initialized, continue to start
  }

  try {
    await pg.start();
    console.log(`✅ Local PostgreSQL Database Server started on port ${dbPort}`);
  } catch (err) {
    console.log(`ℹ️ Checking PostgreSQL server status on port ${dbPort}... (${err.message || 'active'})`);
  }

  process.env.DATABASE_URL = `postgresql://postgres:postgres@localhost:${dbPort}/${dbName}?schema=public`;

  console.log('🔄 Syncing Prisma schema with PostgreSQL database...');
  try {
    execSync('npx prisma db push --skip-generate', { cwd: rootDir, stdio: 'inherit', env: process.env });
    console.log('✅ Prisma database schema synchronized!');

    // Run seed check via child process so the daemon does not keep the Prisma native query engine open
    try {
      execSync('node -e "import(\'@prisma/client\').then(async ({ PrismaClient }) => { const p = new PrismaClient(); const u = await p.user.count().catch(()=>0); const r = await p.role.count().catch(()=>0); await p.\\$disconnect(); if(!u || !r) process.exit(1); })"', { cwd: rootDir, stdio: 'ignore', env: process.env });
      console.log('✅ PostgreSQL database already contains active user and role records. Preserving database state.');
    } catch {
      console.log('🌱 Database is empty. Seeding master demo data into PostgreSQL...');
      execSync('node scripts/seedFullPlatformDemo.js', { cwd: rootDir, stdio: 'inherit', env: process.env });
      execSync('node scripts/seedExamination.js', { cwd: rootDir, stdio: 'inherit', env: process.env });
      console.log('🎉 Master PostgreSQL Database connection & seed fully established!');
    }
  } catch (err) {
    console.error('⚠️ Database sync/seed note:', err.message);
  }

  if (process.argv.includes('--daemon')) {
    console.log(`📌 PostgreSQL Database Server daemon running on port ${dbPort}...`);
    setInterval(() => {}, 1000 * 60 * 60);
  }
}

main().catch(console.error);
