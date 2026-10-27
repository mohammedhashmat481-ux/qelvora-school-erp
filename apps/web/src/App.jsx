import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import { AuthProvider } from './context/AuthContext';

// ─── Eagerly loaded (tiny, needed on first paint) ──────────────
import LoginPage from './pages/LoginPage';
import ProfileSelectionPage from './pages/ProfileSelectionPage';
import GlobalAiAssistant from './components/ai/GlobalAiAssistant';

// ─── Route-based lazy loading (loaded only when the route is visited) ──
const HomePage             = lazy(() => import('./pages/HomePage'));
const RegisterPage         = lazy(() => import('./pages/RegisterPage'));
const DashboardPage        = lazy(() => import('./pages/DashboardPage'));
const AiAssistPage         = lazy(() => import('./pages/AiAssistPage'));
const AdminPage            = lazy(() => import('./pages/AdminPage'));
const TeacherSectionPage   = lazy(() => import('./pages/TeacherSectionPage'));
const StudentPage          = lazy(() => import('./pages/StudentPage'));
const SafePickupPage       = lazy(() => import('./pages/SafePickupPage'));
const AttendancePage       = lazy(() => import('./pages/AttendancePage'));
const DailyReportsPage     = lazy(() => import('./pages/DailyReportsPage'));
const StudentAttendancePage = lazy(() => import('./pages/StudentAttendancePage'));
const FeesManagementPage   = lazy(() => import('./pages/FeesManagementPage'));
const ExaminationPage      = lazy(() => import('./pages/ExaminationPage'));
const OnlineExamManagementPage = lazy(() => import('./pages/OnlineExamManagementPage'));
const StudentPromotionPage = lazy(() => import('./pages/StudentPromotionPage'));
const AcademicManagementPage = lazy(() => import('./pages/AcademicManagementPage'));
const PreviousYearBalancePage = lazy(() => import('./pages/PreviousYearBalancePage'));
const PaperPage            = lazy(() => import('./pages/PaperPage'));
const SummaryPage          = lazy(() => import('./pages/SummaryPage'));
const LocationPage         = lazy(() => import('./pages/LocationPage'));
const VideosPage           = lazy(() => import('./pages/VideosPage'));
const LogoutKioskPage      = lazy(() => import('./pages/LogoutKioskPage'));
const VidyaAiModule        = lazy(() => import('./modules/VidyaAiModule'));

// ─── Student & Parents Portal Dedicated Pages ──────────────────
const StudentProfilePage    = lazy(() => import('./pages/student/StudentProfilePage'));
const StudentHomeworkPage   = lazy(() => import('./pages/student/StudentHomeworkPage'));
const StudentExaminationPage= lazy(() => import('./pages/student/StudentExaminationPage'));
const StudentOnlineExamPage = lazy(() => import('./pages/student/StudentOnlineExamPage'));
const StudentExamLobbyPage  = lazy(() => import('./pages/student/StudentExamLobbyPage'));
const StudentExamScreen     = lazy(() => import('./pages/student/StudentExamScreen'));
const StudentExamResultPage = lazy(() => import('./pages/student/StudentExamResultPage'));
const StudentFeesPage       = lazy(() => import('./pages/student/StudentFeesPage'));
const StudentSafePickupPage = lazy(() => import('./pages/student/StudentSafePickupPage'));

// ─── Shared skeleton shown while any lazy page loads ──────────
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#172B4D] to-indigo-600 animate-pulse" />
        <div className="flex gap-1">
          <span className="w-2 h-2 rounded-full bg-[#29456D] animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-2 h-2 rounded-full bg-[#29456D] animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-2 h-2 rounded-full bg-[#29456D] animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Toaster position="top-right" />
        <GlobalAiAssistant />
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/"                    element={<LoginPage />} />
            <Route path="/login"               element={<LoginPage />} />
            <Route path="/register"            element={<RegisterPage />} />
            <Route path="/profile-selection"   element={<ProfileSelectionPage />} />
            <Route path="/dashboard"           element={<DashboardPage />} />
            <Route path="/admin"               element={<AdminPage />} />
            <Route path="/teacher"             element={<TeacherSectionPage />} />
            <Route path="/teacher-section"     element={<TeacherSectionPage />} />
            
            {/* Student & Parents Dedicated Portal Pages */}
            <Route path="/student/profile"     element={<StudentProfilePage />} />
            <Route path="/student-profile"     element={<StudentProfilePage />} />
            <Route path="/student/homework"    element={<StudentHomeworkPage />} />
            <Route path="/student-homework"    element={<StudentHomeworkPage />} />
            <Route path="/student/examination" element={<StudentExaminationPage />} />
            <Route path="/student-examination" element={<StudentExaminationPage />} />
            <Route path="/student/online-exam" element={<StudentOnlineExamPage />} />
            <Route path="/student-online-exam" element={<StudentOnlineExamPage />} />
            <Route path="/online-exam/lobby/:examId" element={<StudentExamLobbyPage />} />
            <Route path="/online-exam/take/:attemptId" element={<StudentExamScreen />} />
            <Route path="/online-exam/result/:attemptId" element={<StudentExamResultPage />} />
            <Route path="/student/fees"        element={<StudentFeesPage />} />
            <Route path="/student-fees"        element={<StudentFeesPage />} />
            <Route path="/student/safe-pickup" element={<StudentSafePickupPage />} />
            <Route path="/student-safe-pickup" element={<StudentSafePickupPage />} />

            <Route path="/student"             element={<StudentProfilePage />} />
            <Route path="/parent"              element={<StudentSafePickupPage />} />
            <Route path="/safe-pickup"         element={<SafePickupPage />} />
            <Route path="/fees"                element={<FeesManagementPage />} />
            <Route path="/examination"         element={<ExaminationPage />} />
            <Route path="/exams"               element={<ExaminationPage />} />
            <Route path="/online-exam"         element={<OnlineExamManagementPage />} />
            <Route path="/previous-year-balance" element={<PreviousYearBalancePage />} />
            <Route path="/previous-balance"    element={<PreviousYearBalancePage />} />
            <Route path="/student-promotion"   element={<StudentPromotionPage />} />
            <Route path="/promotion"           element={<StudentPromotionPage />} />
            <Route path="/alumni"              element={<StudentPromotionPage />} />
            <Route path="/academic-management" element={<AcademicManagementPage />} />
            <Route path="/academics"           element={<AcademicManagementPage />} />
            <Route path="/attendance"          element={<AttendancePage />} />
            <Route path="/reports"             element={<DailyReportsPage />} />
            <Route path="/daily-reports"       element={<DailyReportsPage />} />
            <Route path="/ai-assist"           element={<AiAssistPage />} />
            <Route path="/student-attendance"  element={<StudentAttendancePage />} />
            <Route path="/logout-kiosk"        element={<LogoutKioskPage />} />
            <Route path="/qelvora-ai"          element={<PaperPage />} />
            <Route path="/school-crm-ai"       element={<Navigate to="/qelvora-ai" replace />} />
            <Route path="/summary"             element={<SummaryPage />} />
            <Route path="/location"            element={<LocationPage />} />
            <Route path="/videos"              element={<VideosPage />} />
            <Route path="/vidya/*"             element={<VidyaAiModule />} />
            <Route path="*"                    element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </Router>
    </AuthProvider>
  );
}

export default App;
