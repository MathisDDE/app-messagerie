import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { allUsersRoute, host } from "../utils/APIRoutes";
import Contacts from "../components/Contacts";
import Welcome from "../components/Welcome";
import ChatContainer from "../components/ChatContainer";
import GroupChatContainer from "../components/GroupChatContainer";
import { io } from "socket.io-client";
import useDarkMode from "../components/useDarkMode";
import authService from "../services/authService";

// Chat
const Chat = () => {
  const socket = useRef();
  const navigate = useNavigate();
  const [contacts, setContacts] = useState([]);
  const [currentUser, setCurrentUser] = useState(undefined);
  const [currentChat, setCurrentChat] = useState(undefined);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [darkMode] = useDarkMode();

  // fetch current user
  useEffect(() => {
    const fetchCurrentUser = async () => {
      const user = authService.getUser();
      if (!user) {
        navigate("/login");
        return;
      }
      setCurrentUser(user);
    };

    fetchCurrentUser();
  }, []); // eslint-disable-line

  // Socket.io add user
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
      });
      
      socket.current.on("disconnect", () => {
        console.log("Disconnected from server");
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

  // Fetch all users
  useEffect(() => {
    const fetchAllUsers = async () => {
      if (currentUser) {
        if (!currentUser.isAvatarImageSet) return navigate("/setAvatar");
        const data = await axios.get(`${allUsersRoute}/${currentUser.id}`);
        setContacts(data.data);
      }
    };

    fetchAllUsers();
  }, [currentUser]); // eslint-disable-line

  // handle chat change
  const handleChatChange = (chat) => {
    setCurrentChat(chat);
  };

  return (
    <div className={`
      h-screen w-screen fixed inset-0
      ${darkMode ? "bg-gray-900" : "bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900"}
      overflow-hidden
    `}>
      <div className="
        h-full w-full
        bg-black bg-opacity-20 backdrop-blur-sm
        flex
        overflow-hidden
      ">
        {/* Sidebar Contacts - Fixed width */}
        <div className="
          w-full md:w-80 lg:w-96
          h-full
          flex-shrink-0
          ${currentChat ? 'hidden md:block' : 'block'}
          overflow-hidden
        ">
          <Contacts
            contacts={contacts}
            currentUser={currentUser}
            changeChat={handleChatChange}
            onlineUsers={onlineUsers}
            socket={socket}
          />
        </div>
        
        {/* Chat Area - Flexible width */}
        <div className={`
          flex-1
          h-full
          ${!currentChat ? 'hidden md:block' : 'block'}
          overflow-hidden
          min-w-0
        `}>
          {currentChat === undefined ? (
            <Welcome currentUser={currentUser} />
          ) : currentChat.isGroup ? (
            <GroupChatContainer
              currentChat={currentChat}
              currentUser={currentUser}
              socket={socket}
            />
          ) : (
            <ChatContainer
              currentChat={currentChat}
              currentUser={currentUser}
              socket={socket}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default Chat;
