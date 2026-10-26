import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { prisma } from './prisma.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(__dirname, 'previousBalanceData.json');

const INITIAL_BALANCES = [
  {
    id: 'pb-1001',
    studentId: 'std-rahul-01',
    studentName: 'Rahul Verma',
    rollNumber: '1001',
    admissionNumber: 'ADM-2023-089',
    standard: '10th',
    section: 'A',
    academicYear: '2026–2027',
    previousYear: '2025–2026',
    openingBalance: 12500,
    paidAmount: 4500,
    outstanding: 8000,
    status: 'Partial',
    remarks: 'Previous year Term 2 tuition & exam fees balance',
    payments: [
      {
        paymentId: 'RCP-PB-901',
        amount: 4500,
        paymentDate: '2026-06-10T11:30:00.000Z',
        paymentMode: 'UPI',
        transactionRef: 'UPI/29384712093',
        receiptNumber: 'PB-2026-001',
        collectedBy: 'Accounts Office',
        remarks: 'Paid ₹4,500 via PhonePe'
      }
    ],
    createdAt: '2026-04-01T09:00:00.000Z',
    updatedAt: '2026-06-10T11:30:00.000Z'
  },
  {
    id: 'pb-1002',
    studentId: 'std-ananya-02',
    studentName: 'Ananya Sharma',
    rollNumber: '901',
    admissionNumber: 'ADM-2024-112',
    standard: '9th',
    section: 'A',
    academicYear: '2026–2027',
    previousYear: '2025–2026',
    openingBalance: 6800,
    paidAmount: 0,
    outstanding: 6800,
    status: 'Pending',
    remarks: 'Outstanding 8th standard annual development charges',
    payments: [],
    createdAt: '2026-04-01T09:00:00.000Z',
    updatedAt: '2026-04-01T09:00:00.000Z'
  },
  {
    id: 'pb-1003',
    studentId: 'std-vikram-03',
    studentName: 'Vikram Singh',
    rollNumber: '802',
    admissionNumber: 'ADM-2024-145',
    standard: '8th',
    section: 'A',
    academicYear: '2026–2027',
    previousYear: '2025–2026',
    openingBalance: 5000,
    paidAmount: 5000,
    outstanding: 0,
    status: 'Paid',
    remarks: '7th standard library and sports dues (Fully Cleared)',
    payments: [
      {
        paymentId: 'RCP-PB-902',
        amount: 5000,
        paymentDate: '2026-05-18T14:15:00.000Z',
        paymentMode: 'Cash',
        transactionRef: 'CASH-REC-108',
        receiptNumber: 'PB-2026-002',
        collectedBy: 'Accounts Office',
        remarks: 'Full settlement in cash'
      }
    ],
    createdAt: '2026-04-01T09:00:00.000Z',
    updatedAt: '2026-05-18T14:15:00.000Z'
  }
];

class PreviousBalanceStore {
  constructor() {
    this.records = [];
    this.init();
  }

