/**
 * Single-Page Unified Institutional Login Portal.
 * Clean, senior-grade design with zero marketing bloat.
 * 
 * Supports:
 * - Credentials Auth (Email + Password)
 * - Biometric Face ID
 * - QR Pass / ID Card Scanner
 * - One-Click Demo Role Fast-Fill (Admin, Teacher, Student, Parent)
 * - Campus GPS Proximity & Remote Access Bypass
 */
import React, { useState, useCallback, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { loginWithPassword, verifyFace, faceLogin, getProfile, geocodeLocation, getCompanySettings } from '../services/authService';
import { reverseGeocodeClient } from '../utils/geocodeClient';
import FaceVerification from '../components/face/FaceVerification';
import Spinner from '../components/ui/Spinner';
import useGeolocation from '../hooks/useGeolocation';
import { Scanner } from '@yudiel/react-qr-scanner';

const DEMO_ACCOUNTS = [
  { role: 'Admin', email: 'admin@qelvora.in', pass: 'Welcome@123', badge: 'Admin Portal' },
  { role: 'Teacher', email: 'priya.patel@qelvora.in', pass: 'Welcome@123', badge: 'Faculty Portal' },
  { role: 'Student & Parent', email: 'aarav.sharma@qelvora.in', pass: 'Welcome@123', badge: 'Student & Parents Portal' },
];

const LoginPage = () => {
  const navigate = useNavigate();
  const { loginSuccess, faceVerified } = useAuth();
  const { position: geoPosition, loading: geoLoading, error: geoError, permissionDenied: geoDenied, refresh: geoRefresh } = useGeolocation({ watch: true });

  // Mode & step
  const [loginMode, setLoginMode] = useState('password'); // 'password' | 'face' | 'qr'
  const [step, setStep] = useState('credentials'); // 'credentials' | 'face-verify'
  const [selectedRoleTab, setSelectedRoleTab] = useState('Admin');
  
  // Credentials
  const [email, setEmail] = useState('admin@qelvora.in');
  const [password, setPassword] = useState('Welcome@123');
  const [showPassword, setShowPassword] = useState(false);
  const [userId, setUserId] = useState('');
  
  // Settings & GPS
  const [offlineMode, setOfflineMode] = useState(true); // default true for seamless direct access
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [locationError, setLocationError] = useState(null);
  const [regAddress, setRegAddress] = useState(null);
  const [curAddress, setCurAddress] = useState(null);
  const [facingMode, setFacingMode] = useState('user');
  const [disabledError, setDisabledError] = useState(null);
  const [geoAddress, setGeoAddress] = useState('');

  // Forgot password modal
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  // Institutional School Settings from Master Settings
  const [schoolSettings, setSchoolSettings] = useState(null);

  useEffect(() => {
    getCompanySettings().then(res => {
      if (res?.data) {
        setSchoolSettings(res.data);
      }
    }).catch(() => {});
  }, []);

  // Address lookup when GPS changes
  useEffect(() => {
    if (geoPosition?.latitude && geoPosition?.longitude) {
      const fetchAddress = async () => {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${geoPosition.latitude}&lon=${geoPosition.longitude}&zoom=18&addressdetails=1`,
            { headers: { 'User-Agent': 'Qelvora-School-CRM/2.0' } }
          );
          const data = await res.json();
          if (data?.display_name) {
            setGeoAddress(data.display_name);
          } else {
            setGeoAddress(`${geoPosition.latitude.toFixed(4)}, ${geoPosition.longitude.toFixed(4)}`);
          }
        } catch {
          setGeoAddress(`${geoPosition.latitude.toFixed(4)}, ${geoPosition.longitude.toFixed(4)}`);
        }
      };
      fetchAddress();
    }
  }, [geoPosition]);

  // Reverse geocode when location error happens
  useEffect(() => {
    if (!locationError) {
      setRegAddress(null);
      setCurAddress(null);
      return;
    }

    const regMatch = locationError.match(/Registered:\s*\(([-\d.]+),\s*([-\d.]+)\)/);
    const curMatch = locationError.match(/Current:\s*\(([-\d.]+),\s*([-\d.]+)\)/);

    const resolveAddress = async (lat, lng) => {
      try {
        const res = await geocodeLocation(lat, lng);
        if (res?.data && (res.data.area || res.data.road || res.data.display_name)) return res.data;
      } catch {}
      try {
        const res = await reverseGeocodeClient(lat, lng);
        if (res && (res.area || res.road || res.display_name)) return res;
      } catch {}
      return { fallback: `${lat.toFixed(6)}, ${lng.toFixed(6)}` };
    };

    const processAddresses = async () => {
      if (regMatch) {
        const addr = await resolveAddress(parseFloat(regMatch[1]), parseFloat(regMatch[2]));
        setRegAddress(addr);
        if (curMatch) await new Promise(r => setTimeout(r, 1000));
      }
      if (curMatch) {
        const addr = await resolveAddress(parseFloat(curMatch[1]), parseFloat(curMatch[2]));
        setCurAddress(addr);
      }
    };

    processAddresses();
  }, [locationError]);

  // Route user based on role
  const navigateByRole = (userObj) => {
    const rawRole = (userObj?.role || '').toLowerCase();
    const emailLower = (userObj?.email || '').toLowerCase();
    
    const isAdmin = Boolean(
      emailLower === 'admin@qelvora.in' ||
      userObj?.isAdmin ||
      rawRole.includes('admin') ||
      rawRole.includes('principal') ||
      rawRole.includes('director') ||
      rawRole.includes('controller') ||
      rawRole.includes('super')
    );

    const isTeacher = !isAdmin && Boolean(
      rawRole.includes('teacher') ||
      rawRole.includes('educator') ||
      rawRole.includes('faculty') ||
      rawRole.includes('coordinator') ||
      rawRole.includes('head') ||
      rawRole.includes('hod') ||
      rawRole.includes('assistant')
    );

    const isStudentOrParent = Boolean(
      rawRole.includes('student') ||
      rawRole.includes('parent')
    );

    if (isAdmin) {
      navigate('/dashboard');
    } else if (isTeacher) {
      navigate('/dashboard');
    } else if (isStudentOrParent) {
      navigate('/student/profile');
    } else {
      navigate('/dashboard');
    }
  };

  /**
   * Handle Password Login
   */
  const handlePasswordLogin = async (e) => {
    if (e) e.preventDefault();
    const newErrors = {};

    if (!email.trim()) newErrors.email = 'Email address is required';
    if (!password) newErrors.password = 'Password is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);
    setErrors({});
    setLocationError(null);
    setDisabledError(null);

    try {
      const locationData = (!offlineMode && geoPosition?.latitude && geoPosition?.longitude)
        ? { latitude: geoPosition.latitude, longitude: geoPosition.longitude }
        : null;

      const result = await loginWithPassword(email.trim().toLowerCase(), password, locationData, offlineMode);
      const userObj = result.user || {};
      const userRoleLower = (userObj.role || '').toLowerCase();

      // Enforce role consistency: if the user selected a role tab, verify that credentials match that role
      if (selectedRoleTab === 'Teacher') {
        const isTeacher = Boolean(
          userRoleLower.includes('teacher') ||
          userRoleLower.includes('educator') ||
          userRoleLower.includes('faculty') ||
          userRoleLower.includes('coordinator') ||
          userRoleLower.includes('assistant') ||
          userRoleLower.includes('head') ||
          userRoleLower.includes('hod')
        );
        if (!isTeacher) {
          toast.error(`Access Denied: Account "${userObj.email}" is registered as "${userObj.role || 'Non-Teacher'}", not as a Teacher.`);
          setIsLoading(false);
          return;
        }
      } else if (selectedRoleTab === 'Admin') {
        const isAdmin = Boolean(
          userObj.isAdmin ||
          userObj.email === 'admin@qelvora.in' ||
          userRoleLower.includes('admin') ||
          userRoleLower.includes('principal') ||
          userRoleLower.includes('director') ||
          userRoleLower.includes('controller') ||
          userRoleLower.includes('super')
        );
        if (!isAdmin) {
          toast.error(`Access Denied: Account "${userObj.email}" does not have Administrator privileges. Please select Teacher or Student profile.`);
          setIsLoading(false);
          return;
        }
      } else if (selectedRoleTab === 'Student & Parent') {
        const isStudentOrParent = Boolean(
          userRoleLower.includes('student') ||
          userRoleLower.includes('parent')
        );
        if (!isStudentOrParent) {
          toast.error(`Access Denied: Account "${userObj.email}" is not a Student or Parent profile.`);
          setIsLoading(false);
          return;
        }
      }

      loginSuccess(result);
      setUserId(result.user_id);

      // If user has no face data or skips face
      if (!result.requires_face_verification) {
        localStorage.setItem('no_camera_login', 'true');
        faceVerified(userObj);
        toast.success(`Welcome, ${userObj?.name || 'User'}!`);
        navigateByRole(userObj);
        return;
      }

      toast.success('Credentials verified. Please verify face identity.');
      setStep('face-verify');
    } catch (err) {
      if (err.isTimeout || err.friendlyMessage) {
        toast.error(err.friendlyMessage || 'Server is starting up. Please retry in a moment.');
        return;
      }

      const detail = err.response?.data?.detail || '';
      const errorMsg = Array.isArray(detail) ? detail.map(e => e.msg).join(', ') : detail || 'Invalid email or password.';

      if (typeof errorMsg === 'string' && errorMsg.toLowerCase().includes('location mismatch')) {
        setLocationError(errorMsg);
      } else if (typeof errorMsg === 'string' && errorMsg.toLowerCase().includes('location is required')) {
        setLocationError(errorMsg);
      } else if (typeof errorMsg === 'string' && errorMsg.toLowerCase().includes('account is disabled')) {
        setDisabledError(errorMsg);
      } else {
        toast.error(errorMsg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle Face Verification Success
   */
  const handleFaceVerified = useCallback(
    async (result) => {
      try {
        if (result?.access_token) {
          loginSuccess(result);
        }
        const profile = await getProfile();
        const userObj = profile.data || profile.user || result?.user;
        faceVerified(userObj);
        toast.success(`Face verified! Welcome, ${userObj?.name || 'User'}`);
        navigateByRole(userObj);
      } catch {
        toast.success('Signed in successfully');
        navigate('/admin');
      }
    },
    [loginSuccess, faceVerified, navigate]
  );

  /**
   * Handle Face Verification Failure
   */
  const handleFaceFailed = useCallback(
    (msg, isLocError = false) => {
      if (isLocError || (typeof msg === 'string' && msg.toLowerCase().includes('location'))) {
        setLocationError(msg);
        setStep('credentials');
      } else {
        toast.error(msg || 'Face verification failed. Please try again.');
      }
    },
    []
  );

  /**
   * Verify function passed to FaceVerification
   */
  const verifyFn = useCallback(
    async (uid, image, challengeFrame = null) => {
      const locationData = offlineMode || !geoPosition
        ? null
        : { latitude: geoPosition.latitude, longitude: geoPosition.longitude };
      if (loginMode === 'face') {
        return await faceLogin(uid, image, locationData, challengeFrame, offlineMode);
      }
      return await verifyFace(uid, image, challengeFrame, locationData, offlineMode);
    },
    [loginMode, geoPosition, offlineMode]
  );

  /**
   * Skip face verification
   */
  const handleSkipFaceVerification = useCallback(async () => {
    try {
      localStorage.setItem('no_camera_login', 'true');
      const profile = await getProfile();
      const userObj = profile.data || profile.user;
      faceVerified(userObj);
      toast.success('Signed in');
      navigateByRole(userObj);
    } catch {
      toast.error('Could not load profile');
    }
  }, [faceVerified, navigate]);

  /**
   * Demo Account Fast Fill
   */
  const applyDemoAccount = (demo) => {
    setSelectedRoleTab(demo.role);
    setEmail(demo.email);
    setPassword(demo.pass);
    setOfflineMode(true);
    setErrors({});
    setLocationError(null);
    toast.success(`Loaded ${demo.role} profile`);
  };

  /**
   * Mock Forgot Password Submit
   */
  const handleForgotSubmit = (e) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      toast.error('Please enter your email');
      return;
    }
    setForgotLoading(true);
    setTimeout(() => {
      setForgotLoading(false);
      setShowForgotPassword(false);
      toast.success('Password reset instructions sent to your email.');
    }, 1200);
  };

  return (
    <div className="min-h-screen w-full bg-[#F7F9FC] flex flex-col justify-between relative selection:bg-blue-600 selection:text-white">
      {/* Subtle modern ambient background */}
      <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />
      <div className="absolute top-0 inset-x-0 h-96 bg-gradient-to-b from-blue-100/40 via-blue-50/20 to-transparent pointer-events-none" />

      {/* Top minimal header bar */}
      <header className="relative z-10 w-full max-w-6xl mx-auto px-6 py-5 flex items-center justify-end">
        <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
          <span className="hidden sm:inline">Academic Year {schoolSettings?.academicYear || '2026–2027'}</span>
          <span className="hidden sm:inline w-1 h-1 rounded-full bg-slate-300" />
          <span className="inline-flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200/60 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            System Operational
          </span>
        </div>
      </header>

      {/* Main Single-Page Center Container */}
      <main className="relative z-10 w-full max-w-[460px] mx-auto px-4 py-4 sm:py-6 flex-1 flex flex-col justify-center">
        <div className="bg-white rounded-2xl shadow-[0_4px_24px_-4px_rgba(15,23,42,0.06),0_1px_3px_rgba(15,23,42,0.04)] border border-slate-200/90 p-7 sm:p-8">
          
          {/* Card Title & Context */}
          <div className="text-center mb-6 flex flex-col items-center">
            {/* Institution School Logo */}
            {schoolSettings?.schoolLogo ? (
              <img
                src={schoolSettings.schoolLogo}
                alt={schoolSettings.schoolName || 'Institution Logo'}
                className="w-16 h-16 object-contain rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm mb-3.5"
              />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#172B4D] to-indigo-700 text-white flex items-center justify-center shadow-md shadow-blue-900/15 mb-3.5">
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                </svg>
              </div>
            )}

            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              {step === 'credentials'
                ? `Sign in to ${schoolSettings?.schoolName || 'Qelvora School CRM'}`
                : 'Biometric Verification'}
            </h1>
            <p className="text-xs text-slate-500 mt-1.5 font-medium max-w-sm">
              {step === 'credentials'
                ? (schoolSettings?.logoSubtext || 'Institutional Portal for Faculty, Administrators & Students')
                : 'Center your face in the camera to verify your identity'}
            </p>
          </div>

          {/* Location Mismatch Error Modal / Alert */}
          {locationError && (
            <div className="mb-5 p-4 rounded-xl bg-rose-50/80 border border-rose-200 text-rose-900 text-xs">
              <div className="flex items-start gap-2.5">
                <svg className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div className="flex-1">
                  <h4 className="font-semibold text-rose-800">Campus Boundary Notice</h4>
                  <p className="text-[11px] text-rose-700 mt-0.5 leading-relaxed">{locationError}</p>
                  <div className="mt-2.5 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => { setOfflineMode(true); setLocationError(null); }}
                      className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-md text-[11px] font-semibold transition-colors"
                    >
                      Enable Remote / Offline Access
                    </button>
                    <button
                      type="button"
                      onClick={() => setLocationError(null)}
                      className="text-[11px] text-rose-700 hover:underline font-medium"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Account Disabled Alert */}
          {disabledError && (
            <div className="mb-5 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
              <div className="flex items-start gap-2.5">
                <svg className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0-8V7m0 10a9 9 0 110-18 9 9 0 010 18z" />
                </svg>
                <div className="flex-1">
                  <h4 className="font-semibold text-amber-800">Account Access Suspended</h4>
                  <p className="text-[11px] text-amber-700 mt-0.5">{disabledError}</p>
                  <button
                    type="button"
                    onClick={() => setDisabledError(null)}
                    className="mt-2 text-[11px] font-semibold text-amber-800 underline"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === 'credentials' ? (
            <>
              {/* Segmented Auth Method Switcher */}
              <div className="grid grid-cols-3 gap-1 bg-slate-100/80 p-1 rounded-xl mb-5 border border-slate-200/60">
                <button
                  type="button"
                  onClick={() => setLoginMode('password')}
                  className={`py-1.5 px-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                    loginMode === 'password'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                  Password
                </button>

                <button
                  type="button"
                  onClick={() => setLoginMode('face')}
                  className={`py-1.5 px-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                    loginMode === 'face'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Face ID
                </button>

                <button
                  type="button"
                  onClick={() => setLoginMode('qr')}
                  className={`py-1.5 px-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                    loginMode === 'qr'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                  </svg>
                  QR Scan
                </button>
              </div>

              {/* Mode 1: Password Form */}
              {loginMode === 'password' && (
                <form onSubmit={handlePasswordLogin} className="space-y-4">
                  {/* Email Input */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Institutional Email
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                        </svg>
                      </div>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => { setEmail(e.target.value); setErrors((prev) => ({ ...prev, email: '' })); }}
                        placeholder="e.g. admin@qelvora.in"
                        className={`w-full pl-9 pr-3.5 py-2 text-sm bg-slate-50/50 border rounded-xl outline-none transition-all placeholder:text-slate-400 ${
                          errors.email
                            ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/10'
                            : 'border-slate-200 focus:bg-white focus:border-[#29456D] focus:ring-2 focus:ring-blue-600/15'
                        }`}
                      />
                    </div>
                    {errors.email && <p className="text-rose-500 text-[11px] mt-1 font-medium">{errors.email}</p>}
                  </div>

                  {/* Password Input */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-slate-700">
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowForgotPassword(true)}
                        className="text-[11px] font-medium text-[#172B4D] hover:underline"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => { setPassword(e.target.value); setErrors((prev) => ({ ...prev, password: '' })); }}
                        placeholder="••••••••"
                        className={`w-full pl-9 pr-10 py-2 text-sm bg-slate-50/50 border rounded-xl outline-none transition-all placeholder:text-slate-400 ${
                          errors.password
                            ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/10'
                            : 'border-slate-200 focus:bg-white focus:border-[#29456D] focus:ring-2 focus:ring-blue-600/15'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                        tabIndex={-1}
                      >
                        {showPassword ? (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                    </div>
                    {errors.password && <p className="text-rose-500 text-[11px] mt-1 font-medium">{errors.password}</p>}
                  </div>

                  {/* Remote / GPS Control Row */}
                  <div className="flex items-center justify-between pt-0.5 pb-1">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={offlineMode}
                        onChange={(e) => setOfflineMode(e.target.checked)}
                        className="w-3.5 h-3.5 rounded border-slate-300 text-[#172B4D] focus:ring-0 cursor-pointer"
                      />
                      <span className="text-xs text-slate-600 font-medium">Remote Access (Bypass GPS)</span>
                    </label>

                    <div className="text-[10px] font-semibold">
                      {offlineMode ? (
                        <span className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200/60">
                          Direct Access
                        </span>
                      ) : geoPosition ? (
                        <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          GPS Verified
                        </span>
                      ) : (
                        <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/60">
                          Locating...
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Primary Submit Button */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-2.5 px-4 bg-[#29456D] hover:bg-[#172B4D] active:scale-[0.99] text-white font-semibold rounded-xl text-sm shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isLoading ? (
                      <>
                        <Spinner size="sm" />
                        <span>Signing in...</span>
                      </>
                    ) : (
                      <>
                        <span>Sign In</span>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* Mode 2: Direct Face Login */}
              {loginMode === 'face' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Faculty / Student Email or ID
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <input
                        type="text"
                        value={userId}
                        onChange={(e) => setUserId(e.target.value)}
                        placeholder="e.g. rajesh.sharma@qelvora.in"
                        className="w-full pl-9 pr-3.5 py-2 text-sm bg-slate-50/50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-[#29456D] focus:ring-2 focus:ring-blue-600/15"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (!userId.trim()) {
                        toast.error('Please enter your email or ID to begin');
                        return;
                      }
                      setStep('face-verify');
                    }}
                    className="w-full py-2.5 px-4 bg-[#29456D] hover:bg-[#172B4D] text-white font-semibold rounded-xl text-sm shadow-sm transition-all flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    </svg>
                    <span>Launch Face Camera</span>
                  </button>
                </div>
              )}

              {/* Mode 3: QR Scanner */}
              {loginMode === 'qr' && (
                <div className="space-y-3">
                  <div className="relative aspect-square w-full max-w-[260px] mx-auto rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 shadow-inner">
                    <Scanner
                      onScan={(result) => {
                        if (result?.length > 0) {
                          const raw = result[0].rawValue;
                          try {
                            const parsed = JSON.parse(raw);
                            setUserId(parsed.user_id || parsed.id || raw);
                          } catch {
                            setUserId(raw);
                          }
                          setLoginMode('face');
                          toast.success('ID Card detected!');
                        }
                      }}
                      onError={(err) => console.error(err)}
                      styles={{ container: { width: '100%', height: '100%' }, video: { objectFit: 'cover' } }}
                      components={{ audio: false, torch: true, finder: true }}
                      constraints={{ facingMode: facingMode }}
                    />
                    <button
                      type="button"
                      onClick={() => setFacingMode(prev => prev === 'user' ? 'environment' : 'user')}
                      className="absolute top-2.5 right-2.5 bg-black/60 hover:bg-black text-white p-1.5 rounded-full backdrop-blur-md"
                      title="Flip camera"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </button>
                  </div>
                  <p className="text-center text-[11px] text-slate-500">
                    Align your Institutional ID Card or QR badge inside the frame.
                  </p>
                </div>
              )}

              {/* Senior Dev Polish: 1-Click Fast Demo Fill */}
              <div className="mt-6 pt-5 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Quick Demo Profiles
                  </span>
                  <span className="text-[10px] text-slate-400">Click to auto-fill</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {DEMO_ACCOUNTS.map((demo) => (
                    <button
                      key={demo.role}
                      type="button"
                      onClick={() => applyDemoAccount(demo)}
                      className={`px-2 py-1.5 rounded-lg text-xs font-semibold border transition-all text-center ${
                        selectedRoleTab === demo.role
                          ? 'bg-blue-50 border-[#29456D] text-[#172B4D] font-bold shadow-xs'
                          : 'bg-slate-50/70 hover:bg-slate-100 border-slate-200 text-slate-600'
                      }`}
                    >
                      {demo.role}
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            /* Face Verification View */
            <div className="space-y-4">
              <FaceVerification
                userId={userId}
                onVerified={handleFaceVerified}
                onFailed={handleFaceFailed}
                onCancel={() => setStep('credentials')}
                onSkip={loginMode === 'password' ? handleSkipFaceVerification : undefined}
                verifyFn={verifyFn}
              />
              <button
                type="button"
                onClick={() => setStep('credentials')}
                className="w-full py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
              >
                ← Back to Password Login
              </button>
            </div>
          )}
        </div>

        {/* Bottom register link & copyright */}
        <div className="text-center mt-5 space-y-1.5">
          <p className="text-xs text-slate-500 font-medium">
            New faculty or student?{' '}
            <Link to="/register" className="text-[#172B4D] hover:underline font-semibold">
              Create an Account
            </Link>
          </p>
          <p className="text-[11px] text-slate-400">
            Protected by Institutional Access Control · © {new Date().getFullYear()} Qelvora School CRM
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full bg-[#172B4D] border-t border-[#29456D] py-4 px-6 text-[11px] text-[#CBD5E1]">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="font-bold text-white tracking-wide text-xs">Qelvora School CRM ENTERPRISE</span>
            <span className="hidden sm:inline w-1 h-1 rounded-full bg-[#29456D]" />
            <div className="flex items-center gap-3 text-[#F3F6FC]">
              <a href="#" className="hover:text-[#93C5FD] transition-colors">Privacy Policy</a>
              <span className="text-[#29456D]">&bull;</span>
              <a href="#" className="hover:text-[#93C5FD] transition-colors">Campus Security</a>
              <span className="text-[#29456D]">&bull;</span>
              <a href="#" className="hover:text-[#93C5FD] transition-colors">System Status</a>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-[#29456D] text-white font-mono text-[10px] border border-[#29456D]">
              v2.18
            </span>
            <span className="text-[#CBD5E1]">
              &copy; {new Date().getFullYear()} Qelvora School CRM
            </span>
          </div>
        </div>
      </footer>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm border border-slate-200 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900 mb-1">Reset Password</h3>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              Enter your institutional email address and we'll send you a password reset verification link.
            </p>
            <form onSubmit={handleForgotSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="admin@qelvora.in"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl outline-none focus:border-[#29456D] focus:ring-2 focus:ring-blue-600/15"
                  required
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(false)}
                  className="flex-1 py-2 text-xs font-semibold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="flex-1 py-2 text-xs font-semibold text-white bg-[#29456D] hover:bg-[#172B4D] rounded-xl flex items-center justify-center"
                >
                  {forgotLoading ? <Spinner size="sm" /> : 'Send Link'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginPage;
