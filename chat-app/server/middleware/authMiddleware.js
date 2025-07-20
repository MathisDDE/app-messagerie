const jwt = require('jsonwebtoken');

// Generate access token (short-lived)
const generateToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '7d' }
  );
};

// Generate refresh token (long-lived)
const generateRefreshToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key',
    { expiresIn: '30d' }
  );
};

// Verify token middleware
const verifyToken = (req, res, next) => {
  const token = req.cookies.authToken || req.headers.authorization?.split(' ')[1];

  console.log('Auth Debug - Cookies:', req.cookies);
  console.log('Auth Debug - Token:', token);

  if (!token) {
    return res.status(401).json({ msg: 'No token provided', status: false });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    console.log('Auth Debug - Decoded token:', decoded);
    req.user = { id: decoded.id };
    console.log('Auth Debug - req.user set to:', req.user);
    next();
  } catch (error) {
    console.error('Auth Debug - Token verification error:', error);
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ msg: 'Token expired', status: false });
    }
    return res.status(401).json({ msg: 'Invalid token', status: false });
  }
};

// Verify refresh token
const verifyRefreshToken = (refreshToken) => {
  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key');
    return { valid: true, userId: decoded.id };
  } catch (error) {
    return { valid: false };
  }
};

// Refresh token route handler
const refreshToken = async (req, res) => {
  const { refreshToken: token } = req.cookies;

  if (!token) {
    return res.status(401).json({ msg: 'No refresh token provided', status: false });
  }

  const result = verifyRefreshToken(token);
  if (!result.valid) {
    return res.status(401).json({ msg: 'Invalid refresh token', status: false });
  }

  // Generate new tokens
  const newAuthToken = generateToken(result.userId);
  const newRefreshToken = generateRefreshToken(result.userId);

  // Set new cookies
  res.cookie('authToken', newAuthToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });

  res.cookie('refreshToken', newRefreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
  });

  return res.json({ status: true, msg: 'Tokens refreshed successfully' });
};

module.exports = {
  generateToken,
  generateRefreshToken,
  verifyToken,
  authenticateToken: verifyToken, // Alias for compatibility
  verifyRefreshToken,
  refreshToken
}; 