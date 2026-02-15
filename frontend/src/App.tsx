import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Header, LoginButton, LoadingSpinner } from './components';
import {
  BookListPage,
  BookDetailPage,
  BookRegisterPage,
  CsvRegisterPage,
  LoanListPage,
  ReviewListPage,
} from './pages';
import { config } from './config';
import './App.css';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner message="認証状態を確認中..." />;
  }

  if (!user) {
    return <LoginButton />;
  }

  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  if (user?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <ProtectedRoute>
      <Header />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<BookListPage />} />
          <Route path="/books/:id" element={<BookDetailPage />} />
          <Route path="/register" element={<AdminRoute><BookRegisterPage /></AdminRoute>} />
          <Route path="/register/csv" element={<AdminRoute><CsvRegisterPage /></AdminRoute>} />
          <Route path="/loans" element={<LoanListPage />} />
          <Route path="/reviews" element={<ReviewListPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </ProtectedRoute>
  );
}

function App() {
  return (
    <GoogleOAuthProvider clientId={config.googleClientId}>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
