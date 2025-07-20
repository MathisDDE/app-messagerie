import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { IoArrowBack } from "react-icons/io5";
import Logo from "../assets/logo.svg";
import DefaultAvatar from "../assets/user-default.png";
import CreateGroup from "./CreateGroup";
import { getUserGroupsRoute } from "../utils/APIRoutes";
import useDarkMode from "./useDarkMode";

// Hook personnalisé pour le debouncing
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// Composant ContactItem avec lazy loading
const ContactItem = React.memo(({ contact, index, isSelected, onSelect, isOnline, darkMode }) => {
  const [isVisible, setIsVisible] = useState(false);
  const itemRef = useRef(null);
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      {
        threshold: 0.1,
        rootMargin: '50px'
      }
    );

    if (itemRef.current) {
      observer.observe(itemRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={itemRef}
      className={`
        flex items-center gap-3 p-3 rounded-lg cursor-pointer 
        transition-all duration-300 min-h-[4.5rem] w-full
        ${isSelected 
          ? "bg-violet-600 shadow-md text-white" 
          : darkMode ? "hover:bg-gray-700" : "hover:bg-gray-200"
        }
        ${!isVisible ? "opacity-0" : "opacity-100"}
      `}
      onClick={() => onSelect(index, contact, false)}
      style={{ transition: 'opacity 0.3s ease-in-out' }}
    >
      {isVisible ? (
        <>
          {/* Avatar Image avec lazy loading */}
          <div className="relative flex-shrink-0">
            <img
              src={contact?.isAvatarImageSet
                ? `data:image/svg+xml;base64,${contact?.avatarImage}`
                : DefaultAvatar}
              alt={`Avatar ${index + 1}`}
              className="w-12 h-12 rounded-full object-cover"
              loading="lazy"
            />
            {isOnline && (
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-800"></div>
            )}
          </div>

          {/* Avatar Username */}
          <div className="flex-1">
            <h3 className={`font-medium ${isSelected ? "text-white" : darkMode ? "text-gray-100" : "text-gray-800"}`}>{contact.username}</h3>
          </div>
        </>
      ) : (
        <div className="w-full h-12 bg-gray-700 animate-pulse rounded"></div>
      )}
    </div>
  );
});

