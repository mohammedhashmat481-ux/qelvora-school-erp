/**
 * Navbar component with authentication-aware navigation.
 * Fully responsive — hamburger menu on mobile, inline links on desktop.
 * Velzon Premium Style. Active page is highlighted with teal.
 */
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { 
  changePassword, 
  updateProfilePhoto,
  getCompanySettings,
  updateCompanySettings,
  geocodeLocation
} from '../../services/authService';
import { QRCodeSVG } from 'qrcode.react';
import useGeolocation from '../../hooks/useGeolocation';
import { reverseGeocodeClient } from '../../utils/geocodeClient';
import toast from 'react-hot-toast';
import { 
  MapPin, 
  History as HistoryIcon, 
  LogOut, 
  FileText, 
  BookMarked, 
  Video, 
  Globe, 
  User, 
  KeyRound, 
  ChevronDown 
} from 'lucide-react';

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();
  const currentLang = i18n.language?.substring(0, 2) || 'en';
  
  const handleLanguageChange = (e) => {
    const newLang = e.target.value;
    i18n.changeLanguage(newLang);
    localStorage.setItem('i18nextLng', newLang);
    document.documentElement.lang = newLang;
    window.dispatchEvent(new Event('languageChanged'));
  };

  return (
    <div className="relative inline-flex items-center">
      <select 
        className="text-xs bg-white text-[#172B4D] border border-[#29456D] rounded-lg px-3 py-1.5 outline-none focus:ring-1 focus:ring-[#93C5FD] font-semibold cursor-pointer shadow-xs hover:bg-[#DBEAFE] transition-all"
        value={currentLang} 
        onChange={handleLanguageChange}
      >
        <option value="en" className="bg-white text-[#172B4D]">🇺🇸 English</option>
        <option value="kn" className="bg-white text-[#172B4D]">🇮🇳 ಕನ್ನಡ (Kannada)</option>
        <option value="hi" className="bg-white text-[#172B4D]">🇮🇳 हिंदी (Hindi)</option>
        <option value="bn" className="bg-white text-[#172B4D]">🇮🇳 বাংলা (Bengali)</option>
        <option value="mr" className="bg-white text-[#172B4D]">🇮🇳 मराठी (Marathi)</option>
        <option value="te" className="bg-white text-[#172B4D]">🇮🇳 తెలుగు (Telugu)</option>
      </select>
    </div>
  );
};

const Navbar = () => {
  const { isAuthenticated, isFaceVerified, user, logout, faceVerified, selectedProfile, selectProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Dynamic branding logo and name
  const [companyLogo, setCompanyLogo] = useState('');
  const [companyName, setCompanyName] = useState('QELVORA SCHOOL CRM');

  const loadNavSettings = () => {
    getCompanySettings().then(res => {
      if (res?.data) {
        if (res.data.schoolLogo) setCompanyLogo(res.data.schoolLogo);
        if (res.data.schoolName) setCompanyName(res.data.schoolName);
      }
    }).catch(() => {});
  };

  useEffect(() => {
    loadNavSettings();
    window.addEventListener('schoolSettingsUpdated', loadNavSettings);
    return () => window.removeEventListener('schoolSettingsUpdated', loadNavSettings);
  }, []);

  // Open profile modal via custom event from sidebar
  useEffect(() => {
    const handleOpenProfile = () => setProfileModalOpen(true);
    window.addEventListener('openProfileModal', handleOpenProfile);
    return () => window.removeEventListener('openProfileModal', handleOpenProfile);
  }, []);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [dropdownRect, setDropdownRect] = useState(null);
  const dropdownRef = useRef(null);
  const triggerRef = useRef(null);

  // Profile and Modal States
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [changePasswordModalOpen, setChangePasswordModalOpen] = useState(false);
  const profileDropdownRef = useRef(null);

  // Form states for password change
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');
  const [pwSubmitting, setPwSubmitting] = useState(false);

  // Profile Photo Upload state
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoError, setPhotoError] = useState('');

  // Live Geolocation and Address resolution states for Profile Modal
  const { position: geoPos } = useGeolocation({ watch: profileModalOpen });
  const [liveAddress, setLiveAddress] = useState(null);
  const [addressLoading, setAddressLoading] = useState(false);

  // Admin company configuration states inside profile details modal
  const [adminSettings, setAdminSettings] = useState({
    hours_per_day: 8.0,
    weekly_off: 'Sunday'
  });
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Retrieve global settings if admin when modal is opened
  useEffect(() => {
    if (profileModalOpen && (user?.role?.toLowerCase() === 'admin' || user?.isAdmin)) {
      getCompanySettings().then(res => {
        if (res?.data) {
          setAdminSettings({
            hours_per_day: res.data.hours_per_day || 8.0,
            weekly_off: res.data.weekly_off || 'Sunday'
          });
        }
      }).catch(err => console.error("Failed to load settings in profile modal:", err));
    }
  }, [profileModalOpen, user]);

  const handleSaveSettings = async () => {
    try {
      setIsSavingSettings(true);
      await updateCompanySettings({
        hours_per_day: parseFloat(adminSettings.hours_per_day),
        hours_per_week: parseFloat(adminSettings.hours_per_day) * 5,
        hours_per_month: parseFloat(adminSettings.hours_per_day) * 20,
        hours_per_year: parseFloat(adminSettings.hours_per_day) * 240,
        weekly_off: adminSettings.weekly_off
      });
      toast.success("Global school settings updated successfully!");
    } catch (err) {
      toast.error(err.message || "Failed to update settings");
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Reverse geocode live coordinates when position changes
  useEffect(() => {
    if (!geoPos || !profileModalOpen) return;
    let cancelled = false;

    const timeoutId = setTimeout(() => {
      const fetchAddr = async () => {
        setAddressLoading(true);
        try {
          const res = await geocodeLocation(geoPos.latitude, geoPos.longitude);
          if (!cancelled && res?.data && (res.data.area || res.data.road || res.data.display_name)) {
            setLiveAddress(res.data);
            setAddressLoading(false);
            return;
          }
        } catch { /* backend failed */ }

        try {
          const clientResult = await reverseGeocodeClient(geoPos.latitude, geoPos.longitude);
          if (!cancelled) setLiveAddress(clientResult);
        } catch { /* both failed */ }
        finally { if (!cancelled) setAddressLoading(false); }
      };
      fetchAddr();
    }, 500);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [
    geoPos ? Math.round(geoPos.latitude * 1000) : null,
    geoPos ? Math.round(geoPos.longitude * 1000) : null,
    profileModalOpen
  ]);

  // QR Code download helper
  const downloadQR = () => {
    const svg = document.getElementById("navbar-employee-qr-code");
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.download = `QR_${user?.employee_id || 'employee'}.png`;
      downloadLink.href = `${pngFile}`;
      downloadLink.click();
    };
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target) &&
        (!document.getElementById('inventory-portal-dropdown') || 
         !document.getElementById('inventory-portal-dropdown').contains(event.target))
      ) {
        setInventoryOpen(false);
      }

      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out successfully');
      setProfileOpen(false);
      navigate('/login');
    } catch (err) {
      toast.error('Failed to log out');
    }
  };

  const handleChangePasswordSubmit = async (e) => {
    e.preventDefault();
    setPwError('');
    setPwSuccess('');

    if (newPassword !== confirmPassword) {
      setPwError('New passwords do not match.');
      return;
    }

    if (newPassword.length < 8) {
      setPwError('Password must be at least 8 characters long.');
      return;
    }

    setPwSubmitting(true);
    try {
      await changePassword(oldPassword, newPassword);
      setPwSuccess('Password changed successfully.');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setChangePasswordModalOpen(false);
        setPwSuccess('');
      }, 1500);
    } catch (err) {
      setPwError(err.message || 'Failed to change password.');
    } finally {
      setPwSubmitting(false);
    }
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setPhotoError('Please select a valid image file.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setPhotoError('Image size should be less than 2MB.');
      return;
    }

    setPhotoUploading(true);
    setPhotoError('');

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result;
      try {
        const res = await updateProfilePhoto(base64String);
        if (res.status) {
          faceVerified({ ...user, profile_photo: base64String });
        } else {
          setPhotoError(res.message || 'Failed to upload profile photo.');
        }
      } catch (err) {
        setPhotoError(err.message || 'Error uploading profile photo.');
      } finally {
        setPhotoUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const closeMobile = () => setMobileOpen(false);

  // Helper: check if current path matches this link
  const isActive = (path) => {
    if (path === '/inventory') {
      return location.pathname.startsWith('/inventory');
    }
    return location.pathname === path;
  };

  // Desktop link classes matching shell design system (#173F35 & #F0E9DC)
  const desktopLink = (path, extra = '') => {
    const base = 'text-xs xl:text-sm font-semibold transition-all flex items-center gap-2 px-3.5 py-2 rounded-lg whitespace-nowrap flex-shrink-0';
    if (isActive(path)) {
      return `${base} text-[#172B4D] bg-[#DBEAFE] font-bold shadow-xs ${extra}`;
    }
    return `${base} text-[#F3F6FC] hover:text-[#DBEAFE] hover:bg-[#29456D] ${extra}`;
  };

  // Mobile link classes with active highlighting
  const mobileLink = (path, extra = '') => {
    const base = 'block px-4 py-2.5 text-sm font-semibold rounded-lg transition-colors';
    if (isActive(path)) {
      return `${base} text-[#172B4D] bg-[#DBEAFE] font-bold ${extra}`;
    }
    return `${base} text-[#F3F6FC] hover:bg-[#29456D] hover:text-[#DBEAFE] ${extra}`;
  };

  // Dynamic brand title renderer matching user's exact design reference
  const renderBrandTitle = (name) => {
    const text = name || 'QELVORA SCHOOL CRM';
    const words = text.trim().split(' ');
    
    if (words.length >= 3) {
      const mainTitle = words.slice(0, 2).join(' ');
      const subTitle = words.slice(2).join(' ');
      return (
        <div className="flex flex-col min-w-0 justify-center">
          <span className="text-base font-serif font-black text-white tracking-tight leading-none uppercase truncate">
            {mainTitle}
          </span>
          <span className="text-[10px] font-bold text-[#93C5FD] uppercase tracking-widest truncate mt-1">
            {subTitle}
          </span>
        </div>
      );
    }

    return (
      <div className="flex flex-col min-w-0 justify-center">
        <span className="text-base font-serif font-black text-white tracking-tight leading-tight uppercase line-clamp-2">
          {text}
        </span>
      </div>
    );
  };

  return (
    <nav className="bg-[#172B4D] shadow-xs border-b border-[#29456D] sticky top-0 z-50">
      <style>{`
        .nav-scroll::-webkit-scrollbar {
          display: none;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes scaleUp {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out forwards;
        }
        .animate-scaleUp {
          animation: scaleUp 0.15s ease-out forwards;
        }
      `}</style>
      <div className="w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between min-h-[3.5rem] sm:min-h-[4rem] py-2 items-center gap-4">
          
          {/* Logo and Brand (Visible on mobile/tablet, hidden on desktop where Sidebar brand header is visible) */}
          <Link to="/" className="flex md:hidden items-center gap-2.5 max-w-[220px] shrink-0 group py-1">
            <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center shadow-sm border border-[#29456D] p-1 shrink-0">
              <img src={companyLogo || "/logo.png"} alt="School Logo" className="w-full h-full object-contain" />
            </div>
            {renderBrandTitle(companyName)}
          </Link>

          {/* Desktop Navigation links with Lucide icons */}
          <div className="hidden md:flex items-center gap-2 overflow-x-auto py-1 nav-scroll flex-1 justify-start min-w-0">
            {isAuthenticated && isFaceVerified && (
              <>
                <Link to="/location" className={desktopLink('/location')}>
                  <MapPin className="w-4 h-4 shrink-0 text-current" />
                  <span>{t('locations')}</span>
                </Link>
                <Link to="/login-history" className={desktopLink('/login-history')}>
                  <HistoryIcon className="w-4 h-4 shrink-0 text-current" />
                  <span>{t('history')}</span>
                </Link>
                 {(user?.role?.toLowerCase() === 'teacher' || user?.role?.toLowerCase() === 'principal' || (user?.role && ['teacher', 'faculty', 'educator', 'department head', 'hod'].some(r => user.role.toLowerCase().includes(r)))) && (
                  <>
                    <Link to="/qelvora-ai" className={desktopLink('/qelvora-ai')}>
                      <FileText className="w-4 h-4 shrink-0 text-current" />
                      <span>{t('question_paper')}</span>
                    </Link>
                    <Link to="/summary" className={desktopLink('/summary')}>
                      <BookMarked className="w-4 h-4 shrink-0 text-current" />
                      <span>{t('summary')}</span>
                    </Link>
                  </>
                )}
                {user?.role?.toLowerCase() !== 'admin' && (
                  <Link to="/videos" className={desktopLink('/videos')}>
                    <Video className="w-4 h-4 shrink-0 text-current" />
                    <span>{t('classroom_recordings')}</span>
                  </Link>
                )}
              </>
            )}
            {!isAuthenticated || !isFaceVerified ? (
              <>
                <Link 
                  to="/login" 
                  className={isActive('/login') 
                    ? "px-4 py-2 text-xs xl:text-sm font-semibold text-white bg-[#29456D] hover:bg-[#172B4D] rounded-md shadow-sm whitespace-nowrap" 
                    : desktopLink('/login')}
                >
                  {t('login')}
                </Link>
                <Link 
                  to="/register" 
                  className={isActive('/register') 
                    ? "px-4 py-2 text-xs xl:text-sm font-semibold text-white bg-[#29456D] hover:bg-[#172B4D] rounded-md shadow-sm whitespace-nowrap" 
                    : desktopLink('/register')}
                >
                  {t('register')}
                </Link>
              </>
            ) : null}
          </div>

          {/* Fixed Right Actions: Language Select + Profile Menu */}
          <div className="hidden md:flex items-center gap-3.5 flex-shrink-0">
            {user?.role?.toLowerCase() === 'student' && selectedProfile && (
              <select
                className="text-xs bg-white text-[#172B4D] border border-[#29456D] rounded-md px-3 py-1.5 outline-none font-bold cursor-pointer focus:ring-1 focus:ring-[#93C5FD] hover:bg-[#DBEAFE] transition-all"
                value={selectedProfile}
                onChange={(e) => {
                  selectProfile(e.target.value);
                  toast.success(`Switched to ${e.target.value === 'student' ? 'Student' : 'Parent'} Profile`);
                  navigate('/dashboard');
                }}
              >
                <option value="student" className="bg-white text-[#172B4D]">👨‍🎓 Student</option>
                <option value="parent" className="bg-white text-[#172B4D]">👨‍👩‍👧 Parent</option>
              </select>
            )}
            <LanguageSwitcher />
            {isAuthenticated && isFaceVerified && (
              <div className="relative flex items-center">
                <button 
                  onClick={() => setProfileModalOpen(true)}
                  className="flex items-center gap-2.5 focus:outline-none bg-[#172B4D] border border-[#29456D] hover:bg-[#29456D] rounded-full px-3 py-1.5 transition-all shadow-xs"
                >
                  {user?.profile_photo ? (
                    <img 
                      src={user.profile_photo} 
                      alt={user.name} 
                      className="w-7 h-7 rounded-full object-cover border border-[#29456D]"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-[#29456D] text-white flex items-center justify-center font-bold text-xs shadow-xs border border-[#29456D]">
                      {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                  )}
                  <span className="text-xs font-bold text-white max-w-[100px] truncate">{user?.name}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-[#F3F6FC]" />
                </button>
              </div>
            )}
          </div>

          {/* Mobile Hamburguer Menu Trigger */}
          <div className="flex md:hidden items-center gap-2 flex-shrink-0">
            <LanguageSwitcher />
            {isAuthenticated && isFaceVerified && (
              <button 
                onClick={() => setProfileModalOpen(true)}
                className="w-8 h-8 rounded-full overflow-hidden border border-stone-200 flex-shrink-0 focus:outline-none shadow-sm"
              >
                {user?.profile_photo ? (
                  <img src={user.profile_photo} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-[#29456D] text-white flex items-center justify-center font-bold text-xs">
                    {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                )}
              </button>
            )}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="text-white hover:text-[#DBEAFE] focus:outline-none p-1.5 hover:bg-[#29456D] rounded-lg border border-[#29456D]"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {mobileOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                )}
              </svg>
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileOpen && (
        <div className="md:hidden bg-[#172B4D] border-t border-[#29456D] py-3 px-4 space-y-2.5 animate-fadeIn shadow-inner">
          {isAuthenticated && isFaceVerified ? (
            <>
              {user?.role?.toLowerCase() === 'student' && selectedProfile && (
                <div className="px-4 py-1.5 border-b border-stone-100">
                  <label className="block text-[9px] font-bold text-stone-400 uppercase mb-1">Active Profile</label>
                  <select
                    className="w-full text-xs bg-white text-[#172B4D] border border-[#29456D] rounded px-2 py-1.5 outline-none font-bold focus:ring-1 focus:ring-[#93C5FD] hover:bg-[#DBEAFE]"
                    value={selectedProfile}
                    onChange={(e) => {
                      selectProfile(e.target.value);
                      toast.success(`Switched to ${e.target.value === 'student' ? 'Student' : 'Parent'} Profile`);
                      navigate('/dashboard');
                      closeMobile();
                    }}
                  >
                    <option value="student" className="bg-white text-[#172B4D]">👨‍🎓 Student Profile</option>
                    <option value="parent" className="bg-white text-[#172B4D]">👨‍👩‍👧 Parent Profile</option>
                  </select>
                </div>
              )}
              <Link to="/location" onClick={closeMobile} className={mobileLink('/location')}>
                📍 {t('locations')}
              </Link>
              <Link to="/login-history" onClick={closeMobile} className={mobileLink('/login-history')}>
                🕐 {t('history')}
              </Link>
              {(user?.role?.toLowerCase() === 'teacher' || user?.role?.toLowerCase() === 'principal' || (user?.role && ['teacher', 'faculty', 'educator', 'department head', 'hod'].some(r => user.role.toLowerCase().includes(r)))) && (
                <>
                  <Link to="/qelvora-ai" onClick={closeMobile} className={mobileLink('/qelvora-ai')}>
                    📝 {t('question_paper')}
                  </Link>
                  <Link to="/summary" onClick={closeMobile} className={mobileLink('/summary')}>
                    📖 {t('summary')}
                  </Link>
                </>
              )}
              {user?.role?.toLowerCase() !== 'admin' && (
                <Link to="/videos" onClick={closeMobile} className={mobileLink('/videos')}>
                  🎥 {t('classroom_recordings')}
                </Link>
              )}
              <button
                onClick={() => {
                  closeMobile();
                  handleLogout();
                }}
                className="w-full text-left block px-4 py-2.5 text-sm font-semibold rounded-lg text-red-600 hover:bg-red-50 transition-colors"
              >
                🚪 {t('logout')}
              </button>
            </>
          ) : (
            <>
              <Link to="/login" onClick={closeMobile} className={mobileLink('/login')}>
                🔑 {t('login')}
              </Link>
              <Link to="/register" onClick={closeMobile} className={mobileLink('/register')}>
                📝 {t('register')}
              </Link>
            </>
          )}
        </div>
      )}

      {/* ── PROFILE DETAILS MODAL ── */}
      {profileModalOpen && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-[99999] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-stone-200 rounded-lg w-full max-w-2xl overflow-hidden shadow-2xl animate-scaleUp">
            {/* Header */}
            <div className="bg-stone-50/80 px-6 py-4 border-b border-stone-200 flex justify-between items-center">
              <h3 className="text-base sm:text-lg font-bold text-stone-850 flex items-center gap-2">
                <span>👤</span> Profile Details
              </h3>
              <button 
                onClick={() => setProfileModalOpen(false)}
                className="text-stone-400 hover:text-stone-700 transition-colors text-xl font-bold focus:outline-none"
              >
                &times;
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto nav-scroll text-stone-700">
              
              {/* Welcone Card Banner */}
              <div className="bg-stone-50/50 rounded-lg p-5 border border-stone-200/80 flex flex-col sm:flex-row items-center gap-6 relative overflow-hidden">
                {/* Avatar Upload */}
                <div className="relative group flex-shrink-0">
                  <div className="w-24 h-24 rounded-full overflow-hidden border border-stone-200 bg-stone-100 flex items-center justify-center shadow-sm relative">
                    {user?.profile_photo ? (
                      <img src={user.profile_photo} alt={user.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-3xl font-extrabold text-stone-400">
                        {user?.name ? user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'U'}
                      </span>
                    )}
                    {photoUploading && (
                      <div className="absolute inset-0 bg-stone-900/40 flex items-center justify-center">
                        <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    )}
                  </div>
                  
                  <label className="absolute bottom-0 right-0 bg-[#29456D] hover:bg-[#172B4D] text-white p-1.5 rounded-full cursor-pointer shadow-sm transition-all hover:scale-105">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={photoUploading} />
                  </label>
                </div>

                <div className="flex-1 text-center sm:text-left space-y-1.5 min-w-0">
                  <h4 className="text-lg font-bold text-stone-850">{user?.name}</h4>
                  <p className="text-xs text-stone-500 font-semibold">{user?.designation || 'Staff'} • {user?.profession || 'Employee'}</p>
                  <p className="text-xs text-stone-400 font-mono tracking-wider">{user?.employee_id}</p>
                  {photoError && <p className="text-xs text-red-500 mt-1">{photoError}</p>}
                  
                  <div className="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-3">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                      Face Verified
                    </span>
                    <button 
                      onClick={() => {
                        setProfileModalOpen(false);
                        setChangePasswordModalOpen(true);
                      }}
                      className="text-xs text-[#405189] hover:text-[#364574] font-bold transition-all hover:underline"
                    >
                      🔑 Change Password
                    </button>
                  </div>
                </div>
              </div>

              {/* Grid Fields */}
              <div>
                <h4 className="text-xs font-bold text-stone-500 uppercase tracking-widest mb-3">Faculty/Staff Information Profile</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 text-xs">
                  <div className="bg-stone-50 border border-stone-200/80 rounded-lg p-3">
                    <span className="text-stone-400 text-[9px] block font-bold uppercase tracking-wider mb-1">Full Name</span>
                    <span className="text-stone-800 font-semibold truncate block">{user?.name || 'N/A'}</span>
                  </div>
                  <div className="bg-stone-50 border border-stone-200/80 rounded-lg p-3">
                    <span className="text-stone-400 text-[9px] block font-bold uppercase tracking-wider mb-1">Email Address</span>
                    <span className="text-stone-800 font-semibold truncate block" title={user?.email}>{user?.email || 'N/A'}</span>
                  </div>
                  <div className="bg-stone-50 border border-stone-200/80 rounded-lg p-3">
                    <span className="text-stone-400 text-[9px] block font-bold uppercase tracking-wider mb-1">Phone Number</span>
                    <span className="text-stone-800 font-semibold block">{user?.phone || 'N/A'}</span>
                  </div>
                  <div className="bg-stone-50 border border-stone-200/80 rounded-lg p-3">
                    <span className="text-stone-400 text-[9px] block font-bold uppercase tracking-wider mb-1">Faculty/Staff ID</span>
                    <span className="text-stone-850 font-bold block">{user?.employee_id || 'N/A'}</span>
                  </div>
                  <div className="bg-stone-50 border border-stone-200/80 rounded-lg p-3">
                    <span className="text-stone-400 text-[9px] block font-bold uppercase tracking-wider mb-1">Designation</span>
                    <span className="text-stone-800 font-semibold block truncate">{user?.designation || 'Staff'}</span>
                  </div>
                  <div className="bg-stone-50 border border-stone-200/80 rounded-lg p-3">
                    <span className="text-stone-400 text-[9px] block font-bold uppercase tracking-wider mb-1">Joining Date</span>
                    <span className="text-stone-800 font-semibold block">{user?.joining_date || 'N/A'}</span>
                  </div>
                  <div className="bg-stone-50 border border-stone-200/80 rounded-lg p-3">
                    <span className="text-stone-400 text-[9px] block font-bold uppercase tracking-wider mb-1">Work Hours / Day</span>
                    <span className="text-stone-800 font-semibold block">{user?.hours_per_day || 8} hours</span>
                  </div>
                  <div className="bg-stone-50 border border-stone-200/80 rounded-lg p-3">
                    <span className="text-stone-400 text-[9px] block font-bold uppercase tracking-wider mb-1">Weekly Off</span>
                    <span className="text-stone-800 font-semibold block">{user?.weekly_off || 'Sunday'}</span>
                  </div>
                  <div className="bg-stone-50 border border-stone-200/80 rounded-lg p-3">
                    <span className="text-stone-400 text-[9px] block font-bold uppercase tracking-wider mb-1">Insurance ID</span>
                    <span className="text-[#405189] font-bold block">{user?.insurance_id || 'Not Assigned'}</span>
                  </div>
                  <div className="bg-stone-50 border border-stone-200/80 rounded-lg p-3">
                    <span className="text-stone-400 text-[9px] block font-bold uppercase tracking-wider mb-1">Insurance Provider</span>
                    <span className="text-stone-800 font-semibold block truncate">{user?.insurance_provider || 'Not Assigned'}</span>
                  </div>
                  <div className="bg-stone-50 border border-stone-200/80 rounded-lg p-3">
                    <span className="text-stone-400 text-[9px] block font-bold uppercase tracking-wider mb-1">Member Since</span>
                    <span className="text-stone-800 font-semibold block">
                      {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                  <div className="bg-stone-50 border border-stone-200/80 rounded-lg p-3">
                    <span className="text-stone-400 text-[9px] block font-bold uppercase tracking-wider mb-1">Account Role</span>
                    <span className="text-stone-800 font-semibold block truncate">
                      {user?.role?.toLowerCase() === 'admin' || user?.isAdmin
                        ? 'Admin (Full Access)'
                        : user?.role
                          ? user.role.charAt(0).toUpperCase() + user.role.slice(1).toLowerCase()
                          : 'Employee (Standard)'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Employee QR Code Section */}
              {user?.employee_id && (
                <div className="bg-stone-50 border border-stone-200/80 rounded-lg p-5 text-center">
                  <h4 className="text-xs font-bold text-stone-600 uppercase tracking-widest mb-2">My ID QR Code</h4>
                  <p className="text-[11px] text-stone-450 mb-4">Scan this code at the school logout kiosk to complete your authentication</p>
                  <div className="inline-block bg-white p-3.5 rounded-lg shadow-sm border border-stone-200">
                    <QRCodeSVG
                      id="navbar-employee-qr-code"
                      value={JSON.stringify({
                        employee_id: user.employee_id,
                        name: user.name,
                        email: user.email,
                        phone: user.phone,
                        profession: user.profession || user.designation || '',
                        designation: user.designation || '',
                      })}
                      size={140}
                      level="H"
                      includeMargin={true}
                      bgColor="#ffffff"
                      fgColor="#212529"
                    />
                  </div>
                  <div className="mt-4 flex flex-col items-center gap-2">
                    <span className="text-xs text-stone-500 font-mono font-semibold">{user.employee_id}</span>
                    <button
                      type="button"
                      onClick={downloadQR}
                      className="px-4 py-2 bg-[#29456D] hover:bg-[#172B4D] text-white text-xs font-bold rounded flex items-center gap-1.5 transition-all shadow-sm"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Download My QR Code
                    </button>
                  </div>
                </div>
              )}

              {/* Global School Settings (Admin Only) */}
              {(user?.role?.toLowerCase() === 'admin' || user?.role?.toLowerCase() === 'principal' || user?.role?.toLowerCase() === 'teacher' || user?.isAdmin) && (
                <div className="bg-stone-50 border border-stone-200/80 rounded-lg p-5">
                  <h4 className="text-xs font-bold text-stone-600 uppercase tracking-widest mb-3.5 flex items-center gap-1">
                    <span>⚙️</span> Global School Settings
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">Daily School Hours</label>
                      <input
                        type="number"
                        step="0.5"
                        min="1"
                        max="24"
                        value={adminSettings.hours_per_day}
                        onChange={(e) => setAdminSettings({ ...adminSettings, hours_per_day: e.target.value })}
                        className="w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-stone-800 text-xs outline-none focus:border-[#29456D]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">Weekly Off Days</label>
                      <input
                        type="text"
                        value={adminSettings.weekly_off}
                        onChange={(e) => setAdminSettings({ ...adminSettings, weekly_off: e.target.value })}
                        placeholder="e.g. Sunday"
                        className="w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-stone-800 text-xs outline-none focus:border-[#29456D]"
                      />
                    </div>
                  </div>
                  <div className="mt-4 flex justify-end">
                    <button
                      type="button"
                      onClick={handleSaveSettings}
                      disabled={isSavingSettings}
                      className="px-4 py-2 bg-[#29456D] hover:bg-[#172B4D] text-white text-xs font-bold rounded transition-all disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {isSavingSettings ? (
                        <><span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span> Saving...</>
                      ) : (
                        'Save Global Configuration'
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Session & Location Info */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-stone-500 uppercase tracking-widest">Session & Location Intelligence</h4>
                
                {/* Login & Last Logout Times */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <span className="text-green-700 font-bold uppercase tracking-wider block mb-1">Login Time</span>
                    <span className="text-stone-800 font-semibold font-mono">
                      {user?.last_login_at ? new Date(user.last_login_at).toLocaleString() : 'N/A'}
                    </span>
                  </div>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <span className="text-red-700 font-bold uppercase tracking-wider block mb-1">Last Logout Time</span>
                    <span className="text-stone-800 font-semibold font-mono">
                      {user?.last_logout_at ? new Date(user.last_logout_at).toLocaleString() : 'N/A'}
                    </span>
                  </div>
                </div>

                {/* GPS Addresses */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {/* Live Location */}
                  <div className="bg-stone-50 border border-stone-200/80 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`w-2 h-2 rounded-full ${geoPos ? 'bg-blue-500 animate-pulse' : 'bg-stone-400'}`} />
                      <span className="font-bold text-stone-600 uppercase tracking-wider">Live Location address</span>
                    </div>
                    {addressLoading || !geoPos ? (
                      <div className="py-2 text-stone-400 italic text-[11px]">
                        {geoPos ? 'Resolving live coordinates...' : 'Acquiring GPS signal...'}
                      </div>
                    ) : liveAddress ? (
                      <div className="space-y-1.5">
                        <p className="text-stone-800 leading-snug">{liveAddress.display_name || 'Address Not Found'}</p>
                        <p className="text-[10px] text-stone-500 font-mono">
                          {geoPos.latitude.toFixed(6)}, {geoPos.longitude.toFixed(6)}
                          {geoPos.accuracy && ` (±${Math.round(geoPos.accuracy)}m)`}
                        </p>
                      </div>
                    ) : (
                      <p className="text-stone-400 italic text-[11px]">Live location details not available</p>
                    )}
                  </div>

                  {/* Registered Location */}
                  <div className="bg-stone-50 border border-stone-200/80 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-2 h-2 rounded-full bg-[#29456D]" />
                      <span className="font-bold text-stone-600 uppercase tracking-wider">Registered School Location</span>
                    </div>
                    {user?.registered_location ? (
                      <div className="space-y-1.5">
                        <p className="text-stone-800 leading-snug">
                          {user.registered_address?.display_name || user.registered_address?.address || user.registered_location.address || 'Office Location'}
                        </p>
                        <p className="text-[10px] text-stone-500 font-mono">
                          {Number(user.registered_location.latitude).toFixed(6)}, {Number(user.registered_location.longitude).toFixed(6)}
                        </p>
                      </div>
                    ) : (
                      <p className="text-stone-400 italic text-[11px]">No registered office location on file</p>
                    )}
                  </div>
                </div>

                {/* Range Boundary Check Status */}
                {(() => {
                  const reg = user?.registered_location;
                  const live = geoPos;
                  let dist = null;
                  let isOk = null;

                  if (reg && live && reg.latitude && live.latitude) {
                    const toRad = (d) => (d * Math.PI) / 180;
                    const R = 6371000;
                    const dLat = toRad(live.latitude - reg.latitude);
                    const dLon = toRad(live.longitude - reg.longitude);
                    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(reg.latitude)) * Math.cos(toRad(live.latitude)) * Math.sin(dLon / 2) ** 2;
                    dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                    isOk = dist <= 500;
                  }

                  return (
                    <div className={`p-4 rounded-lg border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isOk === null 
                        ? 'bg-stone-50 border-stone-200 text-stone-500' 
                        : isOk 
                          ? 'bg-blue-50 border-blue-200 text-blue-700' 
                          : 'bg-red-50 border-red-200 text-red-700'
                    }`}>
                      <div>
                        <span className="font-bold uppercase tracking-wider block mb-1">Attendance Range Authorization Status</span>
                        {dist !== null ? (
                          <span className="font-mono text-stone-650">
                            Current Distance from School: <strong className="font-extrabold">{dist < 1000 ? `${Math.round(dist)}m` : `${(dist / 1000).toFixed(2)}km`}</strong>
                          </span>
                        ) : (
                          <span className="italic text-stone-400">Awaiting live geolocation input for range verification...</span>
                        )}
                      </div>
                      {isOk !== null && (
                        <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded font-bold text-[10px] border uppercase ${
                          isOk 
                            ? 'bg-blue-100 border-blue-200 text-blue-800' 
                            : 'bg-red-100 border-red-200 text-red-800'
                        }`}>
                          {isOk ? '✓ Within Login Range' : '✗ Outside Range (Max 500m)'}
                        </span>
                      )}
                    </div>
                  );
                })()}

              </div>
              
            </div>

            {/* Footer */}
            <div className="bg-stone-50 px-6 py-4 border-t border-stone-200 flex justify-end gap-3">
              <button 
                type="button"
                onClick={() => {
                  setProfileModalOpen(false);
                  handleLogout();
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded text-sm transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
              >
                🚪 Logout
              </button>
              <button 
                type="button"
                onClick={() => setProfileModalOpen(false)}
                className="px-4 py-2 bg-[#29456D] text-white hover:bg-[#172B4D] transition-colors font-bold rounded text-sm active:scale-95 shadow-sm"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CHANGE PASSWORD MODAL ── */}
      {changePasswordModalOpen && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-[99999] flex items-center justify-center p-4">
          <form onSubmit={handleChangePasswordSubmit} className="bg-white border border-stone-200 rounded-lg w-full max-w-md overflow-hidden shadow-2xl animate-scaleUp">
            {/* Header */}
            <div className="bg-stone-50 px-6 py-4 border-b border-stone-200 flex justify-between items-center">
              <h3 className="text-base sm:text-lg font-bold text-stone-850 flex items-center gap-2">
                <span>🔑</span> Change Password
              </h3>
              <button 
                type="button"
                onClick={() => setChangePasswordModalOpen(false)}
                className="text-stone-400 hover:text-stone-700 transition-colors text-xl font-bold focus:outline-none"
              >
                &times;
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4 text-stone-700">
              {pwError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded p-3 font-semibold">
                  ⚠️ {pwError}
                </div>
              )}
              {pwSuccess && (
                <div className="bg-green-50 border border-green-200 text-green-700 text-xs rounded p-3 font-semibold">
                  ✅ {pwSuccess}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider block">Current Password</label>
                <input 
                  type="password"
                  className="w-full bg-white border border-stone-200 rounded px-3 py-2 text-stone-800 text-sm outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider block">New Password</label>
                <input 
                  type="password"
                  className="w-full bg-white border border-stone-200 rounded px-3 py-2 text-stone-800 text-sm outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider block">Confirm New Password</label>
                <input 
                  type="password"
                  className="w-full bg-white border border-stone-200 rounded px-3 py-2 text-stone-800 text-sm outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Footer */}
            <div className="bg-stone-50 px-6 py-4 border-t border-stone-200 flex justify-end gap-3">
              <button 
                type="button"
                onClick={() => setChangePasswordModalOpen(false)}
                className="px-4 py-2 border border-stone-200 text-stone-600 hover:bg-stone-100 rounded text-sm transition-colors focus:outline-none"
              >
                Cancel
              </button>
              <button 
                type="submit"
                disabled={pwSubmitting}
                className="px-4 py-2 bg-[#29456D] text-white hover:bg-[#172B4D] transition-colors font-bold rounded text-sm flex items-center gap-1.5 focus:outline-none shadow-sm"
              >
                {pwSubmitting ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                ) : 'Update Password'}
              </button>
            </div>
          </form>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
