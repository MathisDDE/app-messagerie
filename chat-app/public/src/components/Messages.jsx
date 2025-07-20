import React, { useState, useEffect, useRef, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import MessageItem from "./MessageItem";
import useDarkMode from "./useDarkMode";

// Messages avec lazy loading et virtualisation
const Messages = ({ messages, scrollRef, currentUser, currentChat, socket, onReply, onUpdate }) => {
  const [darkMode] = useDarkMode();
  const [visibleMessages, setVisibleMessages] = useState([]);
  const [loadedCount, setLoadedCount] = useState(20); // Charger 20 messages initialement
  const observerRef = useRef(null);
  const loadMoreRef = useRef(null);
  const containerRef = useRef(null);
  
  // Configuration pour le lazy loading
  const MESSAGES_PER_LOAD = 20;
  const RENDER_BUFFER = 5; // Messages supplémentaires à rendre en dehors de la vue
  
  // Charger plus de messages lorsque l'utilisateur fait défiler vers le haut
  const loadMoreMessages = useCallback(() => {
    if (loadedCount < messages.length) {
      setLoadedCount(prev => Math.min(prev + MESSAGES_PER_LOAD, messages.length));
    }
  }, [loadedCount, messages.length]);
  
  // Configurer l'Intersection Observer pour le lazy loading
  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }
    
    observerRef.current = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          loadMoreMessages();
        }
      },
      {
        root: containerRef.current,
        rootMargin: '100px',
        threshold: 0.1
      }
    );
    
    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }
    
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [loadMoreMessages]);
  
  // Mettre à jour les messages visibles lorsque les messages changent
  useEffect(() => {
    // Prendre les derniers messages selon loadedCount
    const startIndex = Math.max(0, messages.length - loadedCount);
    const newVisibleMessages = messages.slice(startIndex);
    setVisibleMessages(newVisibleMessages);
  }, [messages, loadedCount]);
  
  // Réinitialiser le compteur lors du changement de chat
  useEffect(() => {
    setLoadedCount(20);
  }, [currentChat]);
  
  // Composant pour afficher l'indicateur de chargement
  const LoadMoreIndicator = () => {
    if (messages.length <= loadedCount) return null;
    
    return (
      <div 
        ref={loadMoreRef}
        className="flex justify-center py-4"
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 border-4 border-violet-200 dark:border-violet-800 border-t-violet-600 dark:border-t-violet-400 rounded-full animate-spin"></div>
          <span className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
            Chargement des messages précédents...
          </span>
        </div>
      </div>
    );
  };
  
  // Composant optimisé pour chaque message
  const MemoizedMessageItem = React.memo(MessageItem, (prevProps, nextProps) => {
    return (
      prevProps.message.id === nextProps.message.id &&
      prevProps.message.message === nextProps.message.message &&
      prevProps.message.reactions === nextProps.message.reactions &&
      prevProps.message.isEdited === nextProps.message.isEdited &&
      prevProps.message.isDeleted === nextProps.message.isDeleted
    );
  });
  
  return (
    <>
      <style>{`
        .messages-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        
        .messages-scrollbar::-webkit-scrollbar-track {
          background: ${darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'};
          border-radius: 10px;
        }
        
        .messages-scrollbar::-webkit-scrollbar-thumb {
          background: ${darkMode ? 'rgba(139, 92, 246, 0.3)' : 'rgba(139, 92, 246, 0.5)'};
          border-radius: 10px;
          transition: background 0.3s;
        }
        
        .messages-scrollbar::-webkit-scrollbar-thumb:hover {
          background: ${darkMode ? 'rgba(139, 92, 246, 0.5)' : 'rgba(139, 92, 246, 0.7)'};
        }
        
        /* Firefox */
        .messages-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: ${darkMode ? 'rgba(139, 92, 246, 0.3)' : 'rgba(139, 92, 246, 0.5)'} ${darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'};
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .highlight-message {
          animation: highlight 2s ease-in-out;
        }
        
        @keyframes highlight {
          0%, 100% { background-color: transparent; }
          50% { background-color: ${darkMode ? 'rgba(139, 92, 246, 0.2)' : 'rgba(139, 92, 246, 0.1)'}; }
        }
      `}</style>
      
      <div 
        ref={containerRef}
        className={`
          h-full 
          px-3 md:px-6 py-4 
          flex flex-col gap-2 md:gap-3 
          overflow-y-auto overflow-x-hidden
          messages-scrollbar
          ${darkMode ? "bg-gray-900" : "bg-white"} 
          relative
        `}
        style={{ scrollBehavior: 'smooth' }}
      >
        {/* Indicateur de chargement en haut */}
        <LoadMoreIndicator />
        
        {/* Messages visibles */}
        {visibleMessages.map((message, index) => {
          const isLastMessage = index === visibleMessages.length - 1;
          
          return (
            <div 
              ref={isLastMessage ? scrollRef : null} 
              key={`${message.id || uuidv4()}-${index}`}
              className="w-full"
            >
              <div
                id={`message-${message.id}`}
                className={`
                  message 
                  ${message.fromSelf ? "sended" : "received"} 
                  transition-all duration-300
                `}
                style={{ 
                  opacity: 1,
                  animation: 'fadeIn 0.3s ease-in-out'
                }}
              >
                <MemoizedMessageItem
                  message={message}
                  currentUser={currentUser}
                  currentChat={currentChat}
                  socket={socket}
                  onReply={onReply}
                  onUpdate={onUpdate}
                />
              </div>
            </div>
          );
        })}
        
        {/* Message si aucun message */}
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <p className={`text-base md:text-lg text-center px-4 ${darkMode ? "text-gray-500" : "text-gray-400"}`}>
              Aucun message pour le moment.<br className="md:hidden" /> Commencez la conversation !
            </p>
          </div>
        )}
      </div>
    </>
  );
};

export default Messages;
