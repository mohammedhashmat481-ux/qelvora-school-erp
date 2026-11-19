import { Expense } from '../models/Expense.js';
import { ExpenseCategory } from '../models/ExpenseCategory.js';
import prisma from '../db/prisma.js';
import path from 'path';
import fs from 'fs';
import XLSX from 'xlsx';
import PDFDocument from 'pdfkit';

export const DEFAULT_EXPENSE_CATEGORIES = [
  { name: 'Staff Salary', color: '#4F46E5', description: 'Salaries and wages for teaching and non-teaching staff' },
  { name: 'Electricity Bill', color: '#EAB308', description: 'Monthly electricity and power utility bills' },
  { name: 'Water Bill', color: '#06B6D4', description: 'Water supply, tankers, and utility charges' },
  { name: 'Internet Bill', color: '#3B82F6', description: 'Broadband, Wi-Fi, and telecommunications' },
  { name: 'School Rent', color: '#8B5CF6', description: 'Building and campus rental or lease expenses' },
  { name: 'Transport', color: '#F97316', description: 'School bus leases, route charges, and vehicle permits' },
  { name: 'Fuel', color: '#EF4444', description: 'Diesel and petrol for school buses and generator' },
  { name: 'Stationery', color: '#10B981', description: 'Paper, registers, pens, markers, and office supplies' },
  { name: 'Books', color: '#6366F1', description: 'Library books, textbooks, syllabus materials, and journals' },
  { name: 'Classroom Materials', color: '#14B8A6', description: 'Blackboards, charts, science kits, and classroom aids' },
  { name: 'Building Maintenance', color: '#F59E0B', description: 'Painting, masonry, plumbing, and structural upkeep' },
  { name: 'Cleaning', color: '#0D9488', description: 'Sanitization, cleaning supplies, and housekeeping' },
  { name: 'Security', color: '#475569', description: 'Security guards, surveillance, and safety services' },
  { name: 'Food and Canteen', color: '#EC4899', description: 'Midday meals, staff refreshments, and canteen inventory' },
  { name: 'Printing', color: '#64748B', description: 'Exam question papers, circulars, ID cards, and diary printing' },
  { name: 'Software and Technology', color: '#2563EB', description: 'Software subscriptions, computer lab, domain, and IT maintenance' },
  { name: 'Marketing', color: '#D97706', description: 'Banners, pamphlets, digital ads, and admission promotions' },
  { name: 'Events and Functions', color: '#9333EA', description: 'Annual day, sports day, celebrations, and certificates' },
  { name: 'Repairs', color: '#DC2626', description: 'Furniture, electrical repairs, and equipment servicing' },
  { name: 'Other Expenses', color: '#6B7280', description: 'Miscellaneous and daily contingency expenses' }
];

/**
 * Ensures default categories are seeded for the school if none exist.
 */
export async function ensureDefaultCategories(schoolId, user = null) {
  try {
    const count = await ExpenseCategory.countDocuments({ schoolId });
    if (count === 0) {
      const docs = DEFAULT_EXPENSE_CATEGORIES.map(cat => ({
        schoolId,
        name: cat.name,
        color: cat.color,
        description: cat.description,
        isDefault: true,
        isActive: true,
        createdBy: user ? { id: user.id || user._id, name: user.name, role: user.role } : { id: 'system', name: 'System', role: 'system' }
      }));
      await ExpenseCategory.insertMany(docs, { ordered: false });
      console.log(`✅ Seeded ${docs.length} default expense categories for school [${schoolId}]`);
    }
  } catch (err) {
    console.warn(`Category seed notice for [${schoolId}]:`, err.message);
  }
}

/**
 * Generate sequential human-readable expense number per school: EXP-YYYYMM-0001
 */
export async function getNextExpenseNumber(schoolId, date) {
  const d = date ? new Date(date) : new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const prefix = `EXP-${year}${month}`;

  // Find latest expense with this prefix
  const latest = await Expense.findOne({
    schoolId,
    expenseNumber: { $regex: `^${prefix}-` }
  }).sort({ expenseNumber: -1 }).select('expenseNumber');

  let seq = 1;
  if (latest && latest.expenseNumber) {
    const parts = latest.expenseNumber.split('-');
    if (parts.length === 3) {
      const parsedSeq = parseInt(parts[2], 10);
      if (!isNaN(parsedSeq)) seq = parsedSeq + 1;
    }
  }

  return `${prefix}-${String(seq).padStart(4, '0')}`;
}

/**
 * Calculate Indian Financial Year boundaries (April 1 to March 31)
 */
export function getFinancialYearRange(currentDate = new Date()) {
  const d = new Date(currentDate);
  const currentYear = d.getFullYear();
  const currentMonth = d.getMonth(); // 0-indexed (0 = Jan, 3 = April)

  let startYear = currentYear;
  let endYear = currentYear + 1;

  if (currentMonth < 3) { // Jan, Feb, Mar belong to previous FY start
    startYear = currentYear - 1;
    endYear = currentYear;
  }

  const start = new Date(Date.UTC(startYear, 3, 1, 0, 0, 0)); // April 1st 00:00:00 UTC
  const end = new Date(Date.UTC(endYear, 2, 31, 23, 59, 59, 999)); // March 31st 23:59:59.999 UTC
  const label = `FY ${startYear}-${endYear.toString().slice(-2)}`;

  return { start, end, label, startYear, endYear };
}

/**
 * Calculate Week Range (Monday to Sunday)
 */
export function getWeekRange(dateInput = new Date()) {
  const d = new Date(dateInput);
  const day = d.getDay();
  // In JS: 0=Sunday, 1=Monday...
  const diffToMonday = day === 0 ? -6 : 1 - day;
  
  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return { start: monday, end: sunday };
}

/**
 * Calculate Month Range
 */
export function getMonthRange(year, month) { // month: 1-12
  const y = parseInt(year, 10);
  const m = parseInt(month, 10) - 1;
  const start = new Date(Date.UTC(y, m, 1, 0, 0, 0));
  const end = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999));
  return { start, end };
}

/**
 * Retrieve School Profile / Branding
 */
export async function getSchoolBranding() {
  try {
    const settings = await prisma.schoolSettings.findFirst();
    return {
      schoolName: settings?.schoolName || 'Qelvora School CRM',
      schoolLogo: settings?.schoolLogo || '',
      logoSubtext: settings?.logoSubtext || 'Empowering Educational Excellence',
      schoolAddress: settings?.address || settings?.city || '',
      schoolPhone: settings?.phone || '',
      schoolEmail: settings?.email || ''
    };
  } catch (_) {
    return {
      schoolName: 'Qelvora School CRM',
      schoolLogo: '',
      logoSubtext: 'Empowering Educational Excellence'
    };
  }
}
