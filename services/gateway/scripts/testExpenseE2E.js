import express from 'express';
import http from 'http';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import { connectMongo } from '../src/config/mongo.js';
import { Expense } from '../src/models/Expense.js';
import { ExpenseCategory } from '../src/models/ExpenseCategory.js';
import expenseRoutes from '../src/routes/expenseRoutes.js';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_school_crm_platform_2026';

const tokenSchoolA = jwt.sign(
  {
    id: 'user-admin-school-a',
    name: 'School A Accountant',
    email: 'accountant@schoola.edu',
    role: 'admin',
    schoolId: 'school_alpha_101',
    permissions: ['all']
  },
  JWT_SECRET,
  { expiresIn: '1h' }
);

const tokenSchoolB = jwt.sign(
  {
    id: 'user-admin-school-b',
    name: 'School B Accountant',
    email: 'accountant@schoolb.edu',
    role: 'admin',
    schoolId: 'school_beta_202',
    permissions: ['all']
  },
  JWT_SECRET,
  { expiresIn: '1h' }
);

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api/expenses', expenseRoutes);

const server = http.createServer(app);
const TEST_PORT = 8099;

async function runE2ETests() {
  console.log('🚀 Running Comprehensive Expense Management E2E API Tests...');
  await connectMongo();

  await new Promise((resolve) => server.listen(TEST_PORT, resolve));
  console.log(`📡 Test server listening on http://localhost:${TEST_PORT}`);

  const clientA = axios.create({
    baseURL: `http://localhost:${TEST_PORT}/api/expenses`,
    headers: { Authorization: `Bearer ${tokenSchoolA}` }
  });

  const clientB = axios.create({
    baseURL: `http://localhost:${TEST_PORT}/api/expenses`,
    headers: { Authorization: `Bearer ${tokenSchoolB}` }
  });

  const schoolA = 'school_alpha_101';
  const schoolB = 'school_beta_202';

  try {
    // Clean initial test data
    await Expense.deleteMany({ schoolId: { $in: [schoolA, schoolB] } });
    await ExpenseCategory.deleteMany({ schoolId: { $in: [schoolA, schoolB] } });

    // ── TEST 1: Default Categories Auto-Seeding ──
    console.log('\n--- 1. Testing Default Categories ---');
    const catRes = await clientA.get('/categories');
    if (!catRes.data.success || catRes.data.data.length !== 20) {
      throw new Error(`Expected 20 default categories, got: ${catRes.data.data?.length}`);
    }
    console.log(`✅ Seeded and fetched ${catRes.data.data.length} categories for School A`);

    // ── TEST 2: Add Custom Category ──
    console.log('\n--- 2. Testing Add Custom Category ---');
    const addCatRes = await clientA.post('/categories', {
      name: 'Robotics Lab Equipment',
      description: 'Arduino kits, sensors and motors for STEM lab',
      color: '#8B5CF6'
    });
    if (!addCatRes.data.success || addCatRes.data.data.name !== 'Robotics Lab Equipment') {
      throw new Error('Failed to create custom category');
    }
    console.log(`✅ Custom category created: "${addCatRes.data.data.name}"`);

    // ── TEST 3: Validation Check: Reject Negative / Zero Amounts ──
    console.log('\n--- 3. Testing Amount Validations ---');
    try {
      await clientA.post('/', {
        date: '2026-11-19',
        category: 'Electricity Bill',
        amount: -500,
        paidTo: 'Power Corp'
      });
      throw new Error('Should have failed on negative amount');
    } catch (e) {
      if (e.response?.status !== 400) throw e;
      console.log('✅ Rejected negative amount (-500) with 400 Bad Request');
    }

    try {
      await clientA.post('/', {
        date: '2026-11-19',
        category: 'Electricity Bill',
        amount: 0,
        paidTo: 'Power Corp'
      });
      throw new Error('Should have failed on zero amount');
    } catch (e) {
      if (e.response?.status !== 400) throw e;
      console.log('✅ Rejected zero amount (0) with 400 Bad Request');
    }

    // ── TEST 4: Create Valid Expenses with Decimal-Safe Values ──
    console.log('\n--- 4. Testing Create Valid Expenses ---');
    const expRes1 = await clientA.post('/', {
      date: '2026-11-19',
      category: 'Electricity Bill',
      amount: 8750.75,
      paidTo: 'Bescom Electricity Board',
      paymentMethod: 'Bank Transfer',
      description: 'Primary school campus power utility bill',
      referenceNumber: 'NEFT-88392019'
    });
    if (!expRes1.data.success) throw new Error(`Expense 1 creation failed`);
    const exp1Id = expRes1.data.data._id;
    console.log(`✅ Created Expense 1: ${expRes1.data.data.expenseNumber} (₹${expRes1.data.data.amount})`);

    const expRes2 = await clientA.post('/', {
      date: '2026-11-19',
      category: 'Stationery',
      amount: 2249.25,
      paidTo: 'Standard Stationers',
      paymentMethod: 'UPI',
      description: 'A4 printing paper reams & white board markers',
      referenceNumber: 'UPI-9928374'
    });
    if (!expRes2.data.success) throw new Error('Expense 2 creation failed');
    const exp2Id = expRes2.data.data._id;
    console.log(`✅ Created Expense 2: ${expRes2.data.data.expenseNumber} (₹${expRes2.data.data.amount})`);

    // Add 1 expense for School B to test school-wise isolation
    const expResB = await clientB.post('/', {
      date: '2026-11-19',
      category: 'Water Bill',
      amount: 1500.00,
      paidTo: 'City Water Works',
      paymentMethod: 'Cash'
    });
    if (!expResB.data.success) throw new Error('School B expense creation failed');
    console.log(`✅ Created School B Expense: ${expResB.data.data.expenseNumber} (₹1500.00)`);

    // ── TEST 5: School-Wise Isolation Verification ──
    console.log('\n--- 5. Testing Multi-Tenant School Isolation ---');
    const listA = await clientA.get('/');
    if (listA.data.data.pagination.total !== 2) {
      throw new Error(`School A should only see 2 expenses, got: ${listA.data.data.pagination.total}`);
    }

    const listB = await clientB.get('/');
    if (listB.data.data.pagination.total !== 1) {
      throw new Error(`School B should only see 1 expense, got: ${listB.data.data.pagination.total}`);
    }
    console.log('✅ Multi-tenant school isolation strictly verified: School A sees 2, School B sees 1');

    // School A trying to access or edit School B's expense directly by ID
    try {
      await clientA.put(`/${expResB.data.data._id}`, { amount: 9999 });
      throw new Error('Should have failed cross-tenant edit');
    } catch (e) {
      if (e.response?.status !== 404) throw e;
      console.log('✅ Cross-tenant ID tampering prevented with 404 Not Found');
    }

    // ── TEST 6: Dashboard Calculations & Exact Decimal Sum ──
    console.log('\n--- 6. Testing Dashboard Calculations & Decimal Precision ---');
    const dashRes = await clientA.get('/dashboard');
    const d = dashRes.data.data;
    console.log(`  Today's Total: ₹${d.todayTotal}`);
    console.log(`  Financial Year Total: ₹${d.fyTotal}`);
    console.log(`  Transactions: ${d.totalTransactions}`);
    console.log(`  Highest Category: ${d.highestCategory?.category} (₹${d.highestCategory?.amount})`);

    // Expected sum: 8750.75 + 2249.25 = 11000.00 exact!
    if (d.todayTotal !== 11000.00) {
      throw new Error(`Decimal precision error! Expected 11000.00, got: ${d.todayTotal}`);
    }
    if (d.totalTransactions !== 2) {
      throw new Error(`Expected 2 transactions, got: ${d.totalTransactions}`);
    }
    if (d.highestCategory?.category !== 'Electricity Bill' || d.highestCategory?.amount !== 8750.75) {
      throw new Error('Highest category calculation mismatch');
    }
    console.log('✅ Decimal-safe calculations matched exactly: ₹8750.75 + ₹2249.25 = ₹11000.00');

    // ── TEST 7: Daily, Weekly, and Monthly Reports ──
    console.log('\n--- 7. Testing Reports (Daily, Weekly, Monthly) ---');
    const dailyRep = await clientA.get('/reports/daily?date=2026-11-19');
    if (dailyRep.data.data.grandTotal !== 11000.00 || dailyRep.data.data.expenses.length !== 2) {
      throw new Error('Daily report total mismatch');
    }
    console.log(`✅ Daily Report Verified: ₹${dailyRep.data.data.grandTotal} across ${dailyRep.data.data.expenses.length} records`);

    const monthlyRep = await clientA.get('/reports/monthly?month=11&year=2026');
    if (monthlyRep.data.data.grandTotal !== 11000.00) {
      throw new Error('Monthly report total mismatch');
    }
    console.log(`✅ Monthly Report Verified: ₹${monthlyRep.data.data.grandTotal} with ${monthlyRep.data.data.categories.length} category totals`);

    // ── TEST 8: Edit Expense with Audit History ──
    console.log('\n--- 8. Testing Edit Expense & Audit Logging ---');
    const editRes = await clientA.put(`/${exp1Id}`, {
      amount: 9000.00,
      editReason: 'Revised bill with power surcharge adjustment'
    });
    if (!editRes.data.success || editRes.data.data.amount !== 9000.00) {
      throw new Error('Edit expense failed');
    }

    const singleExp = await clientA.get(`/${exp1Id}`);
    const history = singleExp.data.data.auditHistory;
    if (!history || history.length !== 2) {
      throw new Error(`Expected 2 audit records (CREATE + UPDATE), found: ${history?.length}`);
    }
    if (history[1].action !== 'UPDATE' || history[1].changes.amount?.to !== 9000) {
      throw new Error('Audit record details mismatch');
    }
    console.log(`✅ Audit History verified: ${history.length} records, latest action: ${history[1].action} with reason "${history[1].notes}"`);

    // ── TEST 9: Soft Delete with Audit Retention ──
    console.log('\n--- 9. Testing Soft Delete ---');
    const delRes = await clientA.delete(`/${exp2Id}`, { data: { reason: 'Duplicate entry cancelled' } });
    if (!delRes.data.success) throw new Error('Delete expense failed');

    const listAfterDel = await clientA.get('/');
    if (listAfterDel.data.data.pagination.total !== 1) {
      throw new Error(`Expected 1 active expense after deletion, found: ${listAfterDel.data.data.pagination.total}`);
    }
    console.log('✅ Soft delete verified: Active count reduced to 1');

    // ── TEST 10: Excel & PDF Exports ──
    console.log('\n--- 10. Testing Excel & PDF Export Endpoints ---');
    const excelRes = await clientA.get('/export/excel?date=2026-11-19', { responseType: 'arraybuffer' });
    if (excelRes.status !== 200 || !excelRes.headers['content-type'].includes('spreadsheetml')) {
      throw new Error('Excel export failed');
    }
    console.log(`✅ Excel export generated: ${excelRes.data.byteLength} bytes (.xlsx)`);

    const pdfRes = await clientA.get('/export/pdf?date=2026-11-19', { responseType: 'arraybuffer' });
    if (pdfRes.status !== 200 || !pdfRes.headers['content-type'].includes('pdf')) {
      throw new Error('PDF export failed');
    }
    console.log(`✅ PDF export generated: ${pdfRes.data.byteLength} bytes (.pdf)`);

    // Cleanup
    await Expense.deleteMany({ schoolId: { $in: [schoolA, schoolB] } });
    await ExpenseCategory.deleteMany({ schoolId: { $in: [schoolA, schoolB] } });
    console.log('🧹 Cleaned up test data.');

    console.log('\n🎉 ALL 10 E2E UNIT & INTEGRATION TESTS PASSED WITH 100% SUCCESS!\n');
    server.close();
    process.exit(0);
  } catch (err) {
    server.close();
    console.error('❌ E2E test failed:', err);
    process.exit(1);
  }
}

runE2ETests().catch(err => {
  console.error('❌ Fatal test error:', err);
  process.exit(1);
});
