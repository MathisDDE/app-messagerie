import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import useDarkMode from "../components/useDarkMode";
import axios from "axios";
import { io } from "socket.io-client";
import { allUsersRoute, getAllMessagesRoute, host, getUserGroupsRoute, getGroupMessagesRoute } from "../utils/APIRoutes";
import DefaultAvatar from "../assets/user-default.png";
import authService from "../services/authService";

const Home = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [darkMode] = useDarkMode();
  const [recentConversations, setRecentConversations] = useState([]);
  const [stats, setStats] = useState({
    totalMessages: 0,
    messagesThisWeek: 0,
    activeContacts: 0,
    filesShared: 0
  });
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [onlineUserDetails, setOnlineUserDetails] = useState([]);
  const socketRef = React.useRef();

  useEffect(() => {
    const currentUser = authService.getUser();
    if (!currentUser) {
      navigate("/login");
      return;
    }
    setUser(currentUser);
  }, [navigate]);

  // Socket.io pour les utilisateurs en ligne
  useEffect(() => {
    if (user) {
      socketRef.current = io(host);
      socketRef.current.emit("add-user", user.id);
      
      socketRef.current.on("online-users", (users) => {
        setOnlineUsers(users);
      });

      return () => {
        if (socketRef.current) {
          socketRef.current.disconnect();
        }
      };
    }
  }, [user]);

  // Charger les détails des utilisateurs en ligne
  useEffect(() => {
    if (onlineUsers.length > 0 && user) {
      fetchOnlineUserDetails();
    }
  }, [onlineUsers, user]);

  const fetchOnlineUserDetails = async () => {
    try {
      const { data: allContacts } = await axios.get(`${allUsersRoute}/${user.id}`);
      const onlineContacts = allContacts.filter(contact => 
        onlineUsers.includes(contact.id) && contact.id !== user.id
      );
      setOnlineUserDetails(onlineContacts);
    } catch (error) {
      console.error("Error fetching online user details:", error);
    }
  };

  // Charger les conversations récentes et statistiques
  useEffect(() => {
    if (user && onlineUsers) {
      fetchRecentConversations();
      fetchStats();
    }
  }, [user, onlineUsers]);

  const decryptMessage = (message) => {
    // Si c'est un fichier ou un message spécial
    if (message === "FILE_ATTACHMENT") return "📎 Fichier joint";
    if (message === "EPHEMERAL_MESSAGE") return "⏳ Message éphémère";
    
    // Pour les messages normaux, on affiche juste un aperçu
    try {
      // Si le message contient des réactions ou des métadonnées
      if (message.includes("Réagi avec") || message.includes("a réagi avec")) {
        return message;
      }
      // Limiter la longueur du message
      return message.length > 50 ? message.substring(0, 50) + "..." : message;
    } catch (error) {
      return "Message";
    }
  };

  const fetchRecentConversations = async () => {
    try {
      // Récupérer les contacts
      const { data: contacts } = await axios.get(`${allUsersRoute}/${user.id}`);
      
      // Récupérer les groupes
      const { data: groupsData } = await axios.get(`${getUserGroupsRoute}/${user.id}`);
      const groups = groupsData.status ? groupsData.groups : [];
      
      // Récupérer les derniers messages pour chaque contact
      const conversationsWithMessages = await Promise.all(
        contacts.slice(0, 5).map(async (contact) => {
          const { data: messages } = await axios.post(getAllMessagesRoute, {
            from: user.id,
            to: contact.id,
          });
          
          const lastMessage = messages[messages.length - 1];
          const unreadCount = messages.filter(msg => !msg.fromSelf && !msg.read).length;
          
          return {
            ...contact,
            lastMessage: lastMessage ? decryptMessage(lastMessage.message) : "Aucun message",
            lastMessageTime: lastMessage?.createdAt,
            unreadCount,
            isOnline: onlineUsers.includes(contact.id),
            isGroup: false
          };
        })
      );
      
      // Récupérer les derniers messages pour chaque groupe
      const groupConversations = await Promise.all(
        groups.map(async (group) => {
          try {
            const { data: messagesData } = await axios.get(
              `${getGroupMessagesRoute}/${group.id}/messages/${user.id}`
            );
            const messages = messagesData.status ? messagesData.messages : [];
            
            const lastMessage = messages[messages.length - 1];
            
            return {
              id: `group-${group.id}`,
              originalId: group.id,  // Pour garder l'ID original
              username: group.name,
              avatarImage: null, // Les groupes n'ont pas d'avatar base64
              lastMessage: lastMessage ? 
                `${lastMessage.sender.username}: ${decryptMessage(lastMessage.message)}` : 
                "Aucun message",
              lastMessageTime: lastMessage?.createdAt || group.createdAt,
              unreadCount: 0, // TODO: implémenter le comptage des messages non lus
              isOnline: true, // Les groupes sont toujours "en ligne"
              isGroup: true,
              memberCount: group.members.length,
              members: group.members
            };
          } catch (error) {
            console.error(`Error fetching messages for group ${group.id}:`, error);
            return null;
          }
        })
      );
      
      // Combiner et trier toutes les conversations
      const allConversations = [
        ...conversationsWithMessages,
        ...groupConversations.filter(g => g !== null)
      ];
      
      // Trier par date du dernier message
      const sorted = allConversations
        .filter(conv => conv.lastMessageTime)
        .sort((a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime))
        .slice(0, 10); // Limiter à 10 conversations récentes
      
      setRecentConversations(sorted);
    } catch (error) {
      console.error("Error fetching conversations:", error);
    }
  };

  const fetchStats = async () => {
    try {
      const { data: contacts } = await axios.get(`${allUsersRoute}/${user.id}`);
      let totalMessages = 0;
      let messagesThisWeek = 0;
      let filesShared = 0;
      
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      
      await Promise.all(
        contacts.map(async (contact) => {
          const { data: messages } = await axios.post(getAllMessagesRoute, {
            from: user.id,
            to: contact.id,
          });
          
          totalMessages += messages.length;
          messagesThisWeek += messages.filter(msg => 
            new Date(msg.createdAt) > oneWeekAgo
          ).length;
          filesShared += messages.filter(msg => 
            msg.message === "FILE_ATTACHMENT" || (msg.fileUrl && msg.fileUrl !== "")
          ).length;
        })
      );
      
      setStats({
        totalMessages,
        messagesThisWeek,
        activeContacts: contacts.length,
        filesShared
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const handleStartConversation = () => {
    navigate("/contacts");
  };

  const handleSelectConversation = (contact) => {
    if (contact.isGroup) {
      // Pour les groupes, utiliser l'ID original
      const groupData = {
        id: contact.originalId || parseInt(contact.id.replace('group-', '')),
        name: contact.username,
        isGroup: true,
        members: contact.members || []
      };
      localStorage.setItem("securechat-selected-user", JSON.stringify(groupData));
    } else {
      localStorage.setItem("securechat-selected-user", JSON.stringify(contact));
    }
    navigate("/chat");
  };

  return (
    <div className={`flex h-screen ${darkMode ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-900"}`}>
      {/* Sidebar */}
      <div className="w-1/5 bg-violet-600 text-white flex flex-col items-center p-6">
        <h1 className="text-2xl font-bold flex items-center gap-2 mb-8">
          <span>🔒</span> SecureChat
        </h1>

        {user && (
          <div className="flex flex-col items-center gap-2 mb-10">
            <img
              src={`data:image/svg+xml;base64,${user.avatarImage}`}
              alt="User Avatar"
              className="w-20 h-20 rounded-full object-cover border-4 border-white"
            />
            <h2 className="text-lg font-semibold">{user.username}</h2>
            <span className="text-sm text-green-300">En ligne</span>
          </div>
        )}

        <div className="flex flex-col gap-4 w-full">
          <Link to="/home" className="flex items-center gap-3 p-3 rounded-xl bg-violet-500 hover:bg-violet-700 transition">
            <i className="fas fa-home" /> Accueil
          </Link>
          <Link to="/contacts" className="flex items-center gap-3 p-3 rounded-xl hover:bg-violet-500 transition">
            <i className="fas fa-user" /> Contacts
          </Link>
          <Link to="/chat" className="flex items-center gap-3 p-3 rounded-xl hover:bg-violet-500 transition">
            <i className="fas fa-comment" /> Messagerie
          </Link>
          <Link to="/settings" className="flex items-center gap-3 p-3 rounded-xl hover:bg-violet-500 transition">
            <i className="fas fa-cog" /> Paramètres
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8 overflow-y-auto">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            Bienvenue, {user?.username} ! 👋
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Voici un aperçu de votre activité de messagerie
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Conversations récentes */}
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">Conversations récentes</h2>
              <button 
                onClick={handleStartConversation}
                className="text-violet-600 hover:text-violet-700 text-sm font-medium"
              >
                Voir tout →
              </button>
            </div>
            
            {recentConversations.length > 0 ? (
              <div className="space-y-4">
                {recentConversations.map((conv) => (
                  <div 
                    key={conv.id}
                    onClick={() => handleSelectConversation(conv)}
                    className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition"
                  >
                    <div className="relative">
                      {conv.isGroup ? (
                        <div className="w-12 h-12 rounded-full bg-violet-500 flex items-center justify-center text-white text-xl">
                          👥
                        </div>
                      ) : (
                        <>
                          <img
                            src={`data:image/svg+xml;base64,${conv.avatarImage}`}
                            alt={conv.username}
                            className="w-12 h-12 rounded-full"
                          />
                          {conv.isOnline && (
                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-800"></div>
                          )}
                        </>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{conv.username}</h3>
                          {conv.isGroup && (
                            <span className="text-xs text-gray-500">({conv.memberCount} membres)</span>
                          )}
                        </div>
                        <span className="text-xs text-gray-500">
                          {new Date(conv.lastMessageTime).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                        {conv.lastMessage}
                      </p>
                    </div>
                    {conv.unreadCount > 0 && (
                      <span className="bg-violet-600 text-white text-xs px-2 py-1 rounded-full">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-8">
                Aucune conversation récente
              </p>
            )}
          </div>

          {/* Stats & Actions */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
              <h3 className="text-lg font-semibold mb-4">Actions rapides</h3>
              <div className="space-y-3">
                <button 
                  onClick={handleStartConversation}
                  className="w-full bg-violet-600 hover:bg-violet-700 text-white py-3 px-4 rounded-lg font-medium transition flex items-center justify-center gap-2"
                >
                  <i className="fas fa-plus"></i>
                  Nouvelle conversation
                </button>
                <button 
                  onClick={() => navigate("/contacts")}
                  className="w-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 py-3 px-4 rounded-lg font-medium transition flex items-center justify-center gap-2"
                >
                  <i className="fas fa-users"></i>
                  Voir les contacts
                </button>
              </div>
            </div>

            {/* Statistics */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
              <h3 className="text-lg font-semibold mb-4">Statistiques</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Messages totaux</span>
                  <span className="text-2xl font-bold text-violet-600">{stats.totalMessages}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Cette semaine</span>
                  <span className="text-xl font-semibold">{stats.messagesThisWeek}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Contacts actifs</span>
                  <span className="text-xl font-semibold">{stats.activeContacts}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Fichiers partagés</span>
                  <span className="text-xl font-semibold">{stats.filesShared}</span>
                </div>
              </div>
            </div>

            {/* Online Users */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
              <h3 className="text-lg font-semibold mb-4">
                En ligne maintenant ({onlineUserDetails.length})
              </h3>
              {onlineUserDetails.length > 0 ? (
                <div className="space-y-3">
                  {onlineUserDetails.slice(0, 5).map((user) => (
                    <div 
                      key={user.id}
                      onClick={() => handleSelectConversation(user)}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition"
                    >
                      <div className="relative">
                        <img
                          src={`data:image/svg+xml;base64,${user.avatarImage}`}
                          alt={user.username}
                          className="w-10 h-10 rounded-full"
                        />
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-800"></div>
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{user.username}</p>
                      </div>
                    </div>
                  ))}
                  {onlineUserDetails.length > 5 && (
                    <button 
                      onClick={() => navigate("/contacts")}
                      className="text-violet-600 hover:text-violet-700 text-sm font-medium"
                    >
                      Voir tous les contacts en ligne →
                    </button>
                  )}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">Aucun contact en ligne</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
