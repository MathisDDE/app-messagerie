// Middleware de validation des mots de passe conformément au RGPD
const validatePassword = (password) => {
  const errors = [];

  // Vérifier la longueur minimale (12 caractères)
  if (password.length < 12) {
    errors.push("Le mot de passe doit contenir au moins 12 caractères");
  }

  // Vérifier la présence d'au moins une majuscule
  if (!/[A-Z]/.test(password)) {
    errors.push("Le mot de passe doit contenir au moins une lettre majuscule");
  }

  // Vérifier la présence d'au moins une minuscule
  if (!/[a-z]/.test(password)) {
    errors.push("Le mot de passe doit contenir au moins une lettre minuscule");
  }

  // Vérifier la présence d'au moins un chiffre
  if (!/[0-9]/.test(password)) {
    errors.push("Le mot de passe doit contenir au moins un chiffre");
  }

  // Vérifier la présence d'au moins un caractère spécial
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push("Le mot de passe doit contenir au moins un caractère spécial (!@#$%^&*()_+-=[]{}|;:,.<>?)");
  }

  return {
    isValid: errors.length === 0,
    errors: errors
  };
};

// Middleware pour Express
const passwordValidationMiddleware = (req, res, next) => {
  const { password, newPassword } = req.body;
  const passwordToValidate = password || newPassword;

  if (passwordToValidate) {
    const validation = validatePassword(passwordToValidate);
    
    if (!validation.isValid) {
      return res.status(400).json({
        status: false,
        msg: "Le mot de passe ne respecte pas les critères de sécurité RGPD",
        errors: validation.errors
      });
    }
  }

  next();
};

// Fonction pour évaluer la force du mot de passe
const getPasswordStrength = (password) => {
  let strength = 0;
  const checks = {
    length: password.length >= 12,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    numbers: /[0-9]/.test(password),
    special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
    extraLength: password.length >= 16,
    multipleSpecial: (password.match(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/g) || []).length >= 2,
    multipleNumbers: (password.match(/[0-9]/g) || []).length >= 2
  };

  // Calcul du score
  Object.values(checks).forEach(check => {
    if (check) strength++;
  });

  // Déterminer le niveau
  if (strength <= 4) return { level: "Faible", score: strength, color: "red" };
  if (strength <= 6) return { level: "Moyen", score: strength, color: "orange" };
  if (strength <= 7) return { level: "Fort", score: strength, color: "green" };
  return { level: "Très fort", score: strength, color: "darkgreen" };
};

module.exports = {
  validatePassword,
  passwordValidationMiddleware,
  getPasswordStrength
}; 