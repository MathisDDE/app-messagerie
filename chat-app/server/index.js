const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const { Pool } = require("pg");
const userRoutes = require("./routes/userRoutes");
const msgRoute = require("./routes/msgRoutes");
const adminRoutes = require("./routes/adminRoutes");
const exportRoutes = require("./routes/exportRoutes");
const groupRoutes = require("./routes/groupRoutes");
const moderationRoutes = require("./routes/moderationRoutes");
const gdprRoutes = require("./routes/gdprRoutes");
const fileUpload = require("express-fileupload");
const path = require("path");
const fs = require('fs');

require("dotenv").config();

// Initialize App with express
const app = express();

// integrate socket.io
const socket = require("socket.io");

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'https://securechat-tqsn.onrender.com',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['set-cookie']
}));

app.use(cookieParser());
app.use(express.json());

// Créer le dossier uploads s'il n'existe pas
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configuration du middleware de fichiers
app.use(fileUpload({
  createParentPath: true,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  abortOnLimit: true,
  safeFileNames: true,
  preserveExtension: true
}));

// Servir les fichiers uploadés
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.connect()
  .then(() => {
    console.log("PostgreSQL Connection Successfull");
  })
  .catch((err) => {
    console.error("PostgreSQL connection error:", err.message);
  });

// Injecter le pool dans req pour l'utiliser dans les routes
app.use((req, res, next) => {
  req.pg = pool;
  next();
});

// Routes
app.use("/api/auth", userRoutes);
app.use("/api/messages", msgRoute);
app.use("/api/admin", adminRoutes);
app.use("/api/export", exportRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/moderation", moderationRoutes);
app.use("/api/gdpr", gdprRoutes);

// Ne démarrer le serveur que si nous ne sommes pas en mode test
let server;
if (process.env.NODE_ENV !== 'test') {
  server = app.listen(process.env.PORT, () => {
    console.log(`Server started on port ${process.env.PORT}`);
  });

  // socket io initialize
  const io = socket(server, {
    cors: {
      origin: process.env.CLIENT_URL,
      credentials: true,
    },
  });

  // Socket.IO logic...
  // ... rest of your socket.io code ...
}

module.exports = { app, server };
