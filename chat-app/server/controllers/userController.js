const { PrismaClient } = require('../generated/prisma');
const prisma = new PrismaClient();
const bcrypt = require('bcrypt');
const { generateToken, generateRefreshToken } = require('../middleware/authMiddleware');

// Register
module.exports.register = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;

    // Check email existence
    const emailCheck = await prisma.user.findUnique({
      where: { email },
    });
    if (emailCheck)
      return res.json({ msg: "Email is already in use.", status: false });

    // Check username existence
    const usernameCheck = await prisma.user.findUnique({
      where: { username },
    });
    if (usernameCheck)
      return res.json({ msg: "Username is already in use.", status: false });

    // Hash password and create user
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
      },
      select: {
        id: true,
        username: true,
        email: true,
        avatarImage: true,
        isAvatarImageSet: true,
      },
    });

    // Générer les tokens JWT
    const authToken = generateToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    // Protection CSRF - Configuration sécurisée des cookies
    res.cookie('authToken', authToken, {
      httpOnly: true, // Protection XSS - Cookie inaccessible via JavaScript
      secure: process.env.NODE_ENV === 'production', // Cookie uniquement en HTTPS en production
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax', // Protection CSRF - Restriction des requêtes cross-origin
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 jours
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true, // Protection XSS - Cookie inaccessible via JavaScript
      secure: process.env.NODE_ENV === 'production', // Cookie uniquement en HTTPS en production
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax', // Protection CSRF - Restriction des requêtes cross-origin
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 jours
    });

    return res.json({ status: true, user });
  } catch (ex) {
    console.log(ex);
    next(ex);
  }
};

// Login
module.exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    console.log('Login attempt:', { email });

    const user = await prisma.user.findUnique({ 
      where: { email },
      select: {
        id: true,
        email: true,
        password: true,
        username: true,
        avatarImage: true,
        isAvatarImageSet: true,
        isBanned: true,
        bannedReason: true,
        role: true
      }
    });

    console.log('User found:', user ? 'yes' : 'no');

    if (!user)
      return res.json({ msg: "Incorrect Email or Password.", status: false });

    // Vérifier si l'utilisateur est banni
    if (user.isBanned) {
      return res.json({ 
        msg: `Votre compte a été suspendu. Raison: ${user.bannedReason || "Non spécifiée"}`, 
        status: false 
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    console.log('Password valid:', isPasswordValid);

    if (!isPasswordValid)
      return res.json({ msg: "Incorrect Email or Password.", status: false });

    try {
      // Update lastLogin
      await prisma.user.update({
        where: { 
          id: user.id,
          email: user.email // Ajout d'une condition supplémentaire
        },
        data: { 
          lastLogin: new Date()
        }
      });

      // Log l'activité
      await prisma.activityLog.create({
        data: {
          userId: user.id,
          action: 'LOGIN',
          details: JSON.stringify({
            timestamp: new Date(),
            userAgent: req.headers['user-agent'],
            ipAddress: req.ip
          })
        }
      });
    } catch (updateError) {
      console.warn('Failed to update lastLogin:', updateError);
      // Continue même si la mise à jour échoue
    }

    // Don't send password
    const { password: _, ...safeUser } = user;

    // Générer les tokens JWT
    const authToken = generateToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    // Définir les cookies avec les bonnes options
    res.cookie('authToken', authToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 jours
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 jours
    });

    console.log('Login successful, cookies set');

    return res.json({ status: true, user: safeUser });
  } catch (ex) {
    console.error('Login error:', ex);
    next(ex);
  }
};

// Set Avatar
module.exports.setAvatar = async (req, res, next) => {
  try {
    const userId = Number(req.params.id);
    const avatarImage = req.body.image;

    const user = await prisma.user.update({
      where: { id: userId },
      data: { avatarImage, isAvatarImageSet: true },
      select: { id: true, avatarImage: true, isAvatarImageSet: true },
    });

    return res.json({
      isSet: user.isAvatarImageSet,
      image: user.avatarImage,
    });
  } catch (ex) {
    console.log(ex);
    next(ex);
  }
};

// Get All Users (except current)
module.exports.getAllUsers = async (req, res, next) => {
  try {
    const currentId = Number(req.params.id);

    const users = await prisma.user.findMany({
      where: { NOT: { id: currentId } },
      select: {
        id: true,
        email: true,
        username: true,
        avatarImage: true,
        isAvatarImageSet: true,
      },
    });

    return res.json(users);
  } catch (ex) {
    console.log(ex);
    next(ex);
  }
};

// Update User Profile (username, email)
module.exports.updateProfile = async (req, res, next) => {
  try {
    const userId = Number(req.params.id);
    const { username, email } = req.body;

    // Check if new email is already in use by another user
    if (email) {
      const emailCheck = await prisma.user.findFirst({
        where: { 
          email,
          NOT: { id: userId }
        },
      });
      if (emailCheck)
        return res.json({ msg: "Email is already in use.", status: false });
    }

    // Check if new username is already in use by another user
    if (username) {
      const usernameCheck = await prisma.user.findFirst({
        where: { 
          username,
          NOT: { id: userId }
        },
      });
      if (usernameCheck)
        return res.json({ msg: "Username is already in use.", status: false });
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(username && { username }),
        ...(email && { email }),
      },
      select: {
        id: true,
        username: true,
        email: true,
        avatarImage: true,
        isAvatarImageSet: true,
      },
    });

    return res.json({ status: true, user: updatedUser });
  } catch (ex) {
    console.log(ex);
    next(ex);
  }
};

// Logout
module.exports.logout = async (req, res, next) => {
  try {
    // Effacer les cookies
    res.clearCookie('authToken');
    res.clearCookie('refreshToken');
    
    return res.json({ status: true, msg: "Déconnexion réussie." });
  } catch (ex) {
    console.log(ex);
    next(ex);
  }
};

// Get current user
module.exports.getCurrentUser = async (req, res, next) => {
  try {
    // Vérifier que req.user existe et a un ID
    if (!req.user || !req.user.id) {
      console.error('getCurrentUser - req.user is missing or has no id:', req.user);
      return res.status(401).json({ 
        status: false, 
        msg: "User not authenticated" 
      });
    }

    // Convertir l'ID en nombre si nécessaire
    const userId = Number(req.user.id);
    
    if (isNaN(userId)) {
      console.error('getCurrentUser - Invalid user ID:', req.user.id);
      return res.status(400).json({ 
        status: false, 
        msg: "Invalid user ID" 
      });
    }

    // L'utilisateur est déjà attaché par le middleware d'authentification
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        avatarImage: true,
        isAvatarImageSet: true,
        role: true
      }
    });

    if (!user) {
      return res.status(404).json({ 
        status: false, 
        msg: "User not found" 
      });
    }

    return res.json({ status: true, user });
  } catch (ex) {
    console.log('getCurrentUser error:', ex);
    next(ex);
  }
};

// Update Password
module.exports.updatePassword = async (req, res, next) => {
  try {
    const userId = Number(req.params.id);
    const { currentPassword, newPassword } = req.body;

    // Get user with password
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user)
      return res.json({ msg: "User not found.", status: false });

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid)
      return res.json({ msg: "Current password is incorrect.", status: false });

    // Hash new password and update
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return res.json({ status: true, msg: "Password updated successfully." });
  } catch (ex) {
    console.log(ex);
    next(ex);
  }
};
