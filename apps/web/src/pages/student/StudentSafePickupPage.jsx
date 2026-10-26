import React, { useState } from 'react';
import Sidebar from '../../components/ui/Sidebar';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import {
  ShieldCheck,
  Clock,
  UserCheck,
  Car,
  Bell,
  RefreshCw,
  Radio,
  CheckCircle2,
  Plus,
  Edit3,
  Trash2,
  QrCode,
  MapPin,
  Lock,
  Smartphone
} from 'lucide-react';

export default function StudentSafePickupPage() {
  const { user } = useAuth();
  const studentName = user?.name || 'Aarav Sharma';

  // Live campus exit status
  const [departureStatus, setDepartureStatus] = useState({
    hasDeparted: false,
    departureTime: 'Pending Dismissal (Expected 03:45 PM)',
    exitGate: 'Main Gate 1',
    collectorName: 'Ramesh Kumar',
    collectorRelation: 'Family Driver',
    collectorPhoto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    releasedByTeacher: 'Mrs. Ananya Sen (Class Teacher)',
    vehicleNo: 'KA-01-AB-1234',
    transitStatus: 'En-route to Home Address (ETA 15 Mins)',
    gpsLocation: '12.9716° N, 77.5946° E (School Main Gate Radius)'
  });

  // Pickup Request Option: 'mom' | 'dad' | 'others'
  const [pickupRequestOption, setPickupRequestOption] = useState('mom');

  const [momProfile] = useState({
    name: 'Sunita Sharma',
    relation: 'Mother / Primary Guardian',
    phone: '+91 98765 11111',
    photo: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80'
  });

  const [dadProfile] = useState({
    name: 'Rajesh Sharma',
    relation: 'Father / Secondary Guardian',
    phone: '+91 98765 22222',
    photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80'
  });

  const [assignedOthersList, setAssignedOthersList] = useState([
    {
      id: 101,
      name: 'Ramesh Kumar',
      relation: 'Family Driver',
      phone: '+91 98765 43210',
      idType: 'Aadhaar Card',
      idNumber: 'XXXX-XXXX-1234',
      vehicleNo: 'KA-01-AB-1234',
      photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      idProofDoc: 'Uploaded & Verified (Driver License)',
      status: 'Active Pass'
    },
    {
      id: 102,
      name: 'Sunita Patel',
      relation: 'Maternal Aunt',
      phone: '+91 98123 45678',
      idType: 'Passport',
      idNumber: 'P-9812409',
      vehicleNo: 'KA-03-MN-5678',
      photo: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
      idProofDoc: 'Uploaded & Verified (Passport Copy)',
      status: 'Active Pass'
    }
  ]);

  // Modal for new delegation
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [editingThirdParty, setEditingThirdParty] = useState(null);
  const [newAssignForm, setNewAssignForm] = useState({
    name: '',
    relation: 'Family Driver',
    phone: '',
    idType: 'Aadhaar Card',
    idNumber: '',
    vehicleNo: '',
    photo: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    idProofDoc: 'Verified Aadhaar Card'
  });

  const handleOpenAssignModal = () => {
    setEditingThirdParty(null);
    setNewAssignForm({
      name: '',
      relation: 'Family Driver',
      phone: '',
      idType: 'Aadhaar Card',
      idNumber: '',
      vehicleNo: '',
      photo: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      idProofDoc: 'Verified Aadhaar Card'
    });
    setShowAssignModal(true);
  };

  const handleSaveThirdParty = (e) => {
    e.preventDefault();
    if (editingThirdParty) {
      setAssignedOthersList(prev => prev.map(item => item.id === editingThirdParty.id ? { ...item, ...newAssignForm } : item));
      toast.success(`Updated details for ${newAssignForm.name}`);
    } else {
      const newEntry = {
        id: Date.now(),
        ...newAssignForm,
        status: 'Active Pass'
      };
      setAssignedOthersList(prev => [newEntry, ...prev]);
      toast.success(`Authorized ${newAssignForm.name} for child pickup!`);
    }
    setShowAssignModal(false);
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
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Safe Student Dismissal Protocol</span>
                  </div>
                  <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
                    Safe Pickup & Campus Status
                  </h1>
                  <p className="text-sm text-slate-300 max-w-2xl font-normal leading-relaxed">
                    Live gate exit verification, transit tracking, and single-click daily pickup delegation with encrypted guardian QR passes.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span className={`px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wider border flex items-center gap-2 shadow-xs ${
                    departureStatus.hasDeparted
                      ? 'bg-indigo-500/20 text-indigo-300 border-indigo-400/30'
                      : 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30'
                  }`}>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    <span>{departureStatus.hasDeparted ? '🚪 DEPARTED CAMPUS' : '🏫 INSIDE CAMPUS / CLASSROOM'}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* 1. CAMPUS DEPARTURE & EXIT TRACKER */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6 animate-fadeIn">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="flex h-3 w-3 relative">
                      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${departureStatus.hasDeparted ? 'bg-indigo-400 opacity-75' : 'bg-emerald-400 opacity-75'}`} />
                      <span className={`relative inline-flex rounded-full h-3 w-3 ${departureStatus.hasDeparted ? 'bg-indigo-600' : 'bg-emerald-500'}`} />
                    </span>
                    <h3 className="text-lg font-black text-slate-900">Campus Exit & Departure Live Info</h3>
                  </div>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">Real-time confirmation tracking when {studentName} has left school campus.</p>
                </div>

                <button
                  onClick={() => {
                    const nextDeparted = !departureStatus.hasDeparted;
                    setDepartureStatus({
                      ...departureStatus,
                      hasDeparted: nextDeparted,
                      departureTime: nextDeparted ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' Today' : 'Pending Dismissal'
                    });
                    if (nextDeparted) {
                      toast.success(`Simulated Push Alert: Student ${studentName} has departed school campus via Main Gate 1!`);
                    } else {
                      toast('Status updated: Student is inside classroom.', { icon: '🏫' });
                    }
                  }}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all border border-slate-200 flex items-center gap-1.5 self-start md:self-auto"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                  <span>Toggle Status Simulation</span>
                </button>
              </div>

              {/* Grid: 3 Live Status Boxes */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Box 1: Departure Time & Exit Gate */}
                <div className="p-5 rounded-2xl bg-indigo-50/50 border border-indigo-100 space-y-3">
                  <div className="flex items-center justify-between text-xs font-extrabold text-indigo-900 uppercase tracking-wider">
                    <span>Campus Gate Exit</span>
                    <Clock className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div className="space-y-1">
                    <div className="text-xl font-black text-slate-900">
                      {departureStatus.hasDeparted ? departureStatus.departureTime : 'Currently in Class'}
                    </div>
                    <p className="text-xs text-slate-600 font-medium">Exit Location: <strong className="text-slate-900">{departureStatus.exitGate}</strong></p>
                    <p className="text-[11px] text-indigo-950 font-semibold">Verified by Gate Officer Security Scanner</p>
                  </div>
                </div>

                {/* Box 2: Authorized Collector */}
                <div className="p-5 rounded-2xl bg-blue-50/50 border border-blue-100 space-y-3">
                  <div className="flex items-center justify-between text-xs font-extrabold text-blue-900 uppercase tracking-wider">
                    <span>Accompanying Collector</span>
                    <UserCheck className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex items-center gap-3">
                    <img
                      src={departureStatus.collectorPhoto}
                      alt={departureStatus.collectorName}
                      className="w-12 h-12 rounded-xl object-cover border-2 border-blue-300"
                    />
                    <div className="text-xs space-y-0.5">
                      <h4 className="font-bold text-slate-900">{departureStatus.collectorName}</h4>
                      <span className="inline-block px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-extrabold">
                        {departureStatus.collectorRelation}
                      </span>
                      <p className="text-slate-500 text-[10px]">Released by: {departureStatus.releasedByTeacher}</p>
                    </div>
                  </div>
                </div>

                {/* Box 3: Live Transit Tracker */}
                <div className="p-5 rounded-2xl bg-slate-900 text-white space-y-3 border border-slate-800 shadow-md">
                  <div className="flex items-center justify-between text-xs font-extrabold text-blue-300 uppercase tracking-wider">
                    <span>Live Transit Tracker</span>
                    <span className="flex items-center gap-1 text-emerald-400 text-[10px]">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                      GPS ACTIVE
                    </span>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-black text-white flex items-center gap-2">
                      <Car className="w-4 h-4 text-blue-400" />
                      <span>Vehicle: {departureStatus.vehicleNo}</span>
                    </div>
                    <p className="text-xs text-slate-300 font-medium">{departureStatus.transitStatus}</p>
                    <p className="text-[10px] text-slate-400 font-mono">GPS: {departureStatus.gpsLocation}</p>
                  </div>
                </div>
              </div>

              {/* Alert Banner */}
              <div className="p-4 rounded-2xl bg-slate-900 text-white flex items-center justify-between gap-4 border border-indigo-900">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-400/30 shrink-0">
                    <Bell className="w-5 h-5" />
                  </div>
                  <div className="text-xs space-y-0.5">
                    <p className="font-extrabold text-white text-sm">Parent Push Notification Delivered</p>
                    <p className="text-slate-300">
                      "{studentName} has safely departed school campus via Main Gate 1 with {departureStatus.collectorName} ({departureStatus.collectorRelation})."
                    </p>
                  </div>
                </div>
                <span className="hidden sm:inline-block px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30 whitespace-nowrap">
                  ● Parent Alerted
                </span>
              </div>
            </div>

            {/* 2. DAILY PICKUP AUTHORIZATION SYSTEM */}
            <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm space-y-6 animate-fadeIn">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-900 border border-indigo-200 text-xs font-black uppercase tracking-wider mb-2">
                    <Radio className="w-3.5 h-3.5 text-indigo-900 animate-pulse" />
                    <span>Daily Pickup Authorization System</span>
                  </div>
                  <h2 className="text-xl font-black text-slate-900">
                    Who is going to pick up {studentName} today?
                  </h2>
                  <p className="text-xs text-slate-500 font-medium mt-1">
                    Select Mom, Dad, or Assign a Third Party (Relative, Family Driver, Neighbor) with verified photo & ID proof.
                  </p>
                </div>

                {/* 3 Selector Options: Mom, Dad, Others */}
                <div className="flex items-center gap-2 p-1.5 bg-slate-100 rounded-2xl border border-slate-200">
                  <button
                    onClick={() => {
                      setPickupRequestOption('mom');
                      toast.success(`Pickup Mode set to Mom (${momProfile.name})`);
                    }}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-extrabold text-xs transition-all ${
                      pickupRequestOption === 'mom'
                        ? 'bg-indigo-900 text-white shadow-md'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                    }`}
                  >
                    <span>👩‍👦 Mom</span>
                  </button>

                  <button
                    onClick={() => {
                      setPickupRequestOption('dad');
                      toast.success(`Pickup Mode set to Dad (${dadProfile.name})`);
                    }}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-extrabold text-xs transition-all ${
                      pickupRequestOption === 'dad'
                        ? 'bg-indigo-900 text-white shadow-md'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                    }`}
                  >
                    <span>👨‍👦 Dad</span>
                  </button>

                  <button
                    onClick={() => {
                      setPickupRequestOption('others');
                      toast('Pickup Mode set to Others (Third Party Assignment)', { icon: '🤝' });
                    }}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-extrabold text-xs transition-all ${
                      pickupRequestOption === 'others'
                        ? 'bg-indigo-900 text-white shadow-md'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                    }`}
                  >
                    <span>🤝 Others (Relative / Driver)</span>
                  </button>
                </div>
              </div>

              {/* Option 1: MOM */}
              {pickupRequestOption === 'mom' && (
                <div className="bg-gradient-to-br from-indigo-50/50 via-white to-slate-50 rounded-2xl p-6 border border-indigo-100 flex flex-col md:flex-row items-center justify-between gap-6 animate-fadeIn">
                  <div className="flex items-center gap-4">
                    <img src={momProfile.photo} alt={momProfile.name} className="w-20 h-20 rounded-2xl object-cover ring-4 ring-indigo-900/10 shadow-md" />
                    <div className="space-y-1">
                      <span className="px-2.5 py-0.5 bg-indigo-900 text-white text-[10px] font-black rounded uppercase">Authorized Pickup Person</span>
                      <h3 className="text-lg font-black text-slate-900">{momProfile.name}</h3>
                      <p className="text-xs font-semibold text-slate-600">{momProfile.relation} • {momProfile.phone}</p>
                      <p className="text-[11px] text-emerald-700 font-bold flex items-center gap-1 mt-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Verified Guardian QR Token Generated
                      </p>
                    </div>
                  </div>

                  <div className="text-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-2">
                    <div className="w-24 h-24 bg-slate-900 text-white p-2 rounded-xl mx-auto flex items-center justify-center font-mono text-[10px] font-black tracking-widest text-center shadow-inner">
                      [QR PASS: MOM-2026-8812]
                    </div>
                    <span className="text-[10px] font-mono text-slate-500 font-bold block">Valid Token: SP-MOM-2026-8812</span>
                    <button
                      onClick={() => toast.success('Mother Pickup Confirmation broadcasted to Gate 1 Kiosk!')}
                      className="px-4 py-2 bg-indigo-900 hover:bg-indigo-950 text-white font-extrabold text-xs rounded-xl transition-all shadow-sm w-full"
                    >
                      Broadcast to Gate Kiosk
                    </button>
                  </div>
                </div>
              )}

              {/* Option 2: DAD */}
              {pickupRequestOption === 'dad' && (
                <div className="bg-gradient-to-br from-indigo-50/50 via-white to-slate-50 rounded-2xl p-6 border border-indigo-100 flex flex-col md:flex-row items-center justify-between gap-6 animate-fadeIn">
                  <div className="flex items-center gap-4">
                    <img src={dadProfile.photo} alt={dadProfile.name} className="w-20 h-20 rounded-2xl object-cover ring-4 ring-indigo-900/10 shadow-md" />
                    <div className="space-y-1">
                      <span className="px-2.5 py-0.5 bg-indigo-900 text-white text-[10px] font-black rounded uppercase">Authorized Pickup Person</span>
                      <h3 className="text-lg font-black text-slate-900">{dadProfile.name}</h3>
                      <p className="text-xs font-semibold text-slate-600">{dadProfile.relation} • {dadProfile.phone}</p>
                      <p className="text-[11px] text-emerald-700 font-bold flex items-center gap-1 mt-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Verified Guardian QR Token Generated
                      </p>
                    </div>
                  </div>

                  <div className="text-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-2">
                    <div className="w-24 h-24 bg-slate-900 text-white p-2 rounded-xl mx-auto flex items-center justify-center font-mono text-[10px] font-black tracking-widest text-center shadow-inner">
                      [QR PASS: DAD-2026-9934]
                    </div>
                    <span className="text-[10px] font-mono text-slate-500 font-bold block">Valid Token: SP-DAD-2026-9934</span>
                    <button
                      onClick={() => toast.success('Father Pickup Confirmation broadcasted to Gate 1 Kiosk!')}
                      className="px-4 py-2 bg-indigo-900 hover:bg-indigo-950 text-white font-extrabold text-xs rounded-xl transition-all shadow-sm w-full"
                    >
                      Broadcast to Gate Kiosk
                    </button>
                  </div>
                </div>
              )}

              {/* Option 3: OTHERS */}
              {pickupRequestOption === 'others' && (
                <div className="space-y-6 animate-fadeIn">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <div>
                      <h4 className="font-extrabold text-slate-900 text-sm">Assigned Third-Party & Relative Pickup Roster</h4>
                      <p className="text-xs text-slate-500">Parents can assign any trusted third party (Relative, Driver, Neighbor) with photo and ID proof.</p>
                    </div>
                    <button
                      onClick={handleOpenAssignModal}
                      className="px-4 py-2.5 bg-indigo-900 hover:bg-indigo-950 text-white font-extrabold text-xs rounded-xl transition-all flex items-center gap-1.5 shadow-md shrink-0 active:scale-95"
                    >
                      <Plus className="w-4 h-4 text-blue-300" />
                      <span>+ Assign New Relative / Driver</span>
                    </button>
                  </div>

                  {/* Grid of Assigned Third Parties */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {assignedOthersList.map((person) => (
                      <div key={person.id} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4 hover:border-indigo-300 transition-all flex flex-col justify-between">
                        <div>
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <img src={person.photo} alt={person.name} className="w-14 h-14 rounded-xl object-cover ring-2 ring-slate-200" />
                              <div>
                                <span className="px-2 py-0.5 bg-indigo-50 text-indigo-900 border border-indigo-200 text-[10px] font-extrabold rounded uppercase">
                                  {person.relation}
                                </span>
                                <h4 className="font-black text-slate-900 text-base leading-tight mt-1">{person.name}</h4>
                                <p className="text-xs font-mono text-slate-500 font-bold">{person.phone}</p>
                              </div>
                            </div>
                            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black rounded-full uppercase">
                              {person.status}
                            </span>
                          </div>

                          <div className="mt-4 pt-3 border-t border-slate-100 text-xs space-y-1.5 text-slate-600">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-slate-400 text-[11px]">ID Proof:</span>
                              <span className="font-bold text-slate-800 font-mono">{person.idType} ({person.idNumber})</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-slate-400 text-[11px]">Vehicle Registration:</span>
                              <span className="font-bold text-indigo-900 font-mono">{person.vehicleNo || 'N/A (Walk-in)'}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-slate-400 text-[11px]">Verification Document:</span>
                              <span className="font-bold text-emerald-700 flex items-center gap-1 text-[11px]">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                {person.idProofDoc}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                          <button
                            onClick={() => toast.success(`Selected ${person.name} as active pickup person today!`)}
                            className="px-3.5 py-1.5 bg-indigo-900 hover:bg-indigo-950 text-white font-extrabold text-xs rounded-xl transition-all shadow-sm"
                          >
                            Authorize for Today
                          </button>

                          <button
                            onClick={() => {
                              setAssignedOthersList(assignedOthersList.filter(p => p.id !== person.id));
                              toast.success(`Revoked authorization for ${person.name}`);
                            }}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Revoke Authorization"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

          </div>
        </main>

      {/* Modal: Assign New Relative / Driver */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full border border-slate-200 shadow-2xl space-y-5 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-900" />
                <span>Assign Pickup Relative / Driver</span>
              </h3>
              <button onClick={() => setShowAssignModal(false)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            <form onSubmit={handleSaveThirdParty} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={newAssignForm.name}
                  onChange={(e) => setNewAssignForm({ ...newAssignForm, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-900 outline-none font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Relationship</label>
                  <select
                    value={newAssignForm.relation}
                    onChange={(e) => setNewAssignForm({ ...newAssignForm, relation: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-900 outline-none font-semibold"
                  >
                    <option value="Family Driver">Family Driver</option>
                    <option value="Maternal Aunt">Maternal Aunt</option>
                    <option value="Paternal Uncle">Paternal Uncle</option>
                    <option value="Grandfather">Grandfather</option>
                    <option value="Grandmother">Grandmother</option>
                    <option value="Neighbor / Carpool">Neighbor / Carpool</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Phone Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="+91 98765 43210"
                    value={newAssignForm.phone}
                    onChange={(e) => setNewAssignForm({ ...newAssignForm, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-900 outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Govt ID Type</label>
                  <select
                    value={newAssignForm.idType}
                    onChange={(e) => setNewAssignForm({ ...newAssignForm, idType: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-900 outline-none font-semibold"
                  >
                    <option value="Aadhaar Card">Aadhaar Card</option>
                    <option value="Driving License">Driving License</option>
                    <option value="Passport">Passport</option>
                    <option value="Voter ID">Voter ID</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Govt ID Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="XXXX-XXXX-1234"
                    value={newAssignForm.idNumber}
                    onChange={(e) => setNewAssignForm({ ...newAssignForm, idNumber: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-900 outline-none font-mono uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Vehicle Registration Number</label>
                <input
                  type="text"
                  placeholder="e.g. KA-01-AB-1234 (Leave blank if walk-in)"
                  value={newAssignForm.vehicleNo}
                  onChange={(e) => setNewAssignForm({ ...newAssignForm, vehicleNo: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-900 outline-none font-mono uppercase"
                />
              </div>

              <div className="pt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-indigo-900 hover:bg-indigo-950 text-white rounded-xl font-extrabold shadow-md"
                >
                  Save & Authorize
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
