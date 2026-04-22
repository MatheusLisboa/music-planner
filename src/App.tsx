import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Services from './pages/Services';
import Availability from './pages/Availability';
import Schedules from './pages/Schedules';
import Users from './pages/Users';
import Songs from './pages/Songs';
import SuperAdminSetup from './pages/SuperAdminSetup';
import Churches from './pages/Churches';
import MainLayout from './components/MainLayout';
import LoadingScreen from './components/LoadingScreen';

function PrivateRoute({ children, adminOnly = false }: { children: React.ReactNode, adminOnly?: boolean }) {
  const { user, profile, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" />;
  
  if (profile?.mustChangePassword) {
    // We would normally redirect to a change password page, 
    // but for simplicity we'll handle it inside the dashboard or common components.
  }

  if (adminOnly && profile?.role !== 'admin' && profile?.role !== 'super_admin') {
    return <Navigate to="/" />;
  }

  return <MainLayout>{children}</MainLayout>;
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/setup-sa" element={<SuperAdminSetup />} />
          
          <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/churches" element={<PrivateRoute adminOnly={true}><Churches /></PrivateRoute>} />
          <Route path="/services" element={<PrivateRoute><Services /></PrivateRoute>} />
          <Route path="/availability" element={<PrivateRoute><Availability /></PrivateRoute>} />
          <Route path="/schedules" element={<PrivateRoute><Schedules /></PrivateRoute>} />
          <Route path="/users" element={<PrivateRoute adminOnly={true}><Users /></PrivateRoute>} />
          <Route path="/songs" element={<PrivateRoute><Songs /></PrivateRoute>} />
          
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
