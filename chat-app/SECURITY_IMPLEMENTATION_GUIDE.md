# 🔐 Guide d'Implémentation des Améliorations de Sécurité

## 1. JWT Authentication Implementation

### Installation des dépendances
```bash
npm install jsonwebtoken cookie-parser
npm install --save-dev @types/jsonwebtoken
```

### Middleware JWT (server/middleware/auth.js)
```javascript
const jwt = require('jsonwebtoken');

const generateAccessToken = (userId) => {
  return jwt.sign(
    { userId, type: 'access' },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: '15m' }
  );
};

const generateRefreshToken = (userId) => {
  return jwt.sign(
    { userId, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );
};

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ msg: 'Token requis' });
  }

  jwt.verify(token, process.env.JWT_ACCESS_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ msg: 'Token invalide' });
    }
    req.userId = decoded.userId;
    next();
  });
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  authenticateToken
};
```

### Mise à jour du login (server/controllers/userController.js)
```javascript
const { generateAccessToken, generateRefreshToken } = require('../middleware/auth');

module.exports.login = async (req, res, next) => {
  try {
    // ... validation existante ...

    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    // Stocker le refresh token en base (hashé)
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { 
        refreshToken: hashedRefreshToken,
        lastLogin: new Date()
      }
    });

    // Définir le refresh token en cookie httpOnly
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 jours
    });

    return res.json({ 
      status: true, 
      accessToken,
      user: safeUser 
    });
  } catch (ex) {
    next(ex);
  }
};
```

### Client-side Token Management (public/src/utils/auth.js)
```javascript
class AuthService {
  constructor() {
    this.token = null;
    this.refreshTimer = null;
  }

  setToken(token) {
    this.token = token;
    this.scheduleRefresh();
  }

  getToken() {
    return this.token;
  }

  async refreshToken() {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        this.setToken(data.accessToken);
        return data.accessToken;
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      this.logout();
    }
  }

  scheduleRefresh() {
    // Rafraîchir 1 minute avant expiration
    this.refreshTimer = setTimeout(() => {
      this.refreshToken();
    }, 14 * 60 * 1000); // 14 minutes
  }

  logout() {
    this.token = null;
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }
    localStorage.removeItem(process.env.REACT_APP_CHAT_APP_USER);
    window.location.href = '/login';
  }
}

export default new AuthService();
```

## 2. Rate Limiting Implementation

### Installation
```bash
npm install express-rate-limit express-slow-down redis
```

### Configuration (server/middleware/rateLimiter.js)
```javascript
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const RedisStore = require('rate-limit-redis');
const Redis = require('redis');

const redisClient = Redis.createClient({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379
});

// Limiter général
const generalLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rl:general:'
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: 'Trop de requêtes, veuillez réessayer plus tard.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Limiter pour login (plus strict)
const loginLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rl:login:'
  }),
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
  message: 'Trop de tentatives de connexion. Réessayez dans 15 minutes.'
});

// Limiter pour messages
const messageLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rl:message:'
  }),
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 messages par minute
  message: 'Limite de messages atteinte. Ralentissez!'
});

// Speed limiter pour uploads
const uploadSpeedLimiter = slowDown({
  windowMs: 15 * 60 * 1000,
  delayAfter: 5,
  delayMs: 500,
  maxDelayMs: 20000,
});

module.exports = {
  generalLimiter,
  loginLimiter,
  messageLimiter,
  uploadSpeedLimiter
};
```

## 3. Security Headers Implementation

### Installation
```bash
npm install helmet
```

### Configuration (server/middleware/security.js)
```javascript
const helmet = require('helmet');

const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "wss:", "https:"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: true,
  crossOriginResourcePolicy: { policy: "cross-origin" },
  dnsPrefetchControl: true,
  frameguard: { action: 'deny' },
  hidePoweredBy: true,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  ieNoOpen: true,
  noSniff: true,
  originAgentCluster: true,
  permittedCrossDomainPolicies: false,
  referrerPolicy: { policy: "no-referrer" },
  xssFilter: true,
});

module.exports = securityHeaders;
```

## 4. Input Validation Implementation

### Installation
```bash
npm install express-validator dompurify jsdom
```

