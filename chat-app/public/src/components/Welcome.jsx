import React from "react";
import Robot from "../assets/robot.gif";
import useDarkMode from "./useDarkMode";

// Welcome
const Welcome = ({ currentUser }) => {
  const [darkMode] = useDarkMode();
  
  return (
    <div className={`
      flex justify-center items-center flex-col 
      h-full w-full
      ${darkMode ? "bg-gray-900 text-white" : "bg-white text-gray-900"}
      px-4 sm:px-6 lg:px-8
    `}>
      <div className="text-center max-w-md mx-auto">
        <div className="mb-6 md:mb-8">
          <img 
            src={Robot} 
            alt="Welcome" 
            className="w-32 h-32 md:w-48 md:h-48 mx-auto opacity-80" 
          />
        </div>
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-3 md:mb-4">
          Bienvenue, <span className="text-violet-600 break-words">{currentUser?.username}!</span>
        </h1>
        <h3 className={`text-base md:text-lg ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
          Veuillez sélectionner une conversation pour commencer.
        </h3>
        
        {/* Bouton pour mobile */}
        <button 
          onClick={() => window.history.back()}
          className={`
            md:hidden mt-6 px-6 py-3 rounded-lg
            bg-violet-600 hover:bg-violet-700
            text-white font-medium
            transition-colors
          `}
        >
          Voir les contacts
        </button>
      </div>
    </div>
  );
};

export default Welcome;