// Composant GroupItem avec lazy loading
const GroupItem = React.memo(({ group, index, isSelected, onSelect, darkMode }) => {
  const [isVisible, setIsVisible] = useState(false);
  const itemRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      {
        threshold: 0.1,
        rootMargin: '50px'
      }
    );

    if (itemRef.current) {
      observer.observe(itemRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={itemRef}
      className={`
        flex items-center gap-3 p-3 rounded-lg cursor-pointer 
        transition-all duration-300 min-h-[4.5rem] w-full
        ${isSelected 
          ? "bg-violet-600 shadow-md text-white" 
          : darkMode ? "hover:bg-gray-700" : "hover:bg-gray-200"
        }
        ${!isVisible ? "opacity-0" : "opacity-100"}
      `}
      onClick={() => onSelect(index, group, true)}
      style={{ transition: 'opacity 0.3s ease-in-out' }}
    >
      {isVisible ? (
        <>
          {/* Group Avatar */}
          <div className="relative flex-shrink-0">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${darkMode ? "bg-gray-700" : "bg-gray-300"}`}>
              👥
            </div>
          </div>

          {/* Group Info */}
          <div className="flex-1">
            <h3 className={`font-medium ${isSelected ? "text-white" : darkMode ? "text-gray-100" : "text-gray-800"}`}>{group.name}</h3>
            <span className={`text-sm ${isSelected ? "text-gray-200" : darkMode ? "text-gray-400" : "text-gray-600"}`}>{group.members.length} membres</span>
          </div>
        </>
      ) : (
        <div className="w-full h-12 bg-gray-700 animate-pulse rounded"></div>
      )}
    </div>
  );
});

// Contacts
const Contacts = ({ contacts, currentUser, changeChat, onlineUsers = [], socket }) => {
  const navigate = useNavigate();
  const [currentUserName, setCurrentUserName] = useState(undefined);
  const [currentUserImage, setCurrentUserImage] = useState(undefined);
  const [currentSelected, setCurrentSelected] = useState(undefined);
  const [search, setSearch] = useState("");
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [groups, setGroups] = useState([]);
  const [activeTab, setActiveTab] = useState("contacts"); // "contacts" ou "groups"
  const [darkMode] = useDarkMode();
  
  // Debounce de la recherche pour améliorer les performances
  const debouncedSearch = useDebounce(search, 300);

  // Check if string is empty or contains whitespaces
  const isEmptyOrSpaces = useCallback((str) => {
    return /^\s*$/.test(str);
  }, []);

  // Check current user
  useEffect(() => {
    if (currentUser) {
      setCurrentUserImage(currentUser.avatarImage);
      setCurrentUserName(currentUser.username);
      fetchGroups();
    }
  }, [currentUser]);

  // Fetch user groups
  const fetchGroups = useCallback(async () => {
    if (!currentUser) return;
    
    try {
      const { data } = await axios.get(`${getUserGroupsRoute}/${currentUser.id}`);
      if (data.status) {
        setGroups(data.groups);
        // Rejoindre les rooms Socket.io des groupes
        if (socket.current) {
          const groupIds = data.groups.map(g => g.id);
          socket.current.emit("join-groups", groupIds);
        }
      }
    } catch (error) {
      console.error("Error fetching groups:", error);
    }
  }, [currentUser, socket]);

  // Filtrage optimisé avec mémorisation
  const filteredContacts = useMemo(() => {
    if (isEmptyOrSpaces(debouncedSearch)) {
      return activeTab === "contacts" ? contacts : groups;
    }

    const re = RegExp(
      `.*${debouncedSearch.toLowerCase().replace(/\s+/g, "").split("").join(".*")}.*`
    );
    
    const itemsToFilter = activeTab === "contacts" ? contacts : groups;
    return itemsToFilter.filter((item) => {
      const name = activeTab === "contacts" ? item.username : item.name;
      return name.toLowerCase().match(re);
    });
  }, [debouncedSearch, contacts, groups, activeTab, isEmptyOrSpaces]);

  // Change Current Chat
  const changeCurrentChat = useCallback((index, item, isGroup = false) => {
    setCurrentSelected(`${isGroup ? 'group' : 'contact'}-${index}`);
    changeChat({ ...item, isGroup });
  }, [changeChat]);

  const handleGroupCreated = useCallback((newGroup) => {
    setGroups(prev => [newGroup, ...prev]);
    // Rejoindre la room du nouveau groupe
    if (socket.current) {
      socket.current.emit("join-groups", [newGroup.id]);
    }
  }, [socket]);

  return (
    <>
      <style>{`
        .scrollbar-custom::-webkit-scrollbar {
          width: 10px;
        }
        
        .scrollbar-custom::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
          margin: 10px 0;
        }
        
        .scrollbar-custom::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, rgba(139, 92, 246, 0.6) 0%, rgba(168, 85, 247, 0.6) 100%);
          border-radius: 10px;
          border: 2px solid rgba(255, 255, 255, 0.1);
          transition: all 0.3s ease;
        }
        
        .scrollbar-custom::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(180deg, rgba(139, 92, 246, 0.9) 0%, rgba(168, 85, 247, 0.9) 100%);
          border-color: rgba(255, 255, 255, 0.2);
        }
        
        /* Firefox */
        .scrollbar-custom {
          scrollbar-width: thin;
          scrollbar-color: rgba(139, 92, 246, 0.6) rgba(255, 255, 255, 0.05);
        }
      `}</style>
      {currentUserImage && currentUserName && (
        <div className={`h-full flex flex-col ${darkMode ? "bg-gray-800" : "bg-gray-100"} border-r ${darkMode ? "border-gray-700" : "border-gray-200"}`}>
          {/* Brand Logo and Name - 10% */}
          <div className={`h-[10%] flex items-center justify-between px-4 border-b ${darkMode ? "border-gray-700 bg-gray-900" : "border-gray-200 bg-white"} shadow-sm`}>
            <button 
              onClick={() => navigate("/home")}
              className="
                p-2 md:p-2.5 rounded-full bg-violet-600 hover:bg-violet-700 
                text-white transition-all duration-300 flex items-center gap-2 
                shadow-md hover:shadow-lg transform hover:scale-105 active:scale-95
                focus:outline-none focus:ring-2 focus:ring-violet-400
              "
              title="Retour à l'accueil"
              aria-label="Retour à la page d'accueil"
            >
              <IoArrowBack className="text-lg md:text-xl" />
              <span className="hidden lg:block text-sm font-medium">Retour</span>
            </button>
            <h3 className={`text-xl font-bold uppercase flex items-center gap-2 ${darkMode ? "text-white" : "text-gray-800"}`}>
              <img src={Logo} alt="logo" className="h-8 w-8" />
              Securechat
            </h3>
            <div className="w-20 lg:w-28"></div> {/* Spacer pour équilibrer */}
          </div>

          {/* Tabs - 8% */}
          <div className="h-[8%] flex justify-center items-center gap-2 px-4">
            <button 
              className={`
                flex-1 py-2 px-4 rounded-lg font-medium 
                transition-all duration-300
                ${activeTab === "contacts" 
                  ? "bg-violet-600 text-white shadow-md" 
                  : darkMode 
                    ? "bg-gray-700 text-gray-300 hover:bg-gray-600" 
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }
              `}
              onClick={() => setActiveTab("contacts")}
            >
              Contacts
            </button>
            <button 
              className={`
                flex-1 py-2 px-4 rounded-lg font-medium 
                transition-all duration-300
                ${activeTab === "groups" 
                  ? "bg-violet-600 text-white shadow-md" 
                  : darkMode 
                    ? "bg-gray-700 text-gray-300 hover:bg-gray-600" 
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }
              `}
              onClick={() => setActiveTab("groups")}
            >
              Groupes
            </button>
          </div>

          {/* Content Area - 67% */}
          <div className="h-[67%] overflow-hidden">
            <div className="h-full flex flex-col overflow-y-auto gap-3 px-4 py-4 scrollbar-custom relative">
              {/* Search Bar */}
              <div className={`w-full h-10 rounded-full flex items-center px-4 flex-shrink-0 sticky top-0 z-10 shadow-sm ${darkMode ? "bg-gray-700" : "bg-white border border-gray-300"}`}>
                <input
                  type="text"
                  placeholder={activeTab === "contacts" ? "Rechercher des contacts" : "Rechercher des groupes"}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className={`bg-transparent border-none flex-1 text-sm placeholder-gray-500 focus:outline-none ${darkMode ? "text-white" : "text-gray-900"}`}
                />
              </div>

              {/* Create Group Button (only in groups tab) */}
              {activeTab === "groups" && (
                <button 
                  className="w-full py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-medium transition-all duration-300 flex items-center justify-center gap-2 flex-shrink-0 shadow-md hover:shadow-lg"
                  onClick={() => setShowCreateGroup(true)}
                >
                  <span className="text-xl">+</span> Créer un groupe
                </button>
              )}

              {/* Show Items based on active tab with lazy loading */}
              {activeTab === "contacts" ? (
                filteredContacts.length > 0 ? (
                  filteredContacts.map((contact, i) => (
                    <ContactItem
                      key={`contact-${contact.id || i}`}
                      contact={contact}
                      index={i}
                      isSelected={`contact-${i}` === currentSelected}
                      onSelect={changeCurrentChat}
                      isOnline={onlineUsers.includes(contact.id)}
                      darkMode={darkMode}
                    />
                  ))
                ) : (
                  <p className={`${darkMode ? "text-gray-400" : "text-gray-600"}`}>Aucun contact trouvé.</p>
                )
              ) : (
                filteredContacts.length > 0 ? (
                  filteredContacts.map((group, i) => (
                    <GroupItem
                      key={`group-${group.id || i}`}
                      group={group}
                      index={i}
                      isSelected={`group-${i}` === currentSelected}
                      onSelect={changeCurrentChat}
                      darkMode={darkMode}
                    />
                  ))
                ) : (
                  <p className={`${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                    {groups.length === 0 && isEmptyOrSpaces(search) 
                      ? "Aucun groupe" 
                      : "Aucun groupe trouvé."}
                  </p>
                )
              )}
            </div>
          </div>

          {/* Current User Info - 15% */}
          <div className={`h-[15%] flex justify-center items-center gap-4 px-4 border-t ${darkMode ? "bg-gray-900 border-gray-700" : "bg-white border-gray-200"} shadow-lg`}>
            <div className="flex-shrink-0">
              <img
                src={`data:image/svg+xml;base64,${currentUserImage}`}
                alt={`${currentUserName}'s Avatar`}
                className="h-14 max-w-full rounded-full"
              />
            </div>

            <div className="flex-1">
              <h2 className={`text-lg font-semibold truncate ${darkMode ? "text-white" : "text-gray-800"}`}>{currentUserName}</h2>
            </div>
          </div>

          {/* Create Group Modal */}
          <CreateGroup
            isOpen={showCreateGroup}
            onClose={() => setShowCreateGroup(false)}
            currentUser={currentUser}
            onGroupCreated={handleGroupCreated}
          />
        </div>
      )}
    </>
  );
};

export default Contacts;




