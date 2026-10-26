import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { prisma } from './prisma.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(__dirname, 'feesData.json');

// Default initial state for Fees Module
const DEFAULT_FEES_STATE = {
  settings: {
    activeAcademicYear: '2026-2027',
    academicYears: ['2026-2027', '2025-2026', '2024-2025'],
    receiptPrefix: 'FEE/2026-27/',
    nextReceiptNumber: 1001,
    lateFineRule: {
      enabled: true,
      type: 'per_day', // 'per_day', 'flat', 'monthly'
      amount: 25, // Rs. 25 per day overdue
      gracePeriodDays: 5,
      maxFineCap: 1500
    },
    schoolDetails: {
      institutionName: 'Qelvora School CRM',
      affiliationNo: 'CBSE/AFF/2026/98210',
      schoolCode: 'QEL-KA-56001',
      address: 'Knowledge Park, Outer Ring Road, Bengaluru, Karnataka - 560103',
      phone: '+91 80 2345 6789',
      email: 'accounts@qelvora.in',
      receiptTerms: '1. Fees once paid are non-refundable unless specified under Security Deposit.\n2. Please retain this receipt for future reference and tax claims under Sec 80C.\n3. Dishonored cheques will attract a statutory processing charge of Rs. 500.'
    },
    paymentModes: [
      { id: 'cash', name: 'Cash', enabled: true },
      { id: 'upi', name: 'UPI / QR Code', enabled: true },
      { id: 'card', name: 'Debit / Credit Card', enabled: true },
      { id: 'cheque', name: 'Cheque / DD', enabled: true },
      { id: 'bank_transfer', name: 'Net Banking / NEFT', enabled: true }
    ]
  },
  heads: [
    {
      id: 'fh-tuition',
      name: 'Tuition Fee',
      shortCode: 'TUIT',
      frequency: 'Monthly',
      mandatory: true,
      appliesTo: 'All',
      reissuable: false,
      refundable: false,
      description: 'Academic tuition, coursework materials, and digital syllabus licenses',
      status: 'Active',
      createdAt: '2026-04-01T00:00:00.000Z'
    },
    {
      id: 'fh-annual',
      name: 'Annual Development Fee',
      shortCode: 'ADF',
      frequency: 'One-time',
      mandatory: true,
      appliesTo: 'All',
      reissuable: false,
      refundable: false,
      description: 'Campus infrastructure, laboratory modernization, and sports facilities maintenance',
      status: 'Active',
      createdAt: '2026-04-01T00:00:00.000Z'
    },
    {
      id: 'fh-lab',
      name: 'Computer & AI Lab Fee',
      shortCode: 'LAB',
      frequency: 'Term-wise',
      mandatory: true,
      appliesTo: 'All',
      reissuable: false,
      refundable: false,
      description: 'Practical computer science labs, high-speed robotics, and STEM workstations',
      status: 'Active',
      createdAt: '2026-04-01T00:00:00.000Z'
    },
    {
      id: 'fh-exam',
      name: 'Examination & Assessment Fee',
      shortCode: 'EXAM',
      frequency: 'Term-wise',
      mandatory: true,
      appliesTo: 'All',
      reissuable: false,
      refundable: false,
      description: 'Periodic tests, question papers, mark-sheets, and CBSE board registration',
      status: 'Active',
      createdAt: '2026-04-01T00:00:00.000Z'
    },
    {
      id: 'fh-transport',
      name: 'School Bus & Transport Fee',
      shortCode: 'BUS',
      frequency: 'Monthly',
      mandatory: false,
      appliesTo: 'All',
      reissuable: false,
      refundable: false,
      description: 'Air-conditioned bus transportation with live GPS route telemetry and attendant',
      status: 'Active',
      createdAt: '2026-04-01T00:00:00.000Z'
    },
    {
      id: 'fh-sports',
      name: 'Sports & Co-curricular Fee',
      shortCode: 'SPRT',
      frequency: 'One-time',
      mandatory: true,
      appliesTo: 'All',
      reissuable: false,
      refundable: false,
      description: 'Athletic coaching, swimming, inter-school tournaments, and cultural events',
      status: 'Active',
      createdAt: '2026-04-01T00:00:00.000Z'
    },
    {
      id: 'fh-idcard',
      name: 'Duplicate Smart ID Card',
      shortCode: 'IDC',
      frequency: 'One-time',
      mandatory: false,
      appliesTo: 'All',
      reissuable: true,
      refundable: false,
      description: 'RFID smart student identity card reissue in case of loss or damage',
      status: 'Active',
      createdAt: '2026-04-01T00:00:00.000Z'
    },
    {
      id: 'fh-caution',
      name: 'Library & Lab Caution Deposit',
      shortCode: 'DEP',
      frequency: 'One-time',
      mandatory: false,
      appliesTo: 'All',
      reissuable: false,
      refundable: true,
      description: 'Refundable security caution deposit returned at the end of schooling',
      status: 'Active',
      createdAt: '2026-04-01T00:00:00.000Z'
    }
  ],
  quotas: [
    {
      id: 'q-general',
      name: 'General',
      description: 'Standard quota for general admissions without concession',
      concessionType: 'none',
      concessionValue: 0,
      status: 'Active'
    },
    {
      id: 'q-rte',
      name: 'RTE (Right to Education)',
      description: 'Government subsidized RTE quota with 100% tuition waiver',
      concessionType: 'percentage',
      concessionValue: 100,
      status: 'Active'
    },
    {
      id: 'q-staff',
      name: 'Staff Ward',
      description: 'Children of teaching and non-teaching academy staff (50% concession)',
      concessionType: 'percentage',
      concessionValue: 50,
      status: 'Active'
    },
    {
      id: 'q-sibling',
      name: 'Sibling Concession',
      description: 'Applicable when 2 or more siblings are concurrently enrolled (15% concession)',
      concessionType: 'percentage',
      concessionValue: 15,
      status: 'Active'
    },
    {
      id: 'q-merit',
      name: 'Merit Scholarship',
      description: 'Merit scholars scoring 95%+ in preceding academic evaluation (25% concession)',
      concessionType: 'percentage',
      concessionValue: 25,
      status: 'Active'
    },
    {
      id: 'q-mgmt',
      name: 'Management Quota',
      description: 'Board of Trustees discretionary admissions quota',
      concessionType: 'none',
      concessionValue: 0,
      status: 'Active'
    }
  ],
  structures: {}, // keyed by `${academicYear}_${standard}_${quotaId}`
  studentQuotas: {}, // keyed by studentId -> { quotaId, assignedAt, assignedBy, notes }
  studentAdjustments: {}, // keyed by `${studentId}_${academicYear}` -> list of adjustments
  receipts: [],
  auditLogs: []
};

