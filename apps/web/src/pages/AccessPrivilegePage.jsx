/**
 * AccessPrivilegePage.jsx — Granular Security & Menu Authorization Suite
 * 
 * Implements the exact UI & UX specified in the user's reference design:
 * - Top header with Security badge, Access Privilege shield, Refresh, and Save Permissions.
 * - Role selector with active role badge, Menu Access Ratio progress bar, and Allow All / Restrict All buttons.
 * - Category filter chips (All, Main Menu, Reports & Analytics, Administration, Modules, Student & Parent Portal) and search.
 * - Granular Permissions Table:
 *   - Menu Access toggle switch (ALLOWED / RESTRICTED)
 *   - Page-Level pill badge (FULL PAGE & FEATURE ACCESS / FULL ANALYTICS & REPORT VIEW)
 *   - CRUD permissions (Read: All/Own/Restricted, Create checkbox, Update: All/Own/Restricted).
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

// Default Master Module Definitions
const SYSTEM_MODULES = [
  // ── 1. MAIN MENU ──
  {
    id: 'dashboard',
    name: 'DASHBOARD',
    category: 'Main Menu',
    icon: LayoutDashboard,
    iconBg: 'bg-indigo-50 text-indigo-600',
    description: 'Overview KPI cards, stage funnel, daily schedule, running classes, and substitute allocations',
    isPageLevel: true,
    pageLevelLabel: 'FULL PAGE & FEATURE ACCESS'
  },
  {
    id: 'attendance',
    name: 'ATTENDANCE SYSTEM',
    category: 'Main Menu',
    icon: Clock,
    iconBg: 'bg-emerald-50 text-emerald-600',
    description: 'Faculty & staff biometric punch attendance, daily attendance roster, monthly matrix, and gate kiosk',
    isPageLevel: false
  },
  {
    id: 'reports',
    name: 'REPORTS & ANALYTICS',
    category: 'Reports & Analytics',
    icon: BarChart3,
    iconBg: 'bg-blue-50 text-blue-600',
    description: 'Comprehensive institutional reports, academic summaries, and student performance metrics',
    isPageLevel: true,
    pageLevelLabel: 'FULL ANALYTICS & REPORT VIEW'
  },
  {
    id: 'ai_assist',
    name: 'AI ASSIST (VIDYA AI)',
    category: 'Main Menu',
    icon: Sparkles,
    iconBg: 'bg-amber-50 text-amber-600',
    description: 'AI-powered faculty copilot, student doubt resolver, lesson generation, and smart analytics',
    isPageLevel: true,
    pageLevelLabel: 'FULL PAGE & FEATURE ACCESS'
  },

  // ── 2. REPORTS & ANALYTICS ──
  {
    id: 'daily_reports',
    name: 'DAILY OPERATIONS REPORT',
    category: 'Reports & Analytics',
    icon: FileText,
    iconBg: 'bg-cyan-50 text-cyan-600',
    description: 'Daily campus activity matrix, teacher attendance rates, running classes, and incident logs',
    isPageLevel: true,
    pageLevelLabel: 'FULL ANALYTICS & REPORT VIEW'
  },
  {
    id: 'monthly_reports',
    name: 'MONTHLY ACADEMIC REPORT',
    category: 'Reports & Analytics',
    icon: BarChart3,
    iconBg: 'bg-violet-50 text-violet-600',
    description: 'Monthly student progression, attendance consolidations, fee collections, and curriculum pace',
    isPageLevel: true,
    pageLevelLabel: 'FULL ANALYTICS & REPORT VIEW'
  },

  // ── 3. ADMINISTRATION ──
  {
    id: 'admin_panel',
    name: 'MASTER SETTINGS',
    category: 'Administration',
    icon: Settings,
    iconBg: 'bg-slate-50 text-slate-700',
    description: 'Institution identity, academic years, campus geofence radius, and system-wide configurations',
    isPageLevel: false
  },
  {
    id: 'access_privilege',
    name: 'ACCESS PRIVILEGE & ROLES',
    category: 'Administration',
    icon: ShieldCheck,
    iconBg: 'bg-purple-50 text-purple-600',
    description: 'Role-based access control, security scopes, menu authorization toggles, and administrative privileges',
    isPageLevel: false
  },
  {
    id: 'employees',
    name: 'EMPLOYEE MANAGEMENT',
    category: 'Administration',
    icon: Users,
    iconBg: 'bg-sky-50 text-sky-600',
    description: 'Faculty registration, teacher profiles, document vaults, credentials, and staff directory',
    isPageLevel: false
  },
  {
    id: 'subjects',
    name: 'SUBJECT MANAGEMENT',
    category: 'Administration',
    icon: BookOpen,
    iconBg: 'bg-indigo-50 text-indigo-600',
    description: 'Curriculum subjects, syllabus codes, department mappings, and academic credit structures',
    isPageLevel: false
  },
  {
    id: 'classes',
    name: 'CLASS MANAGEMENT',
    category: 'Administration',
    icon: School,
    iconBg: 'bg-teal-50 text-teal-600',
    description: 'Standard & section configuration, class teachers, room assignments, and student capacities',
    isPageLevel: false
  },
  {
    id: 'teacher_mappings',
    name: 'TEACHER CLASS MAPPINGS',
    category: 'Administration',
    icon: LinkIcon,
    iconBg: 'bg-amber-50 text-amber-600',
    description: 'Assigning subject teachers to classrooms, elective groups, and weekly period limits',
    isPageLevel: false
  },
  {
    id: 'timetable',
    name: 'TIMETABLE MANAGEMENT',
    category: 'Administration',
    icon: Calendar,
    iconBg: 'bg-orange-50 text-orange-600',
    description: 'Automated & manual period scheduling, conflict resolution, room allocations, and PDF timetables',
    isPageLevel: false
  },
  {
    id: 'parent_feedback',
    name: 'PARENT FEEDBACK',
    category: 'Administration',
    icon: MessageSquare,
    iconBg: 'bg-pink-50 text-pink-600',
    description: 'Parent-teacher communications, sentiment analysis, resolved inquiries, and grievance tracking',
    isPageLevel: false
  },
  {
    id: 'class_sessions',
    name: 'CLASS SESSIONS LOGS',
    category: 'Administration',
    icon: Clock,
    iconBg: 'bg-emerald-50 text-emerald-600',
    description: 'Live class start/end timestamps, teacher room check-ins, substitute teaching records',
    isPageLevel: true,
    pageLevelLabel: 'FULL PAGE & FEATURE ACCESS'
  },

  // ── 4. CORE MODULES ──
  {
    id: 'student_attendance',
    name: 'STUDENT ATTENDANCE',
    category: 'Modules',
    icon: Calendar,
    iconBg: 'bg-emerald-50 text-emerald-600',
    description: 'Classroom roll-call, biometric scanning, absent SMS triggers, and monthly registers',
    isPageLevel: false
  },
  {
    id: 'fees_management',
    name: 'FEES MANAGEMENT',
    category: 'Modules',
    icon: CreditCard,
    iconBg: 'bg-blue-50 text-blue-600',
    description: 'Fee structures, concessions, online payment gateways, invoice generator, and receipts',
    isPageLevel: false
  },
  {
    id: 'student_promotion',
    name: 'STUDENT PROMOTION',
    category: 'Modules',
    icon: GraduationCap,
    iconBg: 'bg-indigo-50 text-indigo-600',
    description: 'Academic year advancement, section reallocations, failure handling, and alumni archival',
    isPageLevel: false
  },
  {
    id: 'examination',
    name: 'EXAMINATION SYSTEM',
    category: 'Modules',
    icon: Award,
    iconBg: 'bg-rose-50 text-rose-600',
    description: 'Exam schedules, marks entry, hall tickets, grade calculation, and report cards',
    isPageLevel: false
  },
  {
    id: 'online_exam',
    name: 'ONLINE EXAM (CBT)',
    category: 'Modules',
    icon: Tv,
    iconBg: 'bg-purple-50 text-purple-600',
    description: 'Digital quiz creator, question bank, live timed test lobby, and auto-evaluation',
    isPageLevel: false
  },
  {
    id: 'safe_pickup',
    name: 'SAFE PICKUP & CAMPUS STATUS',
    category: 'Modules',
    icon: ShieldAlert,
    iconBg: 'bg-amber-50 text-amber-600',
    description: 'Guardian QR/OTP clearance badges, automated gate dismissal, and campus departure logs',
    isPageLevel: false
  },

  // ── 5. STUDENT & PARENT PORTAL ──
  {
    id: 'portal_profile',
    name: 'STUDENT PROFILE & HISTORY',
    category: 'Student & Parent Portal',
    icon: User,
    iconBg: 'bg-sky-50 text-sky-600',
    description: 'Personal enrollment info, medical tags, authorized contacts, and multi-year progression',
    isPageLevel: false
  },
  {
    id: 'portal_homework',
    name: 'HOMEWORK & LEARNING MAP',
    category: 'Student & Parent Portal',
    icon: BookMarked,
    iconBg: 'bg-emerald-50 text-emerald-600',
    description: 'Daily assignments, digital submissions, teacher feedback, and chapter syllabus tracker',
    isPageLevel: false
  },
  {
    id: 'portal_fees',
    name: 'STUDENT FEES & RECEIPTS',
    category: 'Student & Parent Portal',
    icon: Receipt,
    iconBg: 'bg-indigo-50 text-indigo-600',
    description: 'Fee dues, payment history, downloadable PDF receipts, and instalment tracking',
    isPageLevel: true,
    pageLevelLabel: 'FULL PAGE & FEATURE ACCESS'
  },
  {
    id: 'portal_pickup',
    name: 'STUDENT SAFE PICKUP STATUS',
    category: 'Student & Parent Portal',
    icon: ShieldCheck,
    iconBg: 'bg-teal-50 text-teal-600',
    description: 'Real-time student checkout notifications, gate clearance approvals, and bus tracking',
    isPageLevel: true,
    pageLevelLabel: 'FULL PAGE & FEATURE ACCESS'
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
        // Base pre-defined roles
        const baseRoles = [
          { id: 'super_admin', name: 'SUPER ADMIN', code: 'SADM', isSystem: true, grantAdmin: true, description: 'Full organizational access and administration controls.' },
          { id: 'admin', name: 'ADMINISTRATOR', code: 'ADMIN', isSystem: true, grantAdmin: true, description: 'Institutional administration, settings, and faculty governance.' },
          { id: 'principal', name: 'SCHOOL PRINCIPAL', code: 'PRIN', isSystem: true, grantAdmin: true, description: 'Academic leadership, appraisals, timetable approvals, and school metrics.' },
          { id: 'hod', name: 'DEPARTMENT HEAD (HOD)', code: 'HOD', isSystem: true, grantAdmin: false, description: 'Department curricula, faculty reviews, and subject assignments.' },
          { id: 'teacher', name: 'TEACHING FACULTY', code: 'TCHR', isSystem: true, grantAdmin: false, description: 'Classroom teaching, student marks entry, attendance, and homework.' },
          { id: 'student_parent', name: 'STUDENT & PARENTS', code: 'STDP', isSystem: true, grantAdmin: false, description: 'Portal access to view timetable, homework, fee receipts, and pickup.' }
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
      name: 'SUPER ADMIN',
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
    toast.success(`Granted full menu access for ${currentRole.name}`);
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
    toast.error(`Restricted all menus for ${currentRole.name}`);
  };

  const handleSavePermissions = async () => {
    setSaving(true);
    try {
      // Find which module IDs are allowed
      const allowedModuleKeys = Object.entries(currentPermsMap)
        .filter(([_, perm]) => perm.allowed)
        .map(([key]) => key);

      // If custom API role with raw ID, call updateRole
      if (currentRole.rawRole?.id || currentRole.rawRole?._id) {
        const roleId = currentRole.rawRole.id || currentRole.rawRole._id;
        await updateRole(roleId, {
          Rolename: currentRole.name,
          RoleCode: currentRole.code,
          permissions: allowedModuleKeys,
          GrantAdminPrivilege: currentRole.grantAdmin
        });
      }

      toast.success(`Access privileges saved successfully for ${currentRole.name}!`);
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
      // Category filter
      if (activeCategory !== 'All' && mod.category !== activeCategory) {
        return false;
      }

      // Search filter
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
      <div className="flex-1 h-screen overflow-y-auto overflow-x-hidden bg-[var(--bg)] p-3 sm:p-5 lg:p-8 pb-28 md:pb-12">
        
        {/* Top Header Section */}
        <div className="mb-6 space-y-3">
          <div className="flex items-center gap-2 text-[11px] font-bold tracking-wider text-[#5B6676] uppercase">
            <span>SECURITY</span>
            <span>/</span>
            <span className="text-[#1F2937]">Role Permissions</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-[#1F2937] tracking-tight">
            Access Privilege
          </h1>

          {/* Inner Banner Bar */}
          <div className="bg-white border border-[#E4E2DA] rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#5B51D8] text-white flex items-center justify-center shadow-xs shrink-0">
                <ShieldCheck className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-lg font-black tracking-wide text-[#1F2937] uppercase">
                ACCESS PRIVILEGE
              </h2>
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <button
                onClick={fetchRolesData}
                disabled={loadingRoles}
                className="flex-1 sm:flex-none px-4 py-2.5 bg-white hover:bg-[#F3F1EA] text-[#334155] border border-[#E4E2DA] rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingRoles ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>

              <button
                onClick={handleSavePermissions}
                disabled={saving}
                className="flex-1 sm:flex-none px-5 py-2.5 bg-[#5B51D8] hover:bg-[#4E44C6] text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95"
              >
                {saving ? (
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  <Check className="w-4 h-4 stroke-[2.5]" />
                )}
                <span>Save Permissions</span>
              </button>
            </div>
          </div>
        </div>

        {/* Role Selector & Overview Card */}
        <div className="bg-white border border-[#E4E2DA] rounded-2xl p-5 sm:p-6 shadow-xs mb-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            
            {/* Left: Role Selection Dropdown */}
            <div className="lg:col-span-4 space-y-1.5">
              <label className="block text-[11px] font-bold text-[#5B6676] uppercase tracking-wider">
                SELECT ROLE TO EDIT PRIVILEGES
              </label>

              <div className="relative">
                <select
                  value={selectedRoleId}
                  onChange={(e) => setSelectedRoleId(e.target.value)}
                  className="w-full appearance-none px-4 py-3 bg-[var(--surface-2)] border border-[#E4E2DA] rounded-xl text-xs font-extrabold text-[#1F2937] uppercase tracking-wide focus:bg-white focus:border-[#5B51D8] outline-none cursor-pointer pr-10"
                >
                  {roles.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.name} {r.id === 'super_admin' ? '👤 (YOUR ACTIVE ROLE)' : `(${r.code})`}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-[#5B6676] pointer-events-none" />
              </div>
            </div>

            {/* Middle: Menu Access Ratio & Progress Bar */}
            <div className="lg:col-span-5 bg-[var(--surface-2)] border border-[#E4E2DA] rounded-2xl p-4 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-[#5B6676] uppercase text-[11px] tracking-wider">
                  MENU ACCESS RATIO
                </span>
                <span className="font-extrabold text-[#5B51D8] font-mono text-sm">
                  {accessRatio.active} / {accessRatio.total} Active
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-[#E4E2DA] h-2.5 rounded-full overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] h-full rounded-full transition-all duration-300"
                  style={{ width: `${accessRatio.percentage}%` }}
                />
              </div>

              <p className="text-[11px] text-[#5B6676] font-medium truncate">
                {currentRole.description || 'Configurable organizational access and privilege authorization.'}
              </p>
            </div>

            {/* Right: Quick Batch Actions */}
            <div className="lg:col-span-3 flex flex-col sm:flex-row lg:flex-col gap-2.5 justify-center">
              <button
                onClick={handleAllowAll}
                className="w-full py-2.5 px-4 bg-[#EEF2FF] hover:bg-[#E0E7FF] text-[#4F46E5] border border-[#C7D2FE] rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
              >
                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Allow All Menus</span>
              </button>

              <button
                onClick={handleRestrictAll}
                className="w-full py-2.5 px-4 bg-[#FEF2F2] hover:bg-[#FEE2E2] text-[#DC2626] border border-[#FECACA] rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Restrict All</span>
              </button>
            </div>

          </div>
        </div>

        {/* Category Filter Tabs & Search Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 mb-6">
          
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-1">
            {categoriesList.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border cursor-pointer ${
                  activeCategory === cat
                    ? 'bg-[#5B51D8] text-white border-[#5B51D8] shadow-xs'
                    : 'bg-white text-[#334155] border-[#E4E2DA] hover:bg-[#F3F1EA] hover:text-[#0F172A]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72 shrink-0">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5B6676]" />
            <input
              type="text"
              placeholder="Search menu or module..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-[#E4E2DA] rounded-xl text-xs text-[#1F2937] placeholder-[#5B6676] focus:border-[#5B51D8] outline-none shadow-xs"
            />
          </div>
        </div>

        {/* Granular Permissions Table */}
        <div className="bg-white border border-[#E4E2DA] rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[var(--surface-2)] border-b border-[#E4E2DA] text-[#5B6676] font-bold uppercase tracking-wider">
                  <th className="py-3.5 px-5 min-w-[280px]">MENU / MODULE NAME</th>
                  <th className="py-3.5 px-5 min-w-[150px]">MENU ACCESS</th>
                  <th className="py-3.5 px-5 min-w-[220px]">READ PERMISSION</th>
                  <th className="py-3.5 px-5 min-w-[130px] text-center">CREATE RECORD</th>
                  <th className="py-3.5 px-5 min-w-[180px]">UPDATE PERMISSION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E4E2DA]">
                {filteredModules.map(mod => {
                  const perm = currentPermsMap[mod.id] || { allowed: true, read: 'all', create: true, update: 'all' };
                  const Icon = mod.icon;

                  return (
                    <tr key={mod.id} className="hover:bg-[#FAF9F5] transition-colors">
                      
                      {/* Column 1: Menu / Module Name & Description */}
                      <td className="py-4 px-5">
                        <div className="flex items-start gap-3.5">
                          <div className={`w-9 h-9 rounded-xl ${mod.iconBg} flex items-center justify-center shrink-0 border border-slate-200/60 shadow-2xs`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-[#1F2937] tracking-tight text-xs">
                                {mod.name}
                              </span>
                              <span className="px-2 py-0.5 rounded-md bg-[var(--surface-2)] border border-[#E4E2DA] text-[10px] font-bold text-[#5B6676] uppercase tracking-wider">
                                {mod.category}
                              </span>
                            </div>
                            <p className="text-[11px] text-[#5B6676] mt-0.5 leading-relaxed line-clamp-1 max-w-md">
                              {mod.description}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Column 2: Menu Access (Interactive Toggle) */}
                      <td className="py-4 px-5">
                        <label className="inline-flex items-center gap-2.5 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={perm.allowed}
                            onChange={() => handleToggleMenuAccess(mod.id)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600 relative"></div>
                          <span className={`text-[11px] font-black uppercase tracking-wider ${perm.allowed ? 'text-emerald-700' : 'text-slate-400'}`}>
                            {perm.allowed ? 'ALLOWED' : 'RESTRICTED'}
                          </span>
                        </label>
                      </td>

                      {/* Column 3: Read Permission / Page Level */}
                      <td className="py-4 px-5">
                        {mod.isPageLevel ? (
                          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>{mod.pageLevelLabel || 'FULL PAGE & FEATURE ACCESS'}</span>
                            <span className="text-[9px] px-1.5 py-0.5 bg-emerald-100 rounded text-emerald-700 uppercase font-mono">
                              PAGE LEVEL
                            </span>
                          </div>
                        ) : (
                          <select
                            disabled={!perm.allowed}
                            value={perm.read || 'all'}
                            onChange={(e) => handleUpdateRead(mod.id, e.target.value)}
                            className="px-3 py-1.5 bg-white border border-[#E4E2DA] rounded-xl text-xs font-semibold text-[#1F2937] outline-none disabled:opacity-40 disabled:bg-[var(--surface-2)] cursor-pointer"
                          >
                            <option value="all">All Records</option>
                            <option value="own">Own Records</option>
                            <option value="none">Restricted</option>
                          </select>
                        )}
                      </td>

                      {/* Column 4: Create Record Checkbox */}
                      <td className="py-4 px-5 text-center">
                        {mod.isPageLevel ? (
                          <span className="text-[#5B6676] font-mono text-sm">—</span>
                        ) : (
                          <label className={`inline-flex items-center gap-1.5 ${perm.allowed ? 'cursor-pointer' : 'opacity-40 cursor-not-allowed'}`}>
                            <input
                              type="checkbox"
                              disabled={!perm.allowed}
                              checked={Boolean(perm.create)}
                              onChange={() => handleToggleCreate(mod.id)}
                              className="w-4 h-4 text-[#5B51D8] rounded border-gray-300 focus:ring-[#5B51D8] cursor-pointer"
                            />
                            <span className="text-xs font-bold text-[#1F2937]">Create</span>
                          </label>
                        )}
                      </td>

                      {/* Column 5: Update Permission */}
                      <td className="py-4 px-5">
                        {mod.isPageLevel ? (
                          <span className="text-[#5B6676] font-mono text-sm">—</span>
                        ) : (
                          <select
                            disabled={!perm.allowed}
                            value={perm.update || 'all'}
                            onChange={(e) => handleUpdateUpdatePerm(mod.id, e.target.value)}
                            className="px-3 py-1.5 bg-white border border-[#E4E2DA] rounded-xl text-xs font-semibold text-[#1F2937] outline-none disabled:opacity-40 disabled:bg-[var(--surface-2)] cursor-pointer"
                          >
                            <option value="all">All Records</option>
                            <option value="own">Own Records</option>
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
