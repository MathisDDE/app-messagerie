import React from "react";
import useDarkMode from "./useDarkMode";

const LoadingSpinner = () => {
  const [darkMode] = useDarkMode();

  return (
    <div className={`min-h-screen flex items-center justify-center ${darkMode ? "bg-gray-900" : "bg-gray-100"}`}>
      <div className="text-center">
        {/* Spinner animé */}
        <div className="relative inline-flex">
          <div className="w-16 h-16 rounded-full border-4 border-violet-200 dark:border-violet-900"></div>
          <div className="w-16 h-16 rounded-full border-4 border-transparent border-t-violet-600 dark:border-t-violet-400 animate-spin absolute top-0 left-0"></div>
        </div>
        
        {/* Texte de chargement */}
        <p className={`mt-4 text-lg font-medium ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
          Chargement...
        </p>
        
        {/* Points animés */}
        <div className="flex justify-center mt-2 space-x-1">
          <div className="w-2 h-2 bg-violet-600 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
          <div className="w-2 h-2 bg-violet-600 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
          <div className="w-2 h-2 bg-violet-600 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
        </div>
      </div>
    </div>
  );
};

export default LoadingSpinner; 