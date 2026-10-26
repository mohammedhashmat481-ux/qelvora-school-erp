import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const ProfileSelectionPage = () => {
  const { user, selectProfile } = useAuth();
  const navigate = useNavigate();

  const handleProfileSelect = (profile) => {
    selectProfile(profile);
    toast.success(`Switched to ${profile === 'student' ? 'Student' : 'Parent'} Profile`);
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-[#111119] text-white flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="absolute top-0 inset-x-0 h-72 bg-gradient-to-b from-blue-900/20 to-transparent pointer-events-none" />
      
      <div className="w-full max-w-2xl z-10 text-center space-y-8 animate-fadeIn">
        <div className="space-y-2">
          <h2 className="text-stone-400 text-sm font-bold tracking-widest uppercase">Welcome back, {user?.name || 'User'}</h2>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">Who's using this account?</h1>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-lg mx-auto pt-4">
          {/* Student Profile Card */}
          <button
            onClick={() => handleProfileSelect('student')}
            className="group bg-stone-900/40 border border-stone-800 hover:border-[#29456D] hover:bg-stone-900/80 rounded-xl p-8 transition-all hover:scale-105 flex flex-col items-center space-y-4 focus:outline-none shadow-lg active:scale-95"
          >
            <div className="w-24 h-24 bg-stone-800 rounded-full flex items-center justify-center text-5xl group-hover:bg-[#29456D]/10 border-2 border-stone-700 group-hover:border-[#29456D] transition-all shadow-inner">
              👨‍🎓
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-bold text-white group-hover:text-[#172B4D] transition-colors">Student</h3>
              <p className="text-xs text-stone-500 font-medium">Access dashboard, homework, timetable, and marks</p>
            </div>
          </button>

          {/* Parent Profile Card */}
          <button
            onClick={() => handleProfileSelect('parent')}
            className="group bg-stone-900/40 border border-stone-800 hover:border-[#29456D] hover:bg-stone-900/80 rounded-xl p-8 transition-all hover:scale-105 flex flex-col items-center space-y-4 focus:outline-none shadow-lg active:scale-95"
          >
            <div className="w-24 h-24 bg-stone-800 rounded-full flex items-center justify-center text-5xl group-hover:bg-[#29456D]/10 border-2 border-stone-700 group-hover:border-[#29456D] transition-all shadow-inner">
              👨‍👩‍👧
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-bold text-white group-hover:text-[#172B4D] transition-colors">Parent</h3>
              <p className="text-xs text-stone-500 font-medium">View child info, rate teachers, and submit suggestions</p>
            </div>
          </button>
        </div>

        <div className="pt-8">
          <p className="text-xs text-stone-600 font-medium tracking-wide">
            © {new Date().getFullYear()} Qelvora AI. Profile selection manages workspace configuration dynamically.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ProfileSelectionPage;