// Safe atomic read & write
class FeesStore {
  constructor() {
    this.data = null;
    this.init();
  }

  init() {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        this.data = JSON.parse(raw);
        // Ensure defaults if any key missing
        if (!this.data.settings) this.data.settings = DEFAULT_FEES_STATE.settings;
        if (!this.data.heads) this.data.heads = DEFAULT_FEES_STATE.heads;
        if (!this.data.quotas) this.data.quotas = DEFAULT_FEES_STATE.quotas;
        if (!this.data.structures) this.data.structures = {};
        if (!this.data.studentQuotas) this.data.studentQuotas = {};
        if (!this.data.studentAdjustments) this.data.studentAdjustments = {};
        if (!this.data.receipts) this.data.receipts = [];
        if (!this.data.auditLogs || !Array.isArray(this.data.auditLogs)) this.data.auditLogs = [];
        // Ensure Previous Year Balance is not inside Fee Heads (handled in its own dedicated module)
        if (this.data.heads && this.data.heads.some(h => h.id === 'fh-prev-balance' || h.shortCode === 'PREV_BAL' || (h.name && h.name.toLowerCase() === 'previous year balance'))) {
          this.data.heads = this.data.heads.filter(h => h.id !== 'fh-prev-balance' && h.shortCode !== 'PREV_BAL' && (h.name && h.name.toLowerCase() !== 'previous year balance'));
          this.save();
        }
      } else {
        this.data = JSON.parse(JSON.stringify(DEFAULT_FEES_STATE));
        this.save();
      }
    } catch (err) {
      console.error('FeesStore initialization error:', err);
      this.data = JSON.parse(JSON.stringify(DEFAULT_FEES_STATE));
      this.save();
    }
    if (!this.data.auditLogs || !Array.isArray(this.data.auditLogs)) {
      this.data.auditLogs = [];
    }
    this.ensureDefaultStructures();
    this.reconcileStructures();
  }

  addAuditLog(entry) {
    if (!this.data) return;
    if (!this.data.auditLogs || !Array.isArray(this.data.auditLogs)) {
      this.data.auditLogs = [];
    }
    this.data.auditLogs.push(entry);
  }

  save() {
    try {
      fs.writeFileSync(DATA_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to write feesData.json:', err);
    }
  }

  // Reconcile and synchronize fee structure items with active fee heads master
  reconcileStructures() {
    if (!this.data || !this.data.structures || !this.data.heads) return;
    let changed = false;
    const headsMap = new Map();
    this.data.heads.forEach(h => {
      headsMap.set(h.id, h);
      headsMap.set(h.name.trim().toLowerCase(), h);
    });

    Object.values(this.data.structures).forEach(struct => {
      if (!struct || !Array.isArray(struct.items)) return;
      struct.items.forEach(it => {
        const h = (it.headId && headsMap.get(it.headId)) || (it.headName && headsMap.get(it.headName.trim().toLowerCase()));
        if (h) {
          if (it.headId !== h.id) { it.headId = h.id; changed = true; }
          if (it.headName !== h.name) { it.headName = h.name; changed = true; }
          if (it.frequency !== h.frequency) {
            it.frequency = h.frequency;
            changed = true;
            if (h.frequency !== 'Monthly') {
              it.billedMonths = null;
              if (!it.dueDate) it.dueDate = '2026-05-15';
            } else {
              if (!it.billedMonths || !Array.isArray(it.billedMonths) || it.billedMonths.length === 0) {
                it.billedMonths = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
              }
            }
          }
        }
      });
    });

    if (changed) {
      this.save();
    }
  }

  // Populate default class structures if empty so that the module is instantly live
  ensureDefaultStructures() {
    const year = this.data.settings.activeAcademicYear;
    const standards = ['Nursery', 'LKG', 'UKG', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th'];
    let changed = false;

    standards.forEach(std => {
      const isSenior = ['9th', '10th'].includes(std);
      const isMiddle = ['6th', '7th', '8th'].includes(std);
      const baseTuition = isSenior ? 4800 : isMiddle ? 3800 : 2800;
      const baseAnnual = isSenior ? 14000 : isMiddle ? 11000 : 8500;
      const baseLab = isSenior ? 3200 : isMiddle ? 2200 : 1500;
      const baseExam = isSenior ? 2400 : 1800;
      const baseSports = 2500;
      const baseTransport = 1800;

      this.data.quotas.forEach(q => {
        const key = `${year}_${std}_${q.id}`;
        if (!this.data.structures[key]) {
          changed = true;
          // Apply concession to tuition if applicable
          let tuitAmt = baseTuition;
          if (q.concessionType === 'percentage') {
            tuitAmt = Math.round(baseTuition * (1 - q.concessionValue / 100));
          } else if (q.concessionType === 'fixed') {
            tuitAmt = Math.max(0, baseTuition - q.concessionValue);
          }

          this.data.structures[key] = {
            academicYear: year,
            standard: std,
            quotaId: q.id,
            quotaName: q.name,
            updatedAt: new Date().toISOString(),
            updatedBy: 'System Administrator',
            installmentsEnabled: true,
            installments: [
              { name: 'Term 1 (April)', dueDate: '2026-04-15', percentage: 40 },
              { name: 'Term 2 (August)', dueDate: '2026-08-15', percentage: 35 },
              { name: 'Term 3 (December)', dueDate: '2026-12-15', percentage: 25 }
            ],
            items: [
              {
                headId: 'fh-tuition',
                headName: 'Tuition Fee',
                frequency: 'Monthly',
                amount: tuitAmt,
                billedMonths: ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'],
                dueDate: '2026-04-10',
                enabled: true
              },
              {
                headId: 'fh-annual',
                headName: 'Annual Development Fee',
                frequency: 'One-time',
                amount: baseAnnual,
                dueDate: '2026-05-15',
                enabled: true
              },
              {
                headId: 'fh-lab',
                headName: 'Computer & AI Lab Fee',
                frequency: 'Term-wise',
                amount: baseLab,
                dueDate: '2026-06-15',
                enabled: true
              },
              {
                headId: 'fh-exam',
                headName: 'Examination & Assessment Fee',
                frequency: 'Term-wise',
                amount: baseExam,
                dueDate: '2026-09-15',
                enabled: true
              },
              {
                headId: 'fh-sports',
                headName: 'Sports & Co-curricular Fee',
                frequency: 'One-time',
                amount: baseSports,
                dueDate: '2026-07-15',
                enabled: true
              },
              {
                headId: 'fh-transport',
                headName: 'School Bus & Transport Fee',
                frequency: 'Monthly',
                amount: baseTransport,
                billedMonths: ['Apr', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'], // excludes vacation May
                dueDate: '2026-04-10',
                enabled: false // Optional
              }
            ]
          };
        }
      });
    });

    if (changed) this.save();
  }

  // Generate next sequential unique receipt number
  getNextReceiptNumber(year) {
    const yr = year || this.data.settings.activeAcademicYear;
    const prefix = this.data.settings.receiptPrefix || `FEE/${yr}/`;
    const num = this.data.settings.nextReceiptNumber || 1001;
    this.data.settings.nextReceiptNumber = num + 1;
    this.save();
    return `${prefix}${String(num).padStart(5, '0')}`;
  }

  // Synchronize with database students and attach quota
  async getEnrichedStudents(filter = {}) {
    let dbStudents = [];
    try {
      const where = {};
      if (filter.standard) where.standard = filter.standard;
      if (filter.section) where.section = filter.section;
      dbStudents = await prisma.student.findMany({
        where,
        orderBy: [{ standard: 'asc' }, { section: 'asc' }, { rollNumber: 'asc' }]
      });
    } catch (e) {
      console.warn('Prisma student read warning:', e.message);
    }

    const year = filter.academicYear || this.data.settings.activeAcademicYear;

    return dbStudents.map(s => {
      const quotaRecord = this.data.studentQuotas[s.id] || { quotaId: 'q-general', assignedBy: 'System' };
      const quotaObj = this.data.quotas.find(q => q.id === quotaRecord.quotaId) || this.data.quotas[0];
      const structureKey = `${year}_${s.standard}_${quotaObj.id}`;
      const structure = this.data.structures[structureKey] || this.data.structures[`${year}_${s.standard}_q-general`];

      // Calculate annual demand
      let annualPayable = 0;
      if (structure && structure.items) {
        structure.items.forEach(it => {
          if (!it.enabled) return;
          if (it.frequency === 'Monthly') {
            const monthsCount = it.billedMonths ? it.billedMonths.length : 12;
            annualPayable += (it.amount * monthsCount);
          } else if (it.frequency === 'Term-wise') {
            annualPayable += (it.amount * 3);
          } else {
            annualPayable += it.amount;
          }
        });
      }

      // Check student-specific adjustments
      const adjList = this.data.studentAdjustments[`${s.id}_${year}`] || [];
      let netAdjustments = 0;
      let previousYearBalance = 0;
      adjList.forEach(adj => {
        if (adj.type === 'discount_fixed') netAdjustments -= Number(adj.value || 0);
        else if (adj.type === 'discount_percentage') netAdjustments -= Math.round((annualPayable * Number(adj.value || 0)) / 100);
        else if (adj.type === 'extra_fee') netAdjustments += Number(adj.value || 0);
        else if (adj.type === 'previous_balance' || adj.type === 'previous_year_balance') {
          previousYearBalance += Number(adj.value || 0);
          netAdjustments += Number(adj.value || 0);
        }
        else if (adj.type === 'full_waiver') netAdjustments -= annualPayable;
      });

      const effectivePayable = Math.max(0, annualPayable + netAdjustments);

      // Calculate already paid from receipts
      const studentReceipts = this.data.receipts.filter(r =>
        (r.studentId === s.id || r.studentId === s.studentId || (r.studentIdCode && r.studentIdCode === s.studentId)) &&
        r.academicYear === year &&
        r.status === 'Active'
      );
      const totalPaid = studentReceipts.reduce((acc, r) => acc + Number(r.paidAmount || 0), 0);
      const totalDue = Math.max(0, effectivePayable - totalPaid);

      return {
        ...s,
        quotaId: quotaObj.id,
        quotaName: quotaObj.name,
        quotaConcession: quotaObj.concessionType !== 'none' ? `${quotaObj.concessionValue}%` : 'None',
        previousYearBalance,
        annualPayable: effectivePayable,
        totalPaid,
        totalDue,
        receiptsCount: studentReceipts.length,
        hasReceipts: studentReceipts.length > 0,
        status: totalDue === 0 ? 'Paid' : totalPaid > 0 ? 'Partial' : 'Overdue'
      };
    });
  }

  // Calculate live summary stats for dashboard
  async getDashboardSummary(academicYear) {
    const yr = academicYear || this.data.settings.activeAcademicYear;
    const students = await this.getEnrichedStudents({ academicYear: yr });

    const todayStr = new Date().toISOString().slice(0, 10);
    const thisMonthStr = new Date().toISOString().slice(0, 7);

    const activeReceipts = this.data.receipts.filter(r => r.academicYear === yr && r.status === 'Active');

    let collectedToday = 0;
    let collectedThisMonth = 0;
    let totalCollected = 0;

    activeReceipts.forEach(r => {
      const recDate = r.paymentDate ? r.paymentDate.slice(0, 10) : '';
      const recMonth = r.paymentDate ? r.paymentDate.slice(0, 7) : '';
      const amt = Number(r.paidAmount || 0);
      totalCollected += amt;
      if (recDate === todayStr) collectedToday += amt;
      if (recMonth === thisMonthStr) collectedThisMonth += amt;
    });

    let studentTotalPaid = 0;
    let totalDemand = 0;
    let totalPending = 0;
    let studentsWithDues = 0;

    students.forEach(s => {
      totalDemand += Number(s.annualPayable || 0);
      totalPending += Number(s.totalDue || 0);
      studentTotalPaid += Number(s.totalPaid || 0);
      if (Number(s.totalDue || 0) > 0) studentsWithDues++;
    });

    // Collection and pending rates for enrolled students
    const collectionRate = totalDemand > 0 ? Math.min(100, Math.round((studentTotalPaid / totalDemand) * 100)) : 0;
    const pendingRate = totalDemand > 0 ? Math.min(100, Math.round((totalPending / totalDemand) * 100)) : 0;
    const studentsWithDuesRate = students.length > 0 ? Math.round((studentsWithDues / students.length) * 100) : 0;

    // Overdue classes analysis
    const classBreakdown = {};
    students.forEach(s => {
      const clsKey = `${s.standard}-${s.section}`;
      if (!classBreakdown[clsKey]) {
        classBreakdown[clsKey] = {
          standard: s.standard,
          section: s.section,
          totalStudents: 0,
          totalDue: 0,
          totalPaid: 0,
          studentsWithDue: 0
        };
      }
      classBreakdown[clsKey].totalStudents++;
      classBreakdown[clsKey].totalDue += s.totalDue;
      classBreakdown[clsKey].totalPaid += s.totalPaid;
      if (s.totalDue > 0) classBreakdown[clsKey].studentsWithDue++;
    });

    // Recent 10 receipts
    const recentReceipts = [...activeReceipts]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 10);

    return {
      academicYear: yr,
      collectedToday,
      collectedThisMonth,
      totalCollected,
      studentTotalPaid,
      totalPending,
      totalDemand,
      studentsWithDues,
      studentsWithDuesRate,
      totalStudentsCount: students.length,
      collectionRate,
      pendingRate,
      recentReceipts,
      classBreakdown: Object.values(classBreakdown).sort((a, b) => b.totalDue - a.totalDue)
    };
  }

  // Seed sample receipts if none exist
  async ensureSeedReceipts() {
    if (this.data.receipts.length > 0) return;
    try {
      const students = await this.getEnrichedStudents();
      if (!students || students.length === 0) return;

      const yr = this.data.settings.activeAcademicYear;
      const s1 = students[0];
      const s2 = students[1] || students[0];

      // Receipt 1: Rahul / Diya
      const r1 = {
        id: 'rec-' + Date.now() + '-1',
        receiptNumber: this.getNextReceiptNumber(yr),
        academicYear: yr,
        studentId: s1.id,
        studentName: s1.name,
        rollNumber: s1.rollNumber || '101',
        studentIdCode: s1.studentId,
        standard: s1.standard,
        section: s1.section,
        quotaId: s1.quotaId,
        quotaName: s1.quotaName,
        paymentDate: new Date().toISOString(),
        paymentModes: [
          { mode: 'upi', amount: 9800, reference: 'UPI/REF/984210928/GPay' }
        ],
        primaryMode: 'UPI',
        subTotal: 9800,
        discount: 0,
        lateFine: 0,
        paidAmount: 9800,
        amountInWords: 'Nine Thousand Eight Hundred Rupees Only',
        collectedBy: 'Admin Principal',
        status: 'Active',
        remarks: 'Term 1 Tuition and Annual Development Fee cleared',
        items: [
          { headName: 'Tuition Fee (Apr-May)', amount: 4800, period: 'Apr, May 2026' },
          { headName: 'Annual Development Fee', amount: 5000, period: 'Annual 2026-27' }
        ],
        createdAt: new Date().toISOString()
      };

      // Receipt 2: Cash + Cheque split payment
      const r2 = {
        id: 'rec-' + Date.now() + '-2',
        receiptNumber: this.getNextReceiptNumber(yr),
        academicYear: yr,
        studentId: s2.id,
        studentName: s2.name,
        rollNumber: s2.rollNumber || '202',
        studentIdCode: s2.studentId,
        standard: s2.standard,
        section: s2.section,
        quotaId: s2.quotaId,
        quotaName: s2.quotaName,
        paymentDate: new Date().toISOString(),
        paymentModes: [
          { mode: 'cash', amount: 3000, reference: 'Tendered: Rs 3000' },
          { mode: 'cheque', amount: 4500, reference: 'HDFC Bank - Chq #481902 dt. 05-04-2026' }
        ],
        primaryMode: 'Cash / Cheque',
        subTotal: 7500,
        discount: 0,
        lateFine: 0,
        paidAmount: 7500,
        amountInWords: 'Seven Thousand Five Hundred Rupees Only',
        collectedBy: 'Accountant Staff',
        status: 'Active',
        remarks: 'Admission fees installment received',
        items: [
          { headName: 'Tuition Fee (Apr)', amount: 3800, period: 'Apr 2026' },
          { headName: 'Computer & AI Lab Fee', amount: 2200, period: 'Term 1' },
          { headName: 'Sports Fee', amount: 1500, period: 'Annual 2026-27' }
        ],
        createdAt: new Date().toISOString()
      };

      this.data.receipts.push(r1, r2);
      this.save();
    } catch (e) {
      console.warn('Seed receipts generation exception:', e.message);
    }
  }
}

export const feesStore = new FeesStore();
// Auto-seed receipts once on startup
setTimeout(() => {
  feesStore.ensureSeedReceipts().catch(() => {});
}, 1000);

export default feesStore;
