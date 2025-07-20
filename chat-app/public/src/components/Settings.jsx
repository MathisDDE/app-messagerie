import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import useDarkMode from "../components/useDarkMode";
import axios from "axios";
import authService from "../services/authService";
import { updatePasswordRoute } from "../utils/APIRoutes";
import ExportModal from "./ExportModal";
import PrivacySettings from "./PrivacySettings";
import PasswordStrengthIndicator from "./PasswordStrengthIndicator";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const Settings = () => {
  const [darkMode, setDarkMode] = useDarkMode();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const result = await authService.getCurrentUser();
      if (!result.success) {
        navigate("/login");
      } else {
        setUser(result.user);
      }
    };
    checkAuth();
  }, [navigate]);

  const handleLogout = async () => {
    await authService.logout();
    // Navigate to login page
    navigate("/login");
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("Les nouveaux mots de passe ne correspondent pas");
      return;
    }

    // Validation RGPD du mot de passe
    if (passwordData.newPassword.length < 12) {
      toast.error("Le nouveau mot de passe doit contenir au moins 12 caractères (RGPD)");
      return;
    }

    if (!/[A-Z]/.test(passwordData.newPassword)) {
      toast.error("Le mot de passe doit contenir au moins une lettre majuscule");
      return;
    }

    if (!/[a-z]/.test(passwordData.newPassword)) {
      toast.error("Le mot de passe doit contenir au moins une lettre minuscule");
      return;
    }

    if (!/[0-9]/.test(passwordData.newPassword)) {
      toast.error("Le mot de passe doit contenir au moins un chiffre");
      return;
    }

    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(passwordData.newPassword)) {
      toast.error("Le mot de passe doit contenir au moins un caractère spécial");
      return;
    }

    setLoading(true);
    try {
      const { data } = await axios.put(`${updatePasswordRoute}/${user.id}`, {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });

      if (data.status) {
        toast.success("Mot de passe modifié avec succès !");
        setShowPasswordModal(false);
        setPasswordData({
          currentPassword: "",
          newPassword: "",
          confirmPassword: ""
        });
      } else {
        toast.error(data.msg || "Erreur lors de la modification du mot de passe");
      }
    } catch (error) {
      toast.error("Erreur lors de la modification du mot de passe");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className={`min-h-screen p-4 ${darkMode ? "bg-gray-900" : "bg-gray-100"}`}>
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-purple-700 dark:text-purple-300">SecureChat</h1>
          <button
            className="bg-purple-500 hover:bg-purple-600 text-white font-semibold py-2 px-4 rounded"
            onClick={() => navigate("/home")}
          >
            Retour
          </button>
        </div>

        <div className="max-w-2xl mx-auto space-y-6">
          <div className="bg-purple-100 dark:bg-purple-800 shadow-md rounded-lg p-4 flex justify-between items-center">
            <span className="text-gray-900 dark:text-white font-medium">Modifier le mot de passe</span>
            <button 
              onClick={() => setShowPasswordModal(true)}
              className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-1 rounded transition"
            >
              Modifier
            </button>
          </div>

          <div className="bg-purple-100 dark:bg-purple-800 shadow-md rounded-lg p-4 flex justify-between items-center">
            <span className="text-gray-900 dark:text-white font-medium">Basculer thème sombre/clair</span>
            <label className="inline-flex relative items-center cursor-pointer">
              <input
                type="checkbox"
                checked={darkMode}
                onChange={() => setDarkMode(!darkMode)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none dark:bg-gray-600 rounded-full peer dark:peer-focus:ring-purple-800 peer-checked:bg-purple-600" />
              <div className="absolute left-[2px] top-[2px] bg-white w-5 h-5 rounded-full transition-all duration-300 peer-checked:translate-x-5"></div>
            </label>
          </div>

          <div className="bg-purple-100 dark:bg-purple-800 shadow-md rounded-lg p-4 flex justify-between items-center">
            <span className="text-gray-900 dark:text-white font-medium">Gérer son profil</span>
            <Link to="/profile">
              <button className="bg-purple-500 text-white px-4 py-1 rounded hover:bg-purple-600 transition">
                Profil
              </button>
            </Link>
          </div>

          <div className="bg-purple-100 dark:bg-purple-800 shadow-md rounded-lg p-4 flex justify-between items-center">
            <span className="text-gray-900 dark:text-white font-medium">Exporter les conversations</span>
            <button 
              onClick={() => setShowExportModal(true)}
              className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-1 rounded transition"
            >
              Exporter
            </button>
          </div>

          <div className="bg-purple-100 dark:bg-purple-800 shadow-md rounded-lg p-4 flex justify-between items-center">
            <span className="text-gray-900 dark:text-white font-medium">Paramètres de confidentialité</span>
            <button 
              onClick={() => setShowPrivacyModal(true)}
              className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-1 rounded transition"
            >
              Confidentialité
            </button>
          </div>

          <div className="bg-purple-100 dark:bg-purple-800 shadow-md rounded-lg p-4 flex justify-between items-center">
            <span className="text-gray-900 dark:text-white font-medium">Se déconnecter</span>
            <button 
              onClick={handleLogout}
              className="border border-purple-500 text-purple-700 dark:text-white px-4 py-1 rounded hover:bg-purple-200 dark:hover:bg-purple-700 transition"
            >
              Déconnexion
            </button>
          </div>
        </div>
      </div>

      {/* Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className={`${darkMode ? "bg-gray-800 text-white" : "bg-white"} rounded-lg p-6 w-full max-w-md`}>
            <h2 className="text-xl font-bold mb-4">Modifier le mot de passe</h2>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Mot de passe actuel</label>
                <input
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                    darkMode ? "bg-gray-700 border-gray-600" : "border-gray-300"
                  }`}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Nouveau mot de passe</label>
                <input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                    darkMode ? "bg-gray-700 border-gray-600" : "border-gray-300"
                  }`}
                  required
                />
                <PasswordStrengthIndicator password={passwordData.newPassword} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Confirmer le nouveau mot de passe</label>
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                    darkMode ? "bg-gray-700 border-gray-600" : "border-gray-300"
                  }`}
                  required
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className={`flex-1 bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 rounded-lg transition ${
                    loading ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  {loading ? "Modification..." : "Modifier"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordModal(false);
                    setPasswordData({
                      currentPassword: "",
                      newPassword: "",
                      confirmPassword: ""
                    });
                  }}
                  className="flex-1 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-700 text-gray-700 dark:text-white font-medium py-2 rounded-lg transition"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Export Modal */}
      {showExportModal && (
        <ExportModal 
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
          darkMode={darkMode}
          currentUser={user}
          currentChat={null}
        />
      )}

      {/* Privacy Settings Modal */}
      {showPrivacyModal && user && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className={`${darkMode ? "bg-gray-800" : "bg-white"} rounded-lg p-6`}>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Paramètres de confidentialité</h2>
                <button
                  onClick={() => setShowPrivacyModal(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <PrivacySettings userId={user.id} />
            </div>
          </div>
        </div>
      )}
      
      <ToastContainer position="bottom-right" theme={darkMode ? "dark" : "light"} />
    </>
  );
};

export default Settings;
