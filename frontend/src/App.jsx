/**
 * Main App component.
 * Sets up routing, auth context, and layout.
 */
import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/ui/Navbar';
import Spinner from './components/ui/Spinner';
import ErrorBoundary from './components/ErrorBoundary';

// Lazy-loaded pages for fast code-splitting and instant initial page load
const HomePage = lazy(() => import('./pages/HomePage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const LocationPage = lazy(() => import('./pages/LocationPage'));
const LogoutKioskPage = lazy(() => import('./pages/LogoutKioskPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const AttendancePage = lazy(() => import('./pages/AttendancePage'));
const CustomerPage = lazy(() => import('./pages/CustomerPage'));
const InventoryPage = lazy(() => import('./pages/InventoryPage'));
const OrderPage = lazy(() => import('./pages/OrderPage'));
const LoginHistoryPage = lazy(() => import('./pages/LoginHistoryPage'));
const QelvoraAiPage = lazy(() => import('./pages/QelvoraAiPage'));
const SummaryPage = lazy(() => import('./pages/SummaryPage'));
const TeacherSectionPage = lazy(() => import('./pages/TeacherSectionPage'));
const ProfileSelectionPage = lazy(() => import('./pages/ProfileSelectionPage'));
const VideosPage = lazy(() => import('./pages/VideosPage'));
const VideoPlayerPage = lazy(() => import('./pages/VideoPlayerPage'));
const SafePickupPage = lazy(() => import('./pages/SafePickupPage'));

/**
 * Protected route wrapper — requires full authentication (password + face).
 */
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isFaceVerified, loading, user, selectedProfile } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated || !isFaceVerified) {
    return <Navigate to="/login" replace />;
  }

  // If user is a student and has not chosen a profile, redirect to profile selection
  if (user?.role?.toLowerCase() === 'student' && !selectedProfile) {
    return <Navigate to="/profile-selection" replace />;
  }

  return children;
};

/**
 * Profile selection route wrapper — requires authentication but does not check chosen profile
 */
const ProfileSelectionRoute = ({ children }) => {
  const { isAuthenticated, isFaceVerified, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated || !isFaceVerified) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

/**
 * Guest route wrapper — redirects to dashboard if already authenticated.
 */
const GuestRoute = ({ children }) => {
  const { isAuthenticated, isFaceVerified, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isAuthenticated && isFaceVerified) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

import useScreenProtection from './hooks/useScreenProtection';
import { useTranslation } from 'react-i18next';

const PageLoader = () => (
  <div className="min-h-[60vh] flex items-center justify-center">
    <Spinner size="lg" />
  </div>
);

const AppRoutes = () => {
  useScreenProtection();
  const { i18n } = useTranslation();

  return (
    <div key={i18n.language}>
      <Navbar />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route
            path="/login"
            element={
              <GuestRoute>
                <LoginPage />
              </GuestRoute>
            }
          />
          <Route
            path="/register"
            element={
              <GuestRoute>
                <RegisterPage />
              </GuestRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile-selection"
            element={
              <ProfileSelectionRoute>
                <ProfileSelectionPage />
              </ProfileSelectionRoute>
            }
          />
          <Route
            path="/videos"
            element={
              <ProtectedRoute>
                <VideosPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/videos/:id"
            element={
              <ProtectedRoute>
                <VideoPlayerPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/location"
            element={
              <ProtectedRoute>
                <LocationPage />
              </ProtectedRoute>
            }
          />
          <Route 
            path="/attendance" 
            element={
              <ProtectedRoute>
                <AttendancePage />
              </ProtectedRoute>
            }
          />
          <Route 
            path="/customers" 
            element={
              <ProtectedRoute>
                <CustomerPage />
              </ProtectedRoute>
            }
          />
          <Route 
            path="/inventory" 
            element={
              <ProtectedRoute>
                <InventoryPage />
              </ProtectedRoute>
            }
          />
          <Route 
            path="/orders" 
            element={
              <ProtectedRoute>
                <OrderPage />
              </ProtectedRoute>
            }
          />
          <Route path="/logout-kiosk" element={<LogoutKioskPage />} />
          <Route
            path="/login-history"
            element={
              <ProtectedRoute>
                <LoginHistoryPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/qelvora-ai"
            element={
              <ProtectedRoute>
                <QelvoraAiPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/summary"
            element={
              <ProtectedRoute>
                <SummaryPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher-section"
            element={
              <ProtectedRoute>
                <TeacherSectionPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/safe-pickup"
            element={
              <ProtectedRoute>
                <SafePickupPage />
              </ProtectedRoute>
            }
          />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </div>
  );
};

const App = () => {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <ErrorBoundary>
          <AppRoutes />
        </ErrorBoundary>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              borderRadius: '12px',
              background: '#333',
              color: '#fff',
              fontSize: '14px',
            },
          }}
        />
      </AuthProvider>
    </Router>
  );
};

export default App;
