import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft, FaEdit } from "react-icons/fa";
import useDarkMode from "../components/useDarkMode";
import multiavatar from "@multiavatar/multiavatar/esm";
import axios from "axios";
import { setAvatarRoute, updateProfileRoute, updatePasswordRoute } from "../utils/APIRoutes";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import authService from "../services/authService";

const Profile = () => {
  const navigate = useNavigate();
  const [darkMode] = useDarkMode();
  const [avatars, setAvatars] = useState([]);
  const [selectedAvatar, setSelectedAvatar] = useState(null);
  const [user, setUser] = useState(null);
  const [editMode, setEditMode] = useState({
    username: false,
    email: false,
    password: false
  });
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchCurrentUser = () => {
      const user = authService.getUser();
      if (!user) {
        navigate("/login");
        return;
      }
      setUser(user);
      setFormData({
        username: user.username || "",
        email: user.email || "",
      });
    };

    fetchCurrentUser();
  }, [navigate]);

  const fetchAvatars = () => {
    const newAvatars = [];
    for (let i = 0; i < 4; i++) {
      const svg = multiavatar(Math.random().toString());
      newAvatars.push(btoa(svg));
    }
    setAvatars(newAvatars);
    setSelectedAvatar(null);
  };

  useEffect(() => {
    fetchAvatars();
  }, []);

  const handleAvatarChange = async () => {
    if (selectedAvatar === null || !user) return;
    try {
      const { data } = await axios.post(`${setAvatarRoute}/${user.id}`, {
        image: avatars[selectedAvatar],
      });
      if (data.isSet) {
        const updatedUser = { ...user, avatarImage: data.image, isAvatarImageSet: true };
        authService.updateUser(updatedUser);
        setUser(updatedUser);
        toast.success("Avatar mis à jour !");
      }
    } catch (err) {
      console.error("Erreur lors de la mise à jour de l'avatar", err);
      toast.error("Erreur lors de la mise à jour de l'avatar");
    }
  };

  const handleUpdateProfile = async (field) => {
    setLoading(true);
    try {
      const updateData = {};
      if (field === "username") updateData.username = formData.username;
      if (field === "email") updateData.email = formData.email;

      const { data } = await axios.put(`${updateProfileRoute}/${user.id}`, updateData);

      if (data.status) {
        const updatedUser = { ...user, ...data.user };
        authService.updateUser(updatedUser);
        setUser(updatedUser);
        setEditMode({ ...editMode, [field]: false });
        toast.success(`${field === "username" ? "Nom d'utilisateur" : "Email"} mis à jour !`);
      } else {
        toast.error(data.msg || "Erreur lors de la mise à jour");
      }
    } catch (error) {
      toast.error("Erreur lors de la mise à jour");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (formData.newPassword !== formData.confirmPassword) {
      toast.error("Les nouveaux mots de passe ne correspondent pas");
      return;
    }

    if (formData.newPassword.length < 6) {
      toast.error("Le nouveau mot de passe doit contenir au moins 6 caractères");
      return;
    }

    setLoading(true);
    try {
      const { data } = await axios.put(`${updatePasswordRoute}/${user.id}`, {
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword
      });

      if (data.status) {
        toast.success("Mot de passe mis à jour !");
        setEditMode({ ...editMode, password: false });
        setFormData({
          ...formData,
          currentPassword: "",
          newPassword: "",
          confirmPassword: ""
        });
      } else {
        toast.error(data.msg || "Erreur lors de la mise à jour du mot de passe");
      }
    } catch (error) {
      toast.error("Erreur lors de la mise à jour du mot de passe");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = (field) => {
    setEditMode({ ...editMode, [field]: false });
    if (field === "username" || field === "email") {
      setFormData({ ...formData, [field]: user[field] });
    } else if (field === "password") {
      setFormData({
        ...formData,
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
      });
    }
  };

  return (
    <div className="min-h-screen p-4 bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-white">
      <div className="flex items-center mb-6">
        <button onClick={() => navigate("/settings")} className="mr-4 text-purple-600 dark:text-purple-400">
          <FaArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-bold">Mon Profil</h1>
      </div>

      {user && (
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="flex items-center space-x-4">
            <img
              src={`data:image/svg+xml;base64,${user.avatarImage}`}
              alt="Avatar"
              className="w-20 h-20 rounded-full border-2 border-purple-500"
            />
            <div>
              <h2 className="text-xl font-semibold">{user.username}</h2>
              <p className="text-sm text-green-500">En ligne</p>
            </div>
          </div>

          {/* Username */}
          <div className="bg-purple-100 dark:bg-purple-800 p-4 rounded-lg shadow-md">
            {!editMode.username ? (
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium">Nom d'utilisateur</p>
                  <p>{user.username}</p>
                </div>
                <FaEdit 
                  className="text-purple-600 cursor-pointer hover:text-purple-700" 
                  onClick={() => setEditMode({ ...editMode, username: true })}
                />
              </div>
            ) : (
              <div>
                <p className="font-medium mb-2">Nom d'utilisateur</p>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => handleUpdateProfile("username")}
                    disabled={loading}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-1 rounded transition disabled:opacity-50"
                  >
                    {loading ? "Sauvegarde..." : "Sauvegarder"}
                  </button>
                  <button
                    onClick={() => handleCancel("username")}
                    className="bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-700 px-4 py-1 rounded transition"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Email */}
          <div className="bg-purple-100 dark:bg-purple-800 p-4 rounded-lg shadow-md">
            {!editMode.email ? (
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium">Adresse e-mail</p>
                  <p>{user.email}</p>
                </div>
                <FaEdit 
                  className="text-purple-600 cursor-pointer hover:text-purple-700" 
                  onClick={() => setEditMode({ ...editMode, email: true })}
                />
              </div>
            ) : (
              <div>
                <p className="font-medium mb-2">Adresse e-mail</p>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => handleUpdateProfile("email")}
                    disabled={loading}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-1 rounded transition disabled:opacity-50"
                  >
                    {loading ? "Sauvegarde..." : "Sauvegarder"}
                  </button>
                  <button
                    onClick={() => handleCancel("email")}
                    className="bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-700 px-4 py-1 rounded transition"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Password */}
          <div className="bg-purple-100 dark:bg-purple-800 p-4 rounded-lg shadow-md">
            {!editMode.password ? (
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium">Mot de passe</p>
                  <p>********</p>
                </div>
                <FaEdit 
                  className="text-purple-600 cursor-pointer hover:text-purple-700" 
                  onClick={() => setEditMode({ ...editMode, password: true })}
                />
              </div>
            ) : (
              <div className="space-y-3">
                <p className="font-medium">Modifier le mot de passe</p>
                <input
                  type="password"
                  placeholder="Mot de passe actuel"
                  value={formData.currentPassword}
                  onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <input
                  type="password"
                  placeholder="Nouveau mot de passe"
                  value={formData.newPassword}
                  onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <input
                  type="password"
                  placeholder="Confirmer le nouveau mot de passe"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={handleUpdatePassword}
                    disabled={loading}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-1 rounded transition disabled:opacity-50"
                  >
                    {loading ? "Sauvegarde..." : "Sauvegarder"}
                  </button>
                  <button
                    onClick={() => handleCancel("password")}
                    className="bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-700 px-4 py-1 rounded transition"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="mt-8">
            <h3 className="text-lg font-semibold mb-2">Changer d'avatar</h3>
            <div className="grid grid-cols-4 gap-4">
              {avatars.map((avatar, index) => (
                <img
                  key={index}
                  src={`data:image/svg+xml;base64,${avatar}`}
                  alt="Avatar option"
                  onClick={() => setSelectedAvatar(index)}
                  className={`w-16 h-16 rounded-full border-4 cursor-pointer transition ${
                    selectedAvatar === index ? "border-purple-600" : "border-transparent"
                  }`}
                />
              ))}
            </div>
            <div className="flex gap-4 mt-4">
              <button
                onClick={handleAvatarChange}
                className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
              >
                Confirmer l'avatar
              </button>
              <button
                onClick={fetchAvatars}
                className="bg-gray-300 dark:bg-gray-700 text-gray-900 dark:text-white px-4 py-2 rounded hover:bg-gray-400 dark:hover:bg-gray-600"
              >
                Recharger les avatars
              </button>
            </div>
          </div>
        </div>
      )}
      
      <ToastContainer position="bottom-right" theme={darkMode ? "dark" : "light"} />
    </div>
  );
};

export default Profile;
