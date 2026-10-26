import React, { useState } from 'react';
import Sidebar from '../../components/ui/Sidebar';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import {
  BookOpen,
  FileText,
  Clock,
  Target,
  TrendingUp,
  Star,
  CheckCircle,
  Plus,
  Calendar,
  Sparkles,
  ArrowRight,
  Filter
} from 'lucide-react';

export default function StudentHomeworkPage() {
  const { user } = useAuth();
  const studentName = user?.name || 'Aarav Sharma';

  const [activeFilter, setActiveFilter] = useState('ALL');

  // Homework & Assignments State
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
      title: "Newton's Third Law Lab Activity Summary",
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

  // Learning Roadmap Milestones
  const [learningRoadmap] = useState([
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
      title: "Unit 2: Kinetic Forces & Newton's Laws Experiments",
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

  const filteredHomework = homeworkList.filter(hw => {
    if (activeFilter === 'ALL') return true;
    return hw.status.toUpperCase() === activeFilter;
  });

  const handleToggleHomeworkStatus = (id) => {
    setHomeworkList(prev => prev.map(hw => {
      if (hw.id === id) {
        const nextStatus = hw.status === 'Pending' ? 'Submitted' : 'Pending';
        toast.success(`Task ${hw.title} marked as ${nextStatus}!`);
        return { ...hw, status: nextStatus };
      }
      return hw;
    }));
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
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Academic Success Hub</span>
                  </div>
                  <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
                    Homework & Learning Map
                  </h1>
                  <p className="text-sm text-slate-300 max-w-2xl font-normal leading-relaxed">
                    Track daily homework assignments, project deadlines, and yearly competency milestones for {studentName}.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span className="px-4 py-2 rounded-2xl bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-black flex items-center gap-1.5 shadow-xs">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    <span>3 Tasks Completed This Week</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Main Content Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fadeIn">

              {/* Left Column (7 cols): Current Homework & Tasks */}
              <div className="lg:col-span-7 bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-indigo-900" />
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-base">Current Homework & Assignments</h3>
                      <p className="text-xs text-slate-400 font-semibold">Active tasks assigned by subject teachers</p>
                    </div>
                  </div>

                  {/* Filter Pills */}
                  <div className="flex items-center gap-1.5 overflow-x-auto">
                    {['ALL', 'PENDING', 'SUBMITTED', 'REVIEWED'].map((filterKey) => (
                      <button
                        key={filterKey}
                        onClick={() => setActiveFilter(filterKey)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap ${
                          activeFilter === filterKey
                            ? 'bg-indigo-900 text-white shadow-sm'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {filterKey === 'ALL' && 'All'}
                        {filterKey === 'PENDING' && 'Pending'}
                        {filterKey === 'SUBMITTED' && 'Submitted'}
                        {filterKey === 'REVIEWED' && 'Reviewed'}
                      </button>
                    ))}
                  </div>
                </div>

                {filteredHomework.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-500">
                    <p className="text-sm font-bold">No assignments found for this filter.</p>
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    {filteredHomework.map((hw) => (
                      <div
                        key={hw.id}
                        className="p-4 rounded-2xl bg-slate-50 border border-slate-200 hover:border-indigo-300 transition-all space-y-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-900 border border-indigo-200">
                              {hw.subject}
                            </span>
                            <h4 className="font-black text-slate-900 text-sm mt-1">{hw.title}</h4>
                            <p className="text-xs text-slate-600 mt-1 leading-relaxed">{hw.description}</p>
                          </div>
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider whitespace-nowrap border shrink-0 ${
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

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs pt-2.5 border-t border-slate-200/80 gap-2 text-slate-500">
                          <span className="flex items-center gap-1 font-medium">
                            <Clock className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                            Due: <strong className="text-slate-800 font-bold">{hw.dueDate}</strong>
                          </span>

                          <div className="flex items-center gap-3">
                            <span className="text-[11px] font-semibold text-slate-500">
                              Assigned by: {hw.teacher}
                            </span>
                            <button
                              onClick={() => handleToggleHomeworkStatus(hw.id)}
                              className="text-[11px] font-bold text-indigo-900 hover:underline"
                            >
                              {hw.status === 'Pending' ? 'Mark Submitted' : 'Revert to Pending'}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Right Column (5 cols): Yearly Learning Roadmap Milestones */}
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
        </main>
    </div>
  );
}
