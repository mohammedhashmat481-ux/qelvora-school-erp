/**
 * Registration Page — Full user registration flow.
 *
 * Step 1: Fill in personal details (name, email, phone, password).
 * Step 2: Face capture in 4 directions with liveness detection.
 * Step 3: Submit registration with face images.
 * 
 * Styled according to Velzon Premium Admin Template.
 */
import React, { useState, useCallback, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import FaceCaptureRegistration from '../components/face/FaceCaptureRegistration';
import Spinner from '../components/ui/Spinner';
import { registerUser, checkUser } from '../services/authService';
import useGeolocation from '../hooks/useGeolocation';
import { QRCodeSVG } from 'qrcode.react';

const RegisterPage = () => {
  const navigate = useNavigate();
  const { position: geoPosition, loading: geoLoading, permissionDenied: geoDenied, error: geoErrorFromHook, refresh: geoRefresh } = useGeolocation({ watch: false });

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    designation: '',
    role: 'teacher',
    joiningDate: '',
    password: '',
    confirmPassword: '',
    standard: '5th',
    section: 'A',
    rollNumber: '',
    parentName: '',
    parentPhone: '',
  });
  const [errors, setErrors] = useState({});
  const [step, setStep] = useState(1); // 1 = form, 2 = face capture, 3 = submitting, 4 = success QR
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [spoofError, setSpoofError] = useState(null);
  const [registeredEmpId, setRegisteredEmpId] = useState(null);
  const [geoAddress, setGeoAddress] = useState('');

  useEffect(() => {
    if (geoPosition && geoPosition.latitude && geoPosition.longitude) {
      const fetchAddress = async () => {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${geoPosition.latitude}&lon=${geoPosition.longitude}&zoom=18&addressdetails=1`,
            { headers: { 'User-Agent': 'FaceAuthSchoolSystem/1.0' } }
          );
          const data = await res.json();
          if (data && data.display_name) {
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

  /**
   * Handle form field changes.
   */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  /**
   * Validate form fields before proceeding.
   */
  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim() || formData.name.trim().length < 2) {
      newErrors.name = 'Full name is required (at least 2 characters)';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Valid email address is required';
    }

    const phoneRegex = /^\+?\d{10,15}$/;
    const cleanedPhone = formData.phone.replace(/[\s\-()]/g, '');
    if (!phoneRegex.test(cleanedPhone)) {
      newErrors.phone = 'Valid phone number is required (10-15 digits)';
    }

    if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    } else {
      if (!/[A-Z]/.test(formData.password)) newErrors.password = 'Must contain uppercase letter';
      if (!/[a-z]/.test(formData.password)) newErrors.password = 'Must contain lowercase letter';
      if (!/\d/.test(formData.password)) newErrors.password = 'Must contain a digit';
      if (!/[!@#$%^&*(),.?":{}|<>]/.test(formData.password)) newErrors.password = 'Must contain a special character';
    }

    if (formData.role !== 'student') {
      if (!formData.designation.trim() || formData.designation.trim().length < 2) {
        newErrors.designation = 'Specialization is required';
      }

      if (!formData.joiningDate) {
        newErrors.joiningDate = 'Joining date is required';
      }
    } else {
      if (!formData.standard) {
        newErrors.standard = 'Standard is required';
      }
      if (!formData.section.trim()) {
        newErrors.section = 'Section is required';
      }
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Proceed to face capture step.
   */
  const handleNext = async (e) => {
    e.preventDefault();
    if (validateForm()) {
      // ── MANDATORY GPS CHECK ──
      if (!geoPosition || !geoPosition.latitude || !geoPosition.longitude) {
        if (geoDenied) {
          toast.error('Location permission denied. Please enable GPS in your browser settings and refresh the page.');
        } else if (geoErrorFromHook) {
          toast.error('GPS location not available. Please enable Location Services and try again.');
        } else {
          toast.error('Acquiring your GPS location... Please wait a moment and try again.');
          geoRefresh();
        }
        return;
      }

      setIsSubmitting(true);
      const emailToCheck = formData.email.trim().toLowerCase();
      const phoneToCheck = formData.phone.replace(/[\s\-()]/g, '');
      const result = await checkUser(emailToCheck, phoneToCheck);
      setIsSubmitting(false);
      
      if (result.status) {
        setStep(2);
      } else {
        const errorMsg = result.message || 'User already registered';
        if (errorMsg.toLowerCase().includes('email') && errorMsg.toLowerCase().includes('phone')) {
          setErrors(prev => ({ ...prev, email: errorMsg, phone: errorMsg }));
          toast.error(errorMsg);
        } else if (errorMsg.toLowerCase().includes('email')) {
          setErrors(prev => ({ ...prev, email: errorMsg }));
          toast.error(errorMsg);
        } else if (errorMsg.toLowerCase().includes('phone')) {
          setErrors(prev => ({ ...prev, phone: errorMsg }));
          toast.error(errorMsg);
        } else {
          toast.error(errorMsg);
        }
      }
    }
  };

  /**
   * Handle face capture completion — submit the full registration.
   */
  const handleFaceCaptureComplete = useCallback(
    async (faceImages) => {
      setStep(3);
      setIsSubmitting(true);

      try {
        const isStudent = formData.role === 'student';
        const payload = {
          name: formData.name.trim(),
          email: formData.email.trim().toLowerCase(),
          phone: formData.phone.replace(/[\s\-()]/g, ''),
          designation: isStudent ? 'Student' : formData.designation.trim(),
          role: formData.role,
          joiningDate: isStudent ? new Date().toISOString().split('T')[0] : formData.joiningDate,
          password: formData.password,
          face_images: faceImages,
          location: {
            latitude: geoPosition.latitude,
            longitude: geoPosition.longitude
          },
          ...(isStudent && {
            standard: formData.standard,
            section: formData.section,
            rollNumber: formData.rollNumber,
            parentName: formData.parentName,
            parentPhone: formData.parentPhone
          })
        };

        const result = await registerUser(payload);
        if (result.status) {
          setRegisteredEmpId(result.employee_id || 'TCH-NEW');
          setStep(4);
          toast.success('Registration successful!');
        } else {
          setStep(2);
          toast.error(result.message || 'Registration failed');
        }
      } catch (err) {
        setStep(2);
        const detail = err.response?.data?.detail;
        const msg = Array.isArray(detail) ? detail.map(e => e.msg).join(', ') : detail || err.message;
        
        if (typeof msg === 'string' && msg.toLowerCase().includes('spoofing detected')) {
          setSpoofError('Liveness verification failed. Please align your face clearly and try again.');
        } else {
          toast.error(msg || 'Connection error. Please try again.');
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [formData, geoPosition]
  );

  /**
   * Skip face registration - proceed with password-only registration.
   */
  const handleSkipFaceRegistration = async () => {
    setStep(3);
    setIsSubmitting(true);

    try {
      const isStudent = formData.role === 'student';
      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.replace(/[\s\-()]/g, ''),
        designation: isStudent ? 'Student' : formData.designation.trim(),
        role: formData.role,
        joiningDate: isStudent ? new Date().toISOString().split('T')[0] : formData.joiningDate,
        password: formData.password,
        face_images: [],
        location: {
          latitude: geoPosition.latitude,
          longitude: geoPosition.longitude
        },
        ...(isStudent && {
          standard: formData.standard,
          section: formData.section,
          rollNumber: formData.rollNumber,
          parentName: formData.parentName,
          parentPhone: formData.parentPhone
        })
      };

      const result = await registerUser(payload);
      if (result.status) {
        setRegisteredEmpId(result.employee_id || 'TCH-NEW');
        setStep(4);
        toast.success('Registered successfully (without face data)');
      } else {
        setStep(1);
        toast.error(result.message || 'Registration failed');
      }
    } catch (err) {
      setStep(1);
      const detail = err.response?.data?.detail;
      const msg = Array.isArray(detail) ? detail.map(e => e.msg).join(', ') : detail || err.message;
      toast.error(msg || 'Registration failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Download registration success QR Card.
   */
  const downloadQR = () => {
    const svg = document.getElementById("qr-code-svg");
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width + 40;
      canvas.height = img.height + 140;
      
      // Paint card backdrop
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw QR Code
      ctx.drawImage(img, 20, 20);
      
      // Draw Text Details
      ctx.fillStyle = "#212529";
      ctx.font = "bold 16px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(formData.name, canvas.width / 2, img.height + 50);
      
      ctx.fillStyle = "#1E3A8A";
      ctx.font = "bold 14px monospace";
      ctx.fillText(registeredEmpId, canvas.width / 2, img.height + 75);
      
      ctx.fillStyle = "#878a99";
      ctx.font = "12px Inter, sans-serif";
      ctx.fillText(formData.designation, canvas.width / 2, img.height + 95);
      
      ctx.font = "9px Inter, sans-serif";
      ctx.fillText("Qelvora AI Attendance System", canvas.width / 2, img.height + 120);

      const pngFile = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.download = `ID_${registeredEmpId}.png`;
      downloadLink.href = `${pngFile}`;
      downloadLink.click();
    };
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  };

  return (
    <div className="min-h-screen bg-[#F7F9FC] relative flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 overflow-x-hidden">
      
      {/* Curved wave header background */}
      <div className="absolute top-0 inset-x-0 h-80 bg-gradient-to-r from-cyan-500 to-blue-600 overflow-hidden z-0">
        <div className="absolute bottom-0 left-0 right-0">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 320" className="w-full h-24 text-[#f3f3f9] fill-current">
            <path d="M0,96C240,224,480,224,720,128C960,32,1200,-160,1440,-96L1440,320L1200,320C960,320,720,320,480,320C240,320,0,320,0,320Z"></path>
          </svg>
        </div>
      </div>
      
      <div className="w-full max-w-md z-10 space-y-6">
        
        {/* Branding header above card */}
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-white tracking-widest uppercase">Qelvora AI</h2>
          <p className="text-blue-100 mt-1 font-semibold text-xs tracking-wider uppercase opacity-85">Face Auth School Attendance System</p>
        </div>

        {/* Card Panel */}
        <div className="bg-white rounded-lg shadow-lg border border-stone-200/80 overflow-hidden velzon-card">
          
          {/* Card Header */}
          <div className="bg-gradient-to-r from-blue-500/5 to-cyan-500/5 px-8 py-6 text-center border-b border-stone-100">
            <h3 className="text-lg font-bold text-stone-850">Create New Account</h3>
            <p className="text-xs text-stone-500 mt-1 font-medium">Get your free Qelvora AI account now.</p>
          </div>

          <div className="p-6 sm:p-8">
            
            {/* Step 1: Form details */}
            {step === 1 && (
              <form onSubmit={handleNext} className="space-y-4 text-stone-700">
                
                {/* Full Name */}
                <div>
                  <label htmlFor="name" className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5">
                    Full Name
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Enter full name"
                    className={`w-full px-3.5 py-2 border rounded-lg focus:ring-1 focus:ring-[#93C5FD] focus:border-[#29456D] outline-none transition-colors bg-white text-stone-800 placeholder-stone-400 ${
                      errors.name ? 'border-red-400' : 'border-stone-200'
                    }`}
                  />
                  {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                </div>

                {/* Email Address */}
                <div>
                  <label htmlFor="email" className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5">
                    Email Address
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="name@school.com"
                    className={`w-full px-3.5 py-2 border rounded-lg focus:ring-1 focus:ring-[#93C5FD] focus:border-[#29456D] outline-none transition-colors bg-white text-stone-800 placeholder-stone-400 ${
                      errors.email ? 'border-red-400' : 'border-stone-200'
                    }`}
                  />
                  {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                </div>

                {/* Phone Number */}
                <div>
                  <label htmlFor="phone" className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5">
                    Phone Number
                  </label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+919876543210"
                    className={`w-full px-3.5 py-2 border rounded-lg focus:ring-1 focus:ring-[#93C5FD] focus:border-[#29456D] outline-none transition-colors bg-white text-stone-800 placeholder-stone-400 ${
                      errors.phone ? 'border-red-400' : 'border-stone-200'
                    }`}
                  />
                  {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
                </div>

                {/* Role Selection */}
                <div>
                  <label htmlFor="role" className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5">
                    Institution Role
                  </label>
                  <select
                    id="role"
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2 border border-stone-200 rounded-lg focus:ring-1 focus:ring-[#93C5FD] focus:border-[#29456D] outline-none bg-white text-stone-800 cursor-pointer"
                  >
                    <option value="teacher">Teacher</option>
                    <option value="student">Student</option>
                    <option value="admin">Admin</option>
                    <option value="principal">Principal</option>
                    <option value="hod">Head of Department (HOD)</option>
                    <option value="staff">Non-Teaching Staff</option>
                  </select>
                </div>

                {formData.role !== 'student' ? (
                  <>
                    {/* Specialization */}
                    <div>
                      <label htmlFor="designation" className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5">
                        Specialization
                      </label>
                      <input
                        id="designation"
                        name="designation"
                        type="text"
                        value={formData.designation}
                        onChange={handleChange}
                        placeholder="e.g. Mathematics, Physics, Chemistry"
                        className={`w-full px-3.5 py-2 border rounded-lg focus:ring-1 focus:ring-[#93C5FD] focus:border-[#29456D] outline-none transition-colors bg-white text-stone-800 placeholder-stone-400 ${
                          errors.designation ? 'border-red-400' : 'border-stone-200'
                        }`}
                      />
                      {errors.designation && <p className="text-red-500 text-xs mt-1">{errors.designation}</p>}
                    </div>

                    {/* Joining Date */}
                    <div>
                      <label htmlFor="joiningDate" className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5">
                        Joining Date
                      </label>
                      <input
                        id="joiningDate"
                        name="joiningDate"
                        type="date"
                        value={formData.joiningDate}
                        onChange={handleChange}
                        className={`w-full px-3.5 py-2 border rounded-lg focus:ring-1 focus:ring-[#93C5FD] focus:border-[#29456D] outline-none transition-colors bg-white text-stone-800 ${
                          errors.joiningDate ? 'border-red-400' : 'border-stone-200'
                        }`}
                      />
                      {errors.joiningDate && <p className="text-red-500 text-xs mt-1">{errors.joiningDate}</p>}
                    </div>
                  </>
                ) : (
                  <>
                    {/* Student Academic & Parent Fields */}
                    <div className="grid grid-cols-2 gap-4 animate-fadeIn">
                      <div>
                        <label htmlFor="standard" className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5">
                          Standard *
                        </label>
                        <select
                          id="standard"
                          name="standard"
                          value={formData.standard}
                          onChange={handleChange}
                          className="w-full px-3.5 py-2 border border-stone-200 rounded-lg focus:ring-1 focus:ring-[#93C5FD] focus:border-[#29456D] outline-none bg-white text-stone-800 text-xs cursor-pointer font-semibold"
                        >
                          {['Nursery', 'LKG', 'UKG', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th'].map(std => (
                            <option key={std} value={std}>{std}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label htmlFor="section" className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5">
                          Section *
                        </label>
                        <input
                          id="section"
                          name="section"
                          type="text"
                          maxLength={1}
                          value={formData.section}
                          onChange={(e) => setFormData({ ...formData, section: e.target.value.toUpperCase() })}
                          placeholder="e.g. A"
                          className={`w-full px-3.5 py-2 border rounded-lg focus:ring-1 focus:ring-[#93C5FD] focus:border-[#29456D] outline-none transition-colors bg-white text-stone-800 text-center font-semibold text-xs ${
                            errors.section ? 'border-red-400' : 'border-stone-200'
                          }`}
                        />
                        {errors.section && <p className="text-red-500 text-xs mt-1">{errors.section}</p>}
                      </div>
                    </div>

                    <div className="animate-fadeIn">
                      <label htmlFor="rollNumber" className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5">
                        Roll Number
                      </label>
                      <input
                        id="rollNumber"
                        name="rollNumber"
                        type="text"
                        value={formData.rollNumber}
                        onChange={handleChange}
                        placeholder="e.g. 24"
                        className="w-full px-3.5 py-2 border border-stone-200 rounded-lg focus:ring-1 focus:ring-[#93C5FD] focus:border-[#29456D] outline-none bg-white text-stone-800 font-semibold text-xs"
                      />
                    </div>

                    <div className="animate-fadeIn">
                      <label htmlFor="parentName" className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5">
                        Parent / Guardian Name
                      </label>
                      <input
                        id="parentName"
                        name="parentName"
                        type="text"
                        value={formData.parentName}
                        onChange={handleChange}
                        placeholder="e.g. Mr. Sharma"
                        className="w-full px-3.5 py-2 border border-stone-200 rounded-lg focus:ring-1 focus:ring-[#93C5FD] focus:border-[#29456D] outline-none bg-white text-stone-800 font-semibold text-xs"
                      />
                    </div>

                    <div className="animate-fadeIn">
                      <label htmlFor="parentPhone" className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5">
                        Parent Contact Phone
                      </label>
                      <input
                        id="parentPhone"
                        name="parentPhone"
                        type="tel"
                        value={formData.parentPhone}
                        onChange={handleChange}
                        placeholder="e.g. 9876543210"
                        className="w-full px-3.5 py-2 border border-stone-200 rounded-lg focus:ring-1 focus:ring-[#93C5FD] focus:border-[#29456D] outline-none bg-white text-stone-800 font-semibold text-xs"
                      />
                    </div>
                  </>
                )}

                {/* Password */}
                <div>
                  <label htmlFor="password" className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5">
                    Password
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Min 8 chars, uppercase, digit, special"
                    className={`w-full px-3.5 py-2 border rounded-lg focus:ring-1 focus:ring-[#93C5FD] focus:border-[#29456D] outline-none transition-colors bg-white text-stone-800 placeholder-stone-400 ${
                      errors.password ? 'border-red-400' : 'border-stone-200'
                    }`}
                  />
                  {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
                </div>

                {/* Confirm Password */}
                <div>
                  <label htmlFor="confirmPassword" className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5">
                    Confirm Password
                  </label>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Confirm password"
                    className={`w-full px-3.5 py-2 border rounded-lg focus:ring-1 focus:ring-[#93C5FD] focus:border-[#29456D] outline-none transition-colors bg-white text-stone-800 placeholder-stone-400 ${
                      errors.confirmPassword ? 'border-red-400' : 'border-stone-200'
                    }`}
                  />
                  {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>}
                </div>

                {/* GPS Location Pill */}
                <div className={`flex items-center gap-2.5 px-3 py-2.5 rounded border text-xs font-medium ${
                  geoPosition
                    ? 'bg-green-50 border-green-200 text-green-700'
                    : geoDenied
                    ? 'bg-red-50 border-red-200 text-red-700'
                    : 'bg-stone-50 border-stone-200 text-stone-500'
                }`}>
                  {geoPosition ? (
                    <>
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      <div className="flex-1 leading-normal pr-2">
                        <span className="font-bold">Live Location Locked</span>
                        <p className="text-[9px] text-green-600/90 mt-0.5 font-medium leading-relaxed truncate max-w-[280px]" title={geoAddress || 'Acquiring address...'}>
                          {geoAddress || 'Resolving address...'}
                        </p>
                      </div>
                      <span className="text-[9px] bg-green-100 text-green-800 px-2 py-0.5 rounded font-mono font-bold whitespace-nowrap self-center">
                        GPS Active
                      </span>
                    </>
                  ) : geoDenied ? (
                    <>
                      <div className="w-2 h-2 bg-red-500 rounded-full" />
                      <div className="flex-1">
                        <span className="font-semibold">GPS Required</span>
                        <p className="text-[10px] text-red-500 mt-0.5">Allow GPS permissions in the browser to sign up.</p>
                      </div>
                      <button type="button" onClick={geoRefresh} className="text-[10px] bg-white border border-stone-250 hover:bg-stone-50 px-2 py-0.5 rounded font-bold">Retry</button>
                    </>
                  ) : (
                    <>
                      <div className="w-2.5 h-2.5 border-2 border-[#29456D] border-t-transparent rounded-full animate-spin" />
                      <span>Verifying registration coordinates...</span>
                    </>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 bg-[#29456D] hover:bg-[#172B4D] text-white rounded-lg disabled:opacity-50 font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 text-sm"
                >
                  {isSubmitting ? 'Checking details...' : 'Next: Face Registration →'}
                </button>
              </form>
            )}

            {/* Step 2: Face Capture */}
            {step === 2 && (
              <div className="space-y-4">
                <FaceCaptureRegistration
                  onCaptureComplete={handleFaceCaptureComplete}
                  onCancel={() => setStep(1)}
                  spoofError={spoofError}
                  onDismissSpoof={() => setSpoofError(null)}
                />
                
                <div className="pt-4 border-t border-stone-200 text-center">
                  <p className="text-xs text-stone-500 mb-2">
                    Camera offline or not available?
                  </p>
                  <button
                    onClick={handleSkipFaceRegistration}
                    disabled={isSubmitting}
                    className="text-xs text-[#172B4D] hover:text-[#172B4D] font-bold underline transition-colors"
                  >
                    Register without face data →
                  </button>
                  <p className="text-[10px] text-stone-400 mt-1 px-4 leading-normal">
                    You can register face templates from your profile page later. Login authentication will fallback to password.
                  </p>
                </div>
              </div>
            )}

            {/* Step 3: Submitting spinner */}
            {step === 3 && (
              <div className="text-center py-12">
                <Spinner size="lg" className="mx-auto mb-4" />
                <h3 className="text-base font-bold text-stone-800">Creating your account...</h3>
                <p className="text-stone-450 text-xs mt-1.5">Encrypting face vectors and writing database entries.</p>
              </div>
            )}

            {/* Step 4: Success & QR Code */}
            {step === 4 && (
              <div className="text-center py-6">
                <div className="w-16 h-16 bg-green-50 border border-green-200 rounded-full flex items-center justify-center mx-auto mb-3 popup-icon-success">
                  <svg className="w-9 h-9 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-stone-850 mb-1">Registration Complete!</h3>
                <p className="text-xs text-stone-500 mb-5 leading-normal">
                  Your Qelvora AI account is active. Download your QR ID card to scan at the campus kiosk for punch outs.
                </p>
                
                <div className="bg-stone-50 border border-stone-200/80 p-5 rounded-lg flex flex-col items-center justify-center mb-5">
                  <div className="bg-white p-3.5 rounded border border-stone-200 mb-3 relative shadow-inner">
                    <QRCodeSVG 
                      id="qr-code-svg"
                      value={JSON.stringify({ employee_id: registeredEmpId, name: formData.name })} 
                      size={180}
                      level={"H"}
                      includeMargin={false}
                    />
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-stone-850 text-base">{formData.name}</p>
                    <p className="text-[#172B4D] font-mono text-xs font-bold">{registeredEmpId}</p>
                    <p className="text-stone-450 text-[10px] mt-0.5 font-medium">{formData.designation}</p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button 
                    onClick={downloadQR}
                    className="flex-grow py-2.5 bg-[#29456D] hover:bg-[#172B4D] text-white text-xs font-bold rounded flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download ID Card
                  </button>
                  <button 
                    onClick={() => navigate('/login')}
                    className="flex-grow py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded"
                  >
                    Go to Login
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Card Footer Link */}
        <div className="text-center text-sm text-stone-500">
          Already have an account?{' '}
          <Link to="/login" className="text-[#172B4D] hover:underline font-bold">
            Signin
          </Link>
        </div>

        {/* Footer brand info */}
        <div className="text-center text-xs text-stone-400 pt-6">
          © {new Date().getFullYear()} Qelvora AI. Crafted with ♥ for Qelvora School CRM.
        </div>

      </div>
    </div>
  );
};

export default RegisterPage;
