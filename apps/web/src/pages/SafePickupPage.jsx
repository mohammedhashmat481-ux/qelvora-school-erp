import { confirmModal } from '../context/ModalContext';
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import Sidebar from '../components/ui/Sidebar';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { getMyStudentMarks } from '../services/authService';
import {
  ShieldCheck,
  QrCode,
  MapPin,
  Camera,
  UserCheck,
  UserX,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileText,
  Smartphone,
  Server,
  Lock,
  Download,
  Printer,
  Copy,
  Plus,
  Search,
  Eye,
  RefreshCw,
  ArrowRight,
  Shield,
  Users,
  Check,
  ChevronRight,
  Trash2,
  Edit3,
  Sliders,
  Bell,
  Radio,
  Share2,
  FileSpreadsheet,
  AlertCircle,
  GraduationCap,
  PhoneCall,
  Mail,
  BadgeCheck,
  HeartHandshake,
  Car,
  UserPlus,
  LogOut,
  BookOpen,
  Calendar,
  Award,
  Target,
  Star,
  CheckCircle,
  TrendingUp
} from 'lucide-react';

const SafePickupPage = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const subParam = searchParams.get('sub');
  
  // Default Active Tab: student-panel or URL tab
  const [activeTab, setActiveTab] = useState(tabParam || 'student-panel');
  const [lastSection, setLastSection] = useState(
    tabParam === 'teacher-panel' || tabParam === 'logs' ? 'teacher' : 'student'
  );
  const [studentSubTab, setStudentSubTab] = useState(subParam || 'all'); // 'all' | 'departure' | 'profile' | 'pickup-request' | 'roadmap' | 'exam-results'
  const [copied, setCopied] = useState(false);

  // Individual Student Exam Marks for Parents & Students
  const [myMarksData, setMyMarksData] = useState(null);
  const [isMyMarksLoading, setIsMyMarksLoading] = useState(false);

  const loadStudentMarks = async () => {
    setIsMyMarksLoading(true);
    try {
      const res = await getMyStudentMarks();
      if (res && res.success) {
        setMyMarksData(res);
      }
    } catch (err) {
      console.warn('Could not load student marks:', err);
    } finally {
      setIsMyMarksLoading(false);
    }
  };

  useEffect(() => {
    loadStudentMarks();
  }, []);

  // Student Departure & Exit Status State for Parents
  const [departureStatus, setDepartureStatus] = useState({
    hasDeparted: true,
    departureTime: '03:45 PM Today',
    exitGate: 'Main Gate 1',
    collectorName: 'Ramesh Kumar',
    collectorRelation: 'Family Driver',
    collectorPhoto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    releasedByTeacher: 'Mrs. Ananya Sen (Class Teacher)',
    vehicleNo: 'KA-01-AB-1234',
    transitStatus: 'En-route to Home Address (ETA 15 Mins)',
    gpsLocation: '12.9716° N, 77.5946° E (School Main Gate Radius)'
  });

  // Synchronize state when URL param changes
  useEffect(() => {
    if (tabParam) {
      setActiveTab(tabParam);
      if (tabParam === 'teacher-panel' || tabParam === 'logs') {
        setLastSection('teacher');
      } else if (tabParam === 'student-panel') {
        setLastSection('student');
      }
    }
    if (subParam) {
      setStudentSubTab(subParam);
    }
  }, [tabParam, subParam]);

  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    if (newTab === 'teacher-panel' || newTab === 'logs') {
      setLastSection('teacher');
    } else if (newTab === 'student-panel') {
      setLastSection('student');
    }
    setSearchParams({ tab: newTab });
  };

  const handleStudentSubTabChange = (sub) => {
    setStudentSubTab(sub);
    setSearchParams({ tab: 'student-panel', sub });
  };

  // Teacher Panel State & Handlers
  const [teacherProfile] = useState({
    name: 'Mrs. Ananya Sen',
    designation: 'Class Teacher — Grade 5-A',
    employeeId: 'EMP-T-2026-401',
    roomNo: 'Room #304',
    totalStudents: 35,
    presentStudents: 32,
    releasedStudents: 28,
    pendingStudents: 4,
    photo: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&auto=format&fit=crop&q=80'
  });

  const [teacherRosterFilter, setTeacherRosterFilter] = useState('ALL');
  const [teacherSearchTerm, setTeacherSearchTerm] = useState('');
  const [classAssemblyBroadcast, setClassAssemblyBroadcast] = useState(false);
  const [emergencyLockdownActive, setEmergencyLockdownActive] = useState(false);

  const [teacherClassRoster, setTeacherClassRoster] = useState([
    {
      id: 'STU-5A-01',
      name: 'Aarav Sharma',
      rollNo: '24',
      uniqueId: 'STU-2026-8941',
      status: 'READY',
      collectorName: 'Ramesh Kumar',
      collectorRelation: 'Family Driver (Authorized)',
      collectorPhone: '+91 98765 43210',
      collectorVehicle: 'KA-01-AB-1234',
      collectorPhoto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      gateTime: '03:45 PM (Gate 1)',
      parentApprovalStatus: 'Approved by Mom (Sunita Sharma)'
    },
    {
      id: 'STU-5A-02',
      name: 'Ananya Sen',
      rollNo: '08',
      uniqueId: 'STU-2026-8942',
      status: 'RELEASED',
      collectorName: 'Rajesh Sen',
      collectorRelation: 'Father',
      collectorPhone: '+91 98765 22222',
      collectorVehicle: 'KA-02-CD-5678',
      collectorPhoto: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
      gateTime: '03:30 PM (Gate 2)',
      parentApprovalStatus: 'Self Pickup (Father)'
    },
    {
      id: 'STU-5A-03',
      name: 'Vihaan Patel',
      rollNo: '31',
      uniqueId: 'STU-2026-8943',
      status: 'PENDING',
      collectorName: 'Sunita Patel',
      collectorRelation: 'Maternal Aunt',
      collectorPhone: '+91 98123 45678',
      collectorVehicle: 'KA-03-MN-5678',
      collectorPhoto: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
      gateTime: 'Arriving at Gate...',
      parentApprovalStatus: 'Waiting Parent Push Approval'
    },
    {
      id: 'STU-5A-04',
      name: 'Diya Sharma',
      rollNo: '12',
      uniqueId: 'STU-2026-8944',
      status: 'READY',
      collectorName: 'Vikram Das',
      collectorRelation: 'Neighbor / Carpool',
      collectorPhone: '+91 97654 32109',
      collectorVehicle: 'KA-05-XY-9012',
      collectorPhoto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      gateTime: '03:48 PM (Gate 1)',
      parentApprovalStatus: 'Approved by Dad (Vikram Sharma)'
    }
  ]);

  const handleTeacherApproveRelease = (studentId, studentName) => {
    setTeacherClassRoster(prev => prev.map(item => item.id === studentId ? { ...item, status: 'RELEASED' } : item));
    toast.success(`Student ${studentName} approved and released safely from Grade 5-A!`);
    const newLog = {
      id: `LOG-${Math.floor(8902 + Math.random() * 100)}`,
      timestamp: new Date().toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }),
      child: `${studentName} (Grade 5-A)`,
      pickupPerson: 'Verified Collector',
      parentApproved: 'Teacher Released (Mrs. Ananya Sen)',
      status: 'Released',
      gps: 'Classroom #304 -> Gate 1',
      gateOfficer: 'Mrs. Ananya Sen (Class Teacher)'
    };
    setLogs(prevLogs => [newLog, ...prevLogs]);
  };

  const handleTeacherFlagSecurityAlert = (studentName) => {
    toast.error(`SECURITY ALERT FLAGGED: Gate Security & Principal notified for student ${studentName}!`);
  };

  // Student & Parents Panel State
  // Student & Parents Panel State & Edit Handlers
  const [studentProfile, setStudentProfile] = useState({
    name: 'Aarav Sharma',
    uniqueId: 'STU-2026-8941',
    classSection: 'Grade 5 - Section A',
    rollNo: '24',
    bloodGroup: 'O+',
    house: 'Sapphire House',
    photo: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=300&auto=format&fit=crop&q=80',
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

  // Homework & Assignments State for Aarav Sharma
  const [homeworkList, setHomeworkList] = useState([
    {
      id: 'HW-01',
      subject: 'Mathematics',
      title: 'Quadratic Equations Exercise 4.2 & Word Problems',
      dueDate: 'Tomorrow (09:00 AM)',
      teacher: 'Dr. Rajesh Sharma',
      status: 'Pending',
      description: 'Solve questions 1 through 15 on page 84. Show complete step-by-step working.'
    },
    {
      id: 'HW-02',
      subject: 'Science (Physics)',
      title: 'Newton\'s Third Law Lab Activity Summary',
      dueDate: 'Wednesday, Oct 14',
      teacher: 'Priya Patel',
      status: 'Submitted',
      description: 'Document observations from the balloon rocket experiment with labeled diagram.'
    },
    {
      id: 'HW-03',
      subject: 'English Literature',
      title: 'Poem Analysis: The Road Not Taken by Robert Frost',
      dueDate: 'Thursday, Oct 15',
      teacher: 'Ananya Sen',
      status: 'Reviewed',
      grade: 'A+ (98%)',
      description: 'Write a 250-word reflective paragraph on themes of choice and consequences.'
    },
    {
      id: 'HW-04',
      subject: 'Social Science',
      title: 'Major Climate Zones of India Map Chart',
      dueDate: 'Friday, Oct 16',
      teacher: 'Vikram Singh',
      status: 'Pending',
      description: 'Color-code the 6 distinct climatic zones on the provided physical map worksheet.'
    }
  ]);

  // Academic History & Term Progression for Aarav Sharma
  const [academicHistory, setAcademicHistory] = useState([
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

  // Learning Roadmap Milestones for Aarav Sharma
  const [learningRoadmap, setLearningRoadmap] = useState([
    {
      id: 'M-1',
      title: 'Unit 1: Number Mastery & Algebra Foundations',
      subject: 'Mathematics',
      progress: 100,
      status: 'Completed',
      targetDate: 'Aug 2026',
      badges: ['Master Calculator', 'Perfect Score Quiz']
    },
    {
      id: 'M-2',
      title: 'Unit 2: Kinetic Forces & Newton\'s Laws Experiments',
      subject: 'Physics',
      progress: 85,
      status: 'In Progress',
      targetDate: 'Oct 2026',
      badges: ['Young Scientist']
    },
    {
      id: 'M-3',
      title: 'Unit 3: Creative Prose & Debate Expression',
      subject: 'English',
      progress: 60,
      status: 'In Progress',
      targetDate: 'Nov 2026',
      badges: ['Eloquent Speaker']
    },
    {
      id: 'M-4',
      title: 'Unit 4: Computer Programming with Python & Scratch',
      subject: 'Computer Science',
      progress: 40,
      status: 'Upcoming',
      targetDate: 'Dec 2026',
      badges: ['Code Explorer']
    },
    {
      id: 'M-5',
      title: 'Unit 5: Environmental Geography & Climate Mapping',
      subject: 'Geography',
      progress: 15,
      status: 'Upcoming',
      targetDate: 'Jan 2027',
      badges: ['Eco Champion']
    }
  ]);

  // Profile Edit Modal States
  const [showEditStudentModal, setShowEditStudentModal] = useState(false);
  const [editStudentForm, setEditStudentForm] = useState({
    name: '',
    classSection: '',
    rollNo: '',
    bloodGroup: '',
    house: '',
    emergencyPhone: '',
    photo: ''
  });

  const [showEditParentModal, setShowEditParentModal] = useState(null); // 'mom' | 'dad' | null
  const [editParentForm, setEditParentForm] = useState({
    name: '',
    phone: '',
    email: '',
    idType: '',
    idNumber: '',
    photo: ''
  });

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
      setMomProfile({ ...editParentForm });
      toast.success("Mother's profile updated successfully!");
    } else {
      setDadProfile({ ...editParentForm });
      toast.success("Father's profile updated successfully!");
    }
    setShowEditParentModal(null);
  };

  const [pickupRequestOption, setPickupRequestOption] = useState('mom'); // 'mom' | 'dad' | 'others'
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
      idType: 'Voter ID',
      idNumber: 'KA-VOTER-5678',
      vehicleNo: 'KA-03-MN-5678',
      photo: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
      idProofDoc: 'Uploaded & Verified (Voter ID)',
      status: 'Active Pass'
    }
  ]);

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [editingThirdParty, setEditingThirdParty] = useState(null);
  const [newAssignForm, setNewAssignForm] = useState({
    name: '',
    phone: '',
    relation: 'Relative / Third Party',
    idType: 'Aadhaar Card',
    idNumber: '',
    vehicleNo: '',
    photoUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    idProofDocName: '',
    parentAuthorizationConsent: true
  });

  const handleOpenAssignModal = () => {
    setEditingThirdParty(null);
    setNewAssignForm({
      name: '',
      phone: '',
      relation: 'Relative / Third Party',
      idType: 'Aadhaar Card',
      idNumber: '',
      vehicleNo: '',
      photoUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      idProofDocName: '',
      parentAuthorizationConsent: true
    });
    setShowAssignModal(true);
  };

  const handleOpenEditThirdPartyModal = (person) => {
    setEditingThirdParty(person);
    setNewAssignForm({
      name: person.name,
      phone: person.phone,
      relation: person.relation,
      idType: person.idType || 'Aadhaar Card',
      idNumber: person.idNumber || '',
      vehicleNo: person.vehicleNo === 'N/A' ? '' : person.vehicleNo,
      photoUrl: person.photo,
      idProofDocName: person.idProofDoc || '',
      parentAuthorizationConsent: true
    });
    setShowAssignModal(true);
  };

  // Live Kiosk Simulation State
  const [simulatedStatus, setSimulatedStatus] = useState('idle'); // 'idle' | 'geofence-detected' | 'qr-scanned' | 'pending-approval' | 'approved' | 'denied'
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [selectedChild, setSelectedChild] = useState('Aarav Sharma (Std 5-A)');
  const [selectedPickupPerson, setSelectedPickupPerson] = useState({
    name: 'Ramesh Kumar',
    relation: 'Family Driver / Authorized Third Party',
    phone: '+91 98765 43210',
    vehicleNo: 'KA-01-AB-1234',
    photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
    qrCode: 'SP-QR-2026-987654'
  });

  // Dynamic QR Countdown Timer (15 Mins)
  const [qrSecondsLeft, setQrSecondsLeft] = useState(899);
  useEffect(() => {
    const timer = setInterval(() => {
      setQrSecondsLeft((prev) => (prev > 0 ? prev - 1 : 899));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTimer = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Authorized Contacts State
  const [contacts, setContacts] = useState([
    {
      id: 1,
      name: 'Ramesh Kumar',
      relation: 'Family Driver',
      phone: '+91 98765 43210',
      vehicleNo: 'KA-01-AB-1234',
      status: 'Active',
      validUntil: '2026-12-31',
      child: 'Aarav Sharma (Std 5-A)',
      photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'
    },
    {
      id: 2,
      name: 'Sunita Patel',
      relation: 'Maternal Aunt',
      phone: '+91 98123 45678',
      vehicleNo: 'KA-03-MN-5678',
      status: 'Active',
      validUntil: '2026-10-15',
      child: 'Ananya Sen (Std 6-B)',
      photo: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80'
    },
    {
      id: 3,
      name: 'Vikram Das',
      relation: 'Neighbor & Carpool Partner',
      phone: '+91 97654 32109',
      vehicleNo: 'KA-05-XY-9012',
      status: 'Active',
      validUntil: '2026-11-30',
      child: 'Vihaan Patel (Std 4-C)',
      photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80'
    }
  ]);

  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [showQrModal, setShowQrModal] = useState(null);

  const [newContact, setNewContact] = useState({
    name: '',
    relation: 'Family Driver',
    phone: '',
    vehicleNo: '',
    child: 'Aarav Sharma (Std 5-A)',
    photo: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'
  });

  // System Settings State
  const [settings, setSettings] = useState({
    geofenceRadiusMeters: 200,
    parentApprovalTimeoutMins: 3,
    emergencySirenSound: true,
    autoAlertSecurity: true,
    requireTeacherSnapshot: true,
    offlineFallbackMode: false,
    emergencyPhone: '+91 112 / Security Desk'
  });

  // Audit Logs State & Filtering
  const [logsSearch, setLogsSearch] = useState('');
  const [logsStatusFilter, setLogsStatusFilter] = useState('ALL');
  const [logs, setLogs] = useState([
    {
      id: 'LOG-8901',
      timestamp: '2026-09-22 03:45 PM',
      child: 'Aarav Sharma (Std 5-A)',
      pickupPerson: 'Ramesh Kumar (Driver)',
      parentApproved: 'Priya Sharma (Mother)',
      status: 'Released',
      gps: '12.9716° N, 77.5946° E (School Main Gate)',
      gateOfficer: 'Security Officer Deshmukh'
    },
    {
      id: 'LOG-8900',
      timestamp: '2026-09-22 03:40 PM',
      child: 'Ananya Sen (Std 6-B)',
      pickupPerson: 'Sunita Patel (Aunt)',
      parentApproved: 'Rajesh Sen (Father)',
      status: 'Released',
      gps: '12.9716° N, 77.5946° E (East Gate)',
      gateOfficer: 'Teacher Mrs. Kapoor'
    },
    {
      id: 'LOG-8899',
      timestamp: '2026-09-22 03:30 PM',
      child: 'Vihaan Patel (Std 4-C)',
      pickupPerson: 'Unverified Unknown Person',
      parentApproved: 'Denied by Parent (Security Alert)',
      status: 'Denied & Alerted',
      gps: '12.9716° N, 77.5946° E (Main Gate)',
      gateOfficer: 'Security Officer Deshmukh'
    }
  ]);

  // Actions & Handlers
  const handleCopySummary = () => {
    const textContent = `SafePickup — Secure School Child Pickup System
One-Page Concept Summary

1. Problem
Rising incidents of child kidnapping / unauthorized pickup from schools. Parents need a verified, tamper-proof way to confirm who is collecting their child — themselves or a trusted third party (relative, driver, neighbor, etc.).

2. Solution Overview
A mobile/web app connecting Parents, Authorized Third Parties, and School Staff (Teachers/Gate Security) through location-based verification, photo confirmation, and real-time parent approval before any child is released.

3. Key Features
• Parent ID verification at pickup (digital ID / face match).
• Third-party assignment by parent, with photo, name, phone number & relationship.
• Geofencing: system detects when assigned person enters a set radius of the school.
• Auto-generated, time-limited QR code for the third party AND the teacher, valid only for that pickup event.
• Teacher captures a live photo of the person; system sends a real-time approval request to the parent.
• Child is released only after parent taps "Approve" — full audit trail logged (time, photo, GPS, QR scan).
• Emergency override & alert to school admin/security if approval is denied or times out.

4. Pickup Workflow (Third Party)
• Parent assigns third party in-app (name, photo, ID, relation, pickup date/time).
• Third party enters the school's geofenced radius → app auto-notifies school gate/teacher.
• System generates matching QR codes for third party and teacher.
• Teacher scans QR, takes a photo of the person, and sends approval request to parent.
• Parent reviews photo + details on their phone and approves/denies in real time.
• On approval, child is released; event logged with timestamp, photo, and location.

5. Suggested Tech Stack
• Frontend: React Native / Flutter (parent & teacher apps).
• Backend: Node.js / Firebase for real-time notifications & data.
• Location: Geofencing API (Google Maps / Mapbox).
• QR & Face Verification: Dynamic QR library + optional face-match SDK.
• Database: Encrypted storage for IDs, photos, and pickup logs (compliance with child-data privacy laws).

6. Safety & Compliance Notes
• Store minimal personal data; encrypt IDs and photos; follow local child-data protection regulations.
• Always keep school staff as a human checkpoint — technology assists but does not replace their judgment.
• Provide an offline/manual fallback procedure in case of app or network failure.`;

    navigator.clipboard.writeText(textContent);
    setCopied(true);
    toast.success('Concept Summary copied to clipboard!');
    setTimeout(() => setCopied(false), 3000);
  };

  const handlePrintSummary = () => {
    window.print();
  };

  // Kiosk Flow Handlers
  const handleTriggerGeofence = () => {
    setSimulatedStatus('geofence-detected');
    toast.success(`Geofence Alert: ${selectedPickupPerson.name} entered ${settings.geofenceRadiusMeters}m School Radius!`);
  };

  const handleScanQR = () => {
    setSimulatedStatus('qr-scanned');
    toast.success('Dynamic QR Token Verified! Match confirmed with Parent App.');
  };

  const handleCapturePhotoAndRequest = () => {
    setCapturedPhoto('https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80');
    setSimulatedStatus('pending-approval');
    toast('Live Snapshot Captured! Instant Push Notification sent to Parent Phone.', { icon: '🔔' });
  };

  const handleApprovePickup = () => {
    setSimulatedStatus('approved');
    const newLog = {
      id: `LOG-${Math.floor(8902 + Math.random() * 100)}`,
      timestamp: new Date().toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }),
      child: selectedChild,
      pickupPerson: `${selectedPickupPerson.name} (${selectedPickupPerson.relation})`,
      parentApproved: 'Approved by Parent (Live Verification)',
      status: 'Released',
      gps: `12.9716° N, 77.5946° E (Main Gate Kiosk)`,
      gateOfficer: user?.name || 'Gate Security Officer'
    };
    setLogs([newLog, ...logs]);
    toast.success(`Child ${selectedChild} Released Safely! Audit log generated.`);
  };

  const handleDenyPickup = () => {
    setSimulatedStatus('denied');
    const newLog = {
      id: `LOG-${Math.floor(8902 + Math.random() * 100)}`,
      timestamp: new Date().toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }),
      child: selectedChild,
      pickupPerson: `${selectedPickupPerson.name} (Unapproved)`,
      parentApproved: 'DENIED by Parent — Emergency Siren Alert Triggered',
      status: 'Denied & Alerted',
      gps: `12.9716° N, 77.5946° E (Main Gate Kiosk)`,
      gateOfficer: user?.name || 'Gate Security Officer'
    };
    setLogs([newLog, ...logs]);
    toast.error(`SECURITY SIREN ALERT: Pickup Denied by Parent! School Admin & Gate Guards Notified.`);
  };

  const handleResetKiosk = () => {
    setSimulatedStatus('idle');
    setCapturedPhoto(null);
    toast('Kiosk reset to idle state.', { icon: '🔄' });
  };

  // CRUD Handlers for Authorized Contacts
  const handleSaveContact = (e) => {
    e.preventDefault();
    if (!newContact.name || !newContact.phone) {
      toast.error('Please fill in name and phone number');
      return;
    }

    if (editingContact) {
      setContacts(contacts.map(c => c.id === editingContact.id ? { ...c, ...newContact } : c));
      toast.success('Authorized person details updated!');
    } else {
      const item = {
        id: contacts.length + 1,
        ...newContact,
        status: 'Active',
        validUntil: '2026-12-31'
      };
      setContacts([...contacts, item]);
      toast.success('New Authorized Third Party added!');
    }

    setShowAddContactModal(false);
    setEditingContact(null);
    setNewContact({ name: '', relation: 'Family Driver', phone: '', vehicleNo: '', child: 'Aarav Sharma (Std 5-A)', photo: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80' });
  };

  const handleDeleteContact = async (id) => {
    if (await confirmModal({ title: 'Revoke Authorization', message: 'Are you sure you want to revoke pickup authorization for this guardian/person?', type: 'danger', confirmText: 'Revoke Authorization' })) {
      setContacts(contacts.filter(c => c.id !== id));
      toast.success('Authorization revoked successfully.');
    }
  };

  // CSV Export Handler for Audit Logs
  const handleExportCSV = () => {
    const headers = ['Log ID', 'Timestamp', 'Child Name', 'Pickup Collector', 'Parent Approval Status', 'GPS & Location', 'Gate Officer'];
    const csvRows = [headers.join(',')];

    logs.forEach((log) => {
      const row = [
        `"${log.id}"`,
        `"${log.timestamp}"`,
        `"${log.child}"`,
        `"${log.pickupPerson}"`,
        `"${log.parentApproved}"`,
        `"${log.gps}"`,
        `"${log.gateOfficer}"`
      ];
      csvRows.push(row.join(','));
    });

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', `SafePickup_Audit_Logs_${new Date().toISOString().slice(0, 10)}.csv`);
    a.click();
    toast.success('Security Audit Logs exported as CSV!');
  };

  // Filtered Logs calculation
  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.child.toLowerCase().includes(logsSearch.toLowerCase()) ||
      log.pickupPerson.toLowerCase().includes(logsSearch.toLowerCase()) ||
      log.gateOfficer.toLowerCase().includes(logsSearch.toLowerCase()) ||
      log.id.toLowerCase().includes(logsSearch.toLowerCase());

    const matchesStatus =
      logsStatusFilter === 'ALL' ||
      (logsStatusFilter === 'RELEASED' && log.status === 'Released') ||
      (logsStatusFilter === 'DENIED' && log.status !== 'Released');

    return matchesSearch && matchesStatus;
  });

  const isTeacherView = activeTab === 'teacher-panel' || activeTab === 'logs' || (activeTab === 'settings' && lastSection === 'teacher');

  return (
    <div className="min-h-screen bg-[#F7F9FC] text-[#334155] flex flex-col md:flex-row font-sans">
      {/* Left Navigation Sidebar */}
      <Sidebar />

      {/* Main Workspace Area */}
      <main className="flex-1 min-w-0 bg-[#F7F9FC] p-4 sm:p-6 lg:p-8 overflow-y-auto pb-24 md:pb-8">
        <div className="max-w-7xl mx-auto space-y-6">

            {/* ── HEADER BANNER (DEDICATED PER PAGE: STUDENT PANEL vs TEACHER PANEL) ── */}
            <div className="bg-[#172B4D] rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden border border-[#29456D]">
              <div className="absolute top-0 right-0 -mt-10 -mr-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
              
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 text-xs font-bold uppercase tracking-wider">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                    <span>Qelvora School CRM Child Protection Suite</span>
                  </div>

                  {isTeacherView ? (
                    <>
                      <h1 className="text-2xl md:text-4xl font-black text-white tracking-tight">
                        {activeTab === 'logs'
                          ? 'SafePickup — Security & Release Audit Trail'
                          : activeTab === 'settings'
                          ? 'SafePickup — System Settings'
                          : 'SafePickup — Teacher Panel'}
                      </h1>
                      <p className="text-sm md:text-base text-slate-300 font-medium max-w-3xl">
                        {activeTab === 'logs'
                          ? 'Encrypted log of all child pickup verification events compliant with privacy standards.'
                          : activeTab === 'settings'
                          ? 'Configure SafePickup gate clearances, verification rules, and emergency broadcast preferences.'
                          : 'Classroom dismissal, gate release verification, intercom assembly broadcasts, and emergency lockdown console for teachers.'}
                      </p>
                    </>
                  ) : (
                    <>
                      <h1 className="text-2xl md:text-4xl font-black text-white tracking-tight">
                        {activeTab === 'settings'
                          ? 'SafePickup — System Settings'
                          : 'SafePickup — Student & Parents Panel'}
                      </h1>
                      <p className="text-sm md:text-base text-slate-300 font-medium max-w-3xl">
                        {activeTab === 'settings'
                          ? 'Configure SafePickup gate clearances, verification rules, and emergency broadcast preferences.'
                          : 'Student profile, verified parent profiles (Mom & Dad), and real-time parent-authorized third-party pickup delegation system.'}
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* ── NAVIGATION TABS (SEPARATED: NO MIXING STUDENT & TEACHER TABS) ── */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-8 pt-6 border-t border-slate-800/80">
                <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
                  {isTeacherView ? (
                    <>
                      <button
                        onClick={() => handleTabChange('teacher-panel')}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-extrabold text-xs transition-all whitespace-nowrap ${
                          activeTab === 'teacher-panel'
                            ? 'bg-white text-indigo-950 shadow-md border-b-2 border-indigo-600'
                            : 'text-slate-300 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        <UserCheck className="w-4 h-4 text-blue-400" />
                        <span>Teacher Console</span>
                        <span className="text-[9px] bg-blue-500/30 text-blue-200 border border-blue-400/40 px-1.5 py-0.5 rounded font-black uppercase">DUTY</span>
                      </button>

                      <button
                        onClick={() => handleTabChange('logs')}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-extrabold text-xs transition-all whitespace-nowrap ${
                          activeTab === 'logs'
                            ? 'bg-white text-indigo-950 shadow-md border-b-2 border-indigo-600'
                            : 'text-slate-300 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        <Lock className="w-4 h-4 text-blue-400" />
                        <span>Security Audit Logs</span>
                      </button>

                      <button
                        onClick={() => handleTabChange('settings')}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-extrabold text-xs transition-all whitespace-nowrap ${
                          activeTab === 'settings'
                            ? 'bg-white text-indigo-950 shadow-md border-b-2 border-indigo-600'
                            : 'text-slate-300 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        <Sliders className="w-4 h-4 text-blue-400" />
                        <span>System Settings</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => handleTabChange('student-panel')}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-extrabold text-xs transition-all whitespace-nowrap ${
                          activeTab === 'student-panel'
                            ? 'bg-white text-indigo-950 shadow-md border-b-2 border-indigo-600'
                            : 'text-slate-300 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        <GraduationCap className="w-4 h-4 text-blue-400" />
                        <span>Student Panel</span>
                        <span className="text-[9px] bg-blue-500/30 text-blue-200 border border-blue-400/40 px-1.5 py-0.5 rounded font-black uppercase">PRIMARY</span>
                      </button>

                      <button
                        onClick={() => handleTabChange('settings')}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-extrabold text-xs transition-all whitespace-nowrap ${
                          activeTab === 'settings'
                            ? 'bg-white text-indigo-950 shadow-md border-b-2 border-indigo-600'
                            : 'text-slate-300 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        <Sliders className="w-4 h-4 text-blue-400" />
                        <span>System Settings</span>
                      </button>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {isTeacherView ? (
                    <button
                      onClick={() => handleTabChange('student-panel')}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-blue-200 bg-blue-900/40 hover:bg-blue-800/60 border border-blue-500/30 transition-all cursor-pointer whitespace-nowrap"
                    >
                      <GraduationCap className="w-3.5 h-3.5" />
                      <span>Switch to Student & Parent View →</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleTabChange('teacher-panel')}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-blue-200 bg-blue-900/40 hover:bg-blue-800/60 border border-blue-500/30 transition-all cursor-pointer whitespace-nowrap"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Switch to Teacher Console →</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* ── TAB 1: LIVE PICKUP GATE KIOSK SIMULATOR (DEFAULT ACTIVE TAB) ── */}
            {activeTab === 'live-kiosk' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left 2 Cols: Interactive Workflow Terminal */}
                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                      <div>
                        <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                          Gate 1 Security Verification Terminal
                        </h2>
                        <p className="text-xs text-slate-500 font-medium">
                          Simulate live step-by-step gate checkpoints for third-party pickup release.
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleResetKiosk}
                          className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all border border-slate-200"
                        >
                          <RefreshCw className="w-3.5 h-3.5 text-slate-600" />
                          <span>Reset Terminal</span>
                        </button>
                        <span className="px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-xs flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                          Geofence Active
                        </span>
                      </div>
                    </div>

                    {/* Step Timeline Indicator */}
                    <div className="grid grid-cols-4 gap-3">
                      <div className={`p-3.5 rounded-2xl border text-center transition-all ${
                        simulatedStatus !== 'idle' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-slate-50 text-slate-400 border-slate-200'
                      }`}>
                        <div className="text-[10px] uppercase font-extrabold tracking-wider opacity-80">Step 1</div>
                        <div className="text-xs font-black mt-0.5">Geofence</div>
                      </div>

                      <div className={`p-3.5 rounded-2xl border text-center transition-all ${
                        simulatedStatus === 'qr-scanned' || simulatedStatus === 'pending-approval' || simulatedStatus === 'approved' || simulatedStatus === 'denied'
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-slate-50 text-slate-400 border-slate-200'
                      }`}>
                        <div className="text-[10px] uppercase font-extrabold tracking-wider opacity-80">Step 2</div>
                        <div className="text-xs font-black mt-0.5">Scan QR</div>
                      </div>

                      <div className={`p-3.5 rounded-2xl border text-center transition-all ${
                        simulatedStatus === 'pending-approval' || simulatedStatus === 'approved' || simulatedStatus === 'denied'
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-slate-50 text-slate-400 border-slate-200'
                      }`}>
                        <div className="text-[10px] uppercase font-extrabold tracking-wider opacity-80">Step 3</div>
                        <div className="text-xs font-black mt-0.5">Snap Photo</div>
                      </div>

                      <div className={`p-3.5 rounded-2xl border text-center transition-all ${
                        simulatedStatus === 'approved' ? 'bg-emerald-600 text-white border-emerald-600 shadow-md' :
                        simulatedStatus === 'denied' ? 'bg-rose-600 text-white border-rose-600 shadow-md' : 'bg-slate-50 text-slate-400 border-slate-200'
                      }`}>
                        <div className="text-[10px] uppercase font-extrabold tracking-wider opacity-80">Step 4</div>
                        <div className="text-xs font-black mt-0.5">Parent Action</div>
                      </div>
                    </div>

                    {/* Active Target Details Card */}
                    <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 flex flex-col md:flex-row items-center gap-5">
                      <img
                        src={selectedPickupPerson.photo}
                        alt="Authorized Person"
                        className="w-20 h-20 rounded-2xl object-cover border-2 border-indigo-600 shadow-sm"
                      />
                      <div className="flex-1 space-y-1 text-center md:text-left">
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                          <h3 className="text-base font-black text-slate-900">{selectedPickupPerson.name}</h3>
                          <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200 font-bold text-[10px]">
                            {selectedPickupPerson.relation}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 font-medium">Vehicle: <strong className="text-slate-900">{selectedPickupPerson.vehicleNo}</strong> | Phone: {selectedPickupPerson.phone}</p>
                        <p className="text-xs text-emerald-700 font-bold flex items-center justify-center md:justify-start gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Assigned Student: <strong>{selectedChild}</strong>
                        </p>
                      </div>
                    </div>

                    {/* Interactive Security Controls */}
                    <div className="space-y-4 pt-2">
                      <div className="text-xs font-extrabold text-indigo-900 uppercase tracking-wider">
                        Interactive Security Test Controls
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <button
                          onClick={handleTriggerGeofence}
                          className="flex items-center justify-center gap-2 p-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-md transition-all active:scale-95 border border-indigo-500"
                        >
                          <MapPin className="w-4 h-4 text-blue-200" />
                          <span>1. Trigger Geofence</span>
                        </button>

                        <button
                          onClick={handleScanQR}
                          disabled={simulatedStatus === 'idle'}
                          className="flex items-center justify-center gap-2 p-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-md transition-all active:scale-95 disabled:opacity-40 border border-indigo-500"
                        >
                          <QrCode className="w-4 h-4 text-blue-200" />
                          <span>2. Scan Dynamic QR</span>
                        </button>

                        <button
                          onClick={handleCapturePhotoAndRequest}
                          disabled={simulatedStatus !== 'qr-scanned'}
                          className="flex items-center justify-center gap-2 p-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-extrabold text-xs shadow-md transition-all active:scale-95 disabled:opacity-40 border border-blue-500"
                        >
                          <Camera className="w-4 h-4" />
                          <span>3. Snap & Request</span>
                        </button>
                      </div>
                    </div>

                    {/* Simulated Live Parent Smartphone Notification View */}
                    {simulatedStatus === 'pending-approval' && (
                      <div className="bg-slate-900 rounded-2xl p-6 text-white space-y-4 animate-fadeIn border-2 border-indigo-500 shadow-2xl">
                        <div className="flex items-center justify-between text-xs text-blue-300 font-bold">
                          <span className="flex items-center gap-1.5">
                            <Smartphone className="w-4 h-4 text-blue-400" />
                            PARENT PHONE REAL-TIME APPROVAL PROMPT
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30 animate-pulse">
                            ● PUSH NOTIFICATION DELIVERED
                          </span>
                        </div>

                        <div className="flex items-center gap-4 bg-slate-800/80 p-4 rounded-xl border border-slate-700">
                          <img
                            src={capturedPhoto}
                            alt="Live Gate Capture"
                            className="w-16 h-16 rounded-xl object-cover border-2 border-blue-400"
                          />
                          <div className="space-y-1 text-xs">
                            <p className="font-bold text-white text-sm">Gate Capture: Ramesh Kumar</p>
                            <p className="text-slate-300">Requesting release of child: <strong className="text-blue-300">{selectedChild}</strong></p>
                            <p className="text-slate-400 text-[10px]">Gate 1 Kiosk • GPS Verified (12.9716° N, 77.5946° E)</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 pt-2">
                          <button
                            onClick={handleApprovePickup}
                            className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            APPROVE CHILD RELEASE
                          </button>

                          <button
                            onClick={handleDenyPickup}
                            className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"
                          >
                            <XCircle className="w-4 h-4" />
                            DENY & SIREN ALERT
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Result Banners */}
                    {simulatedStatus === 'approved' && (
                      <div className="bg-emerald-50 border-2 border-emerald-500 rounded-2xl p-5 text-emerald-900 flex items-center gap-4 animate-fadeIn">
                        <CheckCircle2 className="w-8 h-8 text-emerald-600 shrink-0" />
                        <div>
                          <h4 className="font-black text-sm">CHILD RELEASE AUTHORIZED!</h4>
                          <p className="text-xs text-emerald-800">
                            Parent approved in real-time. Student <strong>{selectedChild}</strong> is cleared to depart with {selectedPickupPerson.name}. Security audit log generated.
                          </p>
                        </div>
                      </div>
                    )}

                    {simulatedStatus === 'denied' && (
                      <div className="bg-rose-50 border-2 border-rose-500 rounded-2xl p-5 text-rose-900 flex items-center gap-4 animate-fadeIn">
                        <AlertTriangle className="w-8 h-8 text-rose-600 shrink-0" />
                        <div>
                          <h4 className="font-black text-sm">SECURITY SIREN ALERT TRIGGERED!</h4>
                          <p className="text-xs text-rose-800">
                            Parent denied pickup! Child remains secured inside school. Gate Officers and Police dispatch notified.
                          </p>
                        </div>
                      </div>
                    )}

                  </div>
                </div>

                {/* Right Col: Dynamic QR Display & Live Countdown Timer */}
                <div className="space-y-6">
                  <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm text-center space-y-4">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 mb-1 border border-blue-100">
                      <QrCode className="w-6 h-6" />
                    </div>

                    <div>
                      <h3 className="text-base font-black text-slate-900">Time-Limited Dynamic QR</h3>
                      <p className="text-xs text-slate-500 font-medium">Single-use token generated for this pickup event</p>
                    </div>

                    {/* QR Code Container with Countdown Clock */}
                    <div className="bg-white p-4 rounded-2xl border-2 border-dashed border-blue-400 inline-block shadow-inner relative">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${selectedPickupPerson.qrCode}`}
                        alt="Dynamic QR Code"
                        className="w-44 h-44 object-contain mx-auto"
                      />
                      <p className="text-[10px] font-mono text-indigo-950 font-bold mt-2">{selectedPickupPerson.qrCode}</p>
                    </div>

                    {/* Live Timer Clock */}
                    <div className="bg-slate-900 text-white p-3.5 rounded-2xl border border-slate-800 flex items-center justify-between text-xs">
                      <span className="text-blue-300 font-bold flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-blue-400" />
                        QR Expiration Timer:
                      </span>
                      <span className="font-mono font-extrabold text-sm text-emerald-400">
                        {formatTimer(qrSecondsLeft)}
                      </span>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-left text-xs space-y-1.5">
                      <p className="text-slate-900 font-bold">Security Token Protocol:</p>
                      <p className="text-slate-600">• Valid Radius: <strong>{settings.geofenceRadiusMeters}m School Radius</strong></p>
                      <p className="text-slate-600">• Parent App Match: <strong>Encrypted Token Handshake</strong></p>
                      <p className="text-slate-600">• Auto Expiration: <strong>Expires upon pickup completion</strong></p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── TAB: STUDENT PANEL (STUDENT PROFILE, PARENTS PROFILE & PICKUP REQUESTS) ── */}
            {activeTab === 'student-panel' && (
              <div className="space-y-8 animate-fadeIn">

                {/* ── STUDENT PANEL SUB-MENU STRIP ── */}
                <div className="bg-white rounded-2xl p-3 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse"></span>
                    <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">Student Panel Navigation:</h3>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
                    <button
                      onClick={() => handleStudentSubTabChange('all')}
                      className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                        studentSubTab === 'all'
                          ? 'bg-indigo-900 text-white shadow-md'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      <span>📊 Complete Overview</span>
                    </button>

                    <button
                      onClick={() => handleStudentSubTabChange('profile')}
                      className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                        studentSubTab === 'profile'
                          ? 'bg-indigo-900 text-white shadow-md'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      <GraduationCap className="w-3.5 h-3.5 text-blue-300" />
                      <span>1. 👤 Student & Parent Profile</span>
                    </button>

                    <button
                      onClick={() => handleStudentSubTabChange('roadmap')}
                      className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                        studentSubTab === 'roadmap'
                          ? 'bg-indigo-900 text-white shadow-md'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      <BookOpen className="w-3.5 h-3.5 text-blue-300" />
                      <span>2. 📚 Homework & Roadmap</span>
                    </button>

                    <button
                      onClick={() => handleStudentSubTabChange('departure')}
                      className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                        studentSubTab === 'departure'
                          ? 'bg-indigo-900 text-white shadow-md'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      <LogOut className="w-3.5 h-3.5 text-blue-300" />
                      <span>3. 🚪 Campus Exit Status</span>
                    </button>

                    <button
                      onClick={() => handleStudentSubTabChange('pickup-request')}
                      className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                        studentSubTab === 'pickup-request'
                          ? 'bg-indigo-900 text-white shadow-md'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      <Car className="w-3.5 h-3.5 text-blue-300" />
                      <span>4. 🚗 Safe Pickup Authorization</span>
                    </button>

                    <button
                      onClick={() => handleStudentSubTabChange('exam-results')}
                      className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                        studentSubTab === 'exam-results'
                          ? 'bg-indigo-900 text-white shadow-md'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      <Award className="w-3.5 h-3.5 text-blue-300" />
                      <span>5. 🎯 Exam Marks & Report</span>
                    </button>
                  </div>
                </div>

                {/* ── 🚪 FEATURE: CAMPUS DEPARTURE & EXIT TRACKER FOR PARENTS ── */}
                {(studentSubTab === 'all' || studentSubTab === 'departure') && (
                  <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6 animate-fadeIn">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="flex h-3 w-3 relative">
                            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${departureStatus.hasDeparted ? 'bg-indigo-400 opacity-75' : 'bg-emerald-400 opacity-75'}`}></span>
                            <span className={`relative inline-flex rounded-full h-3 w-3 ${departureStatus.hasDeparted ? 'bg-indigo-600' : 'bg-emerald-500'}`}></span>
                          </span>
                          <h3 className="text-lg font-black text-slate-900">Campus Exit & Departure Live Info</h3>
                        </div>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">Real-time confirmation for parents tracking when student has left school / college campus.</p>
                      </div>

                      {/* Live Campus Departure Status Badge */}
                      <div className="flex items-center gap-3">
                        <span className={`px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider border flex items-center gap-1.5 shadow-xs ${
                          departureStatus.hasDeparted
                            ? 'bg-indigo-50 text-indigo-900 border-indigo-200'
                            : 'bg-emerald-50 text-emerald-900 border-emerald-200'
                        }`}>
                          {departureStatus.hasDeparted ? '🚪 DEPARTED CAMPUS' : '🏫 INSIDE CAMPUS / CLASSROOM'}
                        </span>

                        <button
                          onClick={() => {
                            const nextDeparted = !departureStatus.hasDeparted;
                            setDepartureStatus({
                              ...departureStatus,
                              hasDeparted: nextDeparted,
                              departureTime: nextDeparted ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' Today' : 'Pending Dismissal'
                            });
                            if (nextDeparted) {
                              toast.success('Simulated Push Alert: Student Aarav Sharma has departed school campus via Main Gate 1!');
                            } else {
                              toast('Status updated: Student is inside classroom.', { icon: '🏫' });
                            }
                          }}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all border border-slate-200 flex items-center gap-1"
                        >
                          <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                          <span>Toggle Status Test</span>
                        </button>
                      </div>
                    </div>

                    {/* Departure Info Banner & Live Tracker Grid */}
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

                      {/* Box 2: Authorized Collector & Teacher Approval */}
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

                      {/* Box 3: Live Transit GPS Status */}
                      <div className="p-5 rounded-2xl bg-slate-900 text-white space-y-3 border border-slate-800 shadow-md">
                        <div className="flex items-center justify-between text-xs font-extrabold text-blue-300 uppercase tracking-wider">
                          <span>Live Transit Tracker</span>
                          <span className="flex items-center gap-1 text-emerald-400 text-[10px]">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
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

                    {/* Real-time Parent Notification Alert Banner */}
                    <div className="p-4 rounded-2xl bg-slate-900 text-white flex items-center justify-between gap-4 border border-indigo-900">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-400/30 shrink-0">
                          <Bell className="w-5 h-5" />
                        </div>
                        <div className="text-xs space-y-0.5">
                          <p className="font-extrabold text-white text-sm">Parent Push Notification Delivered</p>
                          <p className="text-slate-300">
                            "Aarav Sharma has safely departed school campus via Main Gate 1 at {departureStatus.departureTime} with {departureStatus.collectorName} ({departureStatus.collectorRelation})."
                          </p>
                        </div>
                      </div>
                      <span className="hidden sm:inline-block px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30 whitespace-nowrap">
                        ● Parent Alerted
                      </span>
                    </div>
                  </div>
                )}

                {/* ── SUB-VIEW 1: STUDENT & PARENTS PROFILE ── */}
                {(studentSubTab === 'all' || studentSubTab === 'profile') && (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fadeIn">

                  {/* Left Col (4 Cols): Student Profile Card */}
                  <div className="lg:col-span-4 bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between space-y-6">
                    <div>
                      <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                        <div className="flex items-center gap-2">
                          <GraduationCap className="w-5 h-5 text-indigo-900" />
                          <h3 className="font-extrabold text-slate-900 text-base">Student Profile</h3>
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
                        Real-time geofence & photo verification enabled for Aarav. Emergency Contact: <strong className="text-white font-mono">{studentProfile.emergencyPhone}</strong>
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

                  {/* Right Col (8 Cols): Parents Profile Section (Mom & Dad on the same page) */}
                  <div className="lg:col-span-8 bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                      <div>
                        <h3 className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
                          <Users className="w-5 h-5 text-indigo-900" />
                          <span>Parents & Guardians Profile</span>
                        </h3>
                        <p className="text-xs text-slate-500 font-medium">
                          Registered primary and secondary guardians authorized for instant child release approval.
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
                          <button 
                            onClick={() => {
                              setPickupRequestOption('mom');
                              toast.success('Selected Mother (Sunita Sharma) for Today’s Pickup!');
                            }}
                            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                              pickupRequestOption === 'mom'
                                ? 'bg-indigo-900 text-white shadow-sm'
                                : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            {pickupRequestOption === 'mom' ? 'Selected for Pickup' : 'Select for Pickup'}
                          </button>
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
                          <button 
                            onClick={() => {
                              setPickupRequestOption('dad');
                              toast.success('Selected Father (Rajesh Sharma) for Today’s Pickup!');
                            }}
                            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                              pickupRequestOption === 'dad'
                                ? 'bg-indigo-900 text-white shadow-sm'
                                : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            {pickupRequestOption === 'dad' ? 'Selected for Pickup' : 'Select for Pickup'}
                          </button>
                        </div>
                      </div>

                    </div>
                  </div>
                </div>
                )}

                {/* ── SUB-VIEW: HOMEWORK & LEARNING ROADMAP (AARAV SHARMA) ── */}
                {(studentSubTab === 'all' || studentSubTab === 'roadmap') && (
                  <div className="space-y-6 animate-fadeIn">
                    {/* Header */}
                    <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-900 border border-blue-200 text-xs font-black uppercase tracking-wider">
                          <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                          <span>Academic Success Portal</span>
                        </div>
                        <h2 className="text-xl font-black text-slate-900">
                          {studentProfile.name}'s Homework & Learning Roadmap
                        </h2>
                        <p className="text-xs text-slate-500 font-medium">
                          Active subject assignments, upcoming due dates, and term competency milestones monitored by class teachers & parents.
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-extrabold flex items-center gap-1.5">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                          <span>3 Tasks Completed This Week</span>
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                      {/* Left: Homework & Daily Assignments List (7 Cols) */}
                      <div className="lg:col-span-7 bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                          <div className="flex items-center gap-2">
                            <FileText className="w-5 h-5 text-indigo-900" />
                            <h3 className="font-extrabold text-slate-900 text-base">Current Homework & Tasks</h3>
                          </div>
                          <span className="text-xs font-bold text-slate-400">Term 1 Assignments</span>
                        </div>

                        <div className="space-y-3">
                          {homeworkList.map((hw) => (
                            <div
                              key={hw.id}
                              className="p-4 rounded-2xl bg-slate-50 border border-slate-200 hover:border-indigo-300 transition-all space-y-2.5"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-900 border border-indigo-200">
                                    {hw.subject}
                                  </span>
                                  <h4 className="font-black text-slate-900 text-sm mt-1">{hw.title}</h4>
                                  <p className="text-xs text-slate-600 mt-0.5">{hw.description}</p>
                                </div>
                                <span
                                  className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider whitespace-nowrap border ${
                                    hw.status === 'Reviewed'
                                      ? 'bg-purple-50 text-purple-800 border-purple-200'
                                      : hw.status === 'Submitted'
                                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                      : 'bg-amber-50 text-amber-800 border-amber-200'
                                  }`}
                                >
                                  {hw.status}
                                </span>
                              </div>

                              <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200/80 text-slate-500">
                                <span className="flex items-center gap-1 font-medium">
                                  <Clock className="w-3.5 h-3.5 text-indigo-600" />
                                  Due: <strong className="text-slate-800 font-bold">{hw.dueDate}</strong>
                                </span>
                                <span className="text-[11px] font-semibold text-slate-600">
                                  Assigned by: {hw.teacher}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Right: Learning Roadmap Milestones (5 Cols) */}
                      <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                          <div className="flex items-center gap-2">
                            <Target className="w-5 h-5 text-indigo-900" />
                            <h3 className="font-extrabold text-slate-900 text-base">Learning Roadmap (2026-27)</h3>
                          </div>
                          <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                            <TrendingUp className="w-3.5 h-3.5" /> On Track
                          </span>
                        </div>

                        <div className="space-y-4">
                          {learningRoadmap.map((item, index) => (
                            <div key={item.id} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="w-5 h-5 rounded-full bg-indigo-900 text-white text-[10px] font-black flex items-center justify-center shrink-0">
                                      {index + 1}
                                    </span>
                                    <span className="text-[11px] font-bold text-indigo-900">{item.subject}</span>
                                  </div>
                                  <h4 className="font-bold text-slate-900 text-xs mt-1">{item.title}</h4>
                                </div>
                                <span className="text-xs font-black text-indigo-900 font-mono">{item.progress}%</span>
                              </div>

                              {/* Progress Bar */}
                              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-500 ${
                                    item.progress === 100
                                      ? 'bg-emerald-500'
                                      : item.progress > 50
                                      ? 'bg-indigo-600'
                                      : 'bg-amber-500'
                                  }`}
                                  style={{ width: `${item.progress}%` }}
                                />
                              </div>

                              <div className="flex items-center justify-between text-[11px] pt-1">
                                <span className="text-slate-500">Target: {item.targetDate}</span>
                                <div className="flex items-center gap-1">
                                  {item.badges.map((b, bIdx) => (
                                    <span key={bIdx} className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 text-[9px] font-black flex items-center gap-0.5">
                                      <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                                      {b}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── 🎯 SUB-VIEW 5: EXAM RESULTS & INDIVIDUAL MARKS (STUDENTS & PARENTS) ── */}
                {(studentSubTab === 'all' || studentSubTab === 'exam-results') && (
                  <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm space-y-6 animate-fadeIn">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                      <div>
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-900 border border-blue-200 text-xs font-black uppercase tracking-wider mb-2">
                          <Award className="w-3.5 h-3.5 text-blue-700" />
                          <span>Academic Assessment & Report Card</span>
                        </div>
                        <h2 className="text-xl font-black text-slate-900">
                          {myMarksData?.student?.name ? `${myMarksData.student.name}’s Exam Results & Subject Marks` : 'Student Exam Results'}
                        </h2>
                        <p className="text-xs text-slate-500 font-medium mt-1">
                          Official examination scores, subject-wise breakdown, grades, and academic performance.
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={loadStudentMarks}
                          disabled={isMyMarksLoading}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all border border-slate-200 flex items-center gap-1.5"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isMyMarksLoading ? 'animate-spin' : ''}`} />
                          <span>Refresh Marks</span>
                        </button>
                      </div>
                    </div>

                    {isMyMarksLoading ? (
                      <div className="p-12 text-center text-slate-500 space-y-3">
                        <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-800" />
                        <p className="font-bold text-sm">Loading verified examination records...</p>
                      </div>
                    ) : !myMarksData || !myMarksData.marks || myMarksData.marks.length === 0 ? (
                      <div className="p-8 bg-slate-50 rounded-2xl border border-slate-200 text-center space-y-3">
                        <Award className="w-10 h-10 text-slate-400 mx-auto" />
                        <h4 className="font-bold text-slate-800 text-sm">No Published Marks Yet</h4>
                        <p className="text-xs text-slate-500 max-w-md mx-auto">
                          The examination results for the current academic session have not been published by the examination committee yet. Please check back soon or contact your class teacher.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {/* Overall Student Highlights */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-100 space-y-1">
                            <span className="text-[10px] font-black text-blue-900 uppercase tracking-wider">Total Marks Obtained</span>
                            <div className="text-2xl font-black text-slate-900">
                              {myMarksData.marks.reduce((sum, m) => sum + Number(m.marksObtained || 0), 0)} / {myMarksData.marks.reduce((sum, m) => sum + Number(m.maxMarks || 100), 0)}
                            </div>
                            <p className="text-[11px] text-slate-500 font-semibold">Across all evaluated subjects</p>
                          </div>

                          <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100 space-y-1">
                            <span className="text-[10px] font-black text-emerald-900 uppercase tracking-wider">Overall Percentage</span>
                            <div className="text-2xl font-black text-emerald-700">
                              {(() => {
                                const totalObt = myMarksData.marks.reduce((sum, m) => sum + Number(m.marksObtained || 0), 0);
                                const totalMax = myMarksData.marks.reduce((sum, m) => sum + Number(m.maxMarks || 100), 0);
                                return totalMax > 0 ? (totalObt / totalMax * 100).toFixed(1) : 0;
                              })()}%
                            </div>
                            <p className="text-[11px] text-slate-500 font-semibold">Distinction Performance</p>
                          </div>

                          <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-100 space-y-1">
                            <span className="text-[10px] font-black text-purple-900 uppercase tracking-wider">Final Result Status</span>
                            <div className="text-2xl font-black text-purple-800">
                              PASS (A+)
                            </div>
                            <p className="text-[11px] text-slate-500 font-semibold">Cleared all subjects successfully</p>
                          </div>
                        </div>

                        {/* Subject-Wise Marks Grid */}
                        <div className="overflow-x-auto rounded-2xl border border-slate-200">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead>
                              <tr className="bg-slate-50 text-slate-700 font-black border-b border-slate-200 uppercase tracking-wider">
                                <th className="p-3.5">Subject</th>
                                <th className="p-3.5">Exam Term</th>
                                <th className="p-3.5 text-center">Max Marks</th>
                                <th className="p-3.5 text-center">Pass Marks</th>
                                <th className="p-3.5 text-center">Marks Obtained</th>
                                <th className="p-3.5 text-center">Grade</th>
                                <th className="p-3.5 text-center">Result</th>
                                <th className="p-3.5">Teacher Remarks</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                              {myMarksData.marks.map((row) => {
                                const marks = Number(row.marksObtained);
                                const min = Number(row.minMarks || 35);
                                const isPass = !row.isAbsent && marks >= min;
                                const pct = (marks / (row.maxMarks || 100)) * 100;
                                const grade = pct >= 90 ? 'A+' : pct >= 80 ? 'A' : pct >= 70 ? 'B+' : pct >= 60 ? 'B' : pct >= 50 ? 'C' : pct >= 35 ? 'D' : 'F';

                                return (
                                  <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                                    <td className="p-3.5 font-bold text-slate-900 text-sm">{row.subject}</td>
                                    <td className="p-3.5 text-slate-600 font-semibold">{row.examName}</td>
                                    <td className="p-3.5 text-center font-bold text-slate-500">{row.maxMarks}</td>
                                    <td className="p-3.5 text-center font-bold text-slate-500">{row.minMarks}</td>
                                    <td className="p-3.5 text-center font-black text-base text-blue-900">
                                      {row.isAbsent ? 'AB' : row.marksObtained}
                                    </td>
                                    <td className="p-3.5 text-center font-black text-sm text-indigo-700">
                                      {row.isAbsent ? '—' : grade}
                                    </td>
                                    <td className="p-3.5 text-center">
                                      {row.isAbsent ? (
                                        <span className="px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 text-[10px] font-black">
                                          ABSENT
                                        </span>
                                      ) : isPass ? (
                                        <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black">
                                          PASS
                                        </span>
                                      ) : (
                                        <span className="px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 text-[10px] font-black">
                                          FAIL
                                        </span>
                                      )}
                                    </td>
                                    <td className="p-3.5 text-slate-600 italic">
                                      "{row.remarks || 'Consistent academic performance.'}"
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {(studentSubTab === 'all' || studentSubTab === 'pickup-request') && (
                  <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm space-y-6 animate-fadeIn">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                    <div>
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-900 border border-indigo-200 text-xs font-black uppercase tracking-wider mb-2">
                        <Radio className="w-3.5 h-3.5 text-indigo-900 animate-pulse" />
                        <span>Daily Pickup Authorization System</span>
                      </div>
                      <h2 className="text-xl font-black text-slate-900">
                        Who is going to pick up Aarav today?
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
                          toast.success('Pickup Mode set to Mom (Sunita Sharma)');
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
                          toast.success('Pickup Mode set to Dad (Rajesh Sharma)');
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

                  {/* Content depending on pickupRequestOption */}

                  {/* OPTION 1: MOM SELECTED */}
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
                          [DYNAMIC QR PASS: MOM-2026-8812]
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

                  {/* OPTION 2: DAD SELECTED */}
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
                          [DYNAMIC QR PASS: DAD-2026-9934]
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

                  {/* OPTION 3: OTHERS (THIRD PARTY / RELATIVE ASSIGNMENT) */}
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
                                onClick={() => {
                                  setSelectedPickupPerson({
                                    name: person.name,
                                    relation: person.relation,
                                    phone: person.phone,
                                    vehicleNo: person.vehicleNo || 'N/A',
                                    photo: person.photo,
                                    qrCode: `SP-QR-2026-${Math.floor(100000 + Math.random() * 900000)}`
                                  });
                                  handleTabChange('live-kiosk');
                                  toast.success(`Active Kiosk set to ${person.name}! Switch to Kiosk to test gate release.`);
                                }}
                                className="px-3 py-1.5 bg-indigo-900 hover:bg-indigo-950 text-white font-extrabold text-xs rounded-xl transition-all shadow-sm"
                              >
                                Set Active in Kiosk
                              </button>
                              
                              <div className="flex items-center gap-1">
                                <button 
                                  onClick={() => handleOpenEditThirdPartyModal(person)}
                                  className="p-1.5 text-slate-500 hover:text-indigo-900 hover:bg-slate-100 rounded-lg transition-colors" 
                                  title="Edit Third Party Details"
                                >
                                  <Edit3 className="w-4 h-4" />
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
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

            {/* ── TAB: TEACHER PANEL (CLASSROOM DISMISSAL & SAFETY CENTER) ── */}
            {activeTab === 'teacher-panel' && (
              <div className="space-y-6 animate-fadeIn">
                
                {/* Teacher Profile & Executive Summary Bar */}
                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
                  <div className="flex flex-col md:flex-row items-center justify-between gap-6 border-b border-slate-100 pb-6">
                    <div className="flex items-center gap-4">
                      <img
                        src={teacherProfile.photo}
                        alt={teacherProfile.name}
                        className="w-16 h-16 rounded-2xl object-cover ring-2 ring-indigo-900 shadow-md"
                      />
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h2 className="text-xl font-black text-slate-900">{teacherProfile.name}</h2>
                          <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-900 font-extrabold text-[10px] border border-indigo-200">
                            {teacherProfile.employeeId}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 font-semibold">{teacherProfile.designation} • <strong className="text-indigo-900">{teacherProfile.roomNo}</strong></p>
                        <p className="text-[11px] text-slate-500 font-medium">Classroom Dismissal & Gate Release Duty Console</p>
                      </div>
                    </div>

                    {/* Emergency & Intercom Controls */}
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        onClick={() => {
                          const nextState = !classAssemblyBroadcast;
                          setClassAssemblyBroadcast(nextState);
                          if (nextState) {
                            toast.success('Intercom Gate Broadcast Activated! Audio streaming to Grade 5-A speaker system.');
                          } else {
                            toast('Intercom broadcast ended.', { icon: '📻' });
                          }
                        }}
                        className={`px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all shadow-sm ${
                          classAssemblyBroadcast
                            ? 'bg-blue-600 text-white animate-pulse border border-blue-400'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200'
                        }`}
                      >
                        <Radio className="w-4 h-4 text-blue-300" />
                        <span>{classAssemblyBroadcast ? '● Intercom Broadcast ACTIVE' : 'Broadcast Gate Intercom'}</span>
                      </button>

                      <button
                        onClick={() => {
                          const nextState = !emergencyLockdownActive;
                          setEmergencyLockdownActive(nextState);
                          if (nextState) {
                            toast.error('EMERGENCY LOCKDOWN ACTIVATED! Classroom doors secured and Security Desk alerted.');
                          } else {
                            toast.success('Lockdown deactivated. Normal dismissal resumed.');
                          }
                        }}
                        className={`px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all shadow-sm ${
                          emergencyLockdownActive
                            ? 'bg-rose-700 text-white animate-bounce border border-rose-500'
                            : 'bg-slate-900 hover:bg-slate-800 text-white'
                        }`}
                      >
                        <Lock className="w-4 h-4 text-rose-300" />
                        <span>{emergencyLockdownActive ? '🚨 Emergency Lockdown ACTIVE' : 'Classroom Lockdown'}</span>
                      </button>
                    </div>
                  </div>

                  {/* High Alert Banner if Emergency Lockdown is active */}
                  {emergencyLockdownActive && (
                    <div className="bg-rose-50 border-2 border-rose-600 rounded-2xl p-4 text-rose-900 flex items-center gap-3 animate-fadeIn">
                      <AlertTriangle className="w-6 h-6 text-rose-600 shrink-0" />
                      <div>
                        <h4 className="font-black text-sm">CLASSROOM SAFETY LOCKDOWN IN EFFECT</h4>
                        <p className="text-xs text-rose-800">
                          All student releases are temporarily halted. Gate officers and school administration are monitoring live security feeds.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* 4 Stat Overview Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                      <div className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Total Class Roster</div>
                      <div className="text-2xl font-black text-slate-900">{teacherProfile.totalStudents} <span className="text-xs font-medium text-slate-500">Students</span></div>
                    </div>

                    <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-100 space-y-1">
                      <div className="text-[10px] font-extrabold text-blue-700 uppercase tracking-wider">Present Today</div>
                      <div className="text-2xl font-black text-blue-900">{teacherProfile.presentStudents} <span className="text-xs font-medium text-blue-600">Present</span></div>
                    </div>

                    <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 space-y-1">
                      <div className="text-[10px] font-extrabold text-indigo-700 uppercase tracking-wider">Released Safely</div>
                      <div className="text-2xl font-black text-indigo-900">
                        {teacherClassRoster.filter(s => s.status === 'RELEASED').length + 24}
                        <span className="text-xs font-medium text-indigo-600"> Released</span>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-100 space-y-1">
                      <div className="text-[10px] font-extrabold text-amber-700 uppercase tracking-wider">Pending Release</div>
                      <div className="text-2xl font-black text-amber-900">
                        {teacherClassRoster.filter(s => s.status !== 'RELEASED').length}
                        <span className="text-xs font-medium text-amber-600"> Pending</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Live Dismissal Roster Section */}
                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                    <div>
                      <h3 className="text-lg font-black text-slate-900">Grade 5-A Live Dismissal Roster</h3>
                      <p className="text-xs text-slate-500 font-medium">Verify arrival of authorized parent/collector and authorize child release from room #304.</p>
                    </div>

                    {/* Filter Pills */}
                    <div className="flex items-center gap-1.5 overflow-x-auto">
                      {['ALL', 'READY', 'RELEASED', 'PENDING'].map((filterKey) => (
                        <button
                          key={filterKey}
                          onClick={() => setTeacherRosterFilter(filterKey)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap ${
                            teacherRosterFilter === filterKey
                              ? 'bg-indigo-900 text-white shadow-sm'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {filterKey === 'ALL' && 'All Students'}
                          {filterKey === 'READY' && '● Ready for Release'}
                          {filterKey === 'RELEASED' && '✓ Released Safely'}
                          {filterKey === 'PENDING' && '⏳ Pending Verification'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Roster Search Bar */}
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      placeholder="Search Grade 5-A roster by student or collector name..."
                      value={teacherSearchTerm}
                      onChange={(e) => setTeacherSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:ring-2 focus:ring-indigo-900 font-medium"
                    />
                  </div>

                  {/* Roster Cards Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {teacherClassRoster
                      .filter(student => {
                        const matchesFilter =
                          teacherRosterFilter === 'ALL' ||
                          (teacherRosterFilter === 'READY' && student.status === 'READY') ||
                          (teacherRosterFilter === 'RELEASED' && student.status === 'RELEASED') ||
                          (teacherRosterFilter === 'PENDING' && student.status === 'PENDING');
                        const matchesSearch =
                          student.name.toLowerCase().includes(teacherSearchTerm.toLowerCase()) ||
                          student.collectorName.toLowerCase().includes(teacherSearchTerm.toLowerCase());
                        return matchesFilter && matchesSearch;
                      })
                      .map((student) => (
                        <div
                          key={student.id}
                          className={`rounded-2xl p-5 border transition-all space-y-4 ${
                            student.status === 'RELEASED'
                              ? 'bg-slate-50 border-slate-200 opacity-80'
                              : student.status === 'READY'
                              ? 'bg-white border-blue-300 shadow-sm ring-1 ring-blue-100'
                              : 'bg-white border-amber-200 shadow-sm'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-xl bg-indigo-900 text-white font-black flex items-center justify-center text-sm shadow-xs shrink-0">
                                {student.rollNo}
                              </div>
                              <div>
                                <h4 className="font-extrabold text-slate-900 text-base">{student.name}</h4>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-slate-500 text-xs font-mono">{student.uniqueId}</span>
                                  <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold">Std 5-A</span>
                                </div>
                              </div>
                            </div>

                            {/* Status Badge */}
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                              student.status === 'RELEASED'
                                ? 'bg-indigo-100 text-indigo-900 border-indigo-200'
                                : student.status === 'READY'
                                ? 'bg-blue-100 text-blue-900 border-blue-300 animate-pulse'
                                : 'bg-amber-100 text-amber-900 border-amber-300'
                            }`}>
                              {student.status === 'RELEASED' && '✓ RELEASED SAFELY'}
                              {student.status === 'READY' && '● READY FOR DISMISSAL'}
                              {student.status === 'PENDING' && '⏳ PENDING APPROVAL'}
                            </span>
                          </div>

                          {/* Collector Card Section */}
                          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-3">
                            <img
                              src={student.collectorPhoto}
                              alt={student.collectorName}
                              className="w-11 h-11 rounded-lg object-cover border border-slate-300"
                            />
                            <div className="flex-1 text-xs space-y-0.5">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-slate-900">{student.collectorName}</span>
                                <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 text-[9px] font-extrabold">
                                  {student.collectorRelation}
                                </span>
                              </div>
                              <p className="text-slate-500 text-[11px]">📞 {student.collectorPhone} • 🚗 {student.collectorVehicle}</p>
                              <p className="text-indigo-900 text-[10px] font-bold">📍 Gate Arrival: {student.gateTime}</p>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                            {student.status !== 'RELEASED' ? (
                              <>
                                <button
                                  onClick={() => handleTeacherApproveRelease(student.id, student.name)}
                                  disabled={emergencyLockdownActive}
                                  className="flex-1 py-2.5 bg-indigo-900 hover:bg-indigo-950 text-white rounded-xl font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 disabled:opacity-40"
                                >
                                  <CheckCircle2 className="w-4 h-4 text-blue-300" />
                                  <span>Approve & Release</span>
                                </button>

                                <button
                                  onClick={() => handleTeacherFlagSecurityAlert(student.name)}
                                  className="px-3 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl font-bold text-xs transition-all"
                                  title="Flag Security Alert"
                                >
                                  <AlertTriangle className="w-4 h-4" />
                                </button>
                              </>
                            ) : (
                              <div className="w-full text-center text-xs font-bold text-indigo-900 py-1 bg-indigo-50 rounded-xl border border-indigo-100">
                                Verified & Released by Class Teacher (Mrs. Ananya Sen)
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>

              </div>
            )}

            {/* ── TAB 3: AUTHORIZED THIRD PARTIES DELEGATION MANAGER ── */}
            {activeTab === 'contacts' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-black text-slate-900">Authorized Pickup Delegation</h2>
                    <p className="text-xs text-slate-500 font-medium">Manage pre-approved relatives, drivers, and neighbors authorized by parents.</p>
                  </div>

                  <button
                    onClick={() => {
                      setEditingContact(null);
                      setNewContact({ name: '', relation: 'Family Driver', phone: '', vehicleNo: '', child: 'Aarav Sharma (Std 5-A)', photo: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80' });
                      setShowAddContactModal(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-md transition-all active:scale-95 border border-indigo-500"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Authorized Person</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {contacts.map((c) => (
                    <div key={c.id} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4 hover:border-indigo-500 transition-all relative group">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <img
                            src={c.photo}
                            alt={c.name}
                            className="w-14 h-14 rounded-xl object-cover border border-slate-200"
                          />
                          <div>
                            <h3 className="font-bold text-slate-900 text-sm">{c.name}</h3>
                            <span className="inline-block px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-extrabold text-[10px]">
                              {c.relation}
                            </span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setShowQrModal(c)}
                            title="View Dynamic QR"
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                          >
                            <QrCode className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => {
                              setEditingContact(c);
                              setNewContact(c);
                              setShowAddContactModal(true);
                            }}
                            title="Edit Details"
                            className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg transition-all"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleDeleteContact(c.id)}
                            title="Revoke Authorization"
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="text-xs space-y-1.5 pt-2 border-t border-slate-100 text-slate-600">
                        <p>📞 Phone: <strong className="text-slate-900">{c.phone}</strong></p>
                        <p>🚗 Vehicle: <strong className="text-slate-900">{c.vehicleNo}</strong></p>
                        <p>👧 Student: <strong className="text-indigo-900 font-bold">{c.child}</strong></p>
                        <p>📅 Valid Until: <span className="text-slate-700 font-bold">{c.validUntil}</span></p>
                      </div>

                      <div className="pt-2 flex items-center justify-between">
                        <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                          ● {c.status}
                        </span>

                        <button
                          onClick={() => {
                            setSelectedPickupPerson({
                              name: c.name,
                              relation: c.relation,
                              phone: c.phone,
                              vehicleNo: c.vehicleNo,
                              photo: c.photo,
                              qrCode: `SP-QR-2026-${Math.floor(100000 + Math.random() * 900000)}`
                            });
                            setSelectedChild(c.child);
                            handleTabChange('live-kiosk');
                            toast.success(`Selected ${c.name} for Gate Kiosk Test!`);
                          }}
                          className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                        >
                          Test Gate Kiosk <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── TAB 3: SECURITY AUDIT LOGS (WITH CSV EXPORT & FILTERS) ── */}
            {activeTab === 'logs' && (
              <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <h2 className="text-xl font-black text-slate-900">Security & Release Audit Trail</h2>
                    <p className="text-xs text-slate-500 font-medium">Encrypted log of all child pickup verification events compliant with privacy standards.</p>
                  </div>

                  <button
                    onClick={handleExportCSV}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-xs shadow-sm transition-all"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>Export Audit Logs (CSV)</span>
                  </button>
                </div>

                {/* Log Search & Status Filter Controls */}
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <div className="relative flex-1 w-full">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      placeholder="Search by student name, collector, or officer..."
                      value={logsSearch}
                      onChange={(e) => setLogsSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-xl text-xs outline-none focus:border-indigo-600"
                    />
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      onClick={() => setLogsStatusFilter('ALL')}
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                        logsStatusFilter === 'ALL' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      All ({logs.length})
                    </button>
                    <button
                      onClick={() => setLogsStatusFilter('RELEASED')}
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                        logsStatusFilter === 'RELEASED' ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Released
                    </button>
                    <button
                      onClick={() => setLogsStatusFilter('DENIED')}
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                        logsStatusFilter === 'DENIED' ? 'bg-rose-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Denied / Alerts
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-900 text-white uppercase text-[10px] font-bold tracking-wider">
                        <th className="p-3.5 rounded-l-xl">Log ID & Time</th>
                        <th className="p-3.5">Student</th>
                        <th className="p-3.5">Collector</th>
                        <th className="p-3.5">Parent Approval</th>
                        <th className="p-3.5">GPS & Gate</th>
                        <th className="p-3.5 rounded-r-xl">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {filteredLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50">
                          <td className="p-3.5 font-mono">
                            <div className="font-bold text-slate-900">{log.id}</div>
                            <div className="text-[10px] text-slate-400">{log.timestamp}</div>
                          </td>
                          <td className="p-3.5 font-bold text-slate-900">{log.child}</td>
                          <td className="p-3.5 text-slate-700">{log.pickupPerson}</td>
                          <td className="p-3.5 font-medium text-slate-800">{log.parentApproved}</td>
                          <td className="p-3.5 text-slate-500 text-[10px] font-mono">
                            <div>{log.gps}</div>
                            <div className="text-indigo-600 font-bold">{log.gateOfficer}</div>
                          </td>
                          <td className="p-3.5">
                            {log.status === 'Released' ? (
                              <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-[10px]">
                                ✓ Released
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 font-extrabold text-[10px]">
                                ⚠️ Denied / Alert
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── TAB 4: SYSTEM & GEOFENCE SETTINGS ── */}
            {activeTab === 'settings' && (
              <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm space-y-6">
                <div className="border-b border-slate-100 pb-4">
                  <h2 className="text-xl font-black text-slate-900">System & Geofence Configuration</h2>
                  <p className="text-xs text-slate-500 font-medium">Customize radius thresholds, emergency contacts, and security protocols.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                  
                  {/* Geofence Threshold */}
                  <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
                    <label className="font-bold text-slate-900 flex items-center gap-2 text-sm">
                      <MapPin className="w-4 h-4 text-blue-600" />
                      Geofence Radius Threshold ({settings.geofenceRadiusMeters} meters)
                    </label>
                    <p className="text-slate-500 text-[11px]">
                      App will automatically notify gate security when an assigned pickup person enters this perimeter around the school.
                    </p>
                    <input
                      type="range"
                      min="50"
                      max="1000"
                      step="50"
                      value={settings.geofenceRadiusMeters}
                      onChange={(e) => setSettings({ ...settings, geofenceRadiusMeters: parseInt(e.target.value) })}
                      className="w-full accent-indigo-600 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400 font-bold">
                      <span>50m (Immediate Gate)</span>
                      <span>500m (Neighborhood)</span>
                      <span>1000m (1 KM)</span>
                    </div>
                  </div>

                  {/* Parent Approval Timeout */}
                  <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
                    <label className="font-bold text-slate-900 flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4 text-blue-600" />
                      Parent Push Timeout ({settings.parentApprovalTimeoutMins} minutes)
                    </label>
                    <p className="text-slate-500 text-[11px]">
                      If parent does not tap Approve/Deny within this duration, gate terminal will automatically initiate secondary verification.
                    </p>
                    <select
                      value={settings.parentApprovalTimeoutMins}
                      onChange={(e) => setSettings({ ...settings, parentApprovalTimeoutMins: parseInt(e.target.value) })}
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-bold"
                    >
                      <option value="1">1 Minute (Rapid)</option>
                      <option value="3">3 Minutes (Standard)</option>
                      <option value="5">5 Minutes (Extended)</option>
                    </select>
                  </div>

                  {/* Security Alert Preferences */}
                  <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
                    <label className="font-bold text-slate-900 flex items-center gap-2 text-sm">
                      <Bell className="w-4 h-4 text-blue-600" />
                      Emergency Alarm & Security Siren
                    </label>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.emergencySirenSound}
                          onChange={(e) => setSettings({ ...settings, emergencySirenSound: e.target.checked })}
                          className="accent-indigo-600 w-4 h-4"
                        />
                        <span>Trigger audible siren at Gate Kiosk on Denial</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.autoAlertSecurity}
                          onChange={(e) => setSettings({ ...settings, autoAlertSecurity: e.target.checked })}
                          className="accent-indigo-600 w-4 h-4"
                        />
                        <span>Auto-dispatch SMS to School Security Desk</span>
                      </label>
                    </div>
                  </div>

                  {/* Offline Manual Fallback */}
                  <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
                    <label className="font-bold text-slate-900 flex items-center gap-2 text-sm">
                      <AlertCircle className="w-4 h-4 text-blue-600" />
                      Offline / Network Outage Fallback Mode
                    </label>
                    <p className="text-slate-500 text-[11px]">
                      Enable manual sign-out register protocol with paper slip backup when school Wi-Fi or cellular network drops.
                    </p>
                    <button
                      onClick={() => {
                        setSettings({ ...settings, offlineFallbackMode: !settings.offlineFallbackMode });
                        toast.success(`Offline Fallback Protocol ${!settings.offlineFallbackMode ? 'ACTIVATED' : 'Deactivated'}`);
                      }}
                      className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all ${
                        settings.offlineFallbackMode ? 'bg-amber-600 text-white' : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {settings.offlineFallbackMode ? '● Offline Mode ACTIVE' : '○ Offline Mode Inactive'}
                    </button>
                  </div>

                </div>
              </div>
            )}

            {/* ── TAB 5: ONE-PAGE CONCEPT SUMMARY (PLACED LAST AS REQUESTED!) ── */}
            {activeTab === 'concept' && (
              <div className="bg-white rounded-3xl p-6 md:p-10 border border-slate-200 shadow-lg space-y-8 max-w-5xl mx-auto print:shadow-none print:border-none print:p-0 print:bg-white">
                
                {/* Executive Document Title Block */}
                <div className="text-center space-y-2 pb-6 border-b border-slate-100">
                  <h1 className="text-2xl md:text-4xl font-black text-[#1E40AF] tracking-tight">
                    SafePickup — Secure School Child Pickup System
                  </h1>
                  <p className="text-base md:text-lg text-slate-500 font-serif italic">
                    One-Page Concept Summary
                  </p>
                </div>

                {/* Section 1: Problem */}
                <div className="space-y-3">
                  <h2 className="text-lg md:text-xl font-bold text-[#1E40AF] flex items-center gap-2">
                    1. Problem
                  </h2>
                  <p className="text-slate-800 text-sm md:text-base leading-relaxed pl-4 border-l-2 border-[#1E40AF]/40">
                    Rising incidents of child kidnapping / unauthorized pickup from schools. Parents need a verified, tamper-proof way to confirm who is collecting their child — themselves or a trusted third party (relative, driver, neighbor, etc.).
                  </p>
                </div>

                {/* Section 2: Solution Overview */}
                <div className="space-y-3">
                  <h2 className="text-lg md:text-xl font-bold text-[#1E40AF] flex items-center gap-2">
                    2. Solution Overview
                  </h2>
                  <p className="text-slate-800 text-sm md:text-base leading-relaxed pl-4 border-l-2 border-[#1E40AF]/40">
                    A mobile/web app connecting Parents, Authorized Third Parties, and School Staff (Teachers/Gate Security) through location-based verification, photo confirmation, and real-time parent approval before any child is released.
                  </p>
                </div>

                {/* Section 3: Key Features */}
                <div className="space-y-3">
                  <h2 className="text-lg md:text-xl font-bold text-[#1E40AF] flex items-center gap-2">
                    3. Key Features
                  </h2>
                  <ul className="list-disc list-inside space-y-2 text-slate-800 text-sm md:text-base leading-relaxed pl-4">
                    <li>Parent ID verification at pickup (digital ID / face match).</li>
                    <li>Third-party assignment by parent, with photo, name, phone number & relationship.</li>
                    <li>Geofencing: system detects when assigned person enters a set radius of the school.</li>
                    <li>Auto-generated, time-limited QR code for the third party AND the teacher, valid only for that pickup event.</li>
                    <li>Teacher captures a live photo of the person; system sends a real-time approval request to the parent.</li>
                    <li>Child is released only after parent taps "Approve" — full audit trail logged (time, photo, GPS, QR scan).</li>
                    <li>Emergency override & alert to school admin/security if approval is denied or times out.</li>
                  </ul>
                </div>

                {/* Section 4: Pickup Workflow (Third Party) */}
                <div className="space-y-3">
                  <h2 className="text-lg md:text-xl font-bold text-[#1E40AF] flex items-center gap-2">
                    4. Pickup Workflow (Third Party)
                  </h2>
                  <ul className="list-disc list-inside space-y-2 text-slate-800 text-sm md:text-base leading-relaxed pl-4">
                    <li>Parent assigns third party in-app (name, photo, ID, relation, pickup date/time).</li>
                    <li>Third party enters the school's geofenced radius → app auto-notifies school gate/teacher.</li>
                    <li>System generates matching QR codes for third party and teacher.</li>
                    <li>Teacher scans QR, takes a photo of the person, and sends approval request to parent.</li>
                    <li>Parent reviews photo + details on their phone and approves/denies in real time.</li>
                    <li>On approval, child is released; event logged with timestamp, photo, and location.</li>
                  </ul>
                </div>

                {/* Section 5: Suggested Tech Stack */}
                <div className="space-y-3">
                  <h2 className="text-lg md:text-xl font-bold text-[#1E40AF] flex items-center gap-2">
                    5. Suggested Tech Stack
                  </h2>
                  <ul className="list-disc list-inside space-y-2 text-slate-800 text-sm md:text-base leading-relaxed pl-4">
                    <li><strong>Frontend:</strong> React Native / Flutter (parent & teacher apps).</li>
                    <li><strong>Backend:</strong> Node.js / Firebase for real-time notifications & data.</li>
                    <li><strong>Location:</strong> Geofencing API (Google Maps / Mapbox).</li>
                    <li><strong>QR & Face Verification:</strong> Dynamic QR library + optional face-match SDK.</li>
                    <li><strong>Database:</strong> Encrypted storage for IDs, photos, and pickup logs (compliance with child-data privacy laws).</li>
                  </ul>
                </div>

                {/* Section 6: Safety & Compliance Notes */}
                <div className="space-y-3">
                  <h2 className="text-lg md:text-xl font-bold text-[#1E40AF] flex items-center gap-2">
                    6. Safety & Compliance Notes
                  </h2>
                  <ul className="list-disc list-inside space-y-2 text-slate-800 text-sm md:text-base leading-relaxed pl-4">
                    <li>Store minimal personal data; encrypt IDs and photos; follow local child-data protection regulations.</li>
                    <li>Always keep school staff as a human checkpoint — technology assists but does not replace their judgment.</li>
                    <li>Provide an offline/manual fallback procedure in case of app or network failure.</li>
                  </ul>
                </div>

                {/* Footnote */}
                <div className="pt-6 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                  <span>Qelvora School CRM Security Architecture Document</span>
                  <span>Confidential — School Administration Use</span>
                </div>
              </div>
            )}

          </div>
        </main>

      {/* ── MODAL: ADD / EDIT AUTHORIZED CONTACT ── */}
      {showAddContactModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full border border-slate-200 shadow-2xl space-y-5 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900">
                {editingContact ? 'Edit Authorized Person' : 'Add Authorized Pickup Person'}
              </h3>
              <button onClick={() => setShowAddContactModal(false)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            <form onSubmit={handleSaveContact} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Ramesh Kumar"
                  value={newContact.name}
                  onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-600 outline-none font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Relationship to Child</label>
                <select
                  value={newContact.relation}
                  onChange={(e) => setNewContact({ ...newContact, relation: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-600 outline-none font-bold"
                >
                  <option value="Family Driver">Family Driver</option>
                  <option value="Maternal Aunt">Maternal Aunt</option>
                  <option value="Paternal Uncle">Paternal Uncle</option>
                  <option value="Grandparent">Grandparent</option>
                  <option value="Neighbor / Carpool">Neighbor / Carpool</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Phone Number</label>
                <input
                  type="text"
                  placeholder="+91 98765 43210"
                  value={newContact.phone}
                  onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-600 outline-none font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Vehicle Registration Number</label>
                <input
                  type="text"
                  placeholder="e.g. KA-01-AB-1234"
                  value={newContact.vehicleNo}
                  onChange={(e) => setNewContact({ ...newContact, vehicleNo: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-600 outline-none font-medium"
                />
              </div>

              <div className="pt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddContactModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-extrabold shadow-md"
                >
                  {editingContact ? 'Update Contact' : 'Save Authorized Person'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: DYNAMIC QR DISPLAY ── */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-sm w-full border border-slate-200 shadow-2xl space-y-4 text-center">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Dynamic QR Pass</h3>
              <button onClick={() => setShowQrModal(null)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            <div className="space-y-1">
              <h4 className="font-extrabold text-slate-900 text-sm">{showQrModal.name}</h4>
              <p className="text-xs text-indigo-600 font-bold">{showQrModal.relation}</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border-2 border-dashed border-blue-400 inline-block shadow-inner">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=SP-QR-2026-${showQrModal.phone.replace(/[^0-9]/g, '')}`}
                alt="QR Pass"
                className="w-48 h-48 mx-auto"
              />
              <p className="text-[10px] font-mono text-indigo-950 font-bold mt-2">
                SP-QR-2026-{showQrModal.phone.replace(/[^0-9]/g, '').slice(-6)}
              </p>
            </div>

            <p className="text-[11px] text-slate-500">
              Valid for gate scan. Expires automatically after pickup confirmation.
            </p>

            <button
              onClick={() => setShowQrModal(null)}
              className="w-full py-2.5 bg-slate-900 text-white rounded-xl font-bold text-xs"
            >
              Close Pass
            </button>
          </div>
        </div>
      )}

      {/* ── MODAL: ASSIGN THIRD PARTY / RELATIVE FOR PICKUP ── */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[99999] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl border border-slate-200 animate-scaleUp">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white px-6 py-4 border-b border-slate-800 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-black flex items-center gap-2">
                  <span>🤝</span> Assign Third Party / Relative
                </h3>
                <p className="text-xs text-slate-300 font-medium">Delegate child pickup authorization to a relative, neighbor, or driver.</p>
              </div>
              <button 
                onClick={() => setShowAssignModal(false)}
                className="text-slate-400 hover:text-white transition-colors text-xl font-bold"
              >
                &times;
              </button>
            </div>

            {/* Modal Form */}
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                if (!newAssignForm.name || !newAssignForm.phone || !newAssignForm.idNumber) {
                  toast.error('Please enter Full Name, Phone Number, and ID Proof Number!');
                  return;
                }

                if (editingThirdParty) {
                  setAssignedOthersList(prev => prev.map(p => p.id === editingThirdParty.id ? {
                    ...p,
                    name: newAssignForm.name,
                    phone: newAssignForm.phone,
                    relation: newAssignForm.relation,
                    idType: newAssignForm.idType,
                    idNumber: newAssignForm.idNumber,
                    vehicleNo: newAssignForm.vehicleNo || 'N/A',
                    photo: newAssignForm.photoUrl,
                  } : p));
                  toast.success(`Updated details for ${newAssignForm.name}!`);
                } else {
                  const created = {
                    id: Date.now(),
                    name: newAssignForm.name,
                    phone: newAssignForm.phone,
                    relation: newAssignForm.relation,
                    idType: newAssignForm.idType,
                    idNumber: newAssignForm.idNumber,
                    vehicleNo: newAssignForm.vehicleNo || 'N/A',
                    photo: newAssignForm.photoUrl,
                    idProofDoc: `${newAssignForm.idType} Uploaded & Verified`,
                    status: 'Active Pass'
                  };

                  setAssignedOthersList([created, ...assignedOthersList]);
                  setContacts([{
                    id: contacts.length + 1,
                    name: newAssignForm.name,
                    relation: newAssignForm.relation,
                    phone: newAssignForm.phone,
                    vehicleNo: newAssignForm.vehicleNo || 'N/A',
                    status: 'Active',
                    validUntil: '2026-12-31',
                    child: 'Aarav Sharma (Std 5-A)',
                    photo: newAssignForm.photoUrl
                  }, ...contacts]);

                  toast.success(`Successfully assigned ${created.name} (${created.relation}) for child pickup!`);
                }

                setPickupRequestOption('others');
                setShowAssignModal(false);
                setEditingThirdParty(null);
                setNewAssignForm({
                  name: '',
                  phone: '',
                  relation: 'Relative / Third Party',
                  idType: 'Aadhaar Card',
                  idNumber: '',
                  vehicleNo: '',
                  photoUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
                  idProofDocName: '',
                  parentAuthorizationConsent: true
                });
              }}
              className="p-6 space-y-4 max-h-[80vh] overflow-y-auto"
            >
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Authorized Person Full Name *</label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. Vikram Das"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 text-sm outline-none focus:ring-2 focus:ring-indigo-900 focus:bg-white font-semibold"
                  value={newAssignForm.name}
                  onChange={(e) => setNewAssignForm({ ...newAssignForm, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Phone Number *</label>
                  <input 
                    type="text"
                    required
                    placeholder="+91 98765 00000"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 text-sm outline-none focus:ring-2 focus:ring-indigo-900 focus:bg-white font-mono"
                    value={newAssignForm.phone}
                    onChange={(e) => setNewAssignForm({ ...newAssignForm, phone: e.target.value })}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Relation to Child</label>
                  <select
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 text-sm outline-none focus:ring-2 focus:ring-indigo-900 focus:bg-white font-semibold"
                    value={newAssignForm.relation}
                    onChange={(e) => setNewAssignForm({ ...newAssignForm, relation: e.target.value })}
                  >
                    <option value="Relative / Uncle">Relative / Uncle</option>
                    <option value="Maternal Aunt">Maternal Aunt</option>
                    <option value="Grandparent">Grandparent</option>
                    <option value="Family Driver">Family Driver</option>
                    <option value="Neighbor / Carpool">Neighbor / Carpool</option>
                    <option value="Authorized Guardian">Authorized Guardian</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">ID Proof Type *</label>
                  <select
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 text-sm outline-none focus:ring-2 focus:ring-indigo-900 focus:bg-white font-semibold"
                    value={newAssignForm.idType}
                    onChange={(e) => setNewAssignForm({ ...newAssignForm, idType: e.target.value })}
                  >
                    <option value="Aadhaar Card">Aadhaar Card</option>
                    <option value="Driving License">Driving License</option>
                    <option value="Voter ID">Voter ID</option>
                    <option value="Passport">Passport</option>
                    <option value="Govt Employee ID">Govt Employee ID</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">ID Proof Number *</label>
                  <input 
                    type="text"
                    required
                    placeholder="e.g. XXXX-XXXX-9912"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 text-sm outline-none focus:ring-2 focus:ring-indigo-900 focus:bg-white font-mono uppercase"
                    value={newAssignForm.idNumber}
                    onChange={(e) => setNewAssignForm({ ...newAssignForm, idNumber: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Vehicle Registration No. (Optional)</label>
                <input 
                  type="text"
                  placeholder="e.g. KA-01-AB-1234"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 text-sm outline-none focus:ring-2 focus:ring-indigo-900 focus:bg-white font-mono uppercase"
                  value={newAssignForm.vehicleNo}
                  onChange={(e) => setNewAssignForm({ ...newAssignForm, vehicleNo: e.target.value })}
                />
              </div>

              {/* Upload Photo & ID Proof Preview Box */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-300 space-y-3">
                <span className="text-xs font-extrabold text-slate-700 block">📷 Upload Photo & Govt ID Document</span>
                <div className="flex items-center gap-3">
                  <img src={newAssignForm.photoUrl} alt="Preview" className="w-12 h-12 rounded-xl object-cover ring-1 ring-slate-300" />
                  <div className="text-xs space-y-1">
                    <span className="font-bold text-indigo-900 block">Photo & ID Attached</span>
                    <span className="text-slate-500 text-[10px] block">Encrypted ID storage compliant with child safety laws</span>
                  </div>
                </div>
              </div>

              {/* Parent Consent Checkbox */}
              <div className="flex items-start gap-2 pt-2">
                <input 
                  type="checkbox"
                  id="parentConsent"
                  checked={newAssignForm.parentAuthorizationConsent}
                  onChange={(e) => setNewAssignForm({ ...newAssignForm, parentAuthorizationConsent: e.target.checked })}
                  className="mt-0.5 rounded text-indigo-900 focus:ring-indigo-900"
                  required
                />
                <label htmlFor="parentConsent" className="text-xs text-slate-600 font-medium leading-tight">
                  I hereby confirm and authorize this third-party person to pick up my child today from the school main gate.
                </label>
              </div>

              {/* Footer Buttons */}
              <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="px-4 py-2.5 border border-slate-300 text-slate-700 font-bold rounded-xl text-xs hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-900 hover:bg-indigo-950 text-white font-extrabold rounded-xl text-xs transition-all shadow-md active:scale-95 flex items-center gap-1.5"
                >
                  <span>Assign & Authorize</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
};

export default SafePickupPage;
