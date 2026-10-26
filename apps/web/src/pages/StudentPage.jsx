import React, { useState, useEffect } from 'react';
import { User, BookOpen, Clock, AlertTriangle, ShieldCheck, LogOut, CheckCircle, Edit, Save } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

export default function StudentPage() {
  const [student, setStudent] = useState({
    name: 'Rahul Student',
    email: 'student@example.com',
    standard: '10th',
    section: 'A',
    rollNumber: '101',
    leftSchoolStatus: false,
    parentName: 'Mr. & Mrs. Sharma',
    parentPhone: '+91 9876543210'
  });

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ ...student });

  const handleSaveProfile = () => {
    setStudent({ ...editForm });
    setIsEditing(false);
    toast.success('Student profile updated successfully!');
  };

  const toggleLeftSchool = () => {
    const updatedStatus = !student.leftSchoolStatus;
    setStudent(prev => ({ ...prev, leftSchoolStatus: updatedStatus }));
    setEditForm(prev => ({ ...prev, leftSchoolStatus: updatedStatus }));
    toast.success(updatedStatus ? 'Status updated: Student has LEFT school campus.' : 'Status updated: Student ON CAMPUS.');
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Student Learning Portal</h1>
            <p className="text-slate-500 text-sm">Welcome back, {student.name} ({student.standard} - Section {student.section})</p>
          </div>

          {/* Left School Status Indicator */}
          <div className="flex items-center gap-3 bg-slate-100 p-3 rounded-lg border">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Campus Status</p>
              <div className="flex items-center gap-2 mt-1">
                {student.leftSchoolStatus ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                    <LogOut className="w-3.5 h-3.5" /> Left School Campus
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                    <CheckCircle className="w-3.5 h-3.5" /> On Campus
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={toggleLeftSchool}
              className="text-xs font-medium px-3 py-1.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition"
            >
              Toggle Status
            </button>
          </div>
        </div>

        {/* Profile Details & Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1 bg-white p-6 rounded-xl shadow-sm border space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <User className="w-5 h-5 text-indigo-600" /> Student Profile
              </h2>
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="text-slate-500 hover:text-indigo-600 transition"
              >
                <Edit className="w-4 h-4" />
              </button>
            </div>

            {isEditing ? (
              <div className="space-y-3 text-sm">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full px-3 py-1.5 border rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Parent Name</label>
                  <input
                    type="text"
                    value={editForm.parentName}
                    onChange={e => setEditForm({ ...editForm, parentName: e.target.value })}
                    className="w-full px-3 py-1.5 border rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Parent Phone</label>
                  <input
                    type="text"
                    value={editForm.parentPhone}
                    onChange={e => setEditForm({ ...editForm, parentPhone: e.target.value })}
                    className="w-full px-3 py-1.5 border rounded-md"
                  />
                </div>
                <button
                  onClick={handleSaveProfile}
                  className="w-full mt-2 py-2 bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-700 flex items-center justify-center gap-1"
                >
                  <Save className="w-4 h-4" /> Save Profile
                </button>
              </div>
            ) : (
              <div className="space-y-2 text-sm text-slate-600">
                <p><span className="font-semibold text-slate-800">Roll No:</span> {student.rollNumber}</p>
                <p><span className="font-semibold text-slate-800">Email:</span> {student.email}</p>
                <p><span className="font-semibold text-slate-800">Parent:</span> {student.parentName}</p>
                <p><span className="font-semibold text-slate-800">Contact:</span> {student.parentPhone}</p>
              </div>
            )}
          </div>

          <div className="md:col-span-2 bg-white p-6 rounded-xl shadow-sm border space-y-4">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 border-b pb-3">
              <BookOpen className="w-5 h-5 text-indigo-600" /> Today Schedule & Learning Resources
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg bg-slate-50">
                <p className="text-xs font-semibold text-indigo-600 uppercase">Period 1 (08:30 AM)</p>
                <p className="font-bold text-slate-800 mt-1">Mathematics — Quadratic Equations</p>
                <p className="text-xs text-slate-500 mt-0.5">Teacher: Dr. Rajesh Sharma</p>
              </div>
              <div className="p-4 border rounded-lg bg-slate-50">
                <p className="text-xs font-semibold text-indigo-600 uppercase">Period 2 (09:30 AM)</p>
                <p className="font-bold text-slate-800 mt-1">Physics — Newton Laws of Motion</p>
                <p className="text-xs text-slate-500 mt-0.5">Teacher: Priya Patel</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
