import React, { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import Logout from "./Logout";
import DefaultAvatar from "../assets/user-default.png";
import ChatInput from "./ChatInput";
import Messages from "./Messages";
import ExportModal from "./ExportModal";
import SearchMessages from "./SearchMessages";
import { getAllMessagesRoute, sendMessageRoute, host } from "../utils/APIRoutes";
import useDarkMode from "./useDarkMode";

// Chat Container
const ChatContainer = ({ currentChat, currentUser, socket }) => {
  const [messages, setMessages] = useState([]);
  const [replyingTo, setReplyingTo] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const scrollRef = useRef();
  const [darkMode] = useDarkMode();

  // fetch all messages
  const fetchAllMessages = useCallback(async () => {
    if (!currentUser?.id || !currentChat?.id) return;
    
    const response = await axios.post(getAllMessagesRoute, {
      from: currentUser.id,
      to: currentChat.id,
    });

    setMessages(response?.data);
  }, [currentUser, currentChat]);

  useEffect(() => {
    fetchAllMessages();
  }, [fetchAllMessages]);

  // socket.io message recieve
  useEffect(() => {
    const socketRef = socket.current;
    
    if (socketRef) {
      socketRef.on("msg-recieve", (data) => {
        // Vérifier que le message provient de la personne avec qui on discute actuellement
        if (data.from === currentChat?.id) {
          // Au lieu d'ajouter le message directement, recharger tous les messages
          // pour obtenir l'ID correct depuis la base de données
          fetchAllMessages();
          
          // Jouer un son de notification simple
          try {
            const audio = new Audio();
            audio.src = 'data:audio/mpeg;base64,SUQzBAAAAAABEVRYWFgAAAAtAAADY29tbWVudABCaWdTb3VuZEJhbmsuY29tIC8gTGFTb25vdGhlcXVlLm9yZwBURU5DAAAAHQAAA1N3aXRjaCBQbHVzIMKpIE5DSCBTb2Z0d2FyZQBUSVQyAAAABgAAAzIyMzUAVFNTRQAAAA8AAANMYXZmNTcuODMuMTAwAAAAAAAAAAAAAAD/80DEAAAAA0gAAAAATEFNRTMuMTAwVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQsRbAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQMSkAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV';
            audio.volume = 0.5;
            audio.play().catch(e => console.log('Notification sound failed'));
          } catch (e) {
            console.log('Audio notification not supported');
          }
        }
      });

      // Indicateur de frappe
      socketRef.on("user-typing", (data) => {
        if (data.from === currentChat?.id) {
          setIsTyping(true);
        }
      });

      socketRef.on("user-stop-typing", (data) => {
        if (data.from === currentChat?.id) {
          setIsTyping(false);
        }
      });

      // Écouter les mises à jour en temps réel
      socketRef.on("reaction-update", () => {
        fetchAllMessages();
      });

      socketRef.on("message-edited", () => {
        fetchAllMessages();
      });

      socketRef.on("message-deleted", () => {
        fetchAllMessages();
      });

      socketRef.on("file-received", (data) => {
        if (data.from === currentChat?.id) {
          fetchAllMessages();
        }
      });
    }

    // Cleanup function pour éviter les listeners multiples
    return () => {
      if (socketRef) {
        socketRef.off("msg-recieve");
        socketRef.off("user-typing");
        socketRef.off("user-stop-typing");
        socketRef.off("reaction-update");
        socketRef.off("message-edited");
        socketRef.off("message-deleted");
        socketRef.off("file-received");
      }
    };
  }, [currentChat, socket, fetchAllMessages]); // Ajouter fetchAllMessages dans les dépendances



  // change scroll to latest message
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behaviour: "smooth" });
  }, [messages]);

  // Handle Send Messages
  const handleSendMsg = async (msg, isEphemeral = false, expiresInMinutes = 5) => {
    const endpoint = isEphemeral ? `${host}/api/messages/ephemeral` : sendMessageRoute;
    const payload = {
      from: currentUser.id,
      to: currentChat.id,
      message: msg,
      ...(isEphemeral && { expiresInMinutes }),
      ...(replyingTo && { replyToId: replyingTo.id })
    };

    try {
      const response = await axios.post(replyingTo ? `${host}/api/messages/reply` : endpoint, payload);
      
      // Vérifier si le message a été bloqué
      if (response.data.blocked) {
        // Message bloqué, afficher l'alerte
        alert(`🛑 Message bloqué pour des raisons de sécurité\n\nScore de risque: ${response.data.analysis.riskScore}/100\n\nProblèmes détectés:\n${response.data.analysis.detectedIssues.join('\n')}\n\nConseils:\n${response.data.securityTips.join('\n')}`);
        return;
      }
      
      // Vérifier si il y a un avertissement
      if (response.data.warning) {
        const confirmSend = window.confirm(`⚠️ Message suspect détecté\n\nScore de risque: ${response.data.analysis.riskScore}/100\n\nProblèmes détectés:\n${response.data.analysis.detectedIssues.join('\n')}\n\nVoulez-vous vraiment envoyer ce message ?`);
        
        if (!confirmSend) {
          return;
        }
      }

      // socket.io send msg
      socket.current.emit("send-msg", {
        to: currentChat.id,
        from: currentUser.id,
        message: msg,
      });

      // Rafraîchir les messages pour afficher la réponse
      fetchAllMessages();
      setReplyingTo(null);
    } catch (error) {
      if (error.response && error.response.status === 403) {
        // Message bloqué par la modération
        alert(`🛑 ${error.response.data.msg}\n\nScore de risque: ${error.response.data.analysis.riskScore}/100\n\nProblèmes détectés:\n${error.response.data.analysis.detectedIssues.join('\n')}`);
      } else {
        console.error("Erreur lors de l'envoi du message:", error);
        alert("Erreur lors de l'envoi du message");
      }
    }
  };

  // Handle file upload
  const handleFileUpload = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('from', currentUser.id);
    formData.append('to', currentChat.id);

    try {
      const { data } = await axios.post(`${host}/api/messages/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      socket.current.emit("file-uploaded", {
        to: currentChat.id,
        from: currentUser.id,
        message: data.message
      });

      fetchAllMessages();
    } catch (err) {
      console.error("Error uploading file:", err);
      alert("Erreur lors de l'upload du fichier");
    }
  };

  const handleReply = (message) => {
    setReplyingTo(message);
  };

  const handleSelectSearchMessage = (message) => {
    // Faire défiler jusqu'au message trouvé
    const messageElement = document.getElementById(`message-${message.id}`);
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Mettre en surbrillance temporairement
      messageElement.classList.add('highlight-message');
      setTimeout(() => {
        messageElement.classList.remove('highlight-message');
      }, 2000);
    }
  };

  // Raccourci clavier pour ouvrir la recherche
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        setShowSearchModal(true);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className={`h-full flex flex-col overflow-hidden ${darkMode ? "bg-gray-900" : "bg-white"}`}>
      {/* Header - Fixed height */}
      <div className={`
        flex-shrink-0 h-16 md:h-20
        flex justify-between items-center 
        px-4 md:px-6 
        border-b ${darkMode ? "border-gray-700 bg-gray-800" : "border-gray-200 bg-gray-50"} 
        shadow-sm
      `}>
        <div className="flex items-center gap-3 md:gap-4 min-w-0">
          {/* Back button on mobile */}
          <button 
            onClick={() => window.history.back()}
            className={`
              md:hidden p-2 rounded-full
              ${darkMode ? "hover:bg-gray-700 text-gray-300" : "hover:bg-gray-100 text-gray-600"}
            `}
          >
            <i className="fas fa-arrow-left"></i>
          </button>
          
          <div className="relative flex-shrink-0">
            <img
              src={`${
                currentChat?.isAvatarImageSet
                  ? `data:image/svg+xml;base64,${currentChat?.avatarImage}`
                  : DefaultAvatar
              }`}
              alt={`${currentChat?.username}'s Avatar`}
              className="w-10 h-10 md:w-12 md:h-12 rounded-full"
            />
            {currentChat?.isOnline && (
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-800"></div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className={`text-base md:text-lg font-semibold truncate ${darkMode ? "text-white" : "text-gray-900"}`}>
              {currentChat?.username}
            </h3>
            {isTyping ? (
              <span className="text-blue-400 text-xs md:text-sm italic">est en train d'écrire...</span>
            ) : currentChat?.isOnline ? (
              <span className="text-green-500 text-xs md:text-sm">En ligne</span>
            ) : (
              <span className="text-gray-500 text-xs md:text-sm">Hors ligne</span>
            )}
          </div>
        </div>
        <div className="flex gap-1 md:gap-2 flex-shrink-0">
          <button 
            onClick={() => setShowSearchModal(true)}
            className={`p-2 md:p-2.5 rounded-full transition-all ${darkMode ? "hover:bg-gray-700 text-gray-300" : "hover:bg-gray-100 text-gray-600"}`}
            title="Rechercher (Ctrl+F)"
          >
            <i className="fas fa-search text-base md:text-lg"></i>
          </button>
          <button 
            onClick={() => setShowExportModal(true)}
            className={`p-2 md:p-2.5 rounded-full transition-all ${darkMode ? "hover:bg-gray-700 text-gray-300" : "hover:bg-gray-100 text-gray-600"}`}
            title="Exporter la conversation"
          >
            <i className="fas fa-download text-base md:text-lg"></i>
          </button>
        </div>
      </div>
      
      {/* Messages Area - Flexible height */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <Messages 
          messages={messages}
          currentUser={currentUser}
          currentChat={currentChat}
          socket={socket}
          setMessages={setMessages}
          scrollRef={scrollRef}
          onReply={handleReply}
          onUpdate={fetchAllMessages}
        />
      </div>

      {/* Typing indicator - Fixed height when visible */}
      {isTyping && (
        <div className={`
          flex-shrink-0 h-12
          flex items-center gap-2 px-4 md:px-6 
          ${darkMode ? "bg-gray-800" : "bg-gray-50"} 
          border-t ${darkMode ? "border-gray-700" : "border-gray-200"}
        `}>
          <div className="flex gap-1">
            <span className="w-2 h-2 bg-violet-600 rounded-full animate-bounce" style={{animationDelay: '-0.32s'}}></span>
            <span className="w-2 h-2 bg-violet-600 rounded-full animate-bounce" style={{animationDelay: '-0.16s'}}></span>
            <span className="w-2 h-2 bg-violet-600 rounded-full animate-bounce"></span>
          </div>
          <span className="text-gray-500 text-xs md:text-sm">{currentChat?.username} est en train d'écrire...</span>
        </div>
      )}

      {/* Input Area - Fixed height */}
      <div className={`
        flex-shrink-0
        border-t ${darkMode ? "border-gray-700" : "border-gray-200"}
      `}>
        <ChatInput 
          handleSendMsg={handleSendMsg} 
          handleFileUpload={handleFileUpload}
          replyingTo={replyingTo}
          onCancelReply={() => setReplyingTo(null)}
          currentChat={currentChat}
          socket={socket}
          currentUser={currentUser}
        />
      </div>
      
      <ExportModal 
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        darkMode={darkMode}
        currentUser={currentUser}
        currentChat={currentChat}
      />
      
      <SearchMessages
        isOpen={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        currentUser={currentUser}
        currentChat={currentChat}
        onSelectMessage={handleSelectSearchMessage}
      />
    </div>
  );
};

export default ChatContainer;

