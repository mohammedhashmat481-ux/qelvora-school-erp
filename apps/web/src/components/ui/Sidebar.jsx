import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { getCompanySettings } from '../../services/authService';
import {
  LayoutDashboard,
  ClipboardCheck,
  LogOut,
  Settings,
  UsersRound,
  GraduationCap,
  School,
  BookOpen,
  Link2,
  CalendarDays,
  MessageCircle,
  History,
  ShieldCheck,
  ChevronDown,
  BookMarked,
  UserCheck,
  Calendar,
  FileText,
  MessageSquare,
  CreditCard,
  Receipt,
  IndianRupee,
  Layers,
  Sliders,
  BadgePercent,
  TrendingUp,
  Wallet,
  Menu,
  X,
  Award,
  FileSpreadsheet,
  MonitorPlay,
  CalendarCheck,
  QrCode,
  ScanFace,
  Bell,
  BellRing,
  BadgeCheck,
  Sparkles
} from 'lucide-react';

const Sidebar = () => {
  const { t } = useTranslation();
  const { user, logout, selectedProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out successfully');
      navigate('/login');
    } catch {
      toast.error('Failed to log out');
    }
  };

  const params = new URLSearchParams(location.search);
  const tab = params.get('tab');

  const [companyLogo, setCompanyLogo] = useState(() => {
    try { return localStorage.getItem('school_crm_cached_logo') || ''; } catch { return ''; }
  });
  const [companyName, setCompanyName] = useState(() => {
    try { return localStorage.getItem('school_crm_cached_name') || 'Qelvora School CRM'; } catch { return 'Qelvora School CRM'; }
  });
  const [logoSubtext, setLogoSubtext] = useState(() => {
    try { return localStorage.getItem('school_crm_cached_subtext') || ''; } catch { return ''; }
  });

  const loadSidebarSettings = () => {
    getCompanySettings().then(res => {
      if (res?.data) {
        if (res.data.schoolLogo) { setCompanyLogo(res.data.schoolLogo); try { localStorage.setItem('school_crm_cached_logo', res.data.schoolLogo); } catch {} }
        if (res.data.schoolName) { setCompanyName(res.data.schoolName); try { localStorage.setItem('school_crm_cached_name', res.data.schoolName); } catch {} }
        if (res.data.logoSubtext) { setLogoSubtext(res.data.logoSubtext); try { localStorage.setItem('school_crm_cached_subtext', res.data.logoSubtext); } catch {} }
      }
    }).catch(() => {});
  };

  useEffect(() => {
    loadSidebarSettings();
    window.addEventListener('schoolSettingsUpdated', loadSidebarSettings);
    return () => window.removeEventListener('schoolSettingsUpdated', loadSidebarSettings);
  }, []);

  // Close mobile drawer on route change
  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname, location.search]);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (isMobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileOpen]);

  const renderSidebarBrandTitle = (name, subtext) => {
    if (subtext && subtext.trim()) {
      return (
        <div className="flex flex-col min-w-0 justify-center">
          <span className="text-sm font-black text-white tracking-tight leading-tight uppercase truncate">
            {name || 'Qelvora School CRM'}
          </span>
          <span className="text-[9.5px] font-extrabold text-[#93C5FD] uppercase tracking-wider leading-tight mt-0.5 line-clamp-2">
            {subtext}
          </span>
        </div>
      );
    }

    const text = name || 'Qelvora School CRM';
    const words = text.trim().split(' ');
    
    if (words.length >= 3) {
      const mainTitle = words.slice(0, 2).join(' ');
      const subTitle = words.slice(2).join(' ');
      return (
        <div className="flex flex-col min-w-0 justify-center">
          <span className="text-sm font-black text-white tracking-tight leading-tight uppercase truncate">
            {mainTitle}
          </span>
          <span className="text-[9.5px] font-extrabold text-[#93C5FD] uppercase tracking-wider leading-tight mt-0.5 line-clamp-2">
            {subTitle}
          </span>
        </div>
      );
    }

    return (
      <div className="flex flex-col min-w-0 justify-center">
        <span className="text-sm font-black text-white tracking-tight leading-tight uppercase truncate">
          {text}
        </span>
      </div>
    );
  };

  const [isTeacherOpen, setIsTeacherOpen] = useState(
    location.pathname === '/qelvora-ai' || location.pathname === '/summary' || location.pathname === '/teacher-section'
  );

  const [isAdminOpen, setIsAdminOpen] = useState(
    location.pathname === '/admin'
  );

  const [isSafePickupOpen, setIsSafePickupOpen] = useState(
    location.pathname === '/safe-pickup' || location.pathname === '/parent'
  );

  const [isFeesOpen, setIsFeesOpen] = useState(
    location.pathname === '/fees'
  );

  const [isPromotionOpen, setIsPromotionOpen] = useState(
    location.pathname === '/student-promotion' || location.pathname === '/promotion' || location.pathname === '/alumni'
  );

  const [isExamOpen, setIsExamOpen] = useState(
    location.pathname.startsWith('/examination')
  );

  const [isOnlineExamOpen, setIsOnlineExamOpen] = useState(
    location.pathname.startsWith('/online-exam')
  );

  const [isStudentAttendanceOpen, setIsStudentAttendanceOpen] = useState(
    location.pathname.startsWith('/student-attendance')
  );

  useEffect(() => {
    if (location.pathname === '/safe-pickup' || location.pathname === '/parent') {
      setIsSafePickupOpen(true);
    }
    if (location.pathname === '/fees') {
      setIsFeesOpen(true);
    }
    if (location.pathname === '/student-promotion' || location.pathname === '/promotion' || location.pathname === '/alumni') {
      setIsPromotionOpen(true);
    }
    if (location.pathname.startsWith('/examination')) {
      setIsExamOpen(true);
    }
    if (location.pathname.startsWith('/online-exam')) {
      setIsOnlineExamOpen(true);
    }
    if (location.pathname.startsWith('/student-attendance')) {
      setIsStudentAttendanceOpen(true);
    }
    if (location.pathname === '/qelvora-ai' || location.pathname === '/summary' || location.pathname === '/teacher-section') {
      setIsTeacherOpen(true);
    }
    if (location.pathname === '/admin') {
      setIsAdminOpen(true);
    }
  }, [location.pathname]);

  const getStudentAttendanceSubLinkClass = (tabName, defaultTab = false) => {
    const isCurrent =
      location.pathname.startsWith('/student-attendance') &&
      ((!tab && defaultTab) || tab === tabName);
    return `w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-150 ${
      isCurrent
        ? 'text-[#172B4D] bg-[#DBEAFE] font-bold shadow-xs'
        : 'text-[#F3F6FC] hover:text-white hover:bg-[#29456D]'
    }`;
  };

  const getOnlineExamSubLinkClass = (tabName, defaultTab = false) => {
    const isCurrent =
      location.pathname.startsWith('/online-exam') &&
      ((!tab && defaultTab) || tab === tabName);
    return `w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-150 ${
      isCurrent
        ? 'text-[#172B4D] bg-[#DBEAFE] font-bold shadow-xs'
        : 'text-[#F3F6FC] hover:text-white hover:bg-[#29456D]'
    }`;
  };

  const getFeesSubLinkClass = (tabName, defaultForFees = false) => {
    const base = "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-150";
    const isFeesActive = location.pathname === '/fees';
    const isMatch = isFeesActive && (tab === tabName || (!tab && defaultForFees));
    if (isMatch) {
      return `${base} text-[#172B4D] bg-[#DBEAFE] font-bold shadow-xs`;
    }
    return `${base} text-[#F3F6FC] hover:text-white hover:bg-[#29456D]`;
  };

  const getPromotionSubLinkClass = (tabName, defaultForPromotion = false) => {
    const base = "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-150";
    const isPromotionActive = location.pathname === '/student-promotion' || location.pathname === '/promotion' || location.pathname === '/alumni';
    const isMatch = (location.pathname === '/alumni' && tabName === 'alumni') || (isPromotionActive && (tab === tabName || (!tab && defaultForPromotion)));
    if (isMatch) {
      return `${base} text-[#172B4D] bg-[#DBEAFE] font-bold shadow-xs`;
    }
    return `${base} text-[#F3F6FC] hover:text-white hover:bg-[#29456D]`;
  };

  const isDashboardActive = location.pathname === '/dashboard';
  const isTeacherSectionActive = location.pathname === '/qelvora-ai' || location.pathname === '/summary' || location.pathname === '/teacher-section';
  const isAdminSectionActive = location.pathname === '/admin';

  const getLinkClass = (path, isSpecialActive = false) => {
    const base = "w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 group";
    const isActive = isSpecialActive || (location.pathname === path && !isDashboardActive && !isSpecialActive);
    
    if (isActive) {
      return `${base} text-[#172B4D] bg-[#DBEAFE] font-bold shadow-xs`;
    }
    return `${base} text-[#F3F6FC] hover:text-white hover:bg-[#29456D]`;
  };

  const getSubLinkClass = (tabName, defaultForAdmin = false) => {
    const base = "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-150";
    const isFeedbackMatch = (tabName === 'recordings' || tabName === 'feedbacks' || tabName === 'feedback') && (tab === 'recordings' || tab === 'feedbacks' || tab === 'feedback');
    const isActive = location.pathname === '/admin' && (tab === tabName || (!tab && defaultForAdmin) || isFeedbackMatch);

    if (isActive) {
      return `${base} text-[#172B4D] bg-[#DBEAFE] font-bold shadow-xs`;
    }
    return `${base} text-[#F3F6FC] hover:text-white hover:bg-[#29456D]`;
  };

  const getSafePickupSubLinkClass = (targetTab) => {
    const base = "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-150";
    const isCurrentSafePickup = location.pathname === '/safe-pickup' || location.pathname === '/parent';
    const isMatch = targetTab === 'student-panel'
      ? (isCurrentSafePickup && (!tab || tab === 'student-panel' || tab === 'departure' || tab === 'profile' || tab === 'pickup-request'))
      : (isCurrentSafePickup && (tab === 'teacher-panel' || tab === 'logs'));

    if (isMatch) {
      return `${base} text-[#172B4D] bg-[#DBEAFE] font-bold shadow-xs`;
    }
    return `${base} text-[#F3F6FC] hover:text-white hover:bg-[#29456D]`;
  };

  const getTeacherSubLinkClass = (tabName, customPath = null) => {
    const base = "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-150";
    const isActive = customPath 
      ? location.pathname === customPath 
      : (location.pathname === '/teacher-section' && tab === tabName);

    if (isActive) {
      return `${base} text-[#172B4D] bg-[#DBEAFE] font-bold shadow-xs`;
    }
    return `${base} text-[#F3F6FC] hover:text-white hover:bg-[#29456D]`;
  };

  const handleLinkClick = () => {
    if (isMobileOpen) {
      setIsMobileOpen(false);
    }
  };

  // ── ROLE DEFINITIONS ──
  const userRoleLower = user?.role?.toLowerCase() || '';
  const isAdmin =
    userRoleLower.includes('admin') ||
    userRoleLower === 'principal' ||
    userRoleLower === 'superadmin' ||
    Boolean(user?.isAdmin) ||
    Boolean(user?.grantAdminPrivilege);

  const hasPermission = (key) => {
    if (isAdmin) return true;
    if (Array.isArray(user?.permissions)) {
      return user.permissions.includes(key) || user.permissions.includes('all');
    }
    return false;
  };

  const hasAnyAdminPermission =
    isAdmin ||
    (Array.isArray(user?.permissions) &&
      user.permissions.some(p =>
        ['admin_panel', 'student_attendance', 'fees_management', 'student_promotion', 'examination', 'online_exam', 'safe_pickup', 'attendance'].includes(p)
      ));
  const isTeacher =
    !isAdmin &&
    (userRoleLower === 'teacher' ||
      userRoleLower.includes('teacher') ||
      userRoleLower.includes('educator') ||
      userRoleLower.includes('faculty') ||
      userRoleLower === 'department head' ||
      userRoleLower === 'hod');
  const isParentOrStudent =
    !isAdmin &&
    !isTeacher &&
    (userRoleLower === 'parent' ||
      userRoleLower === 'student' ||
      userRoleLower.includes('parent') ||
      userRoleLower.includes('student') ||
      selectedProfile === 'parent' ||
      selectedProfile === 'student');

  // ── REUSABLE NAVIGATION LIST (STRICTLY ROLE-ISOLATED) ──
  const renderNavList = () => {
    return (
      <div className="space-y-6">
        {/* ── MAIN MENU SECTION ── */}
        <div className="space-y-1">
          <span className="text-[10px] font-black text-[#93C5FD] uppercase tracking-widest block px-3 mb-2 opacity-90">
            {t('menu') || 'MENU'}
          </span>
          
          <Link
            to="/dashboard"
            onClick={handleLinkClick}
            className={getLinkClass('/dashboard', isDashboardActive)}
          >
            <LayoutDashboard className={`w-4 h-4 shrink-0 ${isDashboardActive ? 'text-blue-400' : 'text-slate-500'}`} />
            <span>{t('dashboard')}</span>
          </Link>

          {/* Admin Attendance & Kiosk Links */}
          {(isAdmin || hasPermission('attendance')) && (
            <>
              <Link
                to="/attendance"
                onClick={handleLinkClick}
                className={getLinkClass('/attendance')}
              >
                <ClipboardCheck className={`w-4 h-4 shrink-0 ${location.pathname === '/attendance' ? 'text-blue-400' : 'text-slate-500'}`} />
                <span>{t('attendance') || 'Attendance System'}</span>
              </Link>

              <Link
                to="/reports"
                onClick={handleLinkClick}
                className={getLinkClass('/reports', location.pathname === '/reports' || location.pathname === '/daily-reports')}
              >
                <FileSpreadsheet className={`w-4 h-4 shrink-0 ${location.pathname === '/reports' || location.pathname === '/daily-reports' ? 'text-blue-400' : 'text-slate-500'}`} />
                <span>{t('reports') || 'Reports'}</span>
              </Link>

              <Link
                to="/ai-assist"
                onClick={handleLinkClick}
                className={getLinkClass('/ai-assist')}
              >
                <Sparkles className={`w-4 h-4 shrink-0 ${location.pathname === '/ai-assist' ? 'text-blue-400' : 'text-slate-500'}`} />
                <span>{t('ai_assist') || 'AI Assist'}</span>
              </Link>
            </>
          )}

          {/* Teacher Quick Attendance Link */}
          {isTeacher && (
            <Link
              to="/teacher-section?tab=attendance"
              onClick={handleLinkClick}
              className={getTeacherSubLinkClass('attendance')}
            >
              <UserCheck className={`w-4 h-4 shrink-0 ${location.pathname === '/teacher-section' && tab === 'attendance' ? 'text-blue-400' : 'text-slate-500'}`} />
              <span>{t('my_attendance') || 'Mark Attendance'}</span>
            </Link>
          )}
        </div>

        {/* ── TEACHER ONLY SECTION (VISIBLE ONLY WHEN LOGGED IN AS TEACHER) ── */}
        {isTeacher && (
          <div className="space-y-1 pt-2 border-t border-[#29456D]">
            <span className="text-[10px] font-black text-[#93C5FD] uppercase tracking-widest block px-3 mb-2 opacity-90">
              {t('teacher_system') || 'TEACHER_SYSTEM'}
            </span>
            
            <button
              type="button"
              onClick={() => { setIsTeacherOpen(prev => !prev); if (!location.pathname.startsWith('/teacher-section') && location.pathname !== '/qelvora-ai' && location.pathname !== '/summary') { navigate('/teacher-section'); } }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 cursor-pointer ${
                isTeacherSectionActive 
                  ? 'text-indigo-950 bg-slate-100 font-bold' 
                  : 'text-[#F3F6FC] hover:text-white hover:bg-[#29456D]'
              }`}
            >
              <div className="flex items-center gap-3">
                <GraduationCap className="w-4 h-4 text-[#F3F6FC] shrink-0" />
                <span>{t('teacher_portal') || 'Teacher Portal'}</span>
              </div>
              <ChevronDown className={`w-4 h-4 text-[#CBD5E1] transition-transform duration-200 ${isTeacherOpen ? 'rotate-180' : ''}`} />
            </button>

            {isTeacherOpen && (
              <div className="pl-3 space-y-1 mt-1 border-l-2 border-[#29456D] ml-5 animate-fadeIn">
                <Link
                  to="/qelvora-ai"
                  onClick={handleLinkClick}
                  className={getTeacherSubLinkClass(null, '/qelvora-ai')}
                >
                  <FileText className="w-3.5 h-3.5 text-current shrink-0" />
                  <span className="font-bold text-current">{t('question_paper') || 'Paper Generator (AI)'}</span>
                </Link>

                <Link
                  to="/summary"
                  onClick={handleLinkClick}
                  className={getTeacherSubLinkClass(null, '/summary')}
                >
                  <BookMarked className="w-3.5 h-3.5 shrink-0" />
                  <span>{t('summary') || 'Topic & Lessons'}</span>
                </Link>

                <Link
                  to="/teacher-section?tab=profile"
                  onClick={handleLinkClick}
                  className={getTeacherSubLinkClass('profile')}
                >
                  <UsersRound className="w-3.5 h-3.5 shrink-0" />
                  <span>{t('my_profile') || 'Teacher Profile'}</span>
                </Link>

                <Link
                  to="/teacher-section?tab=timetable"
                  onClick={handleLinkClick}
                  className={getTeacherSubLinkClass('timetable')}
                >
                  <CalendarDays className="w-3.5 h-3.5 shrink-0" />
                  <span>{t('my_timetable') || 'Teacher Timetable'}</span>
                </Link>

                <Link
                  to="/teacher-section?tab=students"
                  onClick={handleLinkClick}
                  className={getTeacherSubLinkClass('students')}
                >
                  <GraduationCap className="w-3.5 h-3.5 shrink-0" />
                  <span>{t('student_details') || 'Student Roster'}</span>
                </Link>

                <Link
                  to="/teacher-section?tab=marks"
                  onClick={handleLinkClick}
                  className={getTeacherSubLinkClass('marks')}
                >
                  <Award className="w-3.5 h-3.5 shrink-0 text-amber-500" />
                  <span>{t('marks_entry') || 'Marks Entry'}</span>
                </Link>

                <Link
                  to="/teacher-section?tab=homework"
                  onClick={handleLinkClick}
                  className={getTeacherSubLinkClass('homework')}
                >
                  <BookOpen className="w-3.5 h-3.5 shrink-0 text-blue-500" />
                  <span>{t('homework_management') || 'Homework & Tasks'}</span>
                </Link>

                <Link
                  to="/teacher-section?tab=notices"
                  onClick={handleLinkClick}
                  className={getTeacherSubLinkClass('notices')}
                >
                  <Bell className="w-3.5 h-3.5 shrink-0 text-indigo-500" />
                  <span>{t('notices_circulars') || 'Notices & Circulars'}</span>
                </Link>

                <Link
                  to="/teacher-section?tab=attendance"
                  onClick={handleLinkClick}
                  className={getTeacherSubLinkClass('attendance')}
                >
                  <UserCheck className="w-3.5 h-3.5 shrink-0" />
                  <span>{t('my_attendance') || 'Mark Attendance'}</span>
                </Link>

                <Link
                  to="/teacher-section?tab=leaves"
                  onClick={handleLinkClick}
                  className={getTeacherSubLinkClass('leaves')}
                >
                  <Calendar className="w-3.5 h-3.5 shrink-0" />
                  <span>{t('apply_leave') || 'Apply Leave'}</span>
                </Link>

                <Link
                  to="/teacher-section?tab=feedback"
                  onClick={handleLinkClick}
                  className={getTeacherSubLinkClass('feedback')}
                >
                  <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                  <span>{t('parent_reviews') || 'Parent Reviews'}</span>
                </Link>

                <Link
                  to="/examination"
                  onClick={handleLinkClick}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-150 ${
                    location.pathname.startsWith('/examination')
                      ? 'text-[#172B4D] bg-[#DBEAFE] font-bold shadow-xs'
                      : 'text-[#F3F6FC] hover:text-white hover:bg-[#29456D]'
                  }`}
                >
                  <Award className="w-3.5 h-3.5 text-current shrink-0" />
                  <span>Examination System</span>
                </Link>

                <Link
                  to="/online-exam"
                  onClick={handleLinkClick}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-150 ${
                    location.pathname.startsWith('/online-exam')
                      ? 'text-[#172B4D] bg-[#DBEAFE] font-bold shadow-xs'
                      : 'text-[#F3F6FC] hover:text-white hover:bg-[#29456D]'
                  }`}
                >
                  <MonitorPlay className="w-3.5 h-3.5 text-current shrink-0" />
                  <span>Online Exam</span>
                </Link>
              </div>
            )}
          </div>
        )}

        {/* ── ADMIN & PRIVILEGED ROLES SECTION ── */}
        {hasAnyAdminPermission && (
          <div className="space-y-1 pt-2 border-t border-[#29456D]">
            <span className="text-[10px] font-black text-[#93C5FD] uppercase tracking-widest block px-3 mb-2 opacity-90">
              {t('admin_system') || 'ADMIN_SYSTEM'}
            </span>
            
            {hasPermission('admin_panel') && (
            <>
            <button
              type="button"
              onClick={() => setIsAdminOpen(!isAdminOpen)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 cursor-pointer ${
                isAdminSectionActive 
                  ? 'text-indigo-950 bg-slate-100 font-bold' 
                  : 'text-[#F3F6FC] hover:text-white hover:bg-[#29456D]'
              }`}
            >
              <div className="flex items-center gap-3">
                <Settings className="w-4 h-4 text-[#F3F6FC] shrink-0" />
                <span>{t('admin') || 'Admin Panel'}</span>
              </div>
              <ChevronDown className={`w-4 h-4 text-[#CBD5E1] transition-transform duration-200 ${isAdminOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Submenu List */}
            {isAdminOpen && (
              <div className="pl-3 space-y-1 mt-1 border-l-2 border-[#29456D] ml-5 animate-fadeIn">
                <Link
                  to="/admin?tab=settings"
                  onClick={handleLinkClick}
                  className={getSubLinkClass('settings', true)}
                >
                  <Settings className="w-3.5 h-3.5 shrink-0" />
                  <span>Master Settings</span>
                </Link>

                <Link
                  to="/admin?tab=ai_settings"
                  onClick={handleLinkClick}
                  className={getSubLinkClass('ai_settings')}
                >
                  <Sparkles className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                  <span>AI Assistant & Usage</span>
                </Link>

                <Link
                  to="/admin?tab=roles"
                  onClick={handleLinkClick}
                  className={getSubLinkClass('roles')}
                >
                  <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                  <span>Access Privilege & Roles</span>
                </Link>

                <Link
                  to="/admin?tab=employees"
                  onClick={handleLinkClick}
                  className={getSubLinkClass('employees')}
                >
                  <UsersRound className="w-3.5 h-3.5 shrink-0" />
                  <span>Employee Management</span>
                </Link>

                <Link
                  to="/academic-management"
                  onClick={handleLinkClick}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-150 ${
                    location.pathname.startsWith('/academic-management')
                      ? 'text-[#172B4D] bg-[#DBEAFE] font-bold shadow-xs'
                      : 'text-[#F3F6FC] hover:text-white hover:bg-[#29456D]'
                  }`}
                >
                  <School className="w-3.5 h-3.5 shrink-0 text-blue-300" />
                  <span>Academic Management</span>
                </Link>

                <Link
                  to="/admin?tab=subjects"
                  onClick={handleLinkClick}
                  className={getSubLinkClass('subjects')}
                >
                  <BookOpen className="w-3.5 h-3.5 shrink-0" />
                  <span>{t('subject_management') || 'Subject Management'}</span>
                </Link>

                <Link
                  to="/admin?tab=classes"
                  onClick={handleLinkClick}
                  className={getSubLinkClass('classes')}
                >
                  <School className="w-3.5 h-3.5 shrink-0" />
                  <span>{t('class_management') || 'Class Management'}</span>
                </Link>

                <Link
                  to="/admin?tab=mappings"
                  onClick={handleLinkClick}
                  className={getSubLinkClass('mappings')}
                >
                  <Link2 className="w-3.5 h-3.5 shrink-0" />
                  <span>{t('mappings')}</span>
                </Link>

                <Link
                  to="/admin?tab=timetable"
                  onClick={handleLinkClick}
                  className={getSubLinkClass('timetable')}
                >
                  <CalendarDays className="w-3.5 h-3.5 shrink-0" />
                  <span>Timetable Management</span>
                </Link>

                <Link
                  to="/admin?tab=recordings"
                  onClick={handleLinkClick}
                  className={getSubLinkClass('recordings')}
                >
                  <MessageCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{t('feedbacks')}</span>
                </Link>

                <Link
                  to="/admin?tab=sessions"
                  onClick={handleLinkClick}
                  className={getSubLinkClass('sessions')}
                >
                  <History className="w-3.5 h-3.5 shrink-0" />
                  <span>{t('class_sessions_logs') || 'Class Sessions Logs'}</span>
                </Link>
              </div>
            )}

            </>
            )}

            {hasPermission('admin_panel') && (
            <>
            {/* Dedicated Access Privilege Menu below Admin Panel */}
            <Link
              to="/admin?tab=roles"
              onClick={handleLinkClick}
              className={getLinkClass('/admin?tab=roles', location.pathname === '/admin' && tab === 'roles')}
            >
              <ShieldCheck className={`w-4 h-4 shrink-0 ${location.pathname === '/admin' && tab === 'roles' ? 'text-blue-400' : 'text-slate-400'}`} />
              <span>Access Privilege</span>
            </Link>

            {/* Dedicated Academic Management Menu */}
            <Link
              to="/academic-management"
              onClick={handleLinkClick}
              className={getLinkClass('/academic-management', location.pathname.startsWith('/academic-management'))}
            >
              <School className={`w-4 h-4 shrink-0 ${location.pathname.startsWith('/academic-management') ? 'text-blue-400' : 'text-slate-400'}`} />
              <span>Academic Management</span>
            </Link>

            </>
            )}

            {/* Student Attendance Management Module Dropdown */}
            {hasPermission('student_attendance') && (
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => {
                  setIsStudentAttendanceOpen(!isStudentAttendanceOpen);
                  if (!location.pathname.startsWith('/student-attendance')) {
                    navigate('/student-attendance?tab=dashboard');
                    handleLinkClick();
                  }
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 cursor-pointer ${
                  location.pathname.startsWith('/student-attendance')
                    ? 'text-indigo-950 bg-slate-100 font-bold'
                    : 'text-[#F3F6FC] hover:text-white hover:bg-[#29456D]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <CalendarCheck className={`w-4 h-4 shrink-0 ${location.pathname.startsWith('/student-attendance') ? 'text-indigo-900' : 'text-slate-500'}`} />
                  <span>Student Attendance</span>
                </div>
                <ChevronDown className={`w-4 h-4 text-[#CBD5E1] transition-transform duration-200 ${isStudentAttendanceOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Student Attendance Submenu List */}
              {isStudentAttendanceOpen && (
                <div className="pl-3 space-y-1 mt-1 border-l-2 border-[#29456D] ml-5 animate-fadeIn">
                  <Link to="/student-attendance?tab=dashboard" onClick={handleLinkClick} className={getStudentAttendanceSubLinkClass('dashboard', true)}>
                    <LayoutDashboard className="w-3.5 h-3.5 shrink-0" />
                    <span>Overview & Dashboard</span>
                  </Link>
                  <Link to="/student-attendance?tab=manual" onClick={handleLinkClick} className={getStudentAttendanceSubLinkClass('manual')}>
                    <ClipboardCheck className="w-3.5 h-3.5 shrink-0" />
                    <span>Manual Attendance</span>
                  </Link>
                  <Link to="/student-attendance?tab=scan" onClick={handleLinkClick} className={getStudentAttendanceSubLinkClass('scan')}>
                    <QrCode className="w-3.5 h-3.5 shrink-0" />
                    <span>Barcode / QR Scan</span>
                  </Link>
                  <Link to="/student-attendance?tab=face" onClick={handleLinkClick} className={getStudentAttendanceSubLinkClass('face')}>
                    <ScanFace className="w-3.5 h-3.5 shrink-0" />
                    <span>Face Recognition</span>
                  </Link>
                  <Link to="/student-attendance?tab=biometrics" onClick={handleLinkClick} className={getStudentAttendanceSubLinkClass('biometrics')}>
                    <BadgeCheck className="w-3.5 h-3.5 shrink-0" />
                    <span>Face Consent & Enrollment</span>
                  </Link>
                  <Link to="/student-attendance?tab=id-cards" onClick={handleLinkClick} className={getStudentAttendanceSubLinkClass('id-cards')}>
                    <UsersRound className="w-3.5 h-3.5 shrink-0" />
                    <span>Student ID Cards</span>
                  </Link>
                  <Link to="/student-attendance?tab=reports" onClick={handleLinkClick} className={getStudentAttendanceSubLinkClass('reports')}>
                    <FileSpreadsheet className="w-3.5 h-3.5 shrink-0" />
                    <span>Registers & Reports</span>
                  </Link>
                  <Link to="/student-attendance?tab=notifications" onClick={handleLinkClick} className={getStudentAttendanceSubLinkClass('notifications')}>
                    <BellRing className="w-3.5 h-3.5 shrink-0" />
                    <span>Parent Alerts & SMS</span>
                  </Link>
                  <Link to="/student-attendance?tab=settings" onClick={handleLinkClick} className={getStudentAttendanceSubLinkClass('settings')}>
                    <Settings className="w-3.5 h-3.5 shrink-0" />
                    <span>Rules & Settings</span>
                  </Link>
                </div>
              )}
            </div>

            )}

            {/* Fees Management Module Dropdown */}
            {hasPermission('fees_management') && (
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => {
                  setIsFeesOpen(!isFeesOpen);
                  if (location.pathname !== '/fees') {
                    navigate('/fees?tab=overview');
                    handleLinkClick();
                  }
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 cursor-pointer ${
                  location.pathname === '/fees'
                    ? 'text-indigo-950 bg-slate-100 font-bold'
                    : 'text-[#F3F6FC] hover:text-white hover:bg-[#29456D]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <CreditCard className={`w-4 h-4 shrink-0 ${location.pathname === '/fees' ? 'text-indigo-900' : 'text-slate-500'}`} />
                  <span>Fees Management</span>
                </div>
                <ChevronDown className={`w-4 h-4 text-[#CBD5E1] transition-transform duration-200 ${isFeesOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Fees Submenu List */}
              {isFeesOpen && (
                <div className="pl-3 space-y-1 mt-1 border-l-2 border-[#29456D] ml-5 animate-fadeIn">
                  <Link to="/fees?tab=overview" onClick={handleLinkClick} className={getFeesSubLinkClass('overview', true)}>
                    <LayoutDashboard className="w-3.5 h-3.5 shrink-0" />
                    <span>Overview</span>
                  </Link>
                  <Link to="/fees?tab=heads" onClick={handleLinkClick} className={getFeesSubLinkClass('heads')}>
                    <Layers className="w-3.5 h-3.5 shrink-0" />
                    <span>Fee Heads</span>
                  </Link>
                  <Link to="/fees?tab=quotas" onClick={handleLinkClick} className={getFeesSubLinkClass('quotas')}>
                    <BadgePercent className="w-3.5 h-3.5 shrink-0" />
                    <span>Quota Master</span>
                  </Link>
                  <Link to="/fees?tab=structure" onClick={handleLinkClick} className={getFeesSubLinkClass('structure')}>
                    <FileText className="w-3.5 h-3.5 shrink-0" />
                    <span>Fee Structure</span>
                  </Link>
                  <Link to="/fees?tab=assign-quota" onClick={handleLinkClick} className={getFeesSubLinkClass('assign-quota')}>
                    <UsersRound className="w-3.5 h-3.5 shrink-0" />
                    <span>Assign Quota</span>
                  </Link>
                  <Link to="/fees?tab=adjustments" onClick={handleLinkClick} className={getFeesSubLinkClass('adjustments')}>
                    <Sliders className="w-3.5 h-3.5 shrink-0" />
                    <span>Student Fee Adjustment</span>
                  </Link>
                  <Link to="/fees?tab=collection" onClick={handleLinkClick} className={getFeesSubLinkClass('collection')}>
                    <IndianRupee className="w-3.5 h-3.5 shrink-0" />
                    <span>Collection</span>
                  </Link>
                  <Link to="/fees?tab=receipts" onClick={handleLinkClick} className={getFeesSubLinkClass('receipts')}>
                    <Receipt className="w-3.5 h-3.5 shrink-0" />
                    <span>Receipts</span>
                  </Link>
                  <Link to="/fees?tab=previous-balance" onClick={handleLinkClick} className={getFeesSubLinkClass('previous-balance')}>
                    <Wallet className="w-3.5 h-3.5 shrink-0" />
                    <span>Previous Year Balance</span>
                  </Link>
                  <Link to="/fees?tab=reports" onClick={handleLinkClick} className={getFeesSubLinkClass('reports')}>
                    <ClipboardCheck className="w-3.5 h-3.5 shrink-0" />
                    <span>Reports</span>
                  </Link>
                  <Link to="/fees?tab=settings" onClick={handleLinkClick} className={getFeesSubLinkClass('settings')}>
                    <Settings className="w-3.5 h-3.5 shrink-0" />
                    <span>Fee Settings</span>
                  </Link>
                </div>
              )}
            </div>

            )}

            {/* Student Promotion Module Dropdown */}
            {hasPermission('student_promotion') && (
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => {
                  setIsPromotionOpen(!isPromotionOpen);
                  if (location.pathname !== '/student-promotion' && location.pathname !== '/promotion' && location.pathname !== '/alumni') {
                    navigate('/student-promotion?tab=promote');
                    handleLinkClick();
                  }
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 cursor-pointer ${
                  location.pathname === '/student-promotion' || location.pathname === '/promotion' || location.pathname === '/alumni'
                    ? 'text-indigo-950 bg-slate-100 font-bold'
                    : 'text-[#F3F6FC] hover:text-white hover:bg-[#29456D]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <TrendingUp className={`w-4 h-4 shrink-0 ${location.pathname === '/student-promotion' || location.pathname === '/promotion' || location.pathname === '/alumni' ? 'text-indigo-900' : 'text-slate-500'}`} />
                  <span>Student Promotion</span>
                </div>
                <ChevronDown className={`w-4 h-4 text-[#CBD5E1] transition-transform duration-200 ${isPromotionOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Submenu List */}
              {isPromotionOpen && (
                <div className="pl-3 space-y-1 mt-1 border-l-2 border-[#29456D] ml-5 animate-fadeIn">
                  <Link to="/student-promotion?tab=promote" onClick={handleLinkClick} className={getPromotionSubLinkClass('promote', true)}>
                    <TrendingUp className="w-3.5 h-3.5 shrink-0" />
                    <span>Promote Students</span>
                  </Link>
                  <Link to="/student-promotion?tab=alumni" onClick={handleLinkClick} className={getPromotionSubLinkClass('alumni')}>
                    <GraduationCap className="w-3.5 h-3.5 shrink-0" />
                    <span>Graduated / Alumni</span>
                  </Link>
                  <Link to="/student-promotion?tab=history" onClick={handleLinkClick} className={getPromotionSubLinkClass('history')}>
                    <History className="w-3.5 h-3.5 shrink-0" />
                    <span>Promotion History</span>
                  </Link>
                </div>
              )}
            </div>

            )}

            {/* Examination Module Dropdown */}
            {hasPermission('examination') && (
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => {
                  setIsExamOpen(!isExamOpen);
                  if (!location.pathname.startsWith('/examination')) {
                    navigate('/examination');
                    handleLinkClick();
                  }
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 cursor-pointer ${
                  location.pathname.startsWith('/examination')
                    ? 'text-indigo-950 bg-slate-100 font-bold'
                    : 'text-[#F3F6FC] hover:text-white hover:bg-[#29456D]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Award className={`w-4 h-4 shrink-0 ${location.pathname.startsWith('/examination') ? 'text-indigo-900' : 'text-slate-500'}`} />
                  <span>Examination System</span>
                </div>
                <ChevronDown className={`w-4 h-4 text-[#CBD5E1] transition-transform duration-200 ${isExamOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Examination Submenu List */}
              {isExamOpen && (
                <div className="pl-3 space-y-1 mt-1 border-l-2 border-[#29456D] ml-5 animate-fadeIn">
                  <Link to="/examination?tab=types" onClick={handleLinkClick} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-[#F3F6FC] hover:text-white hover:bg-[#29456D]">
                    <span>1. Define Exam Type</span>
                  </Link>
                  <Link to="/examination?tab=names" onClick={handleLinkClick} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-[#F3F6FC] hover:text-white hover:bg-[#29456D]">
                    <span>2. Exam Names / Schedule</span>
                  </Link>
                  <Link to="/examination?tab=entry" onClick={handleLinkClick} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-[#F3F6FC] hover:text-white hover:bg-[#29456D]">
                    <span>3. Marks Entry</span>
                  </Link>
                  <Link to="/examination?tab=modify" onClick={handleLinkClick} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-[#F3F6FC] hover:text-white hover:bg-[#29456D]">
                    <span>4. Modify Marks (Audit)</span>
                  </Link>
                  <Link to="/examination?tab=cards" onClick={handleLinkClick} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-[#F3F6FC] hover:text-white hover:bg-[#29456D]">
                    <span>5. Marks Card / Report</span>
                  </Link>
                  <Link to="/examination?tab=individual" onClick={handleLinkClick} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-[#F3F6FC] hover:text-white hover:bg-[#29456D]">
                    <span>6. Individual Marks Details</span>
                  </Link>
                  <Link to="/examination?tab=cce" onClick={handleLinkClick} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-[#F3F6FC] hover:text-white hover:bg-[#29456D]">
                    <span>7. CCE Skills & Test Types</span>
                  </Link>
                  <Link to="/examination?tab=allocations" onClick={handleLinkClick} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-[#F3F6FC] hover:text-white hover:bg-[#29456D]">
                    <span>8. Score Sheet Allocation</span>
                  </Link>
                  <Link to="/examination?tab=analytics" onClick={handleLinkClick} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-[#F3F6FC] hover:text-white hover:bg-[#29456D]">
                    <span>9. Result Analytics & Audit</span>
                  </Link>
                </div>
              )}
            </div>

            )}

            {/* Online Exam Module Dropdown */}
            {hasPermission('online_exam') && (
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => {
                  setIsOnlineExamOpen(!isOnlineExamOpen);
                  if (!location.pathname.startsWith('/online-exam')) {
                    navigate('/online-exam?tab=dashboard');
                    handleLinkClick();
                  }
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 cursor-pointer ${
                  location.pathname.startsWith('/online-exam')
                    ? 'text-indigo-950 bg-slate-100 font-bold'
                    : 'text-[#F3F6FC] hover:text-white hover:bg-[#29456D]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <MonitorPlay className={`w-4 h-4 shrink-0 ${location.pathname.startsWith('/online-exam') ? 'text-indigo-900' : 'text-slate-500'}`} />
                  <span>Online Exam</span>
                </div>
                <ChevronDown className={`w-4 h-4 text-[#CBD5E1] transition-transform duration-200 ${isOnlineExamOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Online Exam Submenu List */}
              {isOnlineExamOpen && (
                <div className="pl-3 space-y-1 mt-1 border-l-2 border-[#29456D] ml-5 animate-fadeIn">
                  <Link to="/online-exam?tab=dashboard" onClick={handleLinkClick} className={getOnlineExamSubLinkClass('dashboard', true)}>
                    <span>1. Overview & Analytics</span>
                  </Link>
                  <Link to="/online-exam?tab=exams" onClick={handleLinkClick} className={getOnlineExamSubLinkClass('exams')}>
                    <span>2. Exam Management</span>
                  </Link>
                  <Link to="/online-exam?tab=questions" onClick={handleLinkClick} className={getOnlineExamSubLinkClass('questions')}>
                    <span>3. Question Bank</span>
                  </Link>
                  <Link to="/online-exam?tab=results" onClick={handleLinkClick} className={getOnlineExamSubLinkClass('results')}>
                    <span>4. Candidate Results</span>
                  </Link>
                  <Link to="/online-exam?tab=conduct" onClick={handleLinkClick} className={getOnlineExamSubLinkClass('conduct')}>
                    <span>5. Conduct & Preview</span>
                  </Link>
                </div>
              )}
            </div>

            )}

            {/* Safe Pickup Module Dropdown */}
            {hasPermission('safe_pickup') && (
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => {
                  setIsSafePickupOpen(!isSafePickupOpen);
                  if (location.pathname !== '/safe-pickup' && location.pathname !== '/parent') {
                    navigate('/safe-pickup?tab=student-panel');
                    handleLinkClick();
                  }
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 cursor-pointer ${
                  location.pathname === '/safe-pickup' || location.pathname === '/parent'
                    ? 'text-indigo-950 bg-slate-100 font-bold'
                    : 'text-[#F3F6FC] hover:text-white hover:bg-[#29456D]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <ShieldCheck className={`w-4 h-4 shrink-0 ${location.pathname === '/safe-pickup' || location.pathname === '/parent' ? 'text-indigo-900' : 'text-slate-500'}`} />
                  <span>Safe Pickup</span>
                </div>
                <ChevronDown className={`w-4 h-4 text-[#CBD5E1] transition-transform duration-200 ${isSafePickupOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Submenu List */}
              {isSafePickupOpen && (
                <div className="pl-3 space-y-1 mt-1 border-l-2 border-[#29456D] ml-5 animate-fadeIn">
                  <Link
                    to="/safe-pickup?tab=student-panel"
                    onClick={handleLinkClick}
                    className={getSafePickupSubLinkClass('student-panel')}
                  >
                    <GraduationCap className="w-3.5 h-3.5 text-current shrink-0" />
                    <span>Student Panel</span>
                  </Link>

                  <Link
                    to="/safe-pickup?tab=teacher-panel"
                    onClick={handleLinkClick}
                    className={getSafePickupSubLinkClass('teacher-panel')}
                  >
                    <UserCheck className="w-3.5 h-3.5 text-current shrink-0" />
                    <span>Teacher Panel</span>
                  </Link>
                </div>
              )}
            </div>
            )}
          </div>
        )}

        {/* ── STUDENT & PARENT PORTAL LINKS (NEVER VISIBLE IN ADMIN OR TEACHER PANEL) ── */}
        {!isAdmin && !isTeacher && isParentOrStudent && (
          <div className="space-y-1 pt-2 border-t border-[#29456D]">
            <span className="text-[10px] font-black text-[#93C5FD] uppercase tracking-widest block px-3 mb-2 opacity-90">
              STUDENT & PARENTS PORTAL
            </span>

            {/* 1. Student Profile & History */}
            <Link
              to="/student/profile"
              onClick={handleLinkClick}
              className={getLinkClass('/student/profile')}
            >
              <GraduationCap className="w-4 h-4 text-current shrink-0" />
              <span>Student Profile & History</span>
            </Link>

            {/* 2. Homework & Learning Map */}
            <Link
              to="/student/homework"
              onClick={handleLinkClick}
              className={getLinkClass('/student/homework')}
            >
              <BookOpen className="w-4 h-4 text-current shrink-0" />
              <span>Homework & Learning Map</span>
            </Link>

            {/* 3. Examination & Progress */}
            <Link
              to="/student/examination"
              onClick={handleLinkClick}
              className={getLinkClass('/student/examination')}
            >
              <Award className="w-4 h-4 text-current shrink-0" />
              <span>Examination & Progress</span>
            </Link>

            {/* 3b. Online Exam */}
            <Link
              to="/student/online-exam"
              onClick={handleLinkClick}
              className={getLinkClass('/student/online-exam')}
            >
              <MonitorPlay className="w-4 h-4 text-current shrink-0" />
              <span>Online Exam</span>
            </Link>

            {/* 4. Fees Due & Receipts */}
            <Link
              to="/student/fees"
              onClick={handleLinkClick}
              className={getLinkClass('/student/fees')}
            >
              <IndianRupee className="w-4 h-4 text-current shrink-0" />
              <span>Fees Due & Receipts</span>
            </Link>

            {/* 5. Safe Pickup & Campus Status */}
            <Link
              to="/student/safe-pickup"
              onClick={handleLinkClick}
              className={getLinkClass('/student/safe-pickup')}
            >
              <ShieldCheck className="w-4 h-4 text-current shrink-0" />
              <span>Safe Pickup & Campus Status</span>
            </Link>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* ── MOBILE STICKY TOP HEADER (< md) ── */}
      <header className="md:hidden sticky top-0 z-40 w-full shrink-0 bg-[#172B4D] border-b border-[#29456D] px-4 py-2.5 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center p-1 border border-[#29456D] shadow-2xs shrink-0">
            <img 
              src={companyLogo || "/logo.png"} 
              alt="Qelvora School CRM Logo" 
              className="w-full h-full object-contain" 
            />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-black text-white tracking-tight uppercase truncate max-w-[170px]">
              {companyName || 'Qelvora School CRM'}
            </span>
            <span className="text-[9px] font-extrabold text-[#DBEAFE] uppercase tracking-wider">
              {isAdmin ? 'ADMIN PORTAL' : isTeacher ? 'TEACHER PORTAL' : 'STUDENT / PARENT'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {user?.role && (
            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-[#29456D] text-white border border-[#29456D]">
              {user.role}
            </span>
          )}
          <button
            type="button"
            onClick={() => setIsMobileOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#29456D] hover:bg-[#172B4D] active:scale-95 text-white font-bold text-xs shadow-xs transition-all cursor-pointer border border-[#29456D]"
            aria-label="Open Navigation Menu"
          >
            <Menu className="w-4 h-4" />
            <span>Menu</span>
          </button>
        </div>
      </header>

      {/* ── MOBILE SLIDE-OUT DRAWER OVERLAY (< md) ── */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex animate-fadeIn">
          {/* Backdrop Blur Overlay */}
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileOpen(false)}
            aria-hidden="true"
          />

          {/* Slide-out Navigation Panel */}
          <div className="relative w-[85%] max-w-xs bg-[#172B4D] text-[#F3F6FC] h-full flex flex-col justify-between z-10 shadow-2xl border-r border-[#29456D] font-sans overflow-hidden">
            {/* Drawer Header */}
            <div className="p-4 border-b border-[#29456D] flex items-center justify-between bg-[#172B4D] shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center p-1 border border-[#29456D] shadow-2xs shrink-0">
                  <img 
                    src={companyLogo || "/logo.png"} 
                    alt="Logo" 
                    className="w-full h-full object-contain" 
                  />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-black text-white uppercase tracking-tight truncate max-w-[160px]">
                    {companyName || 'Qelvora School CRM'}
                  </span>
                  <span className="text-[9px] font-extrabold text-[#DBEAFE] uppercase tracking-wider">
                    {isAdmin ? 'ADMIN NAVIGATION' : isTeacher ? 'TEACHER NAVIGATION' : 'NAVIGATION'}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsMobileOpen(false)}
                className="p-1.5 rounded-xl text-[#F3F6FC] hover:text-white hover:bg-[#29456D] transition-colors cursor-pointer"
                aria-label="Close Navigation Menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Navigation List */}
            <div className="p-4 space-y-6 flex-1 overflow-y-auto">
              {renderNavList()}
            </div>

            {/* Mobile Footer with User Profile & Logout */}
            <div className="p-4 border-t border-[#29456D] bg-white flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-full bg-[#29456D] text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm border border-[#29456D]">
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-bold text-white truncate">
                    {user?.name || 'User'}
                  </span>
                  <span className="text-[10px] font-extrabold text-[#DBEAFE] uppercase tracking-wider truncate">
                    {user?.role || 'Admin'}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => { setIsMobileOpen(false); handleLogout(); }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-black text-white bg-red-600 hover:bg-red-700 active:bg-red-800 rounded-lg transition-all border border-red-500 shadow-md cursor-pointer active:scale-95"
              >
                <LogOut className="w-3.5 h-3.5 text-white" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DESKTOP FIXED/STICKY SIDEBAR (>= md) ── */}
      <aside className="w-72 bg-[#172B4D] text-[#F3F6FC] h-screen sticky top-0 flex-shrink-0 flex flex-col justify-between hidden md:flex border-r border-[#29456D] shadow-sm font-sans z-30">
        <div className="flex-1 flex flex-col min-h-0">
          {/* Desktop Brand Header */}
          <div className="p-5 border-b border-[#29456D] flex items-center gap-3.5 bg-[#172B4D]">
            <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center p-1.5 border border-[#29456D] shadow-xs shrink-0">
              <img 
                src={companyLogo || "/logo.png"} 
                alt="Qelvora School CRM Logo" 
                className="w-full h-full object-contain" 
              />
            </div>
            {renderSidebarBrandTitle(companyName, logoSubtext)}
          </div>

          {/* Desktop Navigation List */}
          <div className="p-4 space-y-6 flex-1 overflow-y-auto">
            {renderNavList()}
          </div>
        </div>

        {/* Desktop User Footer */}
        <div className="p-4 border-t border-[#29456D] bg-[#172B4D] flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-full bg-[#29456D] text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm border border-[#29456D]">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-white truncate">
                {user?.name || 'User'}
              </span>
              <span className="text-[10px] font-extrabold text-[#93C5FD] uppercase tracking-wider truncate">
                {user?.role || 'Admin'}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-black text-white bg-red-600 hover:bg-red-700 active:bg-red-800 rounded-lg transition-all border border-red-500 shadow-md cursor-pointer active:scale-95"
            title="Sign Out / Logout"
          >
            <LogOut className="w-3.5 h-3.5 text-white" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* ── MOBILE STICKY BOTTOM NAVIGATION BAR (< md) ── */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#172B4D]/95 backdrop-blur-md border-t border-[#29456D] py-1 px-1 flex items-center justify-around shadow-[0_-4px_16px_rgba(0,0,0,0.06)] md:hidden pb-[max(0.25rem,env(safe-area-inset-bottom))]">
        <Link
          to="/dashboard"
          onClick={() => setIsMobileOpen(false)}
          className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg text-[10px] font-bold transition-all ${
            isDashboardActive ? 'bg-[#DBEAFE] text-[#172B4D] font-black' : 'text-[#CBD5E1] hover:text-[#DBEAFE] hover:bg-[#29456D]'
          }`}
        >
          <LayoutDashboard className={`w-4 h-4 ${isDashboardActive ? 'text-[#172B4D]' : 'text-[#F3F6FC]'}`} />
          <span>Dashboard</span>
        </Link>

        {/* Admin Specific Bottom Links */}
        {isAdmin && (
          <>
            <Link
              to="/admin"
              onClick={() => setIsMobileOpen(false)}
              className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg text-[10px] font-bold transition-all ${
                isAdminSectionActive ? 'bg-[#DBEAFE] text-[#172B4D] font-black' : 'text-[#CBD5E1] hover:text-[#DBEAFE] hover:bg-[#29456D]'
              }`}
            >
              <Settings className={`w-4 h-4 ${isAdminSectionActive ? 'text-[#172B4D]' : 'text-[#F3F6FC]'}`} />
              <span>Admin</span>
            </Link>

            <Link
              to="/fees"
              onClick={() => setIsMobileOpen(false)}
              className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg text-[10px] font-bold transition-all ${
                location.pathname === '/fees' ? 'bg-[#DBEAFE] text-[#172B4D] font-black' : 'text-[#CBD5E1] hover:text-[#DBEAFE] hover:bg-[#29456D]'
              }`}
            >
              <CreditCard className={`w-4 h-4 ${location.pathname === '/fees' ? 'text-[#DBEAFE]' : 'text-[#F3F6FC]'}`} />
              <span>Fees</span>
            </Link>

            <Link
              to="/student-promotion"
              onClick={() => setIsMobileOpen(false)}
              className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg text-[10px] font-bold transition-all ${
                location.pathname === '/student-promotion' ? 'bg-[#DBEAFE] text-[#172B4D] font-black' : 'text-[#CBD5E1] hover:text-[#DBEAFE] hover:bg-[#29456D]'
              }`}
            >
              <TrendingUp className={`w-4 h-4 ${location.pathname === '/student-promotion' ? 'text-[#DBEAFE]' : 'text-[#F3F6FC]'}`} />
              <span>Promotion</span>
            </Link>
          </>
        )}

        {/* Teacher Specific Bottom Links */}
        {isTeacher && (
          <>
            <Link
              to="/teacher-section"
              onClick={() => setIsMobileOpen(false)}
              className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg text-[10px] font-bold transition-all ${
                location.pathname === '/teacher-section' ? 'bg-[#DBEAFE] text-[#172B4D] font-black' : 'text-[#CBD5E1] hover:text-[#DBEAFE] hover:bg-[#29456D]'
              }`}
            >
              <GraduationCap className={`w-4 h-4 ${location.pathname === '/teacher-section' ? 'text-[#DBEAFE]' : 'text-[#F3F6FC]'}`} />
              <span>Teacher</span>
            </Link>

            <Link
              to="/qelvora-ai"
              onClick={() => setIsMobileOpen(false)}
              className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg text-[10px] font-bold transition-all ${
                location.pathname === '/qelvora-ai' ? 'bg-[#DBEAFE] text-[#172B4D] font-black' : 'text-[#CBD5E1] hover:text-[#DBEAFE] hover:bg-[#29456D]'
              }`}
            >
              <FileText className={`w-4 h-4 ${location.pathname === '/qelvora-ai' ? 'text-[#DBEAFE]' : 'text-[#F3F6FC]'}`} />
              <span>Paper AI</span>
            </Link>

            <Link
              to="/teacher-section?tab=attendance"
              onClick={() => setIsMobileOpen(false)}
              className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg text-[10px] font-bold transition-all ${
                location.pathname === '/teacher-section' && tab === 'attendance' ? 'bg-[#DBEAFE] text-[#172B4D] font-black' : 'text-[#CBD5E1] hover:text-[#DBEAFE] hover:bg-[#29456D]'
              }`}
            >
              <UserCheck className={`w-4 h-4 ${location.pathname === '/teacher-section' && tab === 'attendance' ? 'text-[#DBEAFE]' : 'text-[#F3F6FC]'}`} />
              <span>Attendance</span>
            </Link>
          </>
        )}

        {/* Parent / Student Specific Bottom Links (NEVER VISIBLE IN ADMIN OR TEACHER PANEL) */}
        {!isAdmin && !isTeacher && isParentOrStudent && (
          <>
            <Link
              to="/student/profile"
              onClick={() => setIsMobileOpen(false)}
              className={`flex flex-col items-center gap-0.5 py-1 px-1.5 rounded-lg text-[9px] font-bold transition-all ${
                location.pathname === '/student/profile' ? 'bg-[#DBEAFE] text-[#172B4D] font-black' : 'text-[#CBD5E1] hover:text-[#DBEAFE] hover:bg-[#29456D]'
              }`}
            >
              <GraduationCap className={`w-4 h-4 ${location.pathname === '/student/profile' ? 'text-[#DBEAFE]' : 'text-[#F3F6FC]'}`} />
              <span>Profile</span>
            </Link>

            <Link
              to="/student/homework"
              onClick={() => setIsMobileOpen(false)}
              className={`flex flex-col items-center gap-0.5 py-1 px-1.5 rounded-lg text-[9px] font-bold transition-all ${
                location.pathname === '/student/homework' ? 'bg-[#DBEAFE] text-[#172B4D] font-black' : 'text-[#CBD5E1] hover:text-[#DBEAFE] hover:bg-[#29456D]'
              }`}
            >
              <BookOpen className={`w-4 h-4 ${location.pathname === '/student/homework' ? 'text-[#DBEAFE]' : 'text-[#F3F6FC]'}`} />
              <span>Homework</span>
            </Link>

            <Link
              to="/student/examination"
              onClick={() => setIsMobileOpen(false)}
              className={`flex flex-col items-center gap-0.5 py-1 px-1.5 rounded-lg text-[9px] font-bold transition-all ${
                location.pathname === '/student/examination' ? 'bg-[#DBEAFE] text-[#172B4D] font-black' : 'text-[#CBD5E1] hover:text-[#DBEAFE] hover:bg-[#29456D]'
              }`}
            >
              <Award className={`w-4 h-4 ${location.pathname === '/student/examination' ? 'text-[#DBEAFE]' : 'text-[#F3F6FC]'}`} />
              <span>Exams</span>
            </Link>

            <Link
              to="/student/online-exam"
              onClick={() => setIsMobileOpen(false)}
              className={`flex flex-col items-center gap-0.5 py-1 px-1.5 rounded-lg text-[9px] font-bold transition-all ${
                location.pathname.startsWith('/student/online-exam') ? 'bg-[#DBEAFE] text-[#172B4D] font-black' : 'text-[#CBD5E1] hover:text-[#DBEAFE] hover:bg-[#29456D]'
              }`}
            >
              <MonitorPlay className={`w-4 h-4 ${location.pathname.startsWith('/student/online-exam') ? 'text-[#DBEAFE]' : 'text-[#F3F6FC]'}`} />
              <span>Online</span>
            </Link>

            <Link
              to="/student/fees"
              onClick={() => setIsMobileOpen(false)}
              className={`flex flex-col items-center gap-0.5 py-1 px-1.5 rounded-lg text-[9px] font-bold transition-all ${
                location.pathname === '/student/fees' ? 'bg-[#DBEAFE] text-[#172B4D] font-black' : 'text-[#CBD5E1] hover:text-[#DBEAFE] hover:bg-[#29456D]'
              }`}
            >
              <IndianRupee className={`w-4 h-4 ${location.pathname === '/student/fees' ? 'text-[#DBEAFE]' : 'text-[#F3F6FC]'}`} />
              <span>Fees</span>
            </Link>

            <Link
              to="/student/safe-pickup"
              onClick={() => setIsMobileOpen(false)}
              className={`flex flex-col items-center gap-0.5 py-1 px-1.5 rounded-lg text-[9px] font-bold transition-all ${
                location.pathname === '/student/safe-pickup' ? 'bg-[#DBEAFE] text-[#172B4D] font-black' : 'text-[#CBD5E1] hover:text-[#DBEAFE] hover:bg-[#29456D]'
              }`}
            >
              <ShieldCheck className={`w-4 h-4 ${location.pathname === '/student/safe-pickup' ? 'text-[#DBEAFE]' : 'text-[#F3F6FC]'}`} />
              <span>Pickup</span>
            </Link>
          </>
        )}

        {/* All Pages Button */}
        <button
          type="button"
          onClick={() => setIsMobileOpen(true)}
          className="flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg text-[10px] font-bold text-[#CBD5E1] hover:text-white cursor-pointer"
        >
          <Menu className="w-4 h-4 text-[#F3F6FC]" />
          <span>All Pages</span>
        </button>
      </nav>
    </>
  );
};

export default Sidebar;
