import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import Logo from "../assets/logo.svg";
import { ToastContainer, toast } from "react-toastify";
import { login, getCurrentUser } from "../services/authService";
import useDarkMode from "../components/useDarkMode";

import "react-toastify/dist/ReactToastify.css";

// Login
const Login = () => {
  const navigate = useNavigate();
  const [darkMode] = useDarkMode();
  const [isLoading, setIsLoading] = useState(false);

  // form initial state
  const initialState = {
    email: "",
    password: "",
  };

  // Show toast error msg
  const showToast = (msg) => {
    const toastOptions = {
      position: "bottom-right",
      autoClose: 8000,
      pauseOnHover: true,
      draggable: true,
      theme: darkMode ? "dark" : "light",
    };

    return toast.error(msg, toastOptions);
  };

  const [values, setValues] = useState(initialState);

  // Check if user is logged in
  useEffect(() => {
    const checkAuth = async () => {
      const result = await getCurrentUser();
      if (result.success) {
        navigate("/home");
      }
    };
    checkAuth();
  }, []); // eslint-disable-line

  // handle form Submit
  const handleSubmit = async (e) => {
    e.preventDefault(); // prevents reload of page
    setIsLoading(true);

    // handle Validation
    if (handleValidation()) {
      try {
        const { email, password } = values;

        const response = await login({ email, password });

        if (response.status) {
          localStorage.setItem("chat-app-user", JSON.stringify(response.user));
          navigate("/home");
        } else {
          showToast(response.msg);
          setIsLoading(false);
          return;
        }
      } catch (error) {
        showToast("Une erreur s'est produite. Veuillez réessayer.");
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  };

  // handle form Validation
  const handleValidation = () => {
    const { email, password } = values;

    // Email validation
    const isInvalidEmail = (email) => {
      const regex = new RegExp( // eslint-disable-next-line
        /^(([^<>()[\]\.,;:\s@\"]+(\.[^<>()[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})$/i
      );
      return !email || regex.test(email) === false;
    };

    if (isInvalidEmail(email)) {
      showToast("Veuillez entrer une adresse e-mail valide.");
      return false;
    }

    if (password.length < 3) {
      showToast("Le mot de passe doit contenir au moins 3 caractères.");
      return false;
    }

    if (/\s/.test(password)) {
      showToast("Le mot de passe ne doit pas contenir d'espaces.");
      return false;
    }

    return true;
  };

  // handle form change
  const handleChange = (e) => {
    setValues({ ...values, [e.target.name]: e.target.value });
  };

  return (
    <>
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? "bg-gray-900" : "bg-gray-100"} px-4 sm:px-6 lg:px-8`}>
        <div className={`max-w-md w-full space-y-8 ${darkMode ? "bg-gray-800" : "bg-white"} p-8 rounded-2xl shadow-xl`}>
          {/* Logo and Title */}
          <div className="text-center">
            <div className="flex justify-center items-center gap-3 mb-6">
              <img src={Logo} alt="SecureChat" className="h-16 w-16" />
              <h1 className={`text-3xl font-bold ${darkMode ? "text-white" : "text-gray-900"}`}>
                SecureChat
              </h1>
            </div>
            <h2 className={`text-2xl font-semibold ${darkMode ? "text-gray-100" : "text-gray-900"}`}>
              Connexion
            </h2>
            <p className={`mt-2 text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
              Bienvenue ! Connectez-vous à votre compte
            </p>
          </div>

          {/* Form */}
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              {/* Email Input */}
              <div>
                <label htmlFor="email" className={`block text-sm font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                  Adresse e-mail
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={values.email}
                  onChange={handleChange}
                  className={`appearance-none relative block w-full px-4 py-3 border ${
                    darkMode 
                      ? "border-gray-600 bg-gray-700 text-white placeholder-gray-400 focus:border-violet-500" 
                      : "border-gray-300 text-gray-900 placeholder-gray-500 focus:border-violet-600"
                  } rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:z-10 sm:text-sm transition duration-200`}
                  placeholder="nom@exemple.com"
                />
              </div>

              {/* Password Input */}
              <div>
                <label htmlFor="password" className={`block text-sm font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                  Mot de passe
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={values.password}
                  onChange={handleChange}
                  className={`appearance-none relative block w-full px-4 py-3 border ${
                    darkMode 
                      ? "border-gray-600 bg-gray-700 text-white placeholder-gray-400 focus:border-violet-500" 
                      : "border-gray-300 text-gray-900 placeholder-gray-500 focus:border-violet-600"
                  } rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:z-10 sm:text-sm transition duration-200`}
                  placeholder="••••••••"
                />
              </div>
            </div>

            {/* Submit Button */}
            <div>
              <button
                type="submit"
                disabled={isLoading}
                className={`group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white ${
                  isLoading 
                    ? "bg-gray-400 cursor-not-allowed" 
                    : "bg-violet-600 hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500"
                } transition duration-200`}
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Connexion en cours...
                  </div>
                ) : (
                  "Se connecter"
                )}
              </button>
            </div>

            {/* Register Link */}
            <div className="text-center">
              <span className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                Pas encore de compte ?{" "}
                <Link 
                  to="/register" 
                  className="font-medium text-violet-600 hover:text-violet-500 transition duration-200"
                >
                  S'inscrire
                </Link>
              </span>
            </div>
          </form>
        </div>
      </div>

      {/* Toast Container */}
      <ToastContainer />
    </>
  );
};

export default Login;
