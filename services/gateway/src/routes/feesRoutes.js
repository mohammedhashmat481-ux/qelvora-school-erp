import express from 'express';
import { feesStore } from '../db/feesStore.js';
import { prisma } from '../db/prisma.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Helper to convert number to words for Indian Rupee receipts
function numberToIndianWords(num) {
  if (!num || isNaN(num)) return 'Zero Rupees Only';
  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const n = ('000000000' + Math.floor(num)).substr(-9);
  const crore = parseInt(n.substr(0, 2), 10);
  const lakh = parseInt(n.substr(2, 2), 10);
  const thousand = parseInt(n.substr(4, 2), 10);
  const hundred = parseInt(n.substr(6, 1), 10);
  const rest = parseInt(n.substr(7, 2), 10);

  let str = '';
  if (crore > 0) str += (crore < 20 ? a[crore] : b[Math.floor(crore / 10)] + ' ' + a[crore % 10]) + 'Crore ';
  if (lakh > 0) str += (lakh < 20 ? a[lakh] : b[Math.floor(lakh / 10)] + ' ' + a[lakh % 10]) + 'Lakh ';
  if (thousand > 0) str += (thousand < 20 ? a[thousand] : b[Math.floor(thousand / 10)] + ' ' + a[thousand % 10]) + 'Thousand ';
  if (hundred > 0) str += a[hundred] + 'Hundred ';
  if (rest > 0) str += (rest < 20 ? a[rest] : b[Math.floor(rest / 10)] + ' ' + a[rest % 10]);

  return (str.trim() || 'Zero') + ' Rupees Only';
}