  init() {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        this.records = JSON.parse(raw);
        if (!Array.isArray(this.records)) {
          this.records = INITIAL_BALANCES;
          this.save();
        }
      } else {
        this.records = INITIAL_BALANCES;
        this.save();
      }
    } catch (err) {
      console.error('PreviousBalanceStore init error:', err);
      this.records = INITIAL_BALANCES;
      this.save();
    }
  }

  save() {
    try {
      fs.writeFileSync(DATA_FILE, JSON.stringify(this.records, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to write previousBalanceData.json:', err);
    }
  }

  async getAll({ standard, section, status, search, academicYear } = {}) {
    let list = [...this.records];

    if (academicYear && academicYear !== 'all') {
      list = list.filter(r => r.academicYear === academicYear);
    }

    if (standard && standard !== 'all') {
      list = list.filter(r => r.standard === standard);
    }

    if (section && section !== 'all') {
      list = list.filter(r => r.section === section);
    }

    if (status && status !== 'all') {
      list = list.filter(r => r.status.toLowerCase() === status.toLowerCase());
    }

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(r =>
        (r.studentName && r.studentName.toLowerCase().includes(q)) ||
        (r.rollNumber && r.rollNumber.toLowerCase().includes(q)) ||
        (r.admissionNumber && r.admissionNumber.toLowerCase().includes(q)) ||
        (r.remarks && r.remarks.toLowerCase().includes(q))
      );
    }

    const statusOrder = { Pending: 1, Partial: 2, Paid: 3, Waived: 4 };
    list.sort((a, b) => {
      const orderA = statusOrder[a.status] || 99;
      const orderB = statusOrder[b.status] || 99;
      if (orderA !== orderB) return orderA - orderB;
      return Number(b.outstanding || 0) - Number(a.outstanding || 0);
    });

    return list;
  }

  async getSummary(academicYear = '2026–2027') {
    let list = this.records;
    if (academicYear && academicYear !== 'all') {
      list = list.filter(r => r.academicYear === academicYear);
    }

    let totalOpening = 0;
    let totalCollected = 0;
    let totalOutstanding = 0;
    let countPending = 0;
    let countPartial = 0;
    let countPaid = 0;

    list.forEach(r => {
      const opening = Number(r.openingBalance || 0);
      const paid = Number(r.paidAmount || 0);
      const out = Number(r.outstanding || 0);

      totalOpening += opening;
      totalCollected += paid;
      totalOutstanding += out;

      if (r.status === 'Paid') countPaid++;
      else if (r.status === 'Partial') countPartial++;
      else countPending++;
    });

    return {
      totalStudents: list.length,
      totalOpening,
      totalCollected,
      totalOutstanding,
      countPending,
      countPartial,
      countPaid,
      recoveryRate: totalOpening > 0 ? Math.round((totalCollected / totalOpening) * 100) : 0
    };
  }

  async addRecord(entry) {
    const id = `pb-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const opening = Number(entry.openingBalance || 0);
    const paid = Number(entry.paidAmount || 0);
    const outstanding = Math.max(0, opening - paid);
    const status = outstanding === 0 ? 'Paid' : paid > 0 ? 'Partial' : 'Pending';

    const newRec = {
      id,
      studentId: entry.studentId || `std-${Date.now()}`,
      studentName: entry.studentName || 'Student',
      rollNumber: entry.rollNumber || '',
      admissionNumber: entry.admissionNumber || '',
      standard: entry.standard || '10th',
      section: entry.section || 'A',
      academicYear: entry.academicYear || '2026–2027',
      previousYear: entry.previousYear || '2025–2026',
      openingBalance: opening,
      paidAmount: paid,
      outstanding,
      status,
      remarks: entry.remarks || 'Carried forward previous balance',
      payments: entry.payments || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.records.unshift(newRec);
    this.save();
    return newRec;
  }

  async updateRecord(id, updates) {
    const idx = this.records.findIndex(r => r.id === id);
    if (idx === -1) throw new Error('Record not found');

    const rec = this.records[idx];
    if (updates.openingBalance !== undefined) {
      rec.openingBalance = Number(updates.openingBalance);
    }
    if (updates.remarks !== undefined) {
      rec.remarks = updates.remarks;
    }
    if (updates.previousYear !== undefined) {
      rec.previousYear = updates.previousYear;
    }
    if (updates.academicYear !== undefined) {
      rec.academicYear = updates.academicYear;
    }

    rec.outstanding = Math.max(0, rec.openingBalance - Number(rec.paidAmount || 0));
    rec.status = rec.outstanding === 0 ? 'Paid' : Number(rec.paidAmount || 0) > 0 ? 'Partial' : 'Pending';
    rec.updatedAt = new Date().toISOString();

    this.records[idx] = rec;
    this.save();
    return rec;
  }

  async recordPayment(id, { amount, paymentMode, transactionRef, remarks, collectedBy }) {
    const idx = this.records.findIndex(r => r.id === id);
    if (idx === -1) throw new Error('Record not found');

    const rec = this.records[idx];
    const payAmt = Number(amount || 0);
    if (payAmt <= 0) throw new Error('Payment amount must be greater than 0');

    const receiptNumber = `PB-REC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const paymentEntry = {
      paymentId: `RCP-PB-${Date.now()}`,
      amount: payAmt,
      paymentDate: new Date().toISOString(),
      paymentMode: paymentMode || 'Cash',
      transactionRef: transactionRef || '',
      receiptNumber,
      collectedBy: collectedBy || 'Accounts Staff',
      remarks: remarks || ''
    };

    if (!Array.isArray(rec.payments)) rec.payments = [];
    rec.payments.unshift(paymentEntry);

    rec.paidAmount = Number(rec.paidAmount || 0) + payAmt;
    rec.outstanding = Math.max(0, Number(rec.openingBalance || 0) - rec.paidAmount);
    rec.status = rec.outstanding === 0 ? 'Paid' : 'Partial';
    rec.updatedAt = new Date().toISOString();

    this.records[idx] = rec;
    this.save();

    return { record: rec, receipt: paymentEntry };
  }

  async deleteRecord(id) {
    const idx = this.records.findIndex(r => r.id === id);
    if (idx === -1) throw new Error('Record not found');
    const removed = this.records.splice(idx, 1)[0];
    this.save();
    return removed;
  }
}

export const previousBalanceStore = new PreviousBalanceStore();
export default previousBalanceStore;