### Validation Middleware (server/middleware/validation.js)
```javascript
const { body, param, query, validationResult } = require('express-validator');
const createDOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');

const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

// Sanitizer personnalisé
const sanitizeHtml = (value) => {
  return DOMPurify.sanitize(value, { 
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a'],
    ALLOWED_ATTR: ['href']
  });
};

// Règles de validation
const validationRules = {
  // Messages
  message: [
    body('message')
      .trim()
      .notEmpty().withMessage('Le message ne peut pas être vide')
      .isLength({ min: 1, max: 1000 }).withMessage('Le message doit contenir entre 1 et 1000 caractères')
      .customSanitizer(sanitizeHtml),
    body('from').isInt().toInt(),
    body('to').isInt().toInt()
  ],

  // Authentification
  register: [
    body('username')
      .trim()
      .isLength({ min: 3, max: 20 }).withMessage('Le nom d\'utilisateur doit contenir entre 3 et 20 caractères')
      .matches(/^[a-zA-Z0-9_-]+$/).withMessage('Le nom d\'utilisateur ne peut contenir que des lettres, chiffres, - et _'),
    body('email')
      .trim()
      .isEmail().withMessage('Email invalide')
      .normalizeEmail(),
    body('password')
      .isLength({ min: 8 }).withMessage('Le mot de passe doit contenir au moins 8 caractères')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/).withMessage('Le mot de passe doit contenir au moins une majuscule, une minuscule, un chiffre et un caractère spécial')
  ],

  // Upload de fichiers
  fileUpload: [
    body('from').isInt().toInt(),
    body('to').isInt().toInt()
  ],

  // Paramètres d'URL
  userId: param('id').isInt().toInt(),
  groupId: param('groupId').isInt().toInt()
};

// Middleware de validation des erreurs
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      status: false,
      errors: errors.array().map(err => ({
        field: err.param,
        message: err.msg
      }))
    });
  }
  next();
};

module.exports = {
  validationRules,
  handleValidationErrors
};
```

## 5. 2FA Implementation

### Installation
```bash
npm install speakeasy qrcode
```

### 2FA Controller (server/controllers/twoFactorController.js)
```javascript
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const { PrismaClient } = require('../generated/prisma');
const prisma = new PrismaClient();

// Générer le secret 2FA
module.exports.generate2FA = async (req, res) => {
  try {
    const userId = req.userId; // From JWT middleware
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    const secret = speakeasy.generateSecret({
      name: `SecureChat (${user.email})`,
      issuer: 'SecureChat',
      length: 32
    });

    // Chiffrer et sauvegarder temporairement
    const encryptedSecret = encrypt(secret.base32);
    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorTempSecret: encryptedSecret.content,
        twoFactorTempSecretIv: encryptedSecret.iv
      }
    });

    // Générer QR code
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

    res.json({
      status: true,
      qrCode: qrCodeUrl,
      manualCode: secret.base32
    });
  } catch (error) {
    res.status(500).json({ status: false, msg: 'Erreur lors de la génération 2FA' });
  }
};

// Activer 2FA
module.exports.enable2FA = async (req, res) => {
  try {
    const userId = req.userId;
    const { token } = req.body;

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user.twoFactorTempSecret) {
      return res.status(400).json({ 
        status: false, 
        msg: 'Aucun secret 2FA en attente' 
      });
    }

    // Déchiffrer le secret
    const secret = decrypt({
      content: user.twoFactorTempSecret,
      iv: user.twoFactorTempSecretIv
    });

    // Vérifier le token
    const verified = speakeasy.totp.verify({
      secret: secret,
      encoding: 'base32',
      token: token,
      window: 2
    });

    if (!verified) {
      return res.status(400).json({ 
        status: false, 
        msg: 'Code invalide' 
      });
    }

    // Activer 2FA
    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: true,
        twoFactorSecret: user.twoFactorTempSecret,
        twoFactorSecretIv: user.twoFactorTempSecretIv,
        twoFactorTempSecret: null,
        twoFactorTempSecretIv: null
      }
    });

    // Générer des codes de récupération
    const recoveryCodes = Array.from({ length: 10 }, () => 
      Math.random().toString(36).substring(2, 10).toUpperCase()
    );

    // Hasher et sauvegarder les codes
    const hashedCodes = await Promise.all(
      recoveryCodes.map(code => bcrypt.hash(code, 10))
    );

    await prisma.recoveryCode.createMany({
      data: hashedCodes.map(code => ({
        userId,
        code,
        used: false
      }))
    });

    res.json({
      status: true,
      msg: '2FA activé avec succès',
      recoveryCodes
    });
  } catch (error) {
    res.status(500).json({ status: false, msg: 'Erreur lors de l\'activation 2FA' });
  }
};

// Vérifier 2FA lors du login
module.exports.verify2FA = async (req, res) => {
  try {
    const { userId, token } = req.body;

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user.twoFactorEnabled) {
      return res.status(400).json({ 
        status: false, 
        msg: '2FA non activé' 
      });
    }

    // Déchiffrer le secret
    const secret = decrypt({
      content: user.twoFactorSecret,
      iv: user.twoFactorSecretIv
    });

    // Vérifier le token
    const verified = speakeasy.totp.verify({
      secret: secret,
      encoding: 'base32',
      token: token,
      window: 2
    });

    if (!verified) {
      // Vérifier si c'est un code de récupération
      const recoveryCodes = await prisma.recoveryCode.findMany({
        where: { userId, used: false }
      });

      let validRecoveryCode = false;
      for (const recoveryCode of recoveryCodes) {
        if (await bcrypt.compare(token, recoveryCode.code)) {
          // Marquer comme utilisé
          await prisma.recoveryCode.update({
            where: { id: recoveryCode.id },
            data: { used: true }
          });
          validRecoveryCode = true;
          break;
        }
      }

      if (!validRecoveryCode) {
        return res.status(400).json({ 
          status: false, 
          msg: 'Code invalide' 
        });
      }
    }

    // Générer les tokens JWT
    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    res.json({
      status: true,
      accessToken,
      refreshToken
    });
  } catch (error) {
    res.status(500).json({ status: false, msg: 'Erreur lors de la vérification 2FA' });
  }
};
```

