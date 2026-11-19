import { connectMongo } from '../src/config/mongo.js';
import { Expense } from '../src/models/Expense.js';
import { ExpenseCategory } from '../src/models/ExpenseCategory.js';
import {
  ensureDefaultCategories,
  getNextExpenseNumber,
  getFinancialYearRange,
  getWeekRange,
  getMonthRange
} from '../src/services/expenseService.js';

async function runTests() {
  console.log('🧪 Starting Expense Management Unit & Integration Checks...');

  await connectMongo();

  const testSchoolId = 'test_school_schoolerp_101';
  const testUser = { id: 'test-admin-1', name: 'Test Accountant', role: 'admin' };

  // 1. Test Category Seeding
  await ExpenseCategory.deleteMany({ schoolId: testSchoolId });
  await ensureDefaultCategories(testSchoolId, testUser);

  const categories = await ExpenseCategory.find({ schoolId: testSchoolId });
  console.log(`✅ Default categories seeded: ${categories.length} (Expected: 20)`);
  if (categories.length !== 20) throw new Error('Expected 20 default categories');

  // 2. Test Expense Creation
  await Expense.deleteMany({ schoolId: testSchoolId });

  const dateNow = new Date();
  const dateStr = dateNow.toISOString().slice(0, 10);
  const expNum = await getNextExpenseNumber(testSchoolId, dateNow);
  console.log(`✅ Generated Expense Number: ${expNum}`);

  const testAmount = 4500.50;
  const testAmountPaise = Math.round(testAmount * 100);

  const exp1 = await Expense.create({
    schoolId: testSchoolId,
    expenseNumber: expNum,
    date: dateNow,
    dateString: dateStr,
    category: 'Electricity Bill',
    amount: testAmount,
    amountPaise: testAmountPaise,
    paidTo: 'Bescom Bangalore',
    paymentMethod: 'Bank Transfer',
    description: 'Main campus monthly electricity bill',
    referenceNumber: 'BESCOM-998822',
    createdBy: testUser,
    updatedBy: testUser,
    auditHistory: [
      {
        action: 'CREATE',
        performedBy: testUser,
        timestamp: new Date(),
        changes: { amount: testAmount, category: 'Electricity Bill' },
        notes: 'Initial test expense'
      }
    ]
  });

  console.log(`✅ Created test expense ID: ${exp1._id}, amount: ₹${exp1.amount}, paise: ${exp1.amountPaise}`);

  // Add 2nd test expense
  const expNum2 = await getNextExpenseNumber(testSchoolId, dateNow);
  const exp2 = await Expense.create({
    schoolId: testSchoolId,
    expenseNumber: expNum2,
    date: dateNow,
    dateString: dateStr,
    category: 'Stationery',
    amount: 1250.00,
    amountPaise: 125000,
    paidTo: 'National Book Store',
    paymentMethod: 'UPI',
    description: 'Exam answer sheets and markers',
    referenceNumber: 'UPI/38382/NBS',
    createdBy: testUser,
    updatedBy: testUser,
    auditHistory: [
      {
        action: 'CREATE',
        performedBy: testUser,
        timestamp: new Date(),
        changes: { amount: 1250.00, category: 'Stationery' },
        notes: 'Stationery purchase'
      }
    ]
  });

  console.log(`✅ Created 2nd test expense: ${exp2.expenseNumber}, amount: ₹${exp2.amount}`);

  // 3. Test Dashboard Aggregation & Precision
  const totalAgg = await Expense.aggregate([
    { $match: { schoolId: testSchoolId, isDeleted: false } },
    { $group: { _id: null, totalPaise: { $sum: '$amountPaise' }, count: { $sum: 1 } } }
  ]);

  const totalPaise = totalAgg[0].totalPaise;
  const totalRupees = Number((totalPaise / 100).toFixed(2));
  console.log(`✅ Total calculated: ₹${totalRupees} across ${totalAgg[0].count} expenses`);

  const expectedTotal = 4500.50 + 1250.00;
  if (totalRupees !== expectedTotal) {
    throw new Error(`Calculation mismatch! Expected ${expectedTotal}, got ${totalRupees}`);
  }

  // 4. Test Audit History on Edit
  exp1.amount = 4800.00;
  exp1.amountPaise = 480000;
  exp1.auditHistory.push({
    action: 'UPDATE',
    performedBy: testUser,
    timestamp: new Date(),
    changes: { amount: { from: 4500.50, to: 4800.00 } },
    notes: 'Corrected meter reading amount'
  });
  await exp1.save();

  const reloadedExp1 = await Expense.findById(exp1._id);
  console.log(`✅ Expense edited with audit history. Audit entries: ${reloadedExp1.auditHistory.length}`);
  if (reloadedExp1.auditHistory.length !== 2) throw new Error('Expected 2 audit records');

  // Clean up test data
  await Expense.deleteMany({ schoolId: testSchoolId });
  await ExpenseCategory.deleteMany({ schoolId: testSchoolId });
  console.log('🧹 Cleaned up test data.');
  console.log('🎉 All Expense Management Unit & Integration Checks PASSED!');

  process.exit(0);
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