// -------------------------------------------------------------
// 1. DASHBOARD & OVERVIEW
// -------------------------------------------------------------
router.get(['/dashboard', '/summary'], protect, async (req, res) => {
  try {
    const year = req.query.academicYear || feesStore.data.settings.activeAcademicYear;
    const summary = await feesStore.getDashboardSummary(year);
    res.json({ success: true, data: summary });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// -------------------------------------------------------------
// 2. FEE HEADS
// -------------------------------------------------------------
router.get('/heads', protect, (req, res) => {
  try {
    res.json({ success: true, data: feesStore.data.heads });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/heads', protect, (req, res) => {
  try {
    const { name, shortCode, frequency, mandatory, appliesTo, reissuable, refundable, description, status } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Fee name is mandatory' });
    }

    const cleanName = name.trim();
    const exists = feesStore.data.heads.some(h => h.name.trim().toLowerCase() === cleanName.toLowerCase());
    if (exists) {
      return res.status(400).json({ success: false, message: `Fee head "${cleanName}" already exists (case-insensitive)` });
    }

    const newHead = {
      id: 'fh-' + Date.now(),
      name: cleanName,
      shortCode: (shortCode || '').trim().toUpperCase(),
      frequency: frequency || 'One-time',
      mandatory: Boolean(mandatory),
      appliesTo: appliesTo || 'All',
      reissuable: Boolean(reissuable),
      refundable: Boolean(refundable),
      description: (description || '').trim(),
      status: status || 'Active',
      createdAt: new Date().toISOString()
    };

    feesStore.data.heads.push(newHead);

    // Sync newly created head into any existing structures in memory
    if (feesStore.data.structures) {
      Object.values(feesStore.data.structures).forEach(struct => {
        if (struct && Array.isArray(struct.items)) {
          const has = struct.items.some(it => it.headId === newHead.id || it.headName?.trim().toLowerCase() === newHead.name.trim().toLowerCase());
          if (!has) {
            struct.items.push({
              headId: newHead.id,
              headName: newHead.name,
              frequency: newHead.frequency,
              amount: 0,
              billedMonths: newHead.frequency === 'Monthly' ? ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'] : null,
              dueDate: newHead.frequency === 'Monthly' ? '' : '2026-05-15',
              enabled: Boolean(newHead.mandatory)
            });
          }
        }
      });
    }

    feesStore.save();

    res.json({ success: true, data: newHead, message: 'Fee head created successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/heads/:id', protect, (req, res) => {
  try {
    const head = feesStore.data.heads.find(h => h.id === req.params.id);
    if (!head) return res.status(404).json({ success: false, message: 'Fee head not found' });

    const oldName = head.name;
    const { name, shortCode, frequency, mandatory, appliesTo, reissuable, refundable, description, status } = req.body;
    if (name && name.trim().toLowerCase() !== head.name.trim().toLowerCase()) {
      const exists = feesStore.data.heads.some(h => h.id !== head.id && h.name.trim().toLowerCase() === name.trim().toLowerCase());
      if (exists) return res.status(400).json({ success: false, message: `Fee head "${name}" already exists` });
      head.name = name.trim();
    }

    if (shortCode !== undefined) head.shortCode = String(shortCode).trim().toUpperCase();
    if (frequency !== undefined) head.frequency = frequency;
    if (mandatory !== undefined) head.mandatory = Boolean(mandatory);
    if (appliesTo !== undefined) head.appliesTo = appliesTo;
    if (reissuable !== undefined) head.reissuable = Boolean(reissuable);
    if (refundable !== undefined) head.refundable = Boolean(refundable);
    if (description !== undefined) head.description = String(description).trim();
    if (status !== undefined) head.status = status;

    // Propagate updated head details and frequency across all existing structures
    if (feesStore.data.structures) {
      Object.values(feesStore.data.structures).forEach(struct => {
        if (struct && Array.isArray(struct.items)) {
          struct.items.forEach(it => {
            if (it.headId === head.id || (oldName && it.headName?.trim().toLowerCase() === oldName.trim().toLowerCase())) {
              it.headId = head.id;
              it.headName = head.name;
              if (frequency !== undefined) {
                it.frequency = head.frequency;
                if (head.frequency !== 'Monthly') {
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
        }
      });
    }

    feesStore.save();
    res.json({ success: true, data: head, message: 'Fee head updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/heads/:id', protect, (req, res) => {
  try {
    const headIndex = feesStore.data.heads.findIndex(h => h.id === req.params.id);
    if (headIndex === -1) return res.status(404).json({ success: false, message: 'Fee head not found' });
    const head = feesStore.data.heads[headIndex];

    // Check if head was used in any collected receipt
    const isUsedInReceipts = feesStore.data.receipts.some(r =>
      r.items && r.items.some(it => (it.headName && it.headName.toLowerCase().includes(head.name.toLowerCase())) || it.headId === head.id)
    );

    if (isUsedInReceipts) {
      return res.status(400).json({
        success: false,
        message: `Fee Head "${head.name}" cannot be deleted because it has already been used in issued receipts. Please deactivate it instead so audit history is preserved.`
      });
    }

    feesStore.data.heads.splice(headIndex, 1);

    // Remove deleted head from all structures
    if (feesStore.data.structures) {
      Object.values(feesStore.data.structures).forEach(struct => {
        if (struct && Array.isArray(struct.items)) {
          struct.items = struct.items.filter(it => it.headId !== head.id && it.headName?.trim().toLowerCase() !== head.name.trim().toLowerCase());
        }
      });
    }

    feesStore.save();
    res.json({ success: true, message: `Fee head "${head.name}" deleted successfully` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.patch('/heads/:id/toggle', protect, (req, res) => {
  try {
    const head = feesStore.data.heads.find(h => h.id === req.params.id);
    if (!head) return res.status(404).json({ success: false, message: 'Fee head not found' });
    head.status = head.status === 'Active' ? 'Inactive' : 'Active';
    feesStore.save();
    res.json({ success: true, data: head, message: `Fee head marked as ${head.status}` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// -------------------------------------------------------------
// 3. QUOTA MASTER (Student Categories)
// -------------------------------------------------------------
router.get('/quotas', protect, async (req, res) => {
  try {
    const students = await feesStore.getEnrichedStudents();
    const quotasWithCounts = feesStore.data.quotas.map(q => {
      const count = students.filter(s => s.quotaId === q.id).length;
      return { ...q, studentCount: count };
    });
    res.json({ success: true, data: quotasWithCounts });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/quotas', protect, (req, res) => {
  try {
    const { name, description, concessionType, concessionValue, status } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ success: false, message: 'Quota name is mandatory' });

    const cleanName = name.trim();
    if (feesStore.data.quotas.some(q => q.name.toLowerCase() === cleanName.toLowerCase())) {
      return res.status(400).json({ success: false, message: `Quota "${cleanName}" already exists` });
    }

    const newQuota = {
      id: 'q-' + Date.now(),
      name: cleanName,
      description: (description || '').trim(),
      concessionType: concessionType || 'none',
      concessionValue: Number(concessionValue || 0),
      status: status || 'Active'
    };

    feesStore.data.quotas.push(newQuota);
    feesStore.save();
    res.json({ success: true, data: newQuota, message: 'Quota created successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/quotas/:id', protect, (req, res) => {
  try {
    const quota = feesStore.data.quotas.find(q => q.id === req.params.id);
    if (!quota) return res.status(404).json({ success: false, message: 'Quota not found' });

    const { name, description, concessionType, concessionValue, status } = req.body;
    if (name && name.trim().toLowerCase() !== quota.name.toLowerCase()) {
      if (feesStore.data.quotas.some(q => q.id !== quota.id && q.name.toLowerCase() === name.trim().toLowerCase())) {
        return res.status(400).json({ success: false, message: `Quota name "${name}" already in use` });
      }
      quota.name = name.trim();
    }

    if (description !== undefined) quota.description = String(description).trim();
    if (concessionType !== undefined) quota.concessionType = concessionType;
    if (concessionValue !== undefined) quota.concessionValue = Number(concessionValue || 0);
    if (status !== undefined) quota.status = status;

    feesStore.save();
    res.json({ success: true, data: quota, message: 'Quota updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/quotas/:id', protect, async (req, res) => {
  try {
    const quota = feesStore.data.quotas.find(q => q.id === req.params.id);
    if (!quota) return res.status(404).json({ success: false, message: 'Quota not found' });

    const students = await feesStore.getEnrichedStudents();
    const assignedCount = students.filter(s => s.quotaId === quota.id).length;
    if (assignedCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete quota "${quota.name}" because it is currently assigned to ${assignedCount} student(s). Reassign them first.`
      });
    }

    feesStore.data.quotas = feesStore.data.quotas.filter(q => q.id !== req.params.id);
    feesStore.save();
    res.json({ success: true, message: `Quota "${quota.name}" deleted successfully` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// -------------------------------------------------------------
// 4. FEE STRUCTURE (Class + Quota Matrix Grid)
// -------------------------------------------------------------
router.get('/structures', protect, (req, res) => {
  try {
    const year = req.query.academicYear || feesStore.data.settings.activeAcademicYear;
    const standard = req.query.standard || '10th';
    const quotaId = req.query.quotaId || 'q-general';
    const studentId = req.query.studentId;

    const studentKey = studentId && studentId !== 'all' ? `${year}_${standard}_${studentId}_${quotaId}` : null;
    const defaultKey = `${year}_${standard}_${quotaId}`;

    let structure = studentKey ? feesStore.data.structures[studentKey] : null;
    if (!structure) {
      structure = feesStore.data.structures[defaultKey];
    }

    // If structure doesn't exist yet, synthesize one from active heads
    if (!structure) {
      const quota = feesStore.data.quotas.find(q => q.id === quotaId) || feesStore.data.quotas[0];
      structure = {
        academicYear: year,
        standard,
        quotaId,
        quotaName: quota?.name || 'General',
        updatedAt: new Date().toISOString(),
        updatedBy: req.user?.name || 'Admin',
        installmentsEnabled: true,
        installments: [
          { name: 'Term 1', dueDate: '2026-04-15', percentage: 40 },
          { name: 'Term 2', dueDate: '2026-08-15', percentage: 35 },
          { name: 'Term 3', dueDate: '2026-12-15', percentage: 25 }
        ],
        items: feesStore.data.heads.map(h => ({
          headId: h.id,
          headName: h.name,
          frequency: h.frequency,
          amount: h.name.includes('Tuition') ? 4000 : h.name.includes('Transport') || h.name.includes('Bus') ? 2500 : 1500,
          billedMonths: h.frequency === 'Monthly' ? ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'] : null,
          dueDate: '2026-04-10',
          enabled: h.mandatory
        }))
      };
      feesStore.data.structures[defaultKey] = structure;
      feesStore.save();
    }

    // Sync all active dynamic fee heads into the structure items
    if (structure && structure.items && feesStore.data.heads) {
      let structChanged = false;
      const headsMap = new Map();
      feesStore.data.heads.forEach(h => {
        headsMap.set(h.id, h);
        headsMap.set(h.name.trim().toLowerCase(), h);
      });

      // 1. Synchronize existing items with active master heads
      structure.items.forEach(it => {
        const h = (it.headId && headsMap.get(it.headId)) || (it.headName && headsMap.get(it.headName.trim().toLowerCase()));
        if (h) {
          if (it.headId !== h.id) {
            it.headId = h.id;
            structChanged = true;
          }
          if (it.headName !== h.name) {
            it.headName = h.name;
            structChanged = true;
          }
          if (it.frequency !== h.frequency) {
            it.frequency = h.frequency;
            structChanged = true;
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

      // 2. Add any active master heads not yet in structure items
      feesStore.data.heads.forEach(h => {
        const hasHead = structure.items.some(it => it.headId === h.id || it.headName?.trim().toLowerCase() === h.name.trim().toLowerCase());
        if (!hasHead) {
          structChanged = true;
          structure.items.push({
            headId: h.id,
            headName: h.name,
            frequency: h.frequency || 'One-time',
            amount: 0,
            billedMonths: h.frequency === 'Monthly' ? ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'] : null,
            dueDate: h.frequency === 'Monthly' ? '' : '2026-05-15',
            enabled: Boolean(h.mandatory)
          });
        }
      });

      if (structChanged) {
        feesStore.save();
      }
    }

    res.json({ success: true, data: structure });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/structures/bulk-save', protect, (req, res) => {
  try {
    const { academicYear, standard, section, studentId, studentName, travellingDistance, quotaId, items, installments, installmentsEnabled } = req.body;
    if (!academicYear || !standard || !quotaId || !items) {
      return res.status(400).json({ success: false, message: 'Missing required structure fields' });
    }

    // Ensure item frequency, headId, and headName strictly adhere to Fee Heads Master
    if (Array.isArray(items) && feesStore.data.heads) {
      items.forEach(it => {
        const h = feesStore.data.heads.find(head => head.id === it.headId || head.name?.trim().toLowerCase() === it.headName?.trim().toLowerCase());
        if (h) {
          it.headId = h.id;
          it.headName = h.name;
          it.frequency = h.frequency;
          if (it.frequency !== 'Monthly') {
            it.billedMonths = null;
            if (!it.dueDate) it.dueDate = '2026-05-15';
          } else {
            if (!it.billedMonths || !Array.isArray(it.billedMonths) || it.billedMonths.length === 0) {
              it.billedMonths = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
            }
          }
        }
      });
    }

    // Inline validation: amounts must be non-negative, due date cannot be blank for enabled heads
    for (const item of items) {
      if (item.enabled) {
        if (Number(item.amount) < 0) {
          return res.status(400).json({ success: false, message: `Amount for "${item.headName}" cannot be negative` });
        }
        if (!item.dueDate && item.frequency !== 'Monthly') {
          return res.status(400).json({ success: false, message: `Due date cannot be blank for enabled head "${item.headName}"` });
        }
      }
    }

    const isStudentSpecific = Boolean(studentId && studentId !== 'all');
    const key = isStudentSpecific ? `${academicYear}_${standard}_${studentId}_${quotaId}` : `${academicYear}_${standard}_${quotaId}`;
    const quota = feesStore.data.quotas.find(q => q.id === quotaId);

    feesStore.data.structures[key] = {
      academicYear,
      standard,
      ...(section && { section }),
      ...(isStudentSpecific && { studentId, studentName, travellingDistance }),
      quotaId,
      quotaName: quota?.name || 'General',
      updatedAt: new Date().toISOString(),
      updatedBy: req.user?.name || 'Admin',
      installmentsEnabled: Boolean(installmentsEnabled),
      installments: installments || [],
      items
    };

    // Audit log
    feesStore.addAuditLog({
      id: 'log-' + Date.now(),
      action: 'UPDATE_FEE_STRUCTURE',
      details: isStudentSpecific 
        ? `Updated Student Fee Structure for ${studentName || studentId} (Class ${standard}, ${travellingDistance ? travellingDistance + ' distance' : ''})` 
        : `Updated Fee Structure for ${standard} (${quota?.name || quotaId}) in ${academicYear}`,
      user: req.user?.name || 'Admin',
      timestamp: new Date().toISOString()
    });

    feesStore.save();
    res.json({ success: true, data: feesStore.data.structures[key], message: 'Fee structure saved successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/structures/copy-class', protect, (req, res) => {
  try {
    const { academicYear, sourceStandard, targetStandards, quotaId } = req.body;
    if (!sourceStandard || !targetStandards || !Array.isArray(targetStandards)) {
      return res.status(400).json({ success: false, message: 'Invalid copy parameters' });
    }

    const srcKey = `${academicYear}_${sourceStandard}_${quotaId}`;
    const sourceStruct = feesStore.data.structures[srcKey];
    if (!sourceStruct) {
      return res.status(404).json({ success: false, message: 'Source structure not found' });
    }

    let copiedCount = 0;
    targetStandards.forEach(tgtStd => {
      const tgtKey = `${academicYear}_${tgtStd}_${quotaId}`;
      feesStore.data.structures[tgtKey] = {
        ...JSON.parse(JSON.stringify(sourceStruct)),
        standard: tgtStd,
        updatedAt: new Date().toISOString(),
        updatedBy: req.user?.name || 'Admin'
      };
      copiedCount++;
    });

    feesStore.save();
    res.json({ success: true, message: `Structure copied to ${copiedCount} class(es) successfully` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/structures/copy-quota', protect, (req, res) => {
  try {
    const { academicYear, standard, sourceQuotaId, targetQuotaId } = req.body;
    const srcKey = `${academicYear}_${standard}_${sourceQuotaId}`;
    const sourceStruct = feesStore.data.structures[srcKey];
    if (!sourceStruct) return res.status(404).json({ success: false, message: 'Source quota structure not found' });

    const targetQuota = feesStore.data.quotas.find(q => q.id === targetQuotaId);
    const tgtKey = `${academicYear}_${standard}_${targetQuotaId}`;

    feesStore.data.structures[tgtKey] = {
      ...JSON.parse(JSON.stringify(sourceStruct)),
      quotaId: targetQuotaId,
      quotaName: targetQuota?.name || 'Target Quota',
      updatedAt: new Date().toISOString(),
      updatedBy: req.user?.name || 'Admin'
    };

    feesStore.save();
    res.json({ success: true, message: `Structure copied from ${sourceStruct.quotaName} to ${targetQuota?.name}` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/structures/copy-year', protect, (req, res) => {
  try {
    const { fromYear, toYear } = req.body;
    if (!fromYear || !toYear) return res.status(400).json({ success: false, message: 'Please specify fromYear and toYear' });

    let count = 0;
    Object.keys(feesStore.data.structures).forEach(k => {
      if (k.startsWith(`${fromYear}_`)) {
        const struct = feesStore.data.structures[k];
        const newKey = `${toYear}_${struct.standard}_${struct.quotaId}`;
        feesStore.data.structures[newKey] = {
          ...JSON.parse(JSON.stringify(struct)),
          academicYear: toYear,
          updatedAt: new Date().toISOString(),
          updatedBy: req.user?.name || 'Admin'
        };
        count++;
      }
    });

    feesStore.save();
    res.json({ success: true, message: `Successfully cloned ${count} fee structures from ${fromYear} to ${toYear}` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// -------------------------------------------------------------
// 5. ASSIGN QUOTA
// -------------------------------------------------------------
router.get('/assign-quota/students', protect, async (req, res) => {
  try {
    const { standard, section, academicYear } = req.query;
    const students = await feesStore.getEnrichedStudents({ standard, section, academicYear });
    res.json({ success: true, data: students });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/assign-quota/bulk-assign', protect, (req, res) => {
  try {
    const { studentIds, targetQuotaId, notes, academicYear } = req.body;
    if (!studentIds || !Array.isArray(studentIds) || !targetQuotaId) {
      return res.status(400).json({ success: false, message: 'Invalid assignment parameters' });
    }

    const quota = feesStore.data.quotas.find(q => q.id === targetQuotaId);
    if (!quota) return res.status(404).json({ success: false, message: 'Target quota not found' });

    let updatedCount = 0;
    studentIds.forEach(sId => {
      feesStore.data.studentQuotas[sId] = {
        quotaId: targetQuotaId,
        assignedAt: new Date().toISOString(),
        assignedBy: req.user?.name || 'Admin',
        notes: notes || 'Bulk assigned via Quota Master'
      };
      updatedCount++;
    });

    // Record bulk assign history
    feesStore.addAuditLog({
      id: 'log-' + Date.now(),
      action: 'BULK_ASSIGN_QUOTA',
      details: `Assigned ${updatedCount} student(s) to quota "${quota.name}" (${notes || 'No notes'})`,
      user: req.user?.name || 'Admin',
      timestamp: new Date().toISOString()
    });

    feesStore.save();
    res.json({
      success: true,
      message: `Successfully assigned ${updatedCount} student(s) to "${quota.name}" quota`,
      updatedCount
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/assign-quota/history', protect, (req, res) => {
  try {
    const logs = Array.isArray(feesStore.data.auditLogs) ? feesStore.data.auditLogs : [];
    const history = logs.filter(l => l.action === 'BULK_ASSIGN_QUOTA' || l.action === 'STUDENT_ADJUSTMENT');
    res.json({ success: true, data: history.reverse() });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// -------------------------------------------------------------
// 6. STUDENT FEE ADJUSTMENT
// -------------------------------------------------------------
router.get('/adjustments/:studentId', protect, async (req, res) => {
  try {
    const sId = req.params.studentId;
    const year = req.query.academicYear || feesStore.data.settings.activeAcademicYear;

    const students = await feesStore.getEnrichedStudents({ academicYear: year });
    const student = students.find(s => s.id === sId || s.studentId === sId);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    const key = `${student.id}_${year}`;
    const adjustments = feesStore.data.studentAdjustments[key] || [];

    // Get base class structure
    const structKey = `${year}_${student.standard}_${student.quotaId}`;
    const baseStructure = feesStore.data.structures[structKey] || feesStore.data.structures[`${year}_${student.standard}_q-general`];
    // Compute past receipts
    const studentReceipts = feesStore.data.receipts.filter(r =>
      (r.studentId === student.id || r.studentId === student.studentId || (r.studentIdCode && r.studentIdCode === student.studentId)) &&
      r.academicYear === year &&
      r.status === 'Active'
    );

    res.json({
      success: true,
      data: {
        student,
        baseStructure,
        adjustments,
        studentReceipts,
        auditLogs: (Array.isArray(feesStore.data.auditLogs) ? feesStore.data.auditLogs : []).filter(l => l.studentId === student.id).reverse()
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/adjustments/:studentId', protect, async (req, res) => {
  try {
    const sId = req.params.studentId;
    const { academicYear, adjustmentType, headName, amountOrValue, reasonType, reasonText, approverName, newQuotaId } = req.body;

    const yr = academicYear || feesStore.data.settings.activeAcademicYear;
    const key = `${sId}_${yr}`;

    if (!feesStore.data.studentAdjustments[key]) {
      feesStore.data.studentAdjustments[key] = [];
    }

    if (newQuotaId) {
      feesStore.data.studentQuotas[sId] = {
        quotaId: newQuotaId,
        assignedAt: new Date().toISOString(),
        assignedBy: req.user?.name || 'Admin',
        notes: `Quota updated during adjustment: ${reasonText || reasonType}`
      };
    }

    if (adjustmentType === 'previous_balance' || adjustmentType === 'previous_year_balance') {
      feesStore.data.studentAdjustments[key] = feesStore.data.studentAdjustments[key].filter(
        a => a.type !== 'previous_balance' && a.type !== 'previous_year_balance'
      );
    }

    const effectiveHeadName = (adjustmentType === 'previous_balance' || adjustmentType === 'previous_year_balance')
      ? 'Previous Year Balance'
      : (headName || 'All Tuition & Academic Heads');

    const adjustmentRecord = {
      id: 'adj-' + Date.now(),
      type: adjustmentType, // 'discount_fixed', 'discount_percentage', 'full_waiver', 'extra_fee', 'previous_balance'
      headName: effectiveHeadName,
      value: Number(amountOrValue || 0),
      reasonType: reasonType || (adjustmentType === 'previous_balance' ? 'Previous Year Balance Carried Forward' : 'Special Management Concession'),
      reasonText: reasonText || '',
      approverName: approverName || req.user?.name || 'Principal',
      appliedAt: new Date().toISOString(),
      appliedBy: req.user?.name || 'Admin'
    };

    feesStore.data.studentAdjustments[key].push(adjustmentRecord);
    feesStore.addAuditLog({
      id: 'log-' + Date.now(),
      studentId: sId,
      action: 'STUDENT_ADJUSTMENT',
      details: `Applied ${adjustmentType} of ${amountOrValue} (${reasonType} - ${reasonText}) approved by ${approverName}`,
      user: req.user?.name || 'Admin',
      timestamp: new Date().toISOString()
    });

    feesStore.save();

    // Fetch updated student record with newly calculated annualPayable and totalDue
    const updatedStudents = await feesStore.getEnrichedStudents({ academicYear: yr });
    const updatedStudent = updatedStudents.find(s => s.id === sId || s.studentId === sId);

    res.json({
      success: true,
      message: 'Fee adjustment applied successfully',
      data: adjustmentRecord,
      student: updatedStudent
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// -------------------------------------------------------------
// 7. COLLECTION (Fast, Keyboard-Friendly)
// -------------------------------------------------------------
router.get('/collection/search-students', protect, async (req, res) => {
  try {
    const { query, standard, section, feeStatus } = req.query;
    let students = await feesStore.getEnrichedStudents({ standard, section });

    if (feeStatus === 'pending') {
      students = students.filter(s => Number(s.totalDue || 0) > 0);
    } else if (feeStatus === 'paid') {
      students = students.filter(s => Number(s.totalDue || 0) <= 0);
    }

    let results = students;
    if (query && query.trim()) {
      const q = query.trim().toLowerCase();
      results = students.filter(s =>
        (s.name && s.name.toLowerCase().includes(q)) ||
        (s.rollNumber && s.rollNumber.toLowerCase().includes(q)) ||
        (s.studentId && s.studentId.toLowerCase().includes(q)) ||
        (s.parentName && s.parentName.toLowerCase().includes(q)) ||
        (s.parentPhone && s.parentPhone.includes(q))
      );
    }

    const max = req.query.limit ? parseInt(req.query.limit, 10) : (standard || section ? 100 : 25);
    res.json({ success: true, data: results.slice(0, max) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/collection/student-details/:studentId', protect, async (req, res) => {
  try {
    const sId = req.params.studentId;
    const year = req.query.academicYear || feesStore.data.settings.activeAcademicYear;

    const students = await feesStore.getEnrichedStudents({ academicYear: year });
    const student = students.find(s => s.id === sId || s.studentId === sId || s.userId === sId);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    // Find siblings (students with same parentName or parentPhone)
    const siblings = students.filter(s =>
      s.id !== student.id && (
        (student.parentPhone && s.parentPhone === student.parentPhone) ||
        (student.parentName && s.parentName && s.parentName.toLowerCase() === student.parentName.toLowerCase())
      )
    );

    // Retrieve applicable structure
    const structKey = `${year}_${student.standard}_${student.quotaId}`;
    const rawStructure = feesStore.data.structures[structKey] || feesStore.data.structures[`${year}_${student.standard}_q-general`] || { items: [] };
    const baseStructure = JSON.parse(JSON.stringify(rawStructure));

    // Ensure student-specific Previous Year Balance is dynamically added as a 1-time fee head
    const prevBal = Number(student.previousYearBalance || 0);
    if (prevBal > 0) {
      const existingPrevItem = baseStructure.items.find(it => it.headId === 'fh-prev-balance' || it.headName?.toLowerCase().includes('previous year balance'));
      if (existingPrevItem) {
        existingPrevItem.amount = prevBal;
        existingPrevItem.enabled = true;
      } else {
        baseStructure.items.unshift({
          headId: 'fh-prev-balance',
          headName: 'Previous Year Balance',
          frequency: 'One-time',
          amount: prevBal,
          enabled: true,
          isDynamic: true,
          description: 'Outstanding dues / carried-forward balance from previous academic year'
        });
      }
    }

    // Attach any other student extra fee adjustments dynamically
    const adjKey = `${student.id}_${year}`;
    const studentAdjs = feesStore.data.studentAdjustments[adjKey] || [];
    studentAdjs.forEach(adj => {
      if (adj.type === 'extra_fee' && !adj.headName?.toLowerCase().includes('previous year balance')) {
        const exists = baseStructure.items.some(it => it.headId === adj.id || it.headName === adj.headName);
        if (!exists) {
          baseStructure.items.push({
            headId: adj.id,
            headName: adj.headName || 'One-Time Extra Charge',
            frequency: 'One-time',
            amount: Number(adj.value || 0),
            enabled: true,
            isDynamic: true
          });
        }
      }
    });

    // Compute past receipts
    const studentReceipts = feesStore.data.receipts.filter(r =>
      (r.studentId === student.id || r.studentId === student.studentId || (r.studentIdCode && r.studentIdCode === student.studentId)) &&
      r.academicYear === year &&
      r.status === 'Active'
    );

    // Calculate Late Fine if overdue
    const fineRule = feesStore.data.settings.lateFineRule;
    let lateFine = 0;
    const today = new Date();
    if (fineRule && fineRule.enabled && baseStructure && baseStructure.items) {
      baseStructure.items.forEach(it => {
        if (it.enabled && it.dueDate) {
          const due = new Date(it.dueDate);
          const diffDays = Math.floor((today - due) / (1000 * 60 * 60 * 24));
          if (diffDays > fineRule.gracePeriodDays && student.totalDue > 0) {
            if (fineRule.type === 'per_day') {
              lateFine += Math.min(fineRule.maxFineCap || 1500, (diffDays - fineRule.gracePeriodDays) * (fineRule.amount || 25));
            } else {
              lateFine += (fineRule.amount || 100);
            }
          }
        }
      });
    }

    res.json({
      success: true,
      data: {
        student,
        siblings,
        baseStructure,
        studentReceipts,
        calculatedLateFine: lateFine,
        fineRule
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/collection/collect', protect, async (req, res) => {
  try {
    const {
      studentId,
      academicYear,
      paymentDate,
      paymentModes, // array of { mode, amount, reference }
      items, // array of { headName, amount, period }
      subTotal,
      discount,
      lateFine,
      waiveLateFineReason,
      paidAmount,
      tenderedAmount,
      changeToReturn,
      remarks
    } = req.body;

    if (!studentId || !paidAmount || Number(paidAmount) <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid payment amount or student selection' });
    }

    const yr = academicYear || feesStore.data.settings.activeAcademicYear;
    const students = await feesStore.getEnrichedStudents({ academicYear: yr });
    const student = students.find(s => s.id === studentId || s.studentId === studentId);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    // Validate split payment modes sum matches paidAmount
    if (paymentModes && paymentModes.length > 0) {
      const modesSum = paymentModes.reduce((acc, m) => acc + Number(m.amount || 0), 0);
      if (Math.abs(modesSum - Number(paidAmount)) > 1) {
        return res.status(400).json({
          success: false,
          message: `Sum of payment modes (₹${modesSum}) must match total payable amount (₹${paidAmount})`
        });
      }
    }

    const receiptNumber = feesStore.getNextReceiptNumber(yr);
    const amountInWords = numberToIndianWords(Number(paidAmount));

    const primaryMode = paymentModes && paymentModes.length > 0
      ? paymentModes.map(m => m.mode.toUpperCase()).join(' + ')
      : 'CASH';

    const newReceipt = {
      id: 'rec-' + Date.now(),
      receiptNumber,
      academicYear: yr,
      studentId: student.id,
      studentName: student.name,
      rollNumber: student.rollNumber || '-',
      studentIdCode: student.studentId,
      standard: student.standard,
      section: student.section,
      gender: student.gender || 'Student',
      parentName: student.parentName || '-',
      parentPhone: student.parentPhone || '-',
      quotaId: student.quotaId,
      quotaName: student.quotaName,
      paymentDate: paymentDate || new Date().toISOString(),
      paymentModes: paymentModes || [{ mode: 'cash', amount: Number(paidAmount), reference: 'Cash at counter' }],
      primaryMode,
      subTotal: Number(subTotal || paidAmount),
      discount: Number(discount || 0),
      lateFine: Number(lateFine || 0),
      waiveLateFineReason: waiveLateFineReason || null,
      paidAmount: Number(paidAmount),
      tenderedAmount: Number(tenderedAmount || 0),
      changeToReturn: Number(changeToReturn || 0),
      amountInWords,
      collectedBy: req.user?.name || 'Accounts Desk',
      status: 'Active',
      remarks: remarks || 'Fee collected successfully',
      items: items && items.length > 0 ? items : [{ headName: 'School Fee Installment', amount: Number(paidAmount), period: 'Current Term' }],
      createdAt: new Date().toISOString()
    };

    feesStore.data.receipts.push(newReceipt);

    // Audit log
    feesStore.addAuditLog({
      id: 'log-' + Date.now(),
      studentId: student.id,
      action: 'COLLECT_FEE',
      details: `Generated receipt ${receiptNumber} for ${student.name} (${student.standard}-${student.section}) amount ₹${paidAmount} via ${primaryMode}`,
      user: req.user?.name || 'Admin',
      timestamp: new Date().toISOString()
    });

    feesStore.save();

    const updatedStudents = await feesStore.getEnrichedStudents({ academicYear: yr });
    const updatedStudent = updatedStudents.find(s => s.id === student.id || s.studentId === student.id);

    res.json({
      success: true,
      message: `Receipt ${receiptNumber} generated successfully!`,
      receipt: newReceipt,
      student: updatedStudent
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/collection/student/:studentId/previous-balance', protect, async (req, res) => {
  try {
    const sId = req.params.studentId;
    const { academicYear, amount, remarks, approverName } = req.body;
    const yr = academicYear || feesStore.data.settings.activeAcademicYear;
    const students = await feesStore.getEnrichedStudents({ academicYear: yr });
    const student = students.find(s => s.id === sId || s.studentId === sId);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    const key = `${student.id}_${yr}`;
    if (!feesStore.data.studentAdjustments[key]) {
      feesStore.data.studentAdjustments[key] = [];
    }

    // Clear prior previous_balance adjustments for this academic year
    feesStore.data.studentAdjustments[key] = feesStore.data.studentAdjustments[key].filter(
      a => a.type !== 'previous_balance' && a.type !== 'previous_year_balance' && !(a.type === 'extra_fee' && a.headName?.toLowerCase().includes('previous year balance'))
    );

    const balAmt = Math.max(0, Number(amount || 0));
    if (balAmt > 0) {
      feesStore.data.studentAdjustments[key].push({
        id: 'adj-prev-' + Date.now(),
        type: 'previous_balance',
        headName: 'Previous Year Balance',
        value: balAmt,
        reasonType: 'Previous Year Balance Carried Forward',
        reasonText: remarks || 'Unpaid fee arrears from previous academic year',
        approverName: approverName || req.user?.name || 'Accounts Department',
        appliedAt: new Date().toISOString(),
        appliedBy: req.user?.name || 'Accountant'
      });
    }

    feesStore.addAuditLog({
      id: 'log-' + Date.now(),
      studentId: student.id,
      action: 'PREVIOUS_YEAR_BALANCE_SET',
      details: `Set Previous Year Balance of ₹${balAmt} for ${student.name} (${remarks || 'Arrears'})`,
      user: req.user?.name || 'Accountant',
      timestamp: new Date().toISOString()
    });

    feesStore.save();

    const updatedStudents = await feesStore.getEnrichedStudents({ academicYear: yr });
    const updatedStudent = updatedStudents.find(s => s.id === student.id || s.studentId === student.id);

    res.json({
      success: true,
      message: balAmt > 0 ? `Previous year balance of ₹${balAmt} recorded successfully` : 'Previous year balance removed',
      student: updatedStudent
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// -------------------------------------------------------------
// 8. RECEIPTS LEDGER & REPRINT / CANCEL
// -------------------------------------------------------------
router.get('/receipts', protect, (req, res) => {
  try {
    const { academicYear, search, standard, section, status, paymentMode, fromDate, toDate } = req.query;
    const yr = academicYear || feesStore.data.settings.activeAcademicYear;

    let list = feesStore.data.receipts.filter(r => r.academicYear === yr);

    if (standard) {
      list = list.filter(r => r.standard === standard);
    }
    if (section) {
      list = list.filter(r => r.section === section);
    }
    if (status) {
      list = list.filter(r => r.status.toLowerCase() === status.toLowerCase());
    }
    if (paymentMode) {
      list = list.filter(r => r.primaryMode.toLowerCase().includes(paymentMode.toLowerCase()));
    }
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(r =>
        r.receiptNumber.toLowerCase().includes(q) ||
        r.studentName.toLowerCase().includes(q) ||
        (r.rollNumber && r.rollNumber.toLowerCase().includes(q)) ||
        (r.studentIdCode && r.studentIdCode.toLowerCase().includes(q))
      );
    }
    if (fromDate) {
      list = list.filter(r => r.paymentDate >= fromDate);
    }
    if (toDate) {
      list = list.filter(r => r.paymentDate <= toDate + 'T23:59:59.999Z');
    }

    res.json({ success: true, data: list.reverse() });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/receipts/:id', protect, (req, res) => {
  try {
    const receipt = feesStore.data.receipts.find(r => r.id === req.params.id || r.receiptNumber === req.params.id);
    if (!receipt) return res.status(404).json({ success: false, message: 'Receipt not found' });
    res.json({ success: true, data: receipt, settings: feesStore.data.settings });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/receipts/:id/cancel', protect, (req, res) => {
  try {
    const { cancelReason, supervisorApproval } = req.body;
    if (!cancelReason || !cancelReason.trim()) {
      return res.status(400).json({ success: false, message: 'Cancellation reason is mandatory' });
    }

    const receipt = feesStore.data.receipts.find(r => r.id === req.params.id || r.receiptNumber === req.params.id);
    if (!receipt) return res.status(404).json({ success: false, message: 'Receipt not found' });
    if (receipt.status === 'Cancelled') {
      return res.status(400).json({ success: false, message: 'Receipt is already cancelled' });
    }

    receipt.status = 'Cancelled';
    receipt.cancelledAt = new Date().toISOString();
    receipt.cancelledBy = req.user?.name || 'Admin';
    receipt.cancelReason = cancelReason.trim();
    receipt.supervisorApproval = supervisorApproval || 'Authorized Supervisor';

    feesStore.addAuditLog({
      id: 'log-' + Date.now(),
      studentId: receipt.studentId,
      action: 'CANCEL_RECEIPT',
      details: `Cancelled receipt ${receipt.receiptNumber} (Amount ₹${receipt.paidAmount}) reason: ${cancelReason} approved by ${supervisorApproval}`,
      user: req.user?.name || 'Admin',
      timestamp: new Date().toISOString()
    });

    feesStore.save();
    res.json({ success: true, message: `Receipt ${receipt.receiptNumber} successfully cancelled`, data: receipt });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/receipts/:id/remarks', protect, (req, res) => {
  try {
    const { remarks } = req.body;
    const receipt = feesStore.data.receipts.find(r => r.id === req.params.id || r.receiptNumber === req.params.id);
    if (!receipt) return res.status(404).json({ success: false, message: 'Receipt not found' });

    receipt.remarks = remarks;
    feesStore.save();
    res.json({ success: true, data: receipt, message: 'Remarks updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// -------------------------------------------------------------
// 9. REPORTS (All 11 Reports)
// -------------------------------------------------------------
router.get('/reports/:reportType', protect, async (req, res) => {
  try {
    const { reportType } = req.params;
    const { academicYear, startDate, endDate, standard, quotaId, paymentMode } = req.query;
    const yr = academicYear || feesStore.data.settings.activeAcademicYear;

    let receipts = feesStore.data.receipts.filter(r => r.academicYear === yr);
    if (startDate) receipts = receipts.filter(r => r.paymentDate >= startDate);
    if (endDate) receipts = receipts.filter(r => r.paymentDate <= endDate + 'T23:59:59.999Z');
    if (standard) receipts = receipts.filter(r => r.standard === standard);
    if (quotaId) receipts = receipts.filter(r => r.quotaId === quotaId);
    if (paymentMode) receipts = receipts.filter(r => r.primaryMode.toLowerCase().includes(paymentMode.toLowerCase()));

    const students = await feesStore.getEnrichedStudents({ academicYear: yr });

    let reportData = {};

    switch (reportType) {
      case 'daily-collection': {
        const daysMap = {};
        receipts.filter(r => r.status === 'Active').forEach(r => {
          const d = r.paymentDate ? r.paymentDate.slice(0, 10) : 'Unknown';
          if (!daysMap[d]) {
            daysMap[d] = { date: d, count: 0, cash: 0, upi: 0, card: 0, cheque: 0, total: 0 };
          }
          daysMap[d].count++;
          daysMap[d].total += Number(r.paidAmount || 0);

          if (r.paymentModes) {
            r.paymentModes.forEach(pm => {
              const amt = Number(pm.amount || 0);
              const m = pm.mode.toLowerCase();
              if (m === 'cash') daysMap[d].cash += amt;
              else if (m === 'upi') daysMap[d].upi += amt;
              else if (m === 'card') daysMap[d].card += amt;
              else if (m === 'cheque') daysMap[d].cheque += amt;
            });
          }
        });
        reportData = {
          title: 'Daily Collection Report',
          rows: Object.values(daysMap).sort((a, b) => b.date.localeCompare(a.date))
        };
        break;
      }

      case 'receipt-wise': {
        reportData = {
          title: 'Receipt-Wise Collection Register',
          rows: receipts.map(r => ({
            receiptNumber: r.receiptNumber,
            date: r.paymentDate ? r.paymentDate.slice(0, 10) : '-',
            studentName: r.studentName,
            classSection: `${r.standard}-${r.section}`,
            rollNumber: r.rollNumber,
            quota: r.quotaName,
            paymentMode: r.primaryMode,
            grossAmount: r.subTotal,
            discount: r.discount,
            lateFine: r.lateFine,
            netCollected: r.paidAmount,
            collector: r.collectedBy,
            status: r.status
          }))
        };
        break;
      }

      case 'fee-head-wise': {
        const headMap = {};
        receipts.filter(r => r.status === 'Active').forEach(r => {
          if (r.items) {
            r.items.forEach(it => {
              const hName = it.headName || 'General Fee';
              if (!headMap[hName]) headMap[hName] = { headName: hName, count: 0, totalAmount: 0 };
              headMap[hName].count++;
              headMap[hName].totalAmount += Number(it.amount || 0);
            });
          }
        });
        reportData = {
          title: 'Fee Head-Wise Collection Summary',
          rows: Object.values(headMap).sort((a, b) => b.totalAmount - a.totalAmount)
        };
        break;
      }

      case 'payment-mode': {
        const modeMap = {
          Cash: { mode: 'Cash', count: 0, total: 0 },
          UPI: { mode: 'UPI / QR Code', count: 0, total: 0 },
          Card: { mode: 'Debit / Credit Card', count: 0, total: 0 },
          Cheque: { mode: 'Cheque / DD', count: 0, total: 0 },
          'Bank Transfer': { mode: 'Bank Transfer / NEFT', count: 0, total: 0 }
        };
        let grandTotal = 0;
        receipts.filter(r => r.status === 'Active').forEach(r => {
          if (r.paymentModes) {
            r.paymentModes.forEach(pm => {
              const amt = Number(pm.amount || 0);
              grandTotal += amt;
              const m = pm.mode.toLowerCase();
              if (m === 'cash') { modeMap.Cash.count++; modeMap.Cash.total += amt; }
              else if (m === 'upi') { modeMap.UPI.count++; modeMap.UPI.total += amt; }
              else if (m === 'card') { modeMap.Card.count++; modeMap.Card.total += amt; }
              else if (m === 'cheque') { modeMap.Cheque.count++; modeMap.Cheque.total += amt; }
              else { modeMap['Bank Transfer'].count++; modeMap['Bank Transfer'].total += amt; }
            });
          }
        });

        const rows = Object.values(modeMap).map(m => ({
          ...m,
          percentage: grandTotal > 0 ? Math.round((m.total / grandTotal) * 100) : 0
        }));

        reportData = {
          title: 'Payment Mode Summary Register',
          grandTotal,
          rows
        };
        break;
      }

      case 'class-wise': {
        const classMap = {};
        students.forEach(s => {
          const clsKey = `${s.standard}-${s.section}`;
          if (!classMap[clsKey]) {
            classMap[clsKey] = {
              standard: s.standard,
              section: s.section,
              totalStudents: 0,
              demand: 0,
              collected: 0,
              pending: 0,
              defaultersCount: 0
            };
          }
          classMap[clsKey].totalStudents++;
          classMap[clsKey].demand += s.annualPayable;
          classMap[clsKey].collected += s.totalPaid;
          classMap[clsKey].pending += s.totalDue;
          if (s.totalDue > 0) classMap[clsKey].defaultersCount++;
        });

        const rows = Object.values(classMap).map(c => ({
          ...c,
          collectionRate: c.demand > 0 ? Math.round((c.collected / c.demand) * 100) : 0
        })).sort((a, b) => b.pending - a.pending);

        reportData = {
          title: 'Class-Wise Collection & Arrears Analysis',
          rows
        };
        break;
      }

      case 'defaulters': {
        const defaulters = students.filter(s => s.totalDue > 0).map(s => ({
          studentId: s.studentId,
          name: s.name,
          standard: s.standard,
          section: s.section,
          rollNumber: s.rollNumber || '-',
          parentName: s.parentName || '-',
          parentPhone: s.parentPhone || '-',
          quota: s.quotaName,
          annualPayable: s.annualPayable,
          totalPaid: s.totalPaid,
          overdueAmount: s.totalDue,
          status: s.totalPaid > 0 ? 'Partial Defaulter' : 'Full Overdue'
        })).sort((a, b) => b.overdueAmount - a.overdueAmount);

        reportData = {
          title: 'Student Fee Defaulters & Overdue Ledger',
          totalDefaulters: defaulters.length,
          totalOverdueAmount: defaulters.reduce((acc, d) => acc + d.overdueAmount, 0),
          rows: defaulters
        };
        break;
      }

      case 'student-ledger': {
        reportData = {
          title: 'Student Comprehensive Fee Ledger',
          rows: students.map(s => ({
            studentId: s.studentId,
            name: s.name,
            classSection: `${s.standard}-${s.section}`,
            rollNumber: s.rollNumber,
            quota: s.quotaName,
            annualDemand: s.annualPayable,
            totalPaid: s.totalPaid,
            balanceDue: s.totalDue,
            receiptsIssued: s.receiptsCount,
            status: s.status
          }))
        };
        break;
      }

      case 'concessions': {
        const concessionRows = students.filter(s => s.quotaId !== 'q-general' || (feesStore.data.studentAdjustments[`${s.id}_${yr}`] && feesStore.data.studentAdjustments[`${s.id}_${yr}`].length > 0))
          .map(s => {
            const adjs = feesStore.data.studentAdjustments[`${s.id}_${yr}`] || [];
            return {
              studentName: s.name,
              classSection: `${s.standard}-${s.section}`,
              quota: s.quotaName,
              quotaConcession: s.quotaConcession,
              customAdjustmentsCount: adjs.length,
              customAdjustments: adjs.map(a => `${a.type}: ₹${a.value} (${a.reasonType})`).join('; ') || 'None',
              netPayable: s.annualPayable
            };
          });

        reportData = {
          title: 'Concession & Scholarship Beneficiaries Audit',
          rows: concessionRows
        };
        break;
      }

      case 'consolidated-annual': {
        let totalProjected = 0;
        let totalReceived = 0;
        let totalOutstanding = 0;
        students.forEach(s => {
          totalProjected += s.annualPayable;
          totalReceived += s.totalPaid;
          totalOutstanding += s.totalDue;
        });

        reportData = {
          title: 'Consolidated Annual Financial Performance Statement',
          academicYear: yr,
          totalProjectedDemand: totalProjected,
          totalActualCollected: totalReceived,
          totalOutstandingArrears: totalOutstanding,
          overallRecoveryPercentage: totalProjected > 0 ? Math.round((totalReceived / totalProjected) * 100) : 0,
          totalEnrolledStudents: students.length,
          fullyPaidStudents: students.filter(s => s.totalDue === 0).length,
          partialPaidStudents: students.filter(s => s.totalPaid > 0 && s.totalDue > 0).length,
          unpaidStudents: students.filter(s => s.totalPaid === 0 && s.annualPayable > 0).length
        };
        break;
      }

      case 'cancelled-receipts': {
        const cancelled = feesStore.data.receipts.filter(r => r.status === 'Cancelled');
        reportData = {
          title: 'Cancelled & Voided Receipts Audit Register',
          count: cancelled.length,
          totalVoidedAmount: cancelled.reduce((acc, c) => acc + Number(c.paidAmount || 0), 0),
          rows: cancelled.map(c => ({
            receiptNumber: c.receiptNumber,
            date: c.paymentDate ? c.paymentDate.slice(0, 10) : '-',
            studentName: c.studentName,
            classSection: `${c.standard}-${c.section}`,
            amount: c.paidAmount,
            cancelledAt: c.cancelledAt ? c.cancelledAt.slice(0, 10) : '-',
            cancelledBy: c.cancelledBy,
            reason: c.cancelReason,
            supervisor: c.supervisorApproval
          }))
        };
        break;
      }

      case 'collector-wise': {
        const collectorMap = {};
        receipts.filter(r => r.status === 'Active').forEach(r => {
          const col = r.collectedBy || 'Default Collector';
          if (!collectorMap[col]) {
            collectorMap[col] = { collectorName: col, transactionsCount: 0, cashTotal: 0, digitalTotal: 0, grandTotal: 0 };
          }
          collectorMap[col].transactionsCount++;
          collectorMap[col].grandTotal += Number(r.paidAmount || 0);

          if (r.paymentModes) {
            r.paymentModes.forEach(pm => {
              const amt = Number(pm.amount || 0);
              if (pm.mode.toLowerCase() === 'cash') collectorMap[col].cashTotal += amt;
              else collectorMap[col].digitalTotal += amt;
            });
          }
        });

        reportData = {
          title: 'Collector-Wise Cashier Reconciliation Register',
          rows: Object.values(collectorMap).sort((a, b) => b.grandTotal - a.grandTotal)
        };
        break;
      }

      default:
        return res.status(400).json({ success: false, message: `Unknown report type: ${reportType}` });
    }

    res.json({ success: true, reportType, academicYear: yr, data: reportData });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// -------------------------------------------------------------
// 10. SETTINGS
// -------------------------------------------------------------
router.get('/settings', protect, (req, res) => {
  try {
    res.json({ success: true, data: feesStore.data.settings });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/settings', protect, (req, res) => {
  try {
    const { activeAcademicYear, academicYears, receiptPrefix, nextReceiptNumber, lateFineRule, schoolDetails, paymentModes } = req.body;

    if (activeAcademicYear) feesStore.data.settings.activeAcademicYear = activeAcademicYear;
    if (academicYears && Array.isArray(academicYears)) feesStore.data.settings.academicYears = academicYears;
    if (receiptPrefix !== undefined) feesStore.data.settings.receiptPrefix = receiptPrefix;
    if (nextReceiptNumber !== undefined) feesStore.data.settings.nextReceiptNumber = Number(nextReceiptNumber);
    if (lateFineRule) feesStore.data.settings.lateFineRule = { ...feesStore.data.settings.lateFineRule, ...lateFineRule };
    if (schoolDetails) feesStore.data.settings.schoolDetails = { ...feesStore.data.settings.schoolDetails, ...schoolDetails };
    if (paymentModes && Array.isArray(paymentModes)) feesStore.data.settings.paymentModes = paymentModes;

    feesStore.save();
    res.json({ success: true, data: feesStore.data.settings, message: 'Fees settings updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
