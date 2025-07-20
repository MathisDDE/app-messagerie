import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaCheck, FaTimes } from 'react-icons/fa';

const PasswordStrengthIndicator = ({ password, onChange }) => {
  const [strength, setStrength] = useState(null);
  const [validation, setValidation] = useState(null);
  const [checking, setChecking] = useState(false);

  // Critères de validation
  const criteria = [
    { 
      id: 'length', 
      label: 'Au moins 12 caractères', 
      test: (pwd) => pwd.length >= 12 
    },
    { 
      id: 'uppercase', 
      label: 'Au moins une lettre majuscule', 
      test: (pwd) => /[A-Z]/.test(pwd) 
    },
    { 
      id: 'lowercase', 
      label: 'Au moins une lettre minuscule', 
      test: (pwd) => /[a-z]/.test(pwd) 
    },
    { 
      id: 'number', 
      label: 'Au moins un chiffre', 
      test: (pwd) => /[0-9]/.test(pwd) 
    },
    { 
      id: 'special', 
      label: 'Au moins un caractère spécial (!@#$%^&*...)', 
      test: (pwd) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd) 
    }
  ];

  useEffect(() => {
    if (password && password.length > 0) {
      checkPasswordStrength();
    } else {
      setStrength(null);
      setValidation(null);
    }
  }, [password]);

  const checkPasswordStrength = async () => {
    setChecking(true);
    try {
      const response = await axios.post(
        `${process.env.REACT_APP_SERVER_URI}/api/auth/checkpassword`,
        { password }
      );
      
      if (response.data.status) {
        setStrength(response.data.strength);
        setValidation(response.data.validation);
      }
    } catch (error) {
      console.error('Erreur lors de la vérification du mot de passe:', error);
    } finally {
      setChecking(false);
    }
  };

  const getStrengthBarColor = () => {
    if (!strength) return 'bg-gray-300';
    switch (strength.color) {
      case 'red': return 'bg-red-500';
      case 'orange': return 'bg-orange-500';
      case 'green': return 'bg-green-500';
      case 'darkgreen': return 'bg-green-700';
      default: return 'bg-gray-300';
    }
  };

  const getStrengthWidth = () => {
    if (!strength) return '0%';
    return `${(strength.score / 8) * 100}%`;
  };

  return (
    <div className="mt-2">
      {/* Barre de force du mot de passe */}
      {password && (
        <div className="mb-3">
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Force du mot de passe
            </span>
            {strength && (
              <span className={`text-sm font-medium ${
                strength.color === 'red' ? 'text-red-600' :
                strength.color === 'orange' ? 'text-orange-600' :
                strength.color === 'green' ? 'text-green-600' :
                'text-green-700'
              }`}>
                {strength.level}
              </span>
            )}
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${getStrengthBarColor()}`}
              style={{ width: getStrengthWidth() }}
            />
          </div>
        </div>
      )}

      {/* Critères de validation */}
      <div className="space-y-1">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Exigences RGPD pour le mot de passe :
        </p>
        {criteria.map((criterion) => {
          const isValid = password ? criterion.test(password) : false;
          return (
            <div
              key={criterion.id}
              className={`flex items-center space-x-2 text-sm ${
                isValid ? 'text-green-600' : 'text-gray-500'
              }`}
            >
              {isValid ? (
                <FaCheck className="w-4 h-4 text-green-500" />
              ) : (
                <FaTimes className="w-4 h-4 text-gray-400" />
              )}
              <span>{criterion.label}</span>
            </div>
          );
        })}
      </div>

      {/* Message d'erreur si validation échoue */}
      {validation && !validation.isValid && password && (
        <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm font-medium text-red-800 dark:text-red-200 mb-1">
            Le mot de passe ne respecte pas les critères RGPD :
          </p>
          <ul className="list-disc list-inside text-sm text-red-600 dark:text-red-300">
            {validation.errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Message de succès */}
      {validation && validation.isValid && password && (
        <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <p className="text-sm text-green-800 dark:text-green-200">
            ✓ Mot de passe conforme aux exigences RGPD
          </p>
        </div>
      )}
    </div>
  );
};

export default PasswordStrengthIndicator; 