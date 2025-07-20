import React, { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import useDarkMode from "./components/useDarkMode";
import CookieConsent from "./components/CookieConsent";
import ProtectedRoute from "./components/ProtectedRoute";

// Composant de chargement
const LoadingSpinner = () => {
  const [darkMode] = useDarkMode();

  return (
    <div className={`min-h-screen flex items-center justify-center ${darkMode ? "bg-gray-900" : "bg-gray-100"}`}>
      <div className="text-center">
        {/* Spinner animé */}
        <div className="relative inline-flex">
          <div className="w-16 h-16 rounded-full border-4 border-violet-200 dark:border-violet-900"></div>
          <div className="w-16 h-16 rounded-full border-4 border-transparent border-t-violet-600 dark:border-t-violet-400 animate-spin absolute top-0 left-0"></div>
        </div>
        
        {/* Texte de chargement */}
        <p className={`mt-4 text-lg font-medium ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
          Chargement...
        </p>
        
        {/* Points animés */}
        <div className="flex justify-center mt-2 space-x-1">
          <div className="w-2 h-2 bg-violet-600 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
          <div className="w-2 h-2 bg-violet-600 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
          <div className="w-2 h-2 bg-violet-600 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
        </div>
      </div>
    </div>
  );
};

// Lazy loading des composants
const Chat = lazy(() => import("./pages/Chat"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const SetAvatar = lazy(() => import("./pages/SetAvatar"));
const Home = lazy(() => import("./components/Home"));
const Settings = lazy(() => import("./components/Settings"));
const Profile = lazy(() => import("./components/Profil"));
const ContactsPage = lazy(() => import("./components/Contact"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));

const App = () => {
  const [darkMode] = useDarkMode();

  return (
    <div className={darkMode ? "dark" : ""}>
      <BrowserRouter>
        <Suspense fallback={<LoadingSpinner />}>
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/register" element={<Register />} />
            <Route path="/login" element={<Login />} />
            <Route path="/setAvatar" element={
              <ProtectedRoute>
                <SetAvatar />
              </ProtectedRoute>
            } />
            <Route path="/chat" element={
              <ProtectedRoute>
                <Chat />
              </ProtectedRoute>
            } />
            <Route path="/home" element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            } />
            <Route path="/settings" element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            } />
            <Route path="/profile" element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } />
            <Route path="/contacts" element={
              <ProtectedRoute>
                <ContactsPage />
              </ProtectedRoute>
            } />
            <Route path="/admin" element={
              <ProtectedRoute requireAdmin={true}>
                <AdminDashboard />
              </ProtectedRoute>
            } />
          </Routes>
        </Suspense>
        <CookieConsent />
      </BrowserRouter>
    </div>
  );
};

export default App;
