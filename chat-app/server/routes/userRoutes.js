const {
  register,
  login,
  logout,
  getCurrentUser,
  setAvatar,
  getAllUsers,
  updateProfile,
  updatePassword,
} = require("../controllers/userController");

const { passwordValidationMiddleware, getPasswordStrength } = require("../middleware/passwordValidation");
const { authenticateToken, refreshToken } = require("../middleware/authMiddleware");

const router = require("express").Router();

// User Routes - Public
router.post("/register", passwordValidationMiddleware, register);
router.post("/login", login);
router.post("/logout", logout);
router.post("/refresh", refreshToken);

// User Routes - Protected (nécessitent authentification)
router.get("/me", authenticateToken, getCurrentUser);
router.post("/setavatar/:id", authenticateToken, setAvatar);
router.get("/allusers/:id", authenticateToken, getAllUsers);
router.put("/updateprofile/:id", authenticateToken, updateProfile);
router.put("/updatepassword/:id", authenticateToken, passwordValidationMiddleware, updatePassword);

// Route pour vérifier la force du mot de passe
router.post("/checkpassword", (req, res) => {
  const { password } = req.body;
  if (!password) {
    return res.json({ status: false, msg: "Mot de passe requis" });
  }
  
  const strength = getPasswordStrength(password);
  const { validatePassword } = require("../middleware/passwordValidation");
  const validation = validatePassword(password);
  
  return res.json({
    status: true,
    strength,
    validation
  });
});

module.exports = router;
