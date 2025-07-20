import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import useDarkMode from "../components/useDarkMode";
import axios from "axios";
import { adminStatsRoute, adminUsersRoute, adminBanUserRoute, adminLogsRoute, adminModerationRoute } from "../utils/APIRoutes";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import authService from "../services/authService";

const AdminDashboard = () => {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    bannedUsers: 0,
    newUsersThisWeek: 0,
    totalMessages: 0,
    todayMessages: 0,
    weekMessages: 0
  });
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [moderationLogs, setModerationLogs] = useState([]);
  const [moderationStats, setModerationStats] = useState({
    totalAnalyzed: 0,
    blocked: 0,
    warned: 0,
    allowed: 0,
    averageRiskScore: 0
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [searchTerm, setSearchTerm] = useState("");
  const [banReason, setBanReason] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const navigate = useNavigate();
  const [darkMode] = useDarkMode();

  useEffect(() => {
    const checkAdmin = async () => {
      const user = authService.getUser();
      if (!user) {
        navigate("/login");
        return;
      }
      if (user.role !== 'ADMIN') {
        navigate("/home");
        return;
      }
      setUser(user);
      setLoading(false);
      fetchDashboardData(user.id);
    };

    checkAdmin();
  }, [navigate]);

  const fetchDashboardData = async (userId) => {
    setLoading(true);
    try {
      // Fetch stats
      const statsRes = await axios.get(`${adminStatsRoute}/${userId}`);
      if (statsRes.data.status) {
        setStats(statsRes.data.stats);
      }

      // Fetch users
      const usersRes = await axios.get(`${adminUsersRoute}/${userId}`);
      if (usersRes.data.status) {
        setUsers(usersRes.data.users);
      }

      // Fetch logs
      const logsRes = await axios.get(`${adminLogsRoute}/${userId}`);
      if (logsRes.data.status) {
        setLogs(logsRes.data.logs);
      }

      // Fetch moderation logs
      const moderationRes = await axios.get(`${adminModerationRoute}/${userId}`);
      if (moderationRes.data.status) {
        setModerationLogs(moderationRes.data.logs);
        setModerationStats(moderationRes.data.stats);
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      toast.error("Erreur lors du chargement des données");
    } finally {
      setLoading(false);
    }
  };

  const handleBanUser = async (targetUser) => {
    if (!banReason.trim()) {
      toast.error("Veuillez fournir une raison pour le bannissement");
      return;
    }

    try {
      const res = await axios.put(`${adminBanUserRoute}/${user.id}/${targetUser.id}`, {
        reason: banReason
      });

      if (res.data.status) {
        toast.success(res.data.msg);
        fetchDashboardData(user.id);
        setBanReason("");
        setSelectedUser(null);
      }
    } catch (error) {
      console.error("Error banning user:", error);
      toast.error("Erreur lors du bannissement");
    }
  };

  const handleUnbanUser = async (targetUser) => {
    try {
      const res = await axios.put(`${adminBanUserRoute}/${user.id}/${targetUser.id}`, {
        reason: null
      });

      if (res.data.status) {
        toast.success(res.data.msg);
        fetchDashboardData(user.id);
      }
    } catch (error) {
      console.error("Error unbanning user:", error);
      toast.error("Erreur lors du débannissement");
    }
  };

  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (date) => {
    return new Date(date).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getActionLabel = (action) => {
    const labels = {
      'LOGIN': '🔓 Connexion',
      'LOGOUT': '🔒 Déconnexion',
      'USER_BANNED': '🚫 Utilisateur banni',
      'USER_UNBANNED': '✅ Utilisateur débanni',
      'MESSAGE_SENT': '💬 Message envoyé',
      'ROLE_CHANGED': '👑 Rôle modifié',
      'MESSAGE_DELETED_BY_ADMIN': '🗑️ Message supprimé'
    };
    return labels[action] || action;
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? "bg-gray-900" : "bg-gray-50"}`}>
        <div className="text-2xl">Chargement...</div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex ${darkMode ? "bg-gray-900 text-white" : "bg-gray-50 text-gray-900"}`}>
      {/* Sidebar */}
      <div className="w-64 bg-violet-700 text-white flex flex-col p-6">
        <h1 className="text-2xl font-bold mb-2">🔒 SecureChat</h1>
        <p className="text-sm mb-8 text-violet-200">Administration</p>
        
        <div className="flex flex-col gap-2">
          <button 
            onClick={() => setActiveTab("dashboard")}
            className={`px-4 py-3 rounded-lg text-left transition ${
              activeTab === "dashboard" ? "bg-violet-600" : "hover:bg-violet-600"
            }`}
          >
            📊 Tableau de bord
          </button>
          <button 
            onClick={() => setActiveTab("users")}
            className={`px-4 py-3 rounded-lg text-left transition ${
              activeTab === "users" ? "bg-violet-600" : "hover:bg-violet-600"
            }`}
          >
            👥 Utilisateurs
          </button>
          <button 
            onClick={() => setActiveTab("logs")}
            className={`px-4 py-3 rounded-lg text-left transition ${
              activeTab === "logs" ? "bg-violet-600" : "hover:bg-violet-600"
            }`}
          >
            📝 Journal d'activité
          </button>
          <button 
            onClick={() => setActiveTab("moderation")}
            className={`px-4 py-3 rounded-lg text-left transition ${
              activeTab === "moderation" ? "bg-violet-600" : "hover:bg-violet-600"
            }`}
          >
            📝 Journal de modération
          </button>
        </div>

        <div className="mt-auto">
          <button 
            onClick={() => navigate("/home")}
            className="w-full bg-violet-500 hover:bg-violet-400 px-4 py-2 rounded-lg transition"
          >
            ← Retour à l'accueil
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 h-screen overflow-hidden flex flex-col">
        <style>{`
          .custom-scrollbar::-webkit-scrollbar {
            width: 8px;
            height: 8px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: ${darkMode ? '#1f2937' : '#f3f4f6'};
            border-radius: 4px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: linear-gradient(to bottom, #8b5cf6, #7c3aed);
            border-radius: 4px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: linear-gradient(to bottom, #7c3aed, #6d28d9);
          }
        `}</style>
        
        {/* Content wrapper with scrollbar */}
        <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-bold">
              {activeTab === "dashboard" && "Tableau de bord"}
              {activeTab === "users" && "Gestion des utilisateurs"}
              {activeTab === "logs" && "Journal d'activité"}
              {activeTab === "moderation" && "Journal de modération"}
            </h2>
            <div className="flex items-center gap-4">
              <span>Bienvenue, {user?.username}</span>
              <img
                src={`data:image/svg+xml;base64,${user?.avatarImage}`}
                alt="Avatar"
                className="w-10 h-10 rounded-full border-2 border-violet-500"
              />
            </div>
          </div>

          {/* Dashboard Tab */}
          {activeTab === "dashboard" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
                <div className="text-3xl mb-2">👥</div>
                <h3 className="text-lg font-semibold mb-1">Utilisateurs totaux</h3>
                <p className="text-3xl font-bold text-violet-600">{stats.totalUsers}</p>
                <p className="text-sm text-gray-500 mt-2">
                  +{stats.newUsersThisWeek} cette semaine
                </p>
              </div>

              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
                <div className="text-3xl mb-2">🟢</div>
                <h3 className="text-lg font-semibold mb-1">Utilisateurs actifs</h3>
                <p className="text-3xl font-bold text-green-600">{stats.activeUsers}</p>
                <p className="text-sm text-gray-500 mt-2">
                  Dernières 24h
                </p>
              </div>

              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
                <div className="text-3xl mb-2">💬</div>
                <h3 className="text-lg font-semibold mb-1">Messages totaux</h3>
                <p className="text-3xl font-bold text-blue-600">{stats.totalMessages}</p>
                <p className="text-sm text-gray-500 mt-2">
                  {stats.todayMessages} aujourd'hui
                </p>
              </div>

              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
                <div className="text-3xl mb-2">🚫</div>
                <h3 className="text-lg font-semibold mb-1">Utilisateurs bannis</h3>
                <p className="text-3xl font-bold text-red-600">{stats.bannedUsers}</p>
                <p className="text-sm text-gray-500 mt-2">
                  Comptes suspendus
                </p>
              </div>
            </div>
          )}

          {/* Users Tab */}
          {activeTab === "users" && (
            <div>
              <div className="mb-6">
                <input
                  type="text"
                  placeholder="Rechercher un utilisateur..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full max-w-md px-4 py-2 rounded-lg border dark:bg-gray-800 dark:border-gray-700"
                />
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full">
                    <thead className="bg-violet-600 text-white sticky top-0">
                      <tr>
                        <th className="px-6 py-3 text-left">Utilisateur</th>
                        <th className="px-6 py-3 text-left">Email</th>
                        <th className="px-6 py-3 text-left">Rôle</th>
                        <th className="px-6 py-3 text-left">Messages</th>
                        <th className="px-6 py-3 text-left">Statut</th>
                        <th className="px-6 py-3 text-left">Dernière connexion</th>
                        <th className="px-6 py-3 text-left">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((u) => (
                        <tr key={u.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <img 
                                src={`data:image/svg+xml;base64,${u.avatarImage}`} 
                                alt={u.username}
                                className="w-8 h-8 rounded-full"
                              />
                              <span className="font-medium">{u.username}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">{u.email}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              u.role === 'ADMIN' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {u.role}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {u._count.messagesSent + u._count.messagesReceived}
                          </td>
                          <td className="px-6 py-4">
                            {u.isBanned ? (
                              <span className="text-red-600 font-medium">Banni</span>
                            ) : (
                              <span className="text-green-600 font-medium">Actif</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            {u.lastLogin ? formatDate(u.lastLogin) : "Jamais"}
                          </td>
                          <td className="px-6 py-4">
                            {u.role !== 'ADMIN' && (
                              <div className="flex gap-2">
                                {u.isBanned ? (
                                  <button
                                    onClick={() => handleUnbanUser(u)}
                                    className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm transition"
                                  >
                                    Débannir
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => setSelectedUser(u)}
                                    className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition"
                                  >
                                    Bannir
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Logs Tab */}
          {activeTab === "logs" && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-semibold mb-4">Activité récente</h3>
              <div className="space-y-3 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
                {logs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center gap-3">
                      {log.user && (
                        <img 
                          src={`data:image/svg+xml;base64,${log.user.avatarImage}`}
                          alt={log.user.username}
                          className="w-8 h-8 rounded-full"
                        />
                      )}
                      <div>
                        <p className="font-medium">
                          {getActionLabel(log.action)}
                        </p>
                        <p className="text-sm text-gray-500">
                          {log.user ? log.user.username : "Système"} • {formatDate(log.createdAt)}
                        </p>
                      </div>
                    </div>
                    {log.details && (
                      <div className="text-sm text-gray-500">
                        {JSON.parse(log.details).targetUsername && 
                          `Cible: ${JSON.parse(log.details).targetUsername}`
                        }
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Moderation Tab */}
          {activeTab === "moderation" && (
            <div>
              {/* Statistiques de modération */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
                  <div className="text-3xl mb-2">📊</div>
                  <h3 className="text-sm font-semibold mb-1">Messages analysés</h3>
                  <p className="text-2xl font-bold text-violet-600">{moderationStats.totalAnalyzed}</p>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
                  <div className="text-3xl mb-2">🚫</div>
                  <h3 className="text-sm font-semibold mb-1">Bloqués</h3>
                  <p className="text-2xl font-bold text-red-600">{moderationStats.blocked}</p>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
                  <div className="text-3xl mb-2">⚠️</div>
                  <h3 className="text-sm font-semibold mb-1">Avertissements</h3>
                  <p className="text-2xl font-bold text-yellow-600">{moderationStats.warned}</p>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
                  <div className="text-3xl mb-2">✅</div>
                  <h3 className="text-sm font-semibold mb-1">Autorisés</h3>
                  <p className="text-2xl font-bold text-green-600">{moderationStats.allowed}</p>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
                  <div className="text-3xl mb-2">🔍</div>
                  <h3 className="text-sm font-semibold mb-1">Score moyen</h3>
                  <p className="text-2xl font-bold text-purple-600">{moderationStats.averageRiskScore}</p>
                </div>
              </div>

              {/* Logs détaillés */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <h3 className="text-xl font-semibold mb-4">Analyses récentes par l'IA</h3>
                <div className="overflow-x-auto custom-scrollbar">
                  <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
                    <table className="w-full">
                      <thead className="sticky top-0 bg-white dark:bg-gray-800 border-b dark:border-gray-700">
                        <tr>
                          <th className="text-left py-3 px-4">Date</th>
                          <th className="text-left py-3 px-4">Expéditeur</th>
                          <th className="text-left py-3 px-4">Destinataire</th>
                          <th className="text-left py-3 px-4">Message</th>
                          <th className="text-left py-3 px-4">Score</th>
                          <th className="text-left py-3 px-4">Analyse IA</th>
                          <th className="text-left py-3 px-4">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {moderationLogs.map((log) => (
                          <tr key={log.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                            <td className="py-3 px-4 text-sm">
                              {formatDate(log.createdAt)}
                            </td>
                            <td className="py-3 px-4">
                              {log.sender && (
                                <div className="flex items-center gap-2">
                                  <img 
                                    src={`data:image/svg+xml;base64,${log.sender.avatarImage}`}
                                    alt={log.sender.username}
                                    className="w-6 h-6 rounded-full"
                                  />
                                  <span className="text-sm">{log.sender.username}</span>
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-4 text-sm">
                              {log.receiver?.username || "N/A"}
                            </td>
                            <td className="py-3 px-4">
                              <div className="max-w-xs truncate text-sm">
                                {log.messageContent}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                log.riskScore >= 70 ? 'bg-red-100 text-red-800' :
                                log.riskScore >= 40 ? 'bg-yellow-100 text-yellow-800' :
                                'bg-green-100 text-green-800'
                              }`}>
                                {log.riskScore}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <div className="text-xs space-y-1">
                                {log.analysis?.detectedIssues?.map((issue, idx) => (
                                  <div key={idx} className="text-red-600">• {issue}</div>
                                ))}
                                {log.analysis?.explanation && (
                                  <div className="text-gray-600 italic">{log.analysis.explanation}</div>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                                log.blocked ? 'bg-red-100 text-red-800' :
                                log.warned ? 'bg-yellow-100 text-yellow-800' :
                                'bg-green-100 text-green-800'
                              }`}>
                                {log.blocked ? '🚫 Bloqué' : log.warned ? '⚠️ Averti' : '✅ Autorisé'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Ban User Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className={`${darkMode ? "bg-gray-800" : "bg-white"} rounded-lg p-6 w-full max-w-md`}>
            <h3 className="text-xl font-bold mb-4">
              Bannir {selectedUser.username} ?
            </h3>
            <textarea
              placeholder="Raison du bannissement..."
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg mb-4 ${
                darkMode ? "bg-gray-700 border-gray-600" : "border-gray-300"
              }`}
              rows="3"
            />
            <div className="flex gap-3">
              <button
                onClick={() => handleBanUser(selectedUser)}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg transition"
              >
                Confirmer le bannissement
              </button>
              <button
                onClick={() => {
                  setSelectedUser(null);
                  setBanReason("");
                }}
                className="flex-1 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-700 py-2 rounded-lg transition"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      <ToastContainer position="bottom-right" theme={darkMode ? "dark" : "light"} />
    </div>
  );
};

export default AdminDashboard;