## 6. Monitoring et Logging

### Installation
```bash
npm install winston express-winston
```

### Logger Configuration (server/utils/logger.js)
```javascript
const winston = require('winston');
const path = require('path');

// Format personnalisé
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Logger principal
const logger = winston.createLogger({
  format: logFormat,
  defaultMeta: { service: 'securechat' },
  transports: [
    // Logs d'erreur
    new winston.transports.File({
      filename: path.join(__dirname, '../logs/error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Logs de sécurité
    new winston.transports.File({
      filename: path.join(__dirname, '../logs/security.log'),
      level: 'warn',
      maxsize: 5242880,
      maxFiles: 5,
    }),
    // Tous les logs
    new winston.transports.File({
      filename: path.join(__dirname, '../logs/combined.log'),
      maxsize: 5242880,
      maxFiles: 5,
    })
  ],
});

// Console en développement
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

// Fonctions utilitaires
logger.security = (message, meta = {}) => {
  logger.warn(message, { type: 'security', ...meta });
};

logger.audit = (action, userId, details = {}) => {
  logger.info('Audit log', {
    type: 'audit',
    action,
    userId,
    timestamp: new Date().toISOString(),
    ...details
  });
};

module.exports = logger;
```

## 7. WebSocket Security

### Secure Socket.io (server/socketSecurity.js)
```javascript
const jwt = require('jsonwebtoken');
const rateLimitMap = new Map();

// Middleware d'authentification Socket.io
const socketAuth = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('Authentication required'));
    }

    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    
    // Vérifier l'utilisateur en base
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, username: true, isBanned: true }
    });

    if (!user || user.isBanned) {
      return next(new Error('Access denied'));
    }

    socket.userId = user.id;
    socket.username = user.username;
    next();
  } catch (err) {
    next(new Error('Invalid token'));
  }
};

// Rate limiting pour Socket.io
const socketRateLimit = (eventName, maxRequests = 30, windowMs = 60000) => {
  return (socket, next) => {
    const key = `${socket.userId}:${eventName}`;
    const now = Date.now();
    const windowStart = now - windowMs;

    if (!rateLimitMap.has(key)) {
      rateLimitMap.set(key, []);
    }

    const requests = rateLimitMap.get(key).filter(timestamp => timestamp > windowStart);
    
    if (requests.length >= maxRequests) {
      return next(new Error('Rate limit exceeded'));
    }

    requests.push(now);
    rateLimitMap.set(key, requests);
    next();
  };
};

// Validation des données Socket.io
const validateSocketData = (schema) => {
  return (data, next) => {
    const { error, value } = schema.validate(data);
    if (error) {
      return next(new Error('Invalid data'));
    }
    next();
  };
};

// Configuration Socket.io sécurisée
const configureSecureSocket = (io) => {
  // Authentification
  io.use(socketAuth);

  io.on('connection', (socket) => {
    logger.info('Socket connected', { userId: socket.userId });

    // Rate limiting par événement
    socket.use(([event, ...args], next) => {
      const limiter = socketRateLimit(event);
      limiter(socket, next);
    });

    // Gestion sécurisée des événements
    socket.on('send-msg', socketRateLimit('send-msg', 30, 60000), async (data) => {
      try {
        // Validation et traitement
        if (!data.to || !data.message) {
          throw new Error('Invalid message data');
        }

        // Vérifier les permissions
        const canSend = await checkUserCanSendTo(socket.userId, data.to);
        if (!canSend) {
          throw new Error('Permission denied');
        }

        // Émettre le message
        socket.to(data.to).emit('msg-receive', {
          message: data.message,
          from: socket.userId
        });

        logger.audit('message_sent', socket.userId, { to: data.to });
      } catch (error) {
        logger.security('Socket message error', {
          userId: socket.userId,
          error: error.message
        });
      }
    });

    socket.on('disconnect', () => {
      logger.info('Socket disconnected', { userId: socket.userId });
    });
  });
};

module.exports = {
  socketAuth,
  socketRateLimit,
  validateSocketData,
  configureSecureSocket
};
```

