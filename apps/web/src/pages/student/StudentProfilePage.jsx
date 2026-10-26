import React, { useState } from 'react';
import Sidebar from '../../components/ui/Sidebar';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import {
  GraduationCap,
  Users,
  Award,
  Check,
  ShieldCheck,
  PhoneCall,
  Mail,
  CheckCircle2,
  Edit3,
  Calendar,
  Sparkles,
  HeartHandshake
} from 'lucide-react';

export default function StudentProfilePage() {
  const { user } = useAuth();

  const [studentProfile, setStudentProfile] = useState({
    name: user?.name || 'Aarav Sharma',
    uniqueId: user?.studentId || 'STU-2026-8941',
    classSection: 'Grade 5 - Section A',
    rollNo: '24',
    bloodGroup: 'O+',
    house: 'Sapphire House',
    photo: user?.avatar || 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=300&auto=format&fit=crop&q=80',
    emergencyPhone: '+91 98765 11111'
  });

  const [momProfile, setMomProfile] = useState({
    name: 'Sunita Sharma',
    relation: 'Mother / Primary Guardian',
    phone: '+91 98765 11111',
    email: 'sunita.sharma@example.com',
    idType: 'Aadhaar Card',
    idNumber: 'XXXX-XXXX-4812',
    status: 'Government & Face Verified',
    photo: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80'
  });

  const [dadProfile, setDadProfile] = useState({
    name: 'Rajesh Sharma',
    relation: 'Father / Secondary Guardian',
    phone: '+91 98765 22222',
    email: 'rajesh.sharma@example.com',
    idType: 'Aadhaar Card',
    idNumber: 'XXXX-XXXX-9834',
    status: 'Government & Face Verified',
    photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80'
  });

  const [academicHistory] = useState([
    {
      year: '2026-2027 (Current)',
      term: 'Term 1 Mid-Term',
      standard: 'Grade 5 - Section A',
      score: '94.6%',
      rank: '#2 in Class',
      attendance: '98.2%',
      conduct: 'Exemplary',
      remarks: 'Outstanding analytical skills in STEM. Consistent classroom engagement.'
    },
    {
      year: '2025-2026',
      term: 'Annual Final Exam',
      standard: 'Grade 4 - Section B',
      score: '92.8%',
      rank: '#3 in Class',
      attendance: '96.5%',
      conduct: 'Excellent',
      remarks: 'Demonstrated superior creativity and strong teamwork in group science projects.'
    },
    {
      year: '2024-2025',
      term: 'Annual Final Exam',
      standard: 'Grade 3 - Section A',
      score: '91.2%',
      rank: '#4 in Class',
      attendance: '97.0%',
      conduct: 'Very Good',
      remarks: 'Fast learner with enthusiastic reading habits and high mathematical curiosity.'
    }
  ]);

  // Edit Modals
  const [showEditStudentModal, setShowEditStudentModal] = useState(false);
  const [editStudentForm, setEditStudentForm] = useState({ ...studentProfile });

  const [showEditParentModal, setShowEditParentModal] = useState(null); // 'mom' | 'dad' | null
  const [editParentForm, setEditParentForm] = useState({ name: '', phone: '', email: '', idType: '', idNumber: '', photo: '' });

  const handleOpenEditStudentModal = () => {
    setEditStudentForm({ ...studentProfile });
    setShowEditStudentModal(true);
  };

  const handleSaveStudentProfile = (e) => {
    e.preventDefault();
    setStudentProfile({ ...editStudentForm });
    setShowEditStudentModal(false);
    toast.success('Student profile updated successfully!');
  };

  const handleOpenEditParentModal = (parentType) => {
    if (parentType === 'mom') {
      setEditParentForm({ ...momProfile });
    } else {
      setEditParentForm({ ...dadProfile });
    }
    setShowEditParentModal(parentType);
  };

  const handleSaveParentProfile = (e) => {
    e.preventDefault();
    if (showEditParentModal === 'mom') {
      setMomProfile({ ...editParentForm, relation: momProfile.relation, status: momProfile.status });
      toast.success('Mother profile updated successfully!');
    } else {
      setDadProfile({ ...editParentForm, relation: dadProfile.relation, status: dadProfile.status });
      toast.success('Father profile updated successfully!');
    }
    setShowEditParentModal(null);
  };

  return (
    <div className="min-h-screen bg-[#F7F9FC] text-[#334155] flex flex-col md:flex-row font-sans">
      <Sidebar />

      <main className="flex-1 min-w-0 bg-[#F7F9FC] p-4 sm:p-6 lg:p-8 overflow-y-auto pb-24 md:pb-8">
        <div className="max-w-7xl mx-auto space-y-6">

            {/* Premium Header Banner */}
            <div className="bg-[#172B4D] rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden border border-[#29456D]">
              <div className="absolute top-0 right-0 -mt-10 -mr-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-400/20 text-blue-300 text-xs font-bold tracking-wider uppercase">
                    <GraduationCap className="w-3.5 h-3.5" />
                    <span>Student & Family Record</span>
                  </div>
                  <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
                    Student Profile & History
                  </h1>
                  <p className="text-sm text-slate-300 max-w-2xl font-normal leading-relaxed">
                    Verified personal enrollment info, authorized parent contacts, emergency numbers, and multi-year academic progression history.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={handleOpenEditStudentModal}
                    className="px-4 py-2.5 bg-white text-indigo-950 font-black text-xs rounded-xl shadow-md hover:bg-slate-100 transition-all flex items-center gap-2 active:scale-95"
                  >
                    <Edit3 className="w-4 h-4 text-indigo-900" />
                    <span>Edit Profile</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Profile Grid: Left (Student Details & Academic History), Right (Parent Cards) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fadeIn">

              {/* Left Column (4 cols): Student Profile Card */}
              <div className="lg:col-span-4 bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between space-y-6">
                <div>
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="w-5 h-5 text-indigo-900" />
                      <h3 className="font-extrabold text-slate-900 text-base">Student Identity</h3>
                    </div>
                    <button
                      onClick={handleOpenEditStudentModal}
                      className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 rounded-lg text-xs font-bold border border-indigo-200 flex items-center gap-1 transition-all"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                  </div>

                  <div className="text-center space-y-3">
                    <div className="relative inline-block">
                      <img
                        src={studentProfile.photo}
                        alt={studentProfile.name}
                        className="w-28 h-28 rounded-full object-cover mx-auto ring-4 ring-indigo-900/10 shadow-md"
                      />
                      <span className="absolute bottom-1 right-1 bg-emerald-500 text-white text-[10px] p-1 rounded-full border-2 border-white" title="Active & Enrolled">
                        <Check className="w-3 h-3" />
                      </span>
                    </div>

                    <div>
                      <h2 className="text-xl font-black text-slate-900">{studentProfile.name}</h2>
                      <p className="text-xs font-bold text-indigo-900 font-mono mt-0.5">{studentProfile.uniqueId}</p>
                    </div>

                    <div className="flex items-center justify-center gap-2 pt-1">
                      <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-extrabold">
                        {studentProfile.classSection}
                      </span>
                      <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-extrabold">
                        Roll #{studentProfile.rollNo}
                      </span>
                    </div>
                  </div>

                  {/* Quick Info Grid */}
                  <div className="grid grid-cols-2 gap-3 mt-6 pt-4 border-t border-slate-100 text-xs">
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                      <span className="text-slate-400 font-semibold text-[10px] uppercase block">Blood Group</span>
                      <span className="font-black text-slate-800 text-sm mt-0.5 block">{studentProfile.bloodGroup}</span>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                      <span className="text-slate-400 font-semibold text-[10px] uppercase block">House</span>
                      <span className="font-black text-indigo-900 text-sm mt-0.5 block">{studentProfile.house}</span>
                    </div>
                  </div>
                </div>

                {/* Protection Badges */}
                <div className="bg-indigo-950 text-white rounded-2xl p-4 space-y-2 border border-indigo-900">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="flex items-center gap-1.5 text-blue-300">
                      <ShieldCheck className="w-4 h-4 text-blue-400" />
                      <span>SafePickup Protocol</span>
                    </span>
                    <span className="text-emerald-400 text-[10px] font-mono">ACTIVE</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-snug">
                    Real-time geofence & photo verification enabled. Emergency Contact: <strong className="text-white font-mono">{studentProfile.emergencyPhone}</strong>
                  </p>
                </div>

                {/* Academic History & Grade Records */}
                <div className="pt-2 border-t border-slate-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5 text-amber-500" />
                      <span>Academic History</span>
                    </h4>
                    <span className="text-[10px] font-bold text-indigo-900 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                      Overall 94.6%
                    </span>
                  </div>
                  <div className="space-y-2">
                    {academicHistory.map((rec, idx) => (
                      <div key={idx} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                        <div className="flex items-center justify-between font-bold text-slate-900">
                          <span>{rec.year}</span>
                          <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded text-[10px] border border-emerald-200 font-extrabold">{rec.score}</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                          <span>{rec.standard} • {rec.term}</span>
                          <span className="font-semibold text-indigo-900">{rec.rank}</span>
                        </div>
                        <p className="text-[10px] text-slate-600 italic">"{rec.remarks}"</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column (8 cols): Parents & Guardians Profile Section */}
              <div className="lg:col-span-8 bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
                      <Users className="w-5 h-5 text-indigo-900" />
                      <span>Parents & Guardians Profile</span>
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      Registered primary and secondary guardians authorized for communications and instant child release approval.
                    </p>
                  </div>
                  <span className="px-3 py-1 bg-blue-50 text-blue-800 border border-blue-200 rounded-full text-xs font-bold">
                    2 Verified Guardians
                  </span>
                </div>

                {/* Mom & Dad Profiles Cards Side-by-Side */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                  {/* Mom Profile Card */}
                  <div className="bg-slate-50/80 rounded-2xl p-5 border border-slate-200 space-y-4 hover:border-indigo-300 transition-all">
                    <div className="flex items-start gap-4">
                      <img
                        src={momProfile.photo}
                        alt={momProfile.name}
                        className="w-16 h-16 rounded-2xl object-cover ring-2 ring-indigo-900/10 shadow-sm"
                      />
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="inline-block px-2.5 py-0.5 bg-pink-100 text-pink-800 font-extrabold text-[10px] rounded-md uppercase">
                            👩 Mother
                          </span>
                          <button
                            onClick={() => handleOpenEditParentModal('mom')}
                            className="p-1 text-slate-500 hover:text-indigo-900 hover:bg-slate-200 rounded-md transition-all"
                            title="Edit Mother Profile"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <h4 className="font-black text-slate-900 text-base leading-tight truncate">{momProfile.name}</h4>
                        <p className="text-xs text-slate-500 font-semibold">{momProfile.relation}</p>
                      </div>
                    </div>

                    <div className="space-y-2 text-xs pt-2 border-t border-slate-200/80">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-semibold">Phone Number:</span>
                        <span className="font-bold text-slate-900 font-mono flex items-center gap-1">
                          <PhoneCall className="w-3 h-3 text-indigo-900" />
                          {momProfile.phone}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-semibold">Email:</span>
                        <span className="font-bold text-slate-800 truncate max-w-[170px]">{momProfile.email}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-semibold">Govt ID:</span>
                        <span className="font-mono text-slate-700 font-extrabold">{momProfile.idNumber}</span>
                      </div>
                    </div>

                    <div className="pt-2 flex items-center justify-between">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        {momProfile.status}
                      </span>
                    </div>
                  </div>

                  {/* Dad Profile Card */}
                  <div className="bg-slate-50/80 rounded-2xl p-5 border border-slate-200 space-y-4 hover:border-indigo-300 transition-all">
                    <div className="flex items-start gap-4">
                      <img
                        src={dadProfile.photo}
                        alt={dadProfile.name}
                        className="w-16 h-16 rounded-2xl object-cover ring-2 ring-indigo-900/10 shadow-sm"
                      />
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="inline-block px-2.5 py-0.5 bg-blue-100 text-blue-800 font-extrabold text-[10px] rounded-md uppercase">
                            👨 Father
                          </span>
                          <button
                            onClick={() => handleOpenEditParentModal('dad')}
                            className="p-1 text-slate-500 hover:text-indigo-900 hover:bg-slate-200 rounded-md transition-all"
                            title="Edit Father Profile"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <h4 className="font-black text-slate-900 text-base leading-tight truncate">{dadProfile.name}</h4>
                        <p className="text-xs text-slate-500 font-semibold">{dadProfile.relation}</p>
                      </div>
                    </div>

                    <div className="space-y-2 text-xs pt-2 border-t border-slate-200/80">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-semibold">Phone Number:</span>
                        <span className="font-bold text-slate-900 font-mono flex items-center gap-1">
                          <PhoneCall className="w-3 h-3 text-indigo-900" />
                          {dadProfile.phone}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-semibold">Email:</span>
                        <span className="font-bold text-slate-800 truncate max-w-[170px]">{dadProfile.email}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-semibold">Govt ID:</span>
                        <span className="font-mono text-slate-700 font-extrabold">{dadProfile.idNumber}</span>
                      </div>
                    </div>

                    <div className="pt-2 flex items-center justify-between">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        {dadProfile.status}
                      </span>
                    </div>
                  </div>

                </div>

                {/* Additional Emergency & Health Instructions Card */}
                <div className="p-5 rounded-2xl bg-indigo-50/50 border border-indigo-100 space-y-3">
                  <h4 className="font-bold text-indigo-950 text-sm flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    <span>Parent Communication & Safety Guidelines</span>
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    All notifications regarding school events, examinations, fee payment reminders, and campus dismissal clearances are dispatched directly to the primary verified phone number (+91 98765 11111) via automated SMS and mobile app push alerts.
                  </p>
                </div>
              </div>

            </div>

          </div>
        </main>

      {/* ── MODAL: EDIT STUDENT PROFILE ── */}
      {showEditStudentModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full border border-slate-200 shadow-2xl space-y-5 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-indigo-900" />
                <span>Edit Student Profile</span>
              </h3>
              <button onClick={() => setShowEditStudentModal(false)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            <form onSubmit={handleSaveStudentProfile} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Student Full Name *</label>
                <input
                  type="text"
                  required
                  value={editStudentForm.name}
                  onChange={(e) => setEditStudentForm({ ...editStudentForm, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-900 outline-none font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Class & Section *</label>
                  <input
                    type="text"
                    required
                    value={editStudentForm.classSection}
                    onChange={(e) => setEditStudentForm({ ...editStudentForm, classSection: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-900 outline-none font-semibold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Roll Number *</label>
                  <input
                    type="text"
                    required
                    value={editStudentForm.rollNo}
                    onChange={(e) => setEditStudentForm({ ...editStudentForm, rollNo: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-900 outline-none font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Blood Group</label>
                  <input
                    type="text"
                    value={editStudentForm.bloodGroup}
                    onChange={(e) => setEditStudentForm({ ...editStudentForm, bloodGroup: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-900 outline-none font-semibold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">House</label>
                  <input
                    type="text"
                    value={editStudentForm.house}
                    onChange={(e) => setEditStudentForm({ ...editStudentForm, house: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-900 outline-none font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Emergency Phone Number *</label>
                <input
                  type="text"
                  required
                  value={editStudentForm.emergencyPhone}
                  onChange={(e) => setEditStudentForm({ ...editStudentForm, emergencyPhone: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-900 outline-none font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Photo URL / Avatar</label>
                <input
                  type="text"
                  value={editStudentForm.photo}
                  onChange={(e) => setEditStudentForm({ ...editStudentForm, photo: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-900 outline-none font-mono text-[11px]"
                />
              </div>

              <div className="pt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowEditStudentModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-indigo-900 hover:bg-indigo-950 text-white rounded-xl font-extrabold shadow-md"
                >
                  Save Profile Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: EDIT PARENT PROFILE (MOM / DAD) ── */}
      {showEditParentModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full border border-slate-200 shadow-2xl space-y-5 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-900" />
                <span>{showEditParentModal === 'mom' ? 'Edit Mother Profile' : 'Edit Father Profile'}</span>
              </h3>
              <button onClick={() => setShowEditParentModal(null)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            <form onSubmit={handleSaveParentProfile} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={editParentForm.name}
                  onChange={(e) => setEditParentForm({ ...editParentForm, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-900 outline-none font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Phone Number *</label>
                <input
                  type="text"
                  required
                  value={editParentForm.phone}
                  onChange={(e) => setEditParentForm({ ...editParentForm, phone: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-900 outline-none font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={editParentForm.email}
                  onChange={(e) => setEditParentForm({ ...editParentForm, email: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-900 outline-none font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Govt ID Type</label>
                  <select
                    value={editParentForm.idType}
                    onChange={(e) => setEditParentForm({ ...editParentForm, idType: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-900 outline-none font-semibold"
                  >
                    <option value="Aadhaar Card">Aadhaar Card</option>
                    <option value="Passport">Passport</option>
                    <option value="Voter ID">Voter ID</option>
                    <option value="Driving License">Driving License</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Govt ID Number *</label>
                  <input
                    type="text"
                    required
                    value={editParentForm.idNumber}
                    onChange={(e) => setEditParentForm({ ...editParentForm, idNumber: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-900 outline-none font-mono uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Photo URL / Avatar</label>
                <input
                  type="text"
                  value={editParentForm.photo}
                  onChange={(e) => setEditParentForm({ ...editParentForm, photo: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-900 outline-none font-mono text-[11px]"
                />
              </div>

              <div className="pt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowEditParentModal(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-indigo-900 hover:bg-indigo-950 text-white rounded-xl font-extrabold shadow-md"
                >
                  Save Guardian Details
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
