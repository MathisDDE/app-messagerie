import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { allUsersRoute, getAllMessagesRoute, host, getUserGroupsRoute, getGroupMessagesRoute } from "../utils/APIRoutes";
import useDarkMode from "../components/useDarkMode";
import { io } from "socket.io-client";
import authService from "../services/authService";

const ContactsPage = () => {
  const navigate = useNavigate();
  const socket = useRef();
  const [contacts, setContacts] = useState([]);
  const [groups, setGroups] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [darkMode] = useDarkMode();
  const [search, setSearch] = useState("");
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [activeTab, setActiveTab] = useState("all"); // "all", "contacts", "groups"

  // Style pour la barre de défilement
  const scrollbarStyles = `
    .contact-scrollbar::-webkit-scrollbar {
      width: 12px;
    }
    
    .contact-scrollbar::-webkit-scrollbar-track {
      background: ${darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'};
      border-radius: 10px;
      margin: 5px 0;
    }
    
    .contact-scrollbar::-webkit-scrollbar-thumb {
      background: ${darkMode 
        ? 'linear-gradient(180deg, rgba(139, 92, 246, 0.8) 0%, rgba(168, 85, 247, 0.8) 100%)' 
        : 'linear-gradient(180deg, rgba(139, 92, 246, 0.9) 0%, rgba(168, 85, 247, 0.9) 100%)'
      };
      border-radius: 10px;
      border: 2px solid ${darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'};
      box-shadow: 0 0 3px rgba(139, 92, 246, 0.3);
      transition: all 0.3s ease;
    }
    
    .contact-scrollbar::-webkit-scrollbar-thumb:hover {
      background: linear-gradient(180deg, rgba(139, 92, 246, 1) 0%, rgba(168, 85, 247, 1) 100%);
      border-color: ${darkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)'};
      box-shadow: 0 0 6px rgba(139, 92, 246, 0.5);
      transform: scale(1.05);
    }
    
    /* Firefox */
    .contact-scrollbar {
      scrollbar-width: thin;
      scrollbar-color: rgba(139, 92, 246, 0.8) ${darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'};
    }
    
    /* Ombre pour indiquer qu'il y a du contenu à faire défiler */
    .scroll-container {
      position: relative;
    }
    
    .scroll-container::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 30px;
      background: linear-gradient(to bottom, ${darkMode ? 'rgba(55, 65, 81, 0.8)' : 'rgba(243, 244, 246, 0.8)'} 0%, transparent 100%);
      z-index: 1;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.3s;
    }
    
    .scroll-container.has-scroll::before {
      opacity: 1;
    }
  `;

  useEffect(() => {
    const fetchCurrentUser = async () => {
      const storedUser = authService.getUser();
      if (!storedUser) {
        navigate("/login");
        return;
      }
      setCurrentUser(storedUser);
    };

    fetchCurrentUser();
  }, [navigate]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        // Récupérer les contacts
        const { data } = await axios.get(`${allUsersRoute}/${currentUser.id}`);
        const enrichedUsers = await Promise.all(
          data.map(async (contact) => {
            const { data: messages } = await axios.post(getAllMessagesRoute, {
              from: currentUser.id,
              to: contact.id,
            });
            const lastMessage = messages[messages.length - 1];
            
            // Formater la date du dernier message
            let timeDisplay = "--:--";
            if (lastMessage && lastMessage.createdAt) {
              const messageDate = new Date(lastMessage.createdAt);
              const today = new Date();
              const yesterday = new Date(today);
              yesterday.setDate(yesterday.getDate() - 1);
              
              if (messageDate.toDateString() === today.toDateString()) {
                // Aujourd'hui : afficher l'heure
                timeDisplay = messageDate.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                });
              } else if (messageDate.toDateString() === yesterday.toDateString()) {
                // Hier
                timeDisplay = "Hier";
              } else {
                // Autre date : afficher la date
                timeDisplay = messageDate.toLocaleDateString([], {
                  day: "2-digit",
                  month: "2-digit",
                });
              }
            }
            
            return {
              ...contact,
              lastMessage: lastMessage?.message || "Aucun message",
              time: timeDisplay,
              isGroup: false
            };
          })
        );
        setContacts(enrichedUsers);
        
        // Récupérer les groupes
        const { data: groupsData } = await axios.get(`${getUserGroupsRoute}/${currentUser.id}`);
        if (groupsData.status) {
          const enrichedGroups = await Promise.all(
            groupsData.groups.map(async (group) => {
              try {
                const { data: messagesData } = await axios.get(
                  `${getGroupMessagesRoute}/${group.id}/messages/${currentUser.id}`
                );
                const messages = messagesData.status ? messagesData.messages : [];
                const lastMessage = messages[messages.length - 1];
                
                // Formater la date
                let timeDisplay = "--:--";
                if (lastMessage && lastMessage.createdAt) {
                  const messageDate = new Date(lastMessage.createdAt);
                  const today = new Date();
                  const yesterday = new Date(today);
                  yesterday.setDate(yesterday.getDate() - 1);
                  
                  if (messageDate.toDateString() === today.toDateString()) {
                    timeDisplay = messageDate.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    });
                  } else if (messageDate.toDateString() === yesterday.toDateString()) {
                    timeDisplay = "Hier";
                  } else {
                    timeDisplay = messageDate.toLocaleDateString([], {
                      day: "2-digit",
                      month: "2-digit",
                    });
                  }
                }
                
                return {
                  id: group.id,
                  username: group.name,
                  avatarImage: null,
                  lastMessage: lastMessage ? 
                    `${lastMessage.sender.username}: ${lastMessage.message}` : 
                    "Aucun message",
                  time: timeDisplay,
                  isGroup: true,
                  memberCount: group.members.length,
                  members: group.members
                };
              } catch (error) {
                console.error(`Error fetching messages for group ${group.id}:`, error);
                return {
                  id: group.id,
                  username: group.name,
                  avatarImage: null,
                  lastMessage: "Aucun message",
                  time: "--:--",
                  isGroup: true,
                  memberCount: group.members.length,
                  members: group.members
                };
              }
            })
          );
          setGroups(enrichedGroups);
        }
      } catch (err) {
        console.error(err);
      }
    };

    fetchUsers();
  }, [currentUser]);

  // Socket.io connection
  useEffect(() => {
    if (currentUser) {
      socket.current = io(host, {
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
      });
      
      socket.current.emit("add-user", currentUser.id);
      
      // Gérer la reconnexion
      socket.current.on("connect", () => {
        console.log("Connected to server");
        socket.current.emit("add-user", currentUser.id);
        setIsConnected(true);
      });
      
      socket.current.on("disconnect", () => {
        console.log("Disconnected from server");
        setIsConnected(false);
      });
      
      // Écouter les mises à jour des utilisateurs en ligne
      socket.current.on("online-users", (users) => {
        setOnlineUsers(users);
      });
    }

    // Cleanup lors du démontage
    return () => {
      if (socket.current) {
        socket.current.disconnect();
      }
    };
  }, [currentUser]);

  const handleSelectContact = (contact) => {
    if (contact.isGroup) {
      const groupData = {
        id: contact.id,
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

  // Combiner et filtrer les contacts et groupes
  const allItems = [...contacts, ...groups];
  
  const getFilteredItems = () => {
    let items = [];
    
    if (activeTab === "all") {
      items = allItems;
    } else if (activeTab === "contacts") {
      items = contacts;
    } else if (activeTab === "groups") {
      items = groups;
    }
    
    return items.filter((item) =>
      item.username.toLowerCase().includes(search.toLowerCase())
    );
  };

  const filteredItems = getFilteredItems();

  return (
    <div className={`flex min-h-screen ${darkMode ? "bg-gray-900 text-white" : "bg-gray-50 text-gray-900"}`}>
      <style>{scrollbarStyles}</style>
      {/* Sidebar */}
      <div className="w-1/5 bg-violet-600 text-white flex flex-col items-center p-6">
        <h1 className="text-2xl font-bold flex items-center gap-2 mb-8">
          <span>🔒</span> SecureChat
        </h1>

        {currentUser && (
          <div className="flex flex-col items-center gap-1 mb-10">
            <img
              src={`data:image/svg+xml;base64,${currentUser.avatarImage}`}
              alt="User Avatar"
              className="w-20 h-20 rounded-full object-cover border-4 border-white"
            />
            <h2 className="text-lg font-semibold">{currentUser.username}</h2>
            <span className={`text-sm ${isConnected ? 'text-green-300' : 'text-gray-300'}`}>
              {isConnected ? 'En ligne' : 'Hors ligne'}
            </span>
          </div>
        )}

        {/* Navigation */}
        <div className="flex flex-col gap-4 w-full">
          <Link
            to="/home"
            className="flex items-center gap-3 p-3 rounded-xl hover:bg-violet-500 transition"
          >
            <i className="fas fa-home" /> Accueil
          </Link>
          <Link
            to="/contacts"
            className="flex items-center gap-3 p-3 rounded-xl bg-violet-500 transition"
          >
            <i className="fas fa-user" /> Contacts
          </Link>
          <Link
            to="/chat"
            className="flex items-center gap-3 p-3 rounded-xl hover:bg-violet-500 transition"
          >
            <i className="fas fa-comment" /> Messagerie
          </Link>
          <Link
            to="/settings"
            className="flex items-center gap-3 p-3 rounded-xl hover:bg-violet-500 transition"
          >
            <i className="fas fa-cog" /> Paramètres
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-10">
        <h1 className="text-3xl font-bold mb-6">Contacts</h1>

        {/* Tabs de filtrage */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setActiveTab("all")}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              activeTab === "all"
                ? "bg-violet-600 text-white"
                : "bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
            }`}
          >
            Tout ({allItems.length})
          </button>
          <button
            onClick={() => setActiveTab("contacts")}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              activeTab === "contacts"
                ? "bg-violet-600 text-white"
                : "bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
            }`}
          >
            Contacts ({contacts.length})
          </button>
          <button
            onClick={() => setActiveTab("groups")}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              activeTab === "groups"
                ? "bg-violet-600 text-white"
                : "bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
            }`}
          >
            Groupes ({groups.length})
          </button>
        </div>

        <div className="mb-6">
          <input
            type="text"
            placeholder={`Rechercher ${activeTab === 'groups' ? 'un groupe' : activeTab === 'contacts' ? 'un contact' : ''}...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-400 focus:outline-none transition"
          />
        </div>

        <div className="bg-gray-100 dark:bg-gray-800 rounded-xl p-2 shadow-inner relative">
          <div className="space-y-4 contact-scrollbar overflow-y-auto max-h-[calc(100vh-320px)] p-2">
            {filteredItems.map((item) => {
              const isOnline = !item.isGroup && onlineUsers.includes(item.id);
              
              return (
                <div
                  key={item.isGroup ? `group-${item.id}` : item.id}
                  onClick={() => handleSelectContact(item)}
                  className="cursor-pointer bg-white dark:bg-gray-700 shadow-md rounded-lg p-4 flex justify-between items-center hover:ring-2 hover:ring-violet-400 transition"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="relative">
                      {item.isGroup ? (
                        <div className="w-12 h-12 rounded-full bg-violet-500 flex items-center justify-center text-white text-xl">
                          👥
                        </div>
                      ) : (
                        <>
                          <img
                            src={`data:image/svg+xml;base64,${item.avatarImage}`}
                            alt="Avatar"
                            className="w-12 h-12 rounded-full"
                          />
                          {isOnline && (
                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-800"></div>
                          )}
                        </>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-900 dark:text-white">{item.username}</p>
                        {item.isGroup && (
                          <span className="text-xs text-gray-500">({item.memberCount} membres)</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                        {item.lastMessage === "FILE_ATTACHMENT" ? "📎 Fichier" : item.lastMessage}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end ml-4">
                    <span className="text-sm font-medium text-violet-600 dark:text-violet-400">
                      {item.time}
                    </span>
                  </div>
                </div>
              );
            })}
            
            {filteredItems.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                {search ? "Aucun résultat trouvé" : "Aucun élément à afficher"}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactsPage;