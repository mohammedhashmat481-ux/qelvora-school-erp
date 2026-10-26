import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { feesStore } from '../src/db/feesStore.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FEES_DATA_PATH = path.resolve(__dirname, '../src/db/feesData.json');

async function auditFees() {
  console.log('====================================================');
  console.log('🔍 INDEPENDENT AUDIT 2: FEES, CONCESSIONS & BALANCES');
  console.log('====================================================\n');

  try {
    const rawData = JSON.parse(fs.readFileSync(FEES_DATA_PATH, 'utf-8'));
    const year = rawData.settings.activeAcademicYear || '2026-2027';
    console.log(`Academic Year: ${year}`);
    console.log(`Total Quotas in master: ${rawData.quotas.length}`);
    rawData.quotas.forEach(q => {
      console.log(`  - ${q.id} (${q.name}): ${q.concessionType === 'percentage' ? q.concessionValue + '%' : 'None'}`);
    });

    const students = await feesStore.getEnrichedStudents({ academicYear: year });
    console.log(`\nEnriched Students: ${students.length}`);

    // Audit Quota assignments
    const quotaCounts = {};
    students.forEach(s => {
      quotaCounts[s.quotaId] = (quotaCounts[s.quotaId] || 0) + 1;
    });
    console.log('\n--- Student Quota Distribution ---');
    Object.entries(quotaCounts).forEach(([qid, count]) => {
      const qObj = rawData.quotas.find(q => q.id === qid);
      console.log(`  ${qid.padEnd(12)} (${(qObj?.name || 'Unknown').padEnd(25)}): ${count} students`);
    });

    // Check Stacking of Concessions & Math Recalculation
    console.log('\n--- Auditing Student Concession Calculations & Double-Dipping ---');
    let stackingDetected = 0;
    let calculationErrors = 0;
    let negativeBalances = 0;
    let rteTuitionLeak = 0;

    let totalCalculatedPayable = 0;
    let totalCalculatedPaid = 0;
    let totalCalculatedDue = 0;

    students.forEach(s => {
      // 1. Get base general structure for this standard
      const generalKey = `${year}_${s.standard}_q-general`;
      const generalStruct = rawData.structures[generalKey];
      if (!generalStruct) {
        console.error(`Missing general structure for ${s.standard}`);
        calculationErrors++;
        return;
      }

      // Calculate baseline general tuition
      let baselineGeneralTuition = 0;
      let generalAnnualTotal = 0;
      generalStruct.items.forEach(it => {
        if (!it.enabled) return;
        const multiplier = it.frequency === 'Monthly' ? (it.billedMonths?.length || 12) : it.frequency === 'Term-wise' ? 3 : 1;
        const totalItem = it.amount * multiplier;
        generalAnnualTotal += totalItem;
        if (it.headId === 'fh-tuition') baselineGeneralTuition = totalItem;
      });

      // 2. Get student's assigned quota structure
      const studentStructKey = `${year}_${s.standard}_${s.quotaId}`;
      const studentStruct = rawData.structures[studentStructKey] || generalStruct;

      let quotaTuition = 0;
      let quotaTotal = 0;
      studentStruct.items.forEach(it => {
        if (!it.enabled) return;
        const multiplier = it.frequency === 'Monthly' ? (it.billedMonths?.length || 12) : it.frequency === 'Term-wise' ? 3 : 1;
        const totalItem = it.amount * multiplier;
        quotaTotal += totalItem;
        if (it.headId === 'fh-tuition') quotaTuition = totalItem;
      });

      // Check RTE: Tuition MUST be 0!
      if (s.quotaId === 'q-rte') {
        if (quotaTuition !== 0) {
          console.error(`RTE student ${s.name} (${s.standard}-${s.section}) has non-zero tuition: ${quotaTuition}`);
          rteTuitionLeak++;
        }
      }

      // Check Staff Ward: Tuition must be 50% of baseline
      if (s.quotaId === 'q-staff') {
        const expectedStaffTuition = Math.round(baselineGeneralTuition * 0.5);
        if (Math.abs(quotaTuition - expectedStaffTuition) > 10) {
          console.error(`Staff student ${s.name} tuition mismatch. Expected ${expectedStaffTuition}, got ${quotaTuition}`);
          calculationErrors++;
        }
      }

      // Check Merit: Tuition must be 75% of baseline (25% off)
      if (s.quotaId === 'q-merit') {
        const expectedMeritTuition = Math.round(baselineGeneralTuition * 0.75);
        if (Math.abs(quotaTuition - expectedMeritTuition) > 10) {
          console.error(`Merit student ${s.name} tuition mismatch. Expected ${expectedMeritTuition}, got ${quotaTuition}`);
          calculationErrors++;
        }
      }

      // Check Sibling: Tuition must be 85% of baseline (15% off)
      if (s.quotaId === 'q-sibling') {
        const expectedSiblingTuition = Math.round(baselineGeneralTuition * 0.85);
        if (Math.abs(quotaTuition - expectedSiblingTuition) > 10) {
          console.error(`Sibling student ${s.name} tuition mismatch. Expected ${expectedSiblingTuition}, got ${quotaTuition}`);
          calculationErrors++;
        }
      }

      // Check adjustments for unintended stacking
      const adjList = rawData.studentAdjustments[`${s.id}_${year}`] || [];
      const hasDiscountAdj = adjList.some(a => a.type === 'discount_fixed' || a.type === 'discount_percentage' || a.type === 'full_waiver');
      if (s.quotaId !== 'q-general' && hasDiscountAdj) {
        console.warn(`Potential concession stacking for ${s.name} (Quota: ${s.quotaId}, Adjustments: ${JSON.stringify(adjList)})`);
        stackingDetected++;
      }

      // Reconcile receipts
      const stuReceipts = rawData.receipts.filter(r =>
        (r.studentId === s.id || r.studentId === s.studentId || r.studentIdCode === s.studentId) &&
        r.academicYear === year &&
        r.status === 'Active'
      );
      const sumReceipts = stuReceipts.reduce((sum, r) => sum + Number(r.paidAmount || 0), 0);

      if (s.totalPaid !== sumReceipts) {
        console.error(`Paid amount mismatch for ${s.name}: s.totalPaid=${s.totalPaid}, sumReceipts=${sumReceipts}`);
        calculationErrors++;
      }

      const expectedDue = Math.max(0, s.annualPayable - s.totalPaid);
      if (s.totalDue !== expectedDue) {
        console.error(`Due amount mismatch for ${s.name}: s.totalDue=${s.totalDue}, expectedDue=${expectedDue}`);
        calculationErrors++;
      }

      if (s.totalDue < 0) negativeBalances++;

      totalCalculatedPayable += s.annualPayable;
      totalCalculatedPaid += s.totalPaid;
      totalCalculatedDue += s.totalDue;
    });

    console.log(`Unintended Concession Stacking Instances: ${stackingDetected}`);
    console.log(`Calculation Errors: ${calculationErrors}`);
    console.log(`RTE Tuition Leaks (Tuition > 0): ${rteTuitionLeak}`);
    console.log(`Negative Balances: ${negativeBalances}`);

    // Summary totals
    console.log('\n--- Institutional Financial Totals ---');
    console.log(`Total Annual Demand (Payable): ₹ ${totalCalculatedPayable.toLocaleString('en-IN')}`);
    console.log(`Total Fees Collected (Paid):    ₹ ${totalCalculatedPaid.toLocaleString('en-IN')}`);
    console.log(`Total Outstanding Dues:         ₹ ${totalCalculatedDue.toLocaleString('en-IN')}`);
    console.log(`Receipts Count:                ${rawData.receipts.length}`);

    // Verify Active Receipts in feesData match total paid
    const activeReceiptsTotal = rawData.receipts
      .filter(r => r.academicYear === year && r.status === 'Active')
      .reduce((sum, r) => sum + Number(r.paidAmount || 0), 0);
    console.log(`Total Active Receipts Value:   ₹ ${activeReceiptsTotal.toLocaleString('en-IN')}`);
    console.log(`Receipts Match Collected:     ${activeReceiptsTotal === totalCalculatedPaid ? 'PERFECT MATCH (PASS)' : 'MISMATCH (FAIL)'}`);

  } catch (err) {
    console.error('Audit failed:', err);
  } finally {
    await prisma.$disconnect();
  }
}

auditFees();
