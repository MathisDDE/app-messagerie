const { PrismaClient } = require('../generated/prisma');
const prisma = new PrismaClient();
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Helpers pour le chiffrement
const encrypt = (msg) => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(
    process.env.MESSAGE_ALGORITHM.replace(/"/g, ''),
    Buffer.from(process.env.MESSAGE_SECRET_KEY.replace(/"/g, ''), 'hex'),
    iv
  );
  const encrypted = Buffer.concat([cipher.update(msg), cipher.final()]);
  return {
    iv: iv.toString('hex'),
    content: encrypted.toString('hex'),
  };
};

// Ajouter une réaction à un message
module.exports.addReaction = async (req, res, next) => {
  try {
    const { messageId, emoji, userId } = req.body;

    // Vérifier si la réaction existe déjà
    const existingReaction = await prisma.reaction.findFirst({
      where: {
        messageId: Number(messageId),
        userId: Number(userId),
        emoji: emoji
      }
    });

    if (existingReaction) {
      // Si elle existe, la supprimer (toggle)
      await prisma.reaction.delete({
        where: { id: existingReaction.id }
      });
      return res.json({ msg: "Reaction removed", action: "removed" });
    }

    // Sinon, créer la réaction
    const reaction = await prisma.reaction.create({
      data: {
        messageId: Number(messageId),
        userId: Number(userId),
        emoji: emoji
      }
    });

    return res.json({ msg: "Reaction added", action: "added", reaction });
  } catch (ex) {
    console.log(ex);
    next(ex);
  }
};

// Obtenir toutes les réactions d'un message
module.exports.getReactions = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    
    // Vérifier que messageId est valide
    if (!messageId || isNaN(Number(messageId))) {
      return res.json([]); // Retourner un tableau vide si pas d'ID valide
    }

    const reactions = await prisma.reaction.findMany({
      where: { messageId: Number(messageId) },
      include: { user: true }
    });

    // Grouper les réactions par emoji
    const groupedReactions = reactions.reduce((acc, reaction) => {
      if (!acc[reaction.emoji]) {
        acc[reaction.emoji] = {
          emoji: reaction.emoji,
          count: 0,
          users: []
        };
      }
      acc[reaction.emoji].count++;
      acc[reaction.emoji].users.push({
        id: reaction.user.id,
        username: reaction.user.username
      });
      return acc;
    }, {});

    return res.json(Object.values(groupedReactions));
  } catch (ex) {
    console.log(ex);
    next(ex);
  }
};

// Modifier un message
module.exports.editMessage = async (req, res, next) => {
  try {
    const { messageId, newContent, userId } = req.body;

    // Vérifier que l'utilisateur est l'auteur du message
    const message = await prisma.message.findUnique({
      where: { id: Number(messageId) }
    });

    if (!message || message.senderId !== Number(userId)) {
      return res.status(403).json({ msg: "Unauthorized to edit this message" });
    }

    // Vérifier que le message n'est pas trop ancien (5 minutes max)
    const messageAge = Date.now() - new Date(message.createdAt).getTime();
    const fiveMinutes = 5 * 60 * 1000;
    
    if (messageAge > fiveMinutes) {
      return res.status(400).json({ msg: "Message too old to edit" });
    }

    const encryptedData = encrypt(newContent);

    // Mettre à jour le message
    const updatedMessage = await prisma.message.update({
      where: { id: Number(messageId) },
      data: {
        content: encryptedData.content,
        iv: encryptedData.iv,
        isEdited: true,
        updatedAt: new Date()
      }
    });

    return res.json({ msg: "Message edited", message: updatedMessage });
  } catch (ex) {
    console.log(ex);
    next(ex);
  }
};

// Supprimer un message (soft delete)
module.exports.deleteMessage = async (req, res, next) => {
  try {
    const { messageId, userId } = req.body;

    // Vérifier que l'utilisateur est l'auteur du message
    const message = await prisma.message.findUnique({
      where: { id: Number(messageId) }
    });

    if (!message || message.senderId !== Number(userId)) {
      return res.status(403).json({ msg: "Unauthorized to delete this message" });
    }

    // Soft delete
    const deletedMessage = await prisma.message.update({
      where: { id: Number(messageId) },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        content: "", // Vider le contenu
        iv: ""
      }
    });

    return res.json({ msg: "Message deleted", messageId: deletedMessage.id });
  } catch (ex) {
    console.log(ex);
    next(ex);
  }
};

// Créer un message éphémère
module.exports.createEphemeralMessage = async (req, res, next) => {
  try {
    const { from, to, message, expiresInMinutes = 5 } = req.body;

    const encryptedData = encrypt(message);
    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

    const ephemeralMessage = await prisma.message.create({
      data: {
        content: encryptedData.content,
        iv: encryptedData.iv,
        senderId: Number(from),
        receiverId: Number(to),
        expiresAt: expiresAt
      }
    });

    // Programmer la suppression automatique
    setTimeout(async () => {
      try {
        await prisma.message.update({
          where: { id: ephemeralMessage.id },
          data: {
            isDeleted: true,
            deletedAt: new Date(),
            content: "",
            iv: ""
          }
        });
      } catch (err) {
        console.log("Error deleting ephemeral message:", err);
      }
    }, expiresInMinutes * 60 * 1000);

    return res.json({ 
      msg: "Ephemeral message sent", 
      messageId: ephemeralMessage.id,
      expiresAt: expiresAt 
    });
  } catch (ex) {
    console.log(ex);
    next(ex);
  }
};

// Répondre à un message spécifique
module.exports.replyToMessage = async (req, res, next) => {
  try {
    const { from, to, message, replyToId } = req.body;

    // Vérifier que le message original existe
    const originalMessage = await prisma.message.findUnique({
      where: { id: Number(replyToId) }
    });

    if (!originalMessage) {
      return res.status(404).json({ msg: "Original message not found" });
    }

    const encryptedData = encrypt(message);

    const replyMessage = await prisma.message.create({
      data: {
        content: encryptedData.content,
        iv: encryptedData.iv,
        senderId: Number(from),
        receiverId: Number(to),
        replyToId: Number(replyToId)
      },
      include: {
        replyTo: {
          include: {
            sender: true
          }
        }
      }
    });

    return res.json({ msg: "Reply sent", message: replyMessage });
  } catch (ex) {
    console.log(ex);
    next(ex);
  }
};

// Upload de fichier
module.exports.uploadFile = async (req, res, next) => {
  try {
    if (!req.files || !req.files.file) {
      return res.status(400).json({ msg: "No file uploaded" });
    }

    const file = req.files.file;
    const { from, to } = req.body;

    // Créer le dossier uploads s'il n'existe pas
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Générer un nom unique pour le fichier
    const uniqueName = `${Date.now()}_${Math.random().toString(36).substring(7)}_${file.name}`;
    const filePath = path.join(uploadDir, uniqueName);

    // Sauvegarder le fichier
    await file.mv(filePath);

    // Créer le message avec les infos du fichier
    const fileMessage = await prisma.message.create({
      data: {
        content: "FILE_ATTACHMENT",
        iv: "0", // Pas de chiffrement pour le marqueur
        senderId: Number(from),
        receiverId: Number(to),
        fileUrl: `/uploads/${uniqueName}`,
        fileName: file.name,
        fileType: file.mimetype
      }
    });

    return res.json({ 
      msg: "File uploaded successfully", 
      message: fileMessage 
    });
  } catch (ex) {
    console.log(ex);
    next(ex);
  }
};





