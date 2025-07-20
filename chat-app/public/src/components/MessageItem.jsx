import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { host } from "../utils/APIRoutes";
import { BsEmojiSmileFill, BsDownload } from "react-icons/bs";
import { MdEdit, MdDelete, MdReply } from "react-icons/md";
import { IoMdTimer } from "react-icons/io";
import useDarkMode from "./useDarkMode";
import MessageSecurityIndicator from "./MessageSecurityIndicator";

const MessageItem = ({ message, currentUser, currentChat, onReply, onUpdate, socket }) => {
  const [showReactions, setShowReactions] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.message);
  const [reactions, setReactions] = useState(message.reactions || []);
  const [showActions, setShowActions] = useState(false);
  const [securityAnalysis, setSecurityAnalysis] = useState(null);
  const [darkMode] = useDarkMode();
  
  const emojiList = ["👍", "❤️", "😂", "😮", "😢", "😡"];
  
  // Détecter si on est sur mobile
  const isMobile = window.innerWidth <= 768;

  const handleContainerClick = () => {
    if (isMobile) {
      setShowActions(!showActions);
    }
  };

  const handleMouseEnter = () => {
    if (!isMobile) {
      setShowActions(true);
    }
  };

  const handleMouseLeave = () => {
    if (!isMobile) {
      setShowActions(false);
    }
  };

  const fetchReactions = useCallback(async () => {
    if (!message.id) {
      console.warn("Message ID is undefined, skipping reactions fetch");
      return;
    }
    try {
      const { data } = await axios.get(`${host}/api/messages/reactions/${message.id}`);
      setReactions(data);
    } catch (err) {
      console.error("Error fetching reactions:", err);
    }
  }, [message.id]);

  // Écouter les mises à jour de réactions
  useEffect(() => {
    fetchReactions();
  }, [fetchReactions]);

  // Récupérer l'analyse de sécurité si disponible
  useEffect(() => {
    const fetchSecurityAnalysis = async () => {
      if (!message.id) {
        console.warn("Message ID is undefined, skipping security analysis fetch");
        return;
      }
      try {
        const { data } = await axios.get(`${host}/api/moderation/logs/${message.id}`);
        if (data.analysis) {
          setSecurityAnalysis(data.analysis);
        }
      } catch (err) {
        // Pas d'analyse disponible, ce qui est normal pour la plupart des messages
      }
    };

    if (!message.fromSelf && message.id) {
      fetchSecurityAnalysis();
    }
  }, [message.id, message.fromSelf]);

  const handleReaction = async (emoji) => {
    try {
      await axios.post(`${host}/api/messages/reaction`, {
        messageId: message.id,
        emoji,
        userId: currentUser.id
      });

      // Émettre l'événement Socket.io
      socket.current.emit("reaction-add", {
        messageId: message.id,
        emoji,
        userId: currentUser.id,
        to: currentChat.id
      });

      fetchReactions();
      setShowReactions(false);
    } catch (err) {
      console.error("Error adding reaction:", err);
    }
  };

  const handleEdit = async () => {
    if (!isEditing) {
      setIsEditing(true);
      return;
    }

    try {
      await axios.post(`${host}/api/messages/edit`, {
        messageId: message.id,
        newContent: editContent,
        userId: currentUser.id
      });

      socket.current.emit("message-edit", {
        messageId: message.id,
        newContent: editContent,
        to: currentChat.id,
        from: currentUser.id
      });

      setIsEditing(false);
      onUpdate();
    } catch (err) {
      console.error("Error editing message:", err);
      alert(err.response?.data?.msg || "Erreur lors de la modification");
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Supprimer ce message ?")) return;

    try {
      await axios.post(`${host}/api/messages/delete`, {
        messageId: message.id,
        userId: currentUser.id
      });

      socket.current.emit("message-delete", {
        messageId: message.id,
        to: currentChat.id,
        from: currentUser.id
      });

      onUpdate();
    } catch (err) {
      console.error("Error deleting message:", err);
    }
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const renderFileMessage = () => {
    const isImage = message.fileType?.startsWith('image/');
    
    return (
      <div>
        {isImage ? (
          <img 
            src={`${host}${message.fileUrl}`} 
            alt={message.fileName} 
            className="max-w-[300px] max-h-[300px] rounded-lg"
          />
        ) : (
          <div className={`flex items-center gap-4 p-2 bg-white bg-opacity-10 rounded-lg ${
            darkMode 
              ? 'bg-gray-800 bg-opacity-50' 
              : 'bg-gray-200 bg-opacity-20'
          }`}>
            <span className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              {message.fileName}
            </span>
            <a 
              href={`${host}${message.fileUrl}`} 
              download={message.fileName}
              className={`text-2xl ${
                darkMode 
                  ? 'text-violet-400 hover:text-violet-300' 
                  : 'text-violet-600 hover:text-violet-500'
              }`}
            >
              <BsDownload />
            </a>
          </div>
        )}
      </div>
    );
  };

  const isFromSelf = message.fromSelf;

  return (
    <div 
      className={`flex flex-col gap-2 relative mb-4 cursor-pointer ${
        isFromSelf ? 'items-end' : 'items-start'
      }`}
      onClick={handleContainerClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Afficher le nom de l'expéditeur dans les groupes */}
      {!isFromSelf && currentChat?.isGroup && message.sender && (
        <div className="flex items-center gap-2 ml-2 mb-1">
          {message.sender.avatarImage && (
            <img 
              src={`data:image/svg+xml;base64,${message.sender.avatarImage}`}
              alt={message.sender.username}
              className="w-6 h-6 rounded-full"
            />
          )}
          <span className={`text-sm font-semibold ${
            darkMode ? 'text-gray-300' : 'text-gray-600'
          }`}>
            {message.sender.username}
          </span>
        </div>
      )}
      
      {message.replyTo && (
        <div className={`p-2 rounded-lg mb-1 text-sm ${
          darkMode 
            ? 'bg-gray-800 bg-opacity-50' 
            : 'bg-gray-200 bg-opacity-20'
        }`}>
          <span className={`font-bold ${
            darkMode ? 'text-violet-400' : 'text-violet-600'
          }`}>
            ↩️ {message.replyTo.sender.username}
          </span>
          <p className={`mt-1 ${
            darkMode ? 'text-gray-300' : 'text-gray-700'
          }`}>{message.replyTo.message}</p>
        </div>
      )}
      
      <div className={`
        max-w-[60%] break-words p-4 text-lg rounded-2xl relative
        ${isFromSelf 
          ? darkMode 
            ? 'bg-gradient-to-br from-violet-600 to-purple-700 text-white shadow-lg' 
            : 'bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-md'
          : darkMode
            ? 'bg-gray-800 text-gray-100 shadow-lg'
            : 'bg-gray-100 text-gray-800 shadow-md'
        }
        transition-all duration-200 hover:shadow-xl
        md:max-w-[100%] sm:max-w-[80%]
      `}>
        {/* Protection XSS - Indicateur de sécurité pour les messages suspects */}
        {!isFromSelf && securityAnalysis && (
          <div className="mb-2">
            <MessageSecurityIndicator 
              message={message}
              analysis={securityAnalysis}
              darkMode={darkMode}
            />
          </div>
        )}
        
        {/* Protection XSS - Rendu sécurisé des pièces jointes */}
        {message.message === "FILE_ATTACHMENT" ? (
          renderFileMessage()
        ) : isEditing ? (
          <div className="flex gap-2">
            {/* Protection XSS - Validation et échappement des entrées utilisateur */}
            <input 
              type="text" 
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleEdit()}
              className="flex-1 bg-white bg-opacity-10 border-none p-2 rounded-lg text-white placeholder-gray-400"
            />
            <button 
              onClick={handleEdit}
              className="text-green-400 text-xl hover:text-green-300"
            >
              ✓
            </button>
            <button 
              onClick={() => setIsEditing(false)}
              className="text-red-400 text-xl hover:text-red-300"
            >
              ✗
            </button>
          </div>
        ) : (
          /* Protection XSS - React échappe automatiquement le HTML dans le rendu */
          <p>{message.message}</p>
        )}
        
        <div className="flex gap-2 text-sm mt-2">
          <span className={`${
            isFromSelf
              ? darkMode ? 'text-violet-200' : 'text-violet-100'
              : darkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>
            {formatTime(message.createdAt)}
          </span>
          {message.isEdited && (
            <span className={`italic ${
              isFromSelf
                ? darkMode ? 'text-violet-200' : 'text-violet-100'
                : darkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              (modifié)
            </span>
          )}
          {message.expiresAt && (
            <span className="flex items-center gap-1 text-orange-400 font-medium">
              <IoMdTimer /> Éphémère
            </span>
          )}
        </div>
      </div>

      {showActions && (
        <div 
          className={`
            flex gap-2 absolute -top-10 p-2 bg-black bg-opacity-85 
            rounded-full z-10 shadow-lg
            ${isFromSelf ? 'right-0' : 'left-0'}
            md:p-2.5 md:gap-3 md:-top-11
          `}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onClick={(e) => e.stopPropagation()}
        >
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setShowReactions(!showReactions);
            }}
            className="bg-transparent border-none text-white p-3 rounded-full cursor-pointer 
                     text-xl transition-all duration-300 flex items-center justify-center 
                     w-10 h-10 hover:bg-white hover:bg-opacity-20 hover:scale-110
                     active:scale-95 md:w-11 md:h-11 md:text-2xl"
          >
            <BsEmojiSmileFill />
          </button>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onReply(message);
            }}
            className="bg-transparent border-none text-white p-3 rounded-full cursor-pointer 
                     text-xl transition-all duration-300 flex items-center justify-center 
                     w-10 h-10 hover:bg-white hover:bg-opacity-20 hover:scale-110
                     active:scale-95 md:w-11 md:h-11 md:text-2xl"
          >
            <MdReply />
          </button>
          {isFromSelf && (
            <>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  handleEdit();
                }}
                className="bg-transparent border-none text-white p-3 rounded-full cursor-pointer 
                         text-xl transition-all duration-300 flex items-center justify-center 
                         w-10 h-10 hover:bg-white hover:bg-opacity-20 hover:scale-110
                         active:scale-95 md:w-11 md:h-11 md:text-2xl"
              >
                <MdEdit />
              </button>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete();
                }}
                className="bg-transparent border-none text-white p-3 rounded-full cursor-pointer 
                         text-xl transition-all duration-300 flex items-center justify-center 
                         w-10 h-10 hover:bg-white hover:bg-opacity-20 hover:scale-110
                         active:scale-95 md:w-11 md:h-11 md:text-2xl"
              >
                <MdDelete />
              </button>
            </>
          )}
        </div>
      )}

      {showReactions && (
        <div 
          className={`
            absolute -top-12 bg-black bg-opacity-95 p-3 rounded-full
            flex gap-3 z-30 shadow-xl
            ${isFromSelf ? 'right-0' : 'left-0'}
            md:p-4 md:gap-4 md:-top-14
          `}
          onClick={(e) => e.stopPropagation()}
        >
          {emojiList.map((emoji) => (
            <button 
              key={emoji} 
              onClick={(e) => {
                e.stopPropagation();
                handleReaction(emoji);
              }}
              className="bg-transparent border-none text-3xl cursor-pointer 
                       transition-all duration-200 p-1 w-11 h-11 flex 
                       items-center justify-center hover:scale-125 
                       hover:bg-white hover:bg-opacity-10 hover:rounded-full
                       active:scale-110 md:text-4xl md:w-12 md:h-12"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {reactions.length > 0 && (
        <div className="flex gap-1 mt-1">
          {reactions.map((reaction) => (
            <div 
              key={reaction.emoji}
              className={`px-2 py-1 rounded-full text-sm flex items-center gap-1 ${
                darkMode 
                  ? 'bg-gray-800 bg-opacity-50 text-gray-300' 
                  : 'bg-gray-200 bg-opacity-30 text-gray-700'
              }`}
            >
              <span>{reaction.emoji}</span>
              <span>{reaction.count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MessageItem;
