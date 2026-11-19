import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { UserRole } from './types/domain';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { LandingPage } from './pages/LandingPage';
import { FindCaretakersPage } from './pages/FindCaretakersPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ParentDashboard } from './pages/ParentDashboard';
import { CaretakerDashboard } from './pages/CaretakerDashboard';
import { AdminDashboard } from './pages/AdminDashboard';

function ProtectedRoute({ allowedRole, children }: { allowedRole: UserRole; children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return <div className="flex min-h-[60vh] items-center justify-center text-sm text-fg-muted">Verifying session...</div>;
  }
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== allowedRole) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <MotionConfig reducedMotion="user">
          <BrowserRouter>
            <div className="flex min-h-screen flex-col bg-bg text-fg">
              <Navbar />
              <main className="flex-1">
                <Routes>
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/caretakers" element={<FindCaretakersPage />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/register" element={<RegisterPage />} />
                  <Route
                    path="/dashboard/parent"
                    element={
                      <ProtectedRoute allowedRole="PARENT">
                        <ParentDashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard/caretaker"
                    element={
                      <ProtectedRoute allowedRole="CARETAKER">
                        <CaretakerDashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard/admin"
                    element={
                      <ProtectedRoute allowedRole="ADMIN">
                        <AdminDashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </main>
              <Footer />
            </div>
          </BrowserRouter>
        </MotionConfig>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
