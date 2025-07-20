import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import Messages from "./Messages";
import ChatInput from "./ChatInput";
import { getGroupMessagesRoute, sendGroupMessageRoute, leaveGroupRoute } from "../utils/APIRoutes";
import useDarkMode from "./useDarkMode";

const GroupChatContainer = ({ currentChat, currentUser, socket }) => {
  const [messages, setMessages] = useState([]);
  const [arrivalMessage, setArrivalMessage] = useState(null);
  const scrollRef = useRef();
  const [darkMode] = useDarkMode();

  // Fetch group messages
  const fetchGroupMessages = async () => {
    if (!currentUser?.id || !currentChat?.id) return;
    
    try {
      const { data } = await axios.get(
        `${getGroupMessagesRoute}/${currentChat.id}/messages/${currentUser.id}`
      );
      
      if (data.status) {
        setMessages(data.messages);
      }
    } catch (error) {
      console.error("Error fetching group messages:", error);
    }
  };

  useEffect(() => {
    fetchGroupMessages();
  }, [currentChat, currentUser]);

  // Socket.io message receive
  useEffect(() => {
    const socketRef = socket.current;
    
    if (socketRef) {
      socketRef.on("group-msg-receive", (data) => {
        if (data.groupId === currentChat?.id) {
          // Rafraîchir les messages pour obtenir toutes les infos
          fetchGroupMessages();
        }
      });
    }

    return () => {
      if (socketRef) {
        socketRef.off("group-msg-receive");
      }
    };
  }, [currentChat, socket]);

  // Add arrival message to messages
  useEffect(() => {
    if (arrivalMessage) {
      setMessages((prev) => [...prev, arrivalMessage]);
    }
  }, [arrivalMessage]);

  // Scroll to latest message
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle send message
  const handleSendMsg = async (msg) => {
    try {
      const { data } = await axios.post(`${sendGroupMessageRoute}/${currentUser.id}`, {
        groupId: currentChat.id,
        message: msg
      });

      if (data.status) {
        // Emit to socket
        socket.current.emit("send-group-msg", {
          groupId: currentChat.id,
          from: currentUser.id,
          message: data.message
        });

        // Add to local messages
        setMessages([...messages, data.message]);
      }
    } catch (error) {
      console.error("Error sending group message:", error);
    }
  };

  // Handle leave group
  const handleLeaveGroup = async () => {
    if (window.confirm(`Êtes-vous sûr de vouloir quitter le groupe "${currentChat.name}" ?`)) {
      try {
        const { data } = await axios.delete(
          `${leaveGroupRoute}/${currentChat.id}/leave/${currentUser.id}`
        );
        
        if (data.status) {
          // Recharger la page pour rafraîchir la liste des groupes
          window.location.reload();
        }
      } catch (error) {
        console.error("Error leaving group:", error);
      }
    }
  };

  // Show group members
  const showMembers = () => {
    const memberNames = currentChat.members
      .map(m => m.user.username)
      .join(", ");
    alert(`Membres du groupe:\n${memberNames}`);
  };

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
          
          <div className={`
            w-10 h-10 md:w-12 md:h-12 
            rounded-full flex items-center justify-center 
            text-xl md:text-2xl flex-shrink-0
            ${darkMode ? "bg-gray-700" : "bg-violet-100"}
          `}>
            👥
          </div>
          <div className="min-w-0 flex-1">
            <h3 className={`text-base md:text-lg font-semibold truncate ${darkMode ? "text-white" : "text-gray-900"}`}>
              {currentChat?.name}
            </h3>
            <button 
              onClick={showMembers}
              className={`text-xs md:text-sm hover:underline ${darkMode ? "text-gray-400 hover:text-gray-300" : "text-gray-600 hover:text-gray-700"}`}
            >
              {currentChat?.members?.length} membres • Cliquez pour voir
            </button>
          </div>
        </div>
        <div className="flex gap-1 md:gap-2 flex-shrink-0">
          <button 
            onClick={handleLeaveGroup}
            className={`
              p-2 md:p-2.5 rounded-full transition-all 
              text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20
            `}
            title="Quitter le groupe"
          >
            <i className="fas fa-sign-out-alt text-base md:text-lg"></i>
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
          onReply={() => {}}
          onUpdate={fetchGroupMessages}
        />
      </div>

      {/* Input Area - Fixed height */}
      <div className={`
        flex-shrink-0
        border-t ${darkMode ? "border-gray-700" : "border-gray-200"}
      `}>
        <ChatInput 
          handleSendMsg={handleSendMsg} 
          currentChat={currentChat}
          socket={socket}
          currentUser={currentUser}
        />
      </div>
    </div>
  );
};

export default GroupChatContainer; 