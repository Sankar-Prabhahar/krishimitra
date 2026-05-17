import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LanguageProvider } from './context/LanguageContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { FarmProvider } from './context/FarmContext';
import Layout from './components/Layout';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Weather from './pages/Weather';
import Market from './pages/Market';
import DiseaseDetection from './pages/DiseaseDetection';
import SoilWater from './pages/SoilWater';
import CropTracking from './pages/CropTracking';
import CropRecommendation from './pages/CropRecommendation';
import Login from './pages/Login';
import Signup from './pages/Signup';
import FarmSetup from './pages/FarmSetup';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading, isProfileComplete } = useAuth();
  
  if (loading) {
    return (
      <div className="auth-loading">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  if (!isProfileComplete) {
    return <Navigate to="/farm-setup" replace />;
  }
  
  return children;
};

// Farm Setup Route (requires auth but not complete profile)
const FarmSetupRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="auth-loading">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

// Public Route (redirect to home if already logged in)
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading, isProfileComplete } = useAuth();
  
  if (loading) {
    return (
      <div className="auth-loading">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }
  
  if (isAuthenticated) {
    if (!isProfileComplete) {
      return <Navigate to="/farm-setup" replace />;
    }
    return <Navigate to="/" replace />;
  }
  
  return children;
};

function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={
        <PublicRoute>
          <Login />
        </PublicRoute>
      } />
      <Route path="/signup" element={
        <PublicRoute>
          <Signup />
        </PublicRoute>
      } />
      
      {/* Farm Setup (requires auth) */}
      <Route path="/farm-setup" element={
        <FarmSetupRoute>
          <FarmSetup />
        </FarmSetupRoute>
      } />
      
      {/* Protected Routes */}
      <Route path="/" element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        <Route index element={<Home />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="disease-detection" element={<DiseaseDetection />} />
        <Route path="market" element={<Market />} />
        <Route path="weather" element={<Weather />} />
        <Route path="soil-water" element={<SoilWater />} />
        <Route path="crop-tracking" element={<CropTracking />} />
        <Route path="crop-recommendation" element={<CropRecommendation />} />
        <Route path="*" element={<div className="container"><h2>404 - Page Not Found</h2></div>} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <LanguageProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <FarmProvider>
            <AppRoutes />
          </FarmProvider>
        </AuthProvider>
      </BrowserRouter>
    </LanguageProvider>
  );
}

export default App;
