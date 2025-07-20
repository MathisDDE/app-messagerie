import React, { useState } from "react";
import Picker from "emoji-picker-react";
import { IoMdSend } from "react-icons/io";
import { BsEmojiSmileFill } from "react-icons/bs";
import { MdAttachFile, MdClose, MdTimer } from "react-icons/md";
import useDarkMode from "./useDarkMode";

// Chat Input
const ChatInput = ({ handleSendMsg, handleFileUpload, replyingTo, onCancelReply, socket, currentChat, currentUser }) => {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [msg, setMsg] = useState("");
  const [isEphemeral, setIsEphemeral] = useState(false);
  const [ephemeralMinutes, setEphemeralMinutes] = useState(5);
  const fileInputRef = React.useRef();
  const typingTimerRef = React.useRef(null);
  const [darkMode] = useDarkMode();

  // Gérer l'indicateur de frappe
  const handleTyping = () => {
    if (socket?.current && currentChat && currentUser) {
      socket.current.emit("typing", {
        to: currentChat.id,
        from: currentUser.id
      });

      // Clear le timer existant
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
      }

      // Arrêter l'indicateur après 3 secondes d'inactivité
      typingTimerRef.current = setTimeout(() => {
        socket.current.emit("stop-typing", {
          to: currentChat.id,
          from: currentUser.id
        });
      }, 3000);
    }
  };

  // Handle Emoji Picker
  const handleEmojiPickerHideShow = () => {
    setShowEmojiPicker(!showEmojiPicker);
  };

  // Emoji Click
  const handleEmojiClick = (event, emoji) => {
    let message = msg;
    message += emoji.emoji;
    setMsg(message);
  };

  // Send Chat
  const sendChat = (event) => {
    event.preventDefault();
    if (msg.length > 0) {
      // Arrêter l'indicateur de frappe
      if (socket?.current && currentChat && currentUser) {
        socket.current.emit("stop-typing", {
          to: currentChat.id,
          from: currentUser.id
        });
      }
      
      handleSendMsg(msg, isEphemeral, ephemeralMinutes);
      setMsg("");
      setIsEphemeral(false);
    }
  };

  // Handle file selection
  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  return (
    <div className={`relative ${darkMode ? "bg-gray-800" : "bg-gray-50"}`}>
      {replyingTo && (
        <div className={`
          absolute bottom-full left-0 right-0 
          px-4 md:px-6 py-2 md:py-3 
          border-t flex justify-between items-center 
          ${darkMode ? "bg-gray-700 border-gray-600" : "bg-blue-50 border-blue-200"}
        `}>
          <div className="min-w-0 flex-1">
            <span className="text-violet-600 text-xs md:text-sm font-medium">
              Répondre à {replyingTo.fromSelf ? "vous-même" : currentChat?.username}
            </span>
            <p className={`text-xs md:text-sm mt-1 truncate ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
              {replyingTo.message.substring(0, 50)}...
            </p>
          </div>
          <button 
            onClick={onCancelReply}
            className={`text-lg md:text-xl hover:opacity-70 transition-opacity ml-2 ${darkMode ? "text-gray-400" : "text-gray-500"}`}
          >
            <MdClose />
          </button>
        </div>
      )}
      
      <div className="px-3 md:px-6 py-3 md:py-4">
        <div className="flex items-center gap-2 md:gap-3 w-full">
          <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
            <div className="relative">
              <BsEmojiSmileFill 
                onClick={handleEmojiPickerHideShow}
                className={`text-lg md:text-xl cursor-pointer hover:scale-110 transition-transform ${darkMode ? "text-yellow-400" : "text-yellow-500"}`}
              />
              {showEmojiPicker && (
                <div className="absolute bottom-12 left-0 z-50">
                  <Picker 
                    onEmojiClick={handleEmojiClick}
                    theme={darkMode ? "dark" : "light"}
                    height={300}
                    width={window.innerWidth < 640 ? 280 : 350}
                  />
                </div>
              )}
            </div>
            
            <button 
              className={`text-lg md:text-xl transition-colors transform hover:scale-110 ${darkMode ? "text-gray-400 hover:text-gray-200" : "text-gray-600 hover:text-gray-800"}`}
              onClick={() => fileInputRef.current.click()}
              title="Joindre un fichier"
            >
              <MdAttachFile />
            </button>
            
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              style={{ display: 'none' }}
              accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
            />
            
            <button 
              className={`text-lg md:text-xl transition-all transform hover:scale-110 ${
                isEphemeral ? 'text-orange-500' : darkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-600 hover:text-gray-800'
              }`}
              onClick={() => setIsEphemeral(!isEphemeral)}
              title="Message éphémère"
            >
              <MdTimer />
            </button>
            
            {isEphemeral && (
              <select 
                value={ephemeralMinutes}
                onChange={(e) => setEphemeralMinutes(Number(e.target.value))}
                className={`
                  rounded-lg px-1 md:px-2 py-1 text-xs md:text-sm 
                  ${darkMode ? "bg-gray-700 text-white border-gray-600" : "bg-white text-gray-700 border-gray-300"} 
                  border
                `}
              >
                <option value={1}>1 min</option>
                <option value={5}>5 min</option>
                <option value={10}>10 min</option>
                <option value={30}>30 min</option>
                <option value={60}>1h</option>
              </select>
            )}
          </div>

          <form 
            className={`
              flex-1 flex items-center gap-2 md:gap-3 
              rounded-full px-3 md:px-5 py-2 md:py-3 
              ${darkMode ? "bg-gray-700" : "bg-white"} 
              shadow-sm
            `} 
            onSubmit={(e) => sendChat(e)}
          >
            <input
              type="text"
              placeholder={isEphemeral ? `Message éphémère (${ephemeralMinutes} min)...` : "Tapez votre message ici"}
              value={msg}
              onChange={(e) => {
                setMsg(e.target.value);
                handleTyping();
              }}
              className={`
                w-full bg-transparent border-none 
                text-sm md:text-base 
                placeholder-gray-500 focus:outline-none 
                ${darkMode ? "text-white" : "text-gray-900"}
              `}
            />
            <button 
              type="submit"
              className="
                p-1.5 md:p-2 rounded-full 
                bg-violet-600 hover:bg-violet-700 
                transition-colors transform hover:scale-105 
                focus:outline-none focus:ring-2 focus:ring-violet-400
                flex-shrink-0
              "
            >
              <IoMdSend className="text-base md:text-xl text-white" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChatInput;