## 8. Mise à jour du serveur principal

### server/index.js sécurisé
```javascript
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { createServer } = require('https');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Import des middlewares de sécurité
const securityHeaders = require('./middleware/security');
const { generalLimiter, loginLimiter, messageLimiter } = require('./middleware/rateLimiter');
const { authenticateToken } = require('./middleware/auth');
const logger = require('./utils/logger');

const app = express();

// HTTPS en production
let server;
if (process.env.NODE_ENV === 'production') {
  const httpsOptions = {
    key: fs.readFileSync(path.join(__dirname, 'ssl/private.key')),
    cert: fs.readFileSync(path.join(__dirname, 'ssl/certificate.crt'))
  };
  server = createServer(httpsOptions, app);
} else {
  server = require('http').createServer(app);
}

// Socket.io avec sécurité
const io = require('socket.io')(server, {
  cors: {
    origin: process.env.CLIENT_URL,
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000
});

// Middlewares de sécurité globaux
app.use(securityHeaders);
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// CORS sécurisé
app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting global
app.use('/api/', generalLimiter);

// Logging des requêtes
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`, {
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
  next();
});

// Routes publiques avec rate limiting spécifique
app.use('/api/auth/login', loginLimiter);
app.use('/api/auth/register', loginLimiter);

// Routes protégées
app.use('/api/messages', authenticateToken, messageLimiter);
app.use('/api/users', authenticateToken);
app.use('/api/groups', authenticateToken);

// Gestion des erreurs globale
app.use((err, req, res, next) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method
  });

  res.status(500).json({
    status: false,
    msg: process.env.NODE_ENV === 'production' 
      ? 'Une erreur est survenue' 
      : err.message
  });
});

// Configuration Socket.io sécurisée
const { configureSecureSocket } = require('./socketSecurity');
configureSecureSocket(io);

// Démarrage du serveur
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  logger.info(`Serveur sécurisé démarré sur le port ${PORT}`);
});
```

## Conclusion

Ces implémentations couvrent les principaux aspects de sécurité manquants. Il est important de :

1. **Tester** chaque fonctionnalité en profondeur
2. **Documenter** les changements pour l'équipe
3. **Former** les développeurs aux nouvelles pratiques
4. **Monitorer** continuellement les logs de sécurité
5. **Mettre à jour** régulièrement les dépendances

N'oubliez pas d'adapter ces exemples à votre architecture spécifique et de les tester dans un environnement de développement avant la mise en production. 