/**
 * AccessPrivilegePage.jsx — Granular Security & Menu Authorization Suite
 * 
 * Refined Executive UI:
 * - Clean classic typography (Title Case, refined font sizes, zero shouting uppercase).
 * - Compact layout: removed duplicate header banner, tightened table cells (py-2.5 px-3.5),
 *   streamlined role selector & access ratio strip.
 * - Elegant Qelvora styling: Navy (#172B4D / #29456D), Emerald (#059669), Slate (#475569),
 *   warm subtle borders (#E4E2DA), and compact modern toggles.
 * - Full persistence with backend /api/roles.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { getRoles, updateRole } from '../services/authService';
import Sidebar from '../components/ui/Sidebar';
import Spinner from '../components/ui/Spinner';
import toast from 'react-hot-toast';
import {
  ShieldCheck,
  Shield,
  RefreshCw,
  Check,
  Lock,
  Unlock,
  Search,
  ChevronDown,
  LayoutDashboard,
  Clock,
  BarChart3,
  Sparkles,
  Settings,
  Users,
  BookOpen,
  School,
  Link as LinkIcon,
  Calendar,
  MessageSquare,
  FileText,
  CreditCard,
  GraduationCap,
  Award,
  Tv,
  ShieldAlert,
  User,
  BookMarked,
  Receipt,
  Eye,
  CheckCircle2,
  XCircle,
  Layers,
  ArrowRight
} from 'lucide-react';

// Master Module Definitions (Title Case, Clean Metadata)
const SYSTEM_MODULES = [
  // ── 1. MAIN MENU ──
  {
    id: 'dashboard',
    name: 'Dashboard',
    category: 'Main Menu',
    icon: LayoutDashboard,
    iconBg: 'bg-indigo-50 text-indigo-600',
    description: 'Overview KPI cards, stage funnel, daily schedule, running classes, and substitute allocations',
    isPageLevel: true,
    pageLevelLabel: 'Full Page Access'
  },
  {
    id: 'attendance',
    name: 'Attendance System',
    category: 'Main Menu',
    icon: Clock,
    iconBg: 'bg-emerald-50 text-emerald-600',
    description: 'Faculty & staff biometric punch attendance, daily attendance roster, monthly matrix, and gate kiosk',
    isPageLevel: false
  },
  {
    id: 'reports',
    name: 'Reports & Analytics',
    category: 'Reports & Analytics',
    icon: BarChart3,
    iconBg: 'bg-blue-50 text-blue-600',
    description: 'Comprehensive institutional reports, academic summaries, and student performance metrics',
    isPageLevel: true,
    pageLevelLabel: 'Full Analytics & Report View'
  },
  {
    id: 'ai_assist',
    name: 'AI Assist (Vidya AI)',
    category: 'Main Menu',
    icon: Sparkles,
    iconBg: 'bg-amber-50 text-amber-600',
    description: 'AI-powered faculty copilot, student doubt resolver, lesson generation, and smart analytics',
    isPageLevel: true,
    pageLevelLabel: 'Full Page Access'
  },

  // ── 2. REPORTS & ANALYTICS ──
  {
    id: 'daily_reports',
    name: 'Daily Operations Report',
    category: 'Reports & Analytics',
    icon: FileText,
    iconBg: 'bg-cyan-50 text-cyan-600',
    description: 'Daily campus activity matrix, teacher attendance rates, running classes, and incident logs',
    isPageLevel: true,
    pageLevelLabel: 'Full Analytics & Report View'
  },
  {
    id: 'monthly_reports',
    name: 'Monthly Academic Report',
    category: 'Reports & Analytics',
    icon: BarChart3,
    iconBg: 'bg-violet-50 text-violet-600',
    description: 'Monthly student progression, attendance consolidations, fee collections, and curriculum pace',
    isPageLevel: true,
    pageLevelLabel: 'Full Analytics & Report View'
  },

  // ── 3. ADMINISTRATION ──
  {
    id: 'admin_panel',
    name: 'Master Settings',
    category: 'Administration',
    icon: Settings,
    iconBg: 'bg-slate-50 text-slate-700',
    description: 'Institution identity, academic years, campus geofence radius, and system-wide configurations',
    isPageLevel: false
  },
  {
    id: 'access_privilege',
    name: 'Access Privilege & Roles',
    category: 'Administration',
    icon: ShieldCheck,
    iconBg: 'bg-purple-50 text-purple-600',
    description: 'Role-based access control, security scopes, menu authorization toggles, and administrative privileges',
    isPageLevel: false
  },
  {
    id: 'employees',
    name: 'Employee Management',
    category: 'Administration',
    icon: Users,
    iconBg: 'bg-sky-50 text-sky-600',
    description: 'Faculty registration, teacher profiles, document vaults, credentials, and staff directory',
    isPageLevel: false
  },
  {
    id: 'subjects',
    name: 'Subject Management',
    category: 'Administration',
    icon: BookOpen,
    iconBg: 'bg-indigo-50 text-indigo-600',
    description: 'Curriculum subjects, syllabus codes, department mappings, and academic credit structures',
    isPageLevel: false
  },
  {
    id: 'classes',
    name: 'Class Management',
    category: 'Administration',
    icon: School,
    iconBg: 'bg-teal-50 text-teal-600',
    description: 'Standard & section configuration, class teachers, room assignments, and student capacities',
    isPageLevel: false
  },
  {
    id: 'teacher_mappings',
    name: 'Teacher Class Mappings',
    category: 'Administration',
    icon: LinkIcon,
    iconBg: 'bg-amber-50 text-amber-600',
    description: 'Assigning subject teachers to classrooms, elective groups, and weekly period limits',
    isPageLevel: false
  },
  {
    id: 'timetable',
    name: 'Timetable Management',
    category: 'Administration',
    icon: Calendar,
    iconBg: 'bg-orange-50 text-orange-600',
    description: 'Automated & manual period scheduling, conflict resolution, room allocations, and PDF timetables',
    isPageLevel: false
  },
  {
    id: 'parent_feedback',
    name: 'Parent Feedback',
    category: 'Administration',
    icon: MessageSquare,
    iconBg: 'bg-pink-50 text-pink-600',
    description: 'Parent-teacher communications, sentiment analysis, resolved inquiries, and grievance tracking',
    isPageLevel: false
  },
  {
    id: 'class_sessions',
    name: 'Class Sessions Logs',
    category: 'Administration',
    icon: Clock,
    iconBg: 'bg-emerald-50 text-emerald-600',
    description: 'Live class start/end timestamps, teacher room check-ins, substitute teaching records',
    isPageLevel: true,
    pageLevelLabel: 'Full Page Access'
  },

  // ── 4. CORE MODULES ──
  {
    id: 'student_attendance',
    name: 'Student Attendance',
    category: 'Modules',
    icon: Calendar,
    iconBg: 'bg-emerald-50 text-emerald-600',
    description: 'Classroom roll-call, biometric scanning, absent SMS triggers, and monthly registers',
    isPageLevel: false
  },
  {
    id: 'fees_management',
    name: 'Fees Management',
    category: 'Modules',
    icon: CreditCard,
    iconBg: 'bg-blue-50 text-blue-600',
    description: 'Fee structures, concessions, online payment gateways, invoice generator, and receipts',
    isPageLevel: false
  },
  {
    id: 'student_promotion',
    name: 'Student Promotion',
    category: 'Modules',
    icon: GraduationCap,
    iconBg: 'bg-indigo-50 text-indigo-600',
    description: 'Academic year advancement, section reallocations, failure handling, and alumni archival',
    isPageLevel: false
  },
  {
    id: 'examination',
    name: 'Examination System',
    category: 'Modules',
    icon: Award,
    iconBg: 'bg-rose-50 text-rose-600',
    description: 'Exam schedules, marks entry, hall tickets, grade calculation, and report cards',
    isPageLevel: false
  },
  {
    id: 'online_exam',
    name: 'Online Exam (CBT)',
    category: 'Modules',
    icon: Tv,
    iconBg: 'bg-purple-50 text-purple-600',
    description: 'Digital quiz creator, question bank, live timed test lobby, and auto-evaluation',
    isPageLevel: false
  },
  {
    id: 'safe_pickup',
    name: 'Safe Pickup & Gate Status',
    category: 'Modules',
    icon: ShieldAlert,
    iconBg: 'bg-amber-50 text-amber-600',
    description: 'Guardian QR/OTP clearance badges, automated gate dismissal, and campus departure logs',
    isPageLevel: false
  },

  // ── 5. STUDENT & PARENT PORTAL ──
  {
    id: 'portal_profile',
    name: 'Student Profile & History',
    category: 'Student & Parent Portal',
    icon: User,
    iconBg: 'bg-sky-50 text-sky-600',
    description: 'Personal enrollment info, medical tags, authorized contacts, and multi-year progression',
    isPageLevel: false
  },
  {
    id: 'portal_homework',
    name: 'Homework & Learning Map',
    category: 'Student & Parent Portal',
    icon: BookMarked,
    iconBg: 'bg-emerald-50 text-emerald-600',
    description: 'Daily assignments, digital submissions, teacher feedback, and chapter syllabus tracker',
    isPageLevel: false
  },
  {
    id: 'portal_fees',
    name: 'Student Fees & Receipts',
    category: 'Student & Parent Portal',
    icon: Receipt,
    iconBg: 'bg-indigo-50 text-indigo-600',
    description: 'Fee dues, payment history, downloadable PDF receipts, and instalment tracking',
    isPageLevel: true,
    pageLevelLabel: 'Full Page Access'
  },
  {
    id: 'portal_pickup',
    name: 'Student Safe Pickup Status',
    category: 'Student & Parent Portal',
    icon: ShieldCheck,
    iconBg: 'bg-teal-50 text-teal-600',
    description: 'Real-time student checkout notifications, gate clearance approvals, and bus tracking',
    isPageLevel: true,
    pageLevelLabel: 'Full Page Access'
  }
];

export default function AccessPrivilegePage() {
  const { user } = useAuth();

  // Role list from API
  const [roles, setRoles] = useState([]);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [selectedRoleId, setSelectedRoleId] = useState('super_admin');
  const [saving, setSaving] = useState(false);

  // Active Category Filter & Search
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Role Permissions Mapping: { [roleId]: { [moduleId]: { allowed: boolean, read: 'all'|'own'|'none', create: boolean, update: 'all'|'own'|'none' } } }
  const [rolePermissions, setRolePermissions] = useState({});

  // Fetch Roles from Backend
  const fetchRolesData = useCallback(async () => {
    setLoadingRoles(true);
    try {
      const res = await getRoles();
      if (res?.status && Array.isArray(res.data)) {
        // Base pre-defined roles with Title Case labels
        const baseRoles = [
          { id: 'super_admin', name: 'Super Admin', code: 'SADM', isSystem: true, grantAdmin: true, description: 'Full organizational access and administration controls.' },
          { id: 'admin', name: 'Administrator', code: 'ADMIN', isSystem: true, grantAdmin: true, description: 'Institutional administration, settings, and faculty governance.' },
          { id: 'principal', name: 'School Principal', code: 'PRIN', isSystem: true, grantAdmin: true, description: 'Academic leadership, appraisals, timetable approvals, and school metrics.' },
          { id: 'hod', name: 'Department Head (HOD)', code: 'HOD', isSystem: true, grantAdmin: false, description: 'Department curricula, faculty reviews, and subject assignments.' },
          { id: 'teacher', name: 'Teaching Faculty', code: 'TCHR', isSystem: true, grantAdmin: false, description: 'Classroom teaching, student marks entry, attendance, and homework.' },
          { id: 'student_parent', name: 'Student & Parents', code: 'STDP', isSystem: true, grantAdmin: false, description: 'Portal access to view timetable, homework, fee receipts, and pickup.' }
        ];

        // Merge API roles
        const mergedRoles = [...baseRoles];
        res.data.forEach(r => {
          const rId = r.id || r._id || r.RoleCode?.toLowerCase();
          if (!mergedRoles.some(br => br.id === rId || br.code === r.RoleCode)) {
            mergedRoles.push({
              id: r.id || r._id,
              name: r.Rolename || r.name || r.RoleCode,
              code: r.RoleCode || r.code,
              isSystem: false,
              grantAdmin: Boolean(r.GrantAdminPrivilege || r.grantAdminPrivilege),
              description: `Custom security role: ${r.Rolename || r.RoleCode}`,
              rawRole: r
            });
          }
        });

        setRoles(mergedRoles);

        // Initialize granular permissions for each role
        const initialPerms = {};
        mergedRoles.forEach(role => {
          const isSuper = role.id === 'super_admin' || role.id === 'admin' || role.grantAdmin;
          const isTeacher = role.code === 'TCHR' || role.id === 'teacher';
          const isStudent = role.code === 'STDP' || role.id === 'student_parent';

          const modMap = {};
          SYSTEM_MODULES.forEach(mod => {
            let allowed = true;
            let read = 'all';
            let create = true;
            let update = 'all';

            if (isSuper) {
              allowed = true;
              read = 'all';
              create = true;
              update = 'all';
            } else if (isTeacher) {
              if (['admin_panel', 'access_privilege', 'employees', 'student_promotion'].includes(mod.id)) {
                allowed = false;
                read = 'none';
                create = false;
                update = 'none';
              } else if (['attendance', 'student_attendance', 'timetable', 'examination', 'online_exam'].includes(mod.id)) {
                allowed = true;
                read = 'own';
                create = true;
                update = 'own';
              } else {
                allowed = ['dashboard', 'reports', 'ai_assist'].includes(mod.id);
                read = 'all';
                create = false;
                update = 'none';
              }
            } else if (isStudent) {
              allowed = mod.category === 'Student & Parent Portal' || mod.id === 'dashboard';
              read = 'own';
              create = false;
              update = 'none';
            } else {
              // Custom API role
              const apiPerms = role.rawRole?.permissions || [];
              if (apiPerms.includes('all')) {
                allowed = true;
              } else if (apiPerms.length > 0) {
                allowed = apiPerms.some(p => mod.id.includes(p) || p.includes(mod.id));
              } else {
                allowed = true;
              }
              read = allowed ? 'all' : 'none';
              create = allowed;
              update = allowed ? 'all' : 'none';
            }

            modMap[mod.id] = { allowed, read, create, update };
          });

          initialPerms[role.id] = modMap;
        });

        setRolePermissions(initialPerms);
      }
    } catch (err) {
      console.error('Failed to load roles for Access Privilege:', err);
      toast.error('Could not load security roles.');
    } finally {
      setLoadingRoles(false);
    }
  }, []);

  useEffect(() => {
    fetchRolesData();
  }, [fetchRolesData]);

  // Current active role object
  const currentRole = useMemo(() => {
    return roles.find(r => r.id === selectedRoleId) || roles[0] || {
      id: 'super_admin',
      name: 'Super Admin',
      code: 'SADM',
      description: 'Full organizational access and administration controls.'
    };
  }, [roles, selectedRoleId]);

  // Current permissions map for the active role
  const currentPermsMap = useMemo(() => {
    return rolePermissions[selectedRoleId] || {};
  }, [rolePermissions, selectedRoleId]);

  // Menu Access Ratio calculation
  const accessRatio = useMemo(() => {
    const total = SYSTEM_MODULES.length;
    let active = 0;
    SYSTEM_MODULES.forEach(mod => {
      if (currentPermsMap[mod.id]?.allowed) {
        active++;
      }
    });
    const percentage = total > 0 ? Math.round((active / total) * 100) : 100;
    return { active, total, percentage };
  }, [currentPermsMap]);

  // ─────────────────────────────────────────────────────────────
  // PERMISSION TOGGLE & UPDATE HANDLERS
  // ─────────────────────────────────────────────────────────────
  const handleToggleMenuAccess = (moduleId) => {
    setRolePermissions(prev => {
      const roleMap = { ...(prev[selectedRoleId] || {}) };
      const current = roleMap[moduleId] || { allowed: false, read: 'all', create: true, update: 'all' };
      const nextAllowed = !current.allowed;

      roleMap[moduleId] = {
        ...current,
        allowed: nextAllowed,
        read: nextAllowed ? (current.read === 'none' ? 'all' : current.read) : 'none',
        update: nextAllowed ? (current.update === 'none' ? 'all' : current.update) : 'none',
        create: nextAllowed ? current.create : false
      };

      return { ...prev, [selectedRoleId]: roleMap };
    });
  };

  const handleUpdateRead = (moduleId, value) => {
    setRolePermissions(prev => {
      const roleMap = { ...(prev[selectedRoleId] || {}) };
      roleMap[moduleId] = { ...(roleMap[moduleId] || {}), read: value };
      return { ...prev, [selectedRoleId]: roleMap };
    });
  };

  const handleToggleCreate = (moduleId) => {
    setRolePermissions(prev => {
      const roleMap = { ...(prev[selectedRoleId] || {}) };
      const current = roleMap[moduleId] || {};
      roleMap[moduleId] = { ...current, create: !current.create };
      return { ...prev, [selectedRoleId]: roleMap };
    });
  };

  const handleUpdateUpdatePerm = (moduleId, value) => {
    setRolePermissions(prev => {
      const roleMap = { ...(prev[selectedRoleId] || {}) };
      roleMap[moduleId] = { ...(roleMap[moduleId] || {}), update: value };
      return { ...prev, [selectedRoleId]: roleMap };
    });
  };

  const handleAllowAll = () => {
    setRolePermissions(prev => {
      const roleMap = {};
      SYSTEM_MODULES.forEach(mod => {
        roleMap[mod.id] = {
          allowed: true,
          read: 'all',
          create: true,
          update: 'all'
        };
      });
      return { ...prev, [selectedRoleId]: roleMap };
    });
    toast.success(`Granted full access for ${currentRole.name}`);
  };

  const handleRestrictAll = () => {
    setRolePermissions(prev => {
      const roleMap = {};
      SYSTEM_MODULES.forEach(mod => {
        roleMap[mod.id] = {
          allowed: false,
          read: 'none',
          create: false,
          update: 'none'
        };
      });
      return { ...prev, [selectedRoleId]: roleMap };
    });
    toast.error(`Restricted all modules for ${currentRole.name}`);
  };

  const handleSavePermissions = async () => {
    setSaving(true);
    try {
      const allowedModuleKeys = Object.entries(currentPermsMap)
        .filter(([_, perm]) => perm.allowed)
        .map(([key]) => key);

      if (currentRole.rawRole?.id || currentRole.rawRole?._id) {
        const roleId = currentRole.rawRole.id || currentRole.rawRole._id;
        await updateRole(roleId, {
          Rolename: currentRole.name,
          RoleCode: currentRole.code,
          permissions: allowedModuleKeys,
          GrantAdminPrivilege: currentRole.grantAdmin
        });
      }

      toast.success(`Access privileges saved for ${currentRole.name}`);
    } catch (err) {
      console.error('Save permissions error:', err);
      toast.error('Failed to save access privileges.');
    } finally {
      setSaving(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // FILTERING & CATEGORIES
  // ─────────────────────────────────────────────────────────────
  const categoriesList = ['All', 'Main Menu', 'Reports & Analytics', 'Administration', 'Modules', 'Student & Parent Portal'];

  const filteredModules = useMemo(() => {
    return SYSTEM_MODULES.filter(mod => {
      if (activeCategory !== 'All' && mod.category !== activeCategory) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch = mod.name.toLowerCase().includes(q);
        const descMatch = mod.description.toLowerCase().includes(q);
        const catMatch = mod.category.toLowerCase().includes(q);
        if (!nameMatch && !descMatch && !catMatch) return false;
      }

      return true;
    });
  }, [activeCategory, searchQuery]);

  return (
    <div className="h-screen overflow-hidden bg-[var(--bg)] text-[#1F2937] flex flex-col lg:flex-row font-sans">
      <Sidebar />
      <div className="flex-1 h-screen overflow-y-auto overflow-x-hidden bg-[var(--bg)] p-3 sm:p-5 lg:p-6 pb-24 md:pb-12">
        
        {/* Unified Executive Header */}
        <div className="mb-4 bg-white border border-[#E4E2DA] rounded-xl p-3.5 sm:p-4 shadow-2xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#172B4D] text-white flex items-center justify-center shrink-0 shadow-2xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                  Access Privilege & Role Authorization
                </h1>
                <span className="hidden sm:inline-block text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                  Security Matrix
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Configure role-based access scopes, modular menu visibility, and granular CRUD permissions.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
            <button
              onClick={fetchRolesData}
              disabled={loadingRoles}
              title="Refresh security roles"
              className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-[#E4E2DA] rounded-lg text-xs font-medium transition-all shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${loadingRoles ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>

            <button
              onClick={handleSavePermissions}
              disabled={saving}
              className="flex-1 sm:flex-none px-4 py-1.5 bg-[#172B4D] hover:bg-[#29456D] text-white rounded-lg text-xs font-semibold transition-all shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-98"
            >
              {saving ? (
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              ) : (
                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
              )}
              <span>Save Privileges</span>
            </button>
          </div>
        </div>

        {/* Compact Role Selector & Access Ratio Strip */}
        <div className="bg-white border border-[#E4E2DA] rounded-xl p-3.5 sm:p-4 shadow-2xs mb-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-center">
            
            {/* Left: Role Selector */}
            <div className="md:col-span-4 space-y-1">
              <label className="block text-[11px] font-medium text-slate-500">
                Active Security Role
              </label>
              <div className="relative">
                <select
                  value={selectedRoleId}
                  onChange={(e) => setSelectedRoleId(e.target.value)}
                  className="w-full appearance-none px-3 py-2 bg-slate-50 hover:bg-white focus:bg-white border border-[#E4E2DA] focus:border-[#172B4D] rounded-lg text-xs font-semibold text-slate-900 outline-none cursor-pointer pr-8 transition-colors"
                >
                  {roles.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.name} {r.id === 'super_admin' ? '• (Current Role)' : `(${r.code})`}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Middle: Access Ratio & Progress */}
            <div className="md:col-span-5 bg-slate-50 border border-slate-200/80 rounded-lg p-2.5 space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-[11px] font-medium text-slate-600">
                  Authorized Modules
                </span>
                <span className="font-semibold text-slate-900 font-mono text-xs">
                  {accessRatio.active} of {accessRatio.total} Active ({accessRatio.percentage}%)
                </span>
              </div>

              {/* Sleek thin progress bar */}
              <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-300 ${
                    accessRatio.percentage >= 80 ? 'bg-emerald-600' : accessRatio.percentage >= 40 ? 'bg-amber-500' : 'bg-rose-500'
                  }`}
                  style={{ width: `${accessRatio.percentage}%` }}
                />
              </div>

              <p className="text-[11px] text-slate-500 truncate">
                {currentRole.description || 'Configurable organizational access and privilege authorization.'}
              </p>
            </div>

            {/* Right: Compact Bulk Actions */}
            <div className="md:col-span-3 flex items-center justify-end gap-2">
              <button
                onClick={handleAllowAll}
                title="Enable all modules for this role"
                className="flex-1 py-1.5 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Allow All</span>
              </button>

              <button
                onClick={handleRestrictAll}
                title="Restrict all modules for this role"
                className="flex-1 py-1.5 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Restrict All</span>
              </button>
            </div>

          </div>
        </div>

        {/* Category Tabs & Search Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2.5 mb-3">
          
          {/* Category Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto py-0.5 no-scrollbar">
            {categoriesList.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all border cursor-pointer ${
                  activeCategory === cat
                    ? 'bg-[#172B4D] text-white border-[#172B4D] shadow-2xs'
                    : 'bg-white text-slate-600 border-[#E4E2DA] hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Compact Search Box */}
          <div className="relative w-full sm:w-64 shrink-0">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search module..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-white border border-[#E4E2DA] rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:border-[#172B4D] outline-none shadow-2xs"
            />
          </div>
        </div>

        {/* Refined Granular Permissions Table */}
        <div className="bg-white border border-[#E4E2DA] rounded-xl shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-[#E4E2DA] text-slate-600 font-semibold">
                  <th className="py-2.5 px-3.5 min-w-[260px]">Module / Capability</th>
                  <th className="py-2.5 px-3.5 min-w-[130px]">Menu Access</th>
                  <th className="py-2.5 px-3.5 min-w-[200px]">Read Permission</th>
                  <th className="py-2.5 px-3.5 min-w-[100px] text-center">Create</th>
                  <th className="py-2.5 px-3.5 min-w-[170px]">Update Permission</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredModules.map(mod => {
                  const perm = currentPermsMap[mod.id] || { allowed: true, read: 'all', create: true, update: 'all' };
                  const Icon = mod.icon;

                  return (
                    <tr key={mod.id} className="hover:bg-slate-50/60 transition-colors">
                      
                      {/* Column 1: Module Name & Description */}
                      <td className="py-2.5 px-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-7 h-7 rounded-lg ${mod.iconBg} flex items-center justify-center shrink-0 border border-slate-200/50 shadow-2xs`}>
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-semibold text-slate-900 text-xs">
                                {mod.name}
                              </span>
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-slate-100 text-slate-500 border border-slate-200/70">
                                {mod.category}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 leading-tight truncate max-w-sm mt-0.5">
                              {mod.description}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Column 2: Menu Access (Compact Switch) */}
                      <td className="py-2.5 px-3.5">
                        <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={perm.allowed}
                            onChange={() => handleToggleMenuAccess(mod.id)}
                            className="sr-only peer"
                          />
                          <div className="w-8 h-4.5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-3.5 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-emerald-600 relative"></div>
                          <span className={`text-[11px] font-medium ${perm.allowed ? 'text-emerald-700' : 'text-slate-400'}`}>
                            {perm.allowed ? 'Allowed' : 'Restricted'}
                          </span>
                        </label>
                      </td>

                      {/* Column 3: Read Permission / Page Level */}
                      <td className="py-2.5 px-3.5">
                        {mod.isPageLevel ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>{mod.pageLevelLabel || 'Full Page Access'}</span>
                          </div>
                        ) : (
                          <select
                            disabled={!perm.allowed}
                            value={perm.read || 'all'}
                            onChange={(e) => handleUpdateRead(mod.id, e.target.value)}
                            className="px-2.5 py-1 bg-white border border-[#E4E2DA] rounded-lg text-xs text-slate-700 outline-none disabled:opacity-40 disabled:bg-slate-50 cursor-pointer shadow-2xs"
                          >
                            <option value="all">All Records</option>
                            <option value="own">Own Records Only</option>
                            <option value="none">Restricted</option>
                          </select>
                        )}
                      </td>

                      {/* Column 4: Create Record Checkbox */}
                      <td className="py-2.5 px-3.5 text-center">
                        {mod.isPageLevel ? (
                          <span className="text-slate-300 font-mono text-xs">—</span>
                        ) : (
                          <label className={`inline-flex items-center gap-1 ${perm.allowed ? 'cursor-pointer' : 'opacity-40 cursor-not-allowed'}`}>
                            <input
                              type="checkbox"
                              disabled={!perm.allowed}
                              checked={Boolean(perm.create)}
                              onChange={() => handleToggleCreate(mod.id)}
                              className="w-3.5 h-3.5 text-[#172B4D] rounded border-slate-300 focus:ring-[#172B4D] cursor-pointer"
                            />
                            <span className="text-[11px] text-slate-600 font-medium">Allow</span>
                          </label>
                        )}
                      </td>

                      {/* Column 5: Update Permission */}
                      <td className="py-2.5 px-3.5">
                        {mod.isPageLevel ? (
                          <span className="text-slate-300 font-mono text-xs">—</span>
                        ) : (
                          <select
                            disabled={!perm.allowed}
                            value={perm.update || 'all'}
                            onChange={(e) => handleUpdateUpdatePerm(mod.id, e.target.value)}
                            className="px-2.5 py-1 bg-white border border-[#E4E2DA] rounded-lg text-xs text-slate-700 outline-none disabled:opacity-40 disabled:bg-slate-50 cursor-pointer shadow-2xs"
                          >
                            <option value="all">All Records</option>
                            <option value="own">Own Records Only</option>
                            <option value="none">Restricted</option>
                          </select>
                        )}
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
