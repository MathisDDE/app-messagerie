const { PrismaClient } = require('../generated/prisma');
const crypto = require('crypto');

const prisma = new PrismaClient();

// Déchiffrer un message
const decryptMessage = (content, iv) => {
  try {
    const algorithm = 'aes-256-cbc';
    const key = Buffer.from(process.env.MESSAGE_SECRET_KEY.replace(/"/g, ''), 'hex');
    const decipher = crypto.createDecipheriv(algorithm, key, Buffer.from(iv, 'hex'));
    let decrypted = decipher.update(content, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    return "[Erreur de déchiffrement]";
  }
};

// Export au format JSON
module.exports.exportToJSON = async (req, res, next) => {
  try {
    const userId = Number(req.params.userId);
    const { contactId, startDate, endDate } = req.query;

    // Construire la requête
    const whereClause = {
      OR: [
        { senderId: userId, receiverId: Number(contactId) },
        { senderId: Number(contactId), receiverId: userId }
      ],
      isDeleted: false
    };

    // Ajouter les filtres de date si fournis
    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) whereClause.createdAt.gte = new Date(startDate);
      if (endDate) whereClause.createdAt.lte = new Date(endDate);
    }

    // Récupérer les messages
    const messages = await prisma.message.findMany({
      where: whereClause,
      include: {
        sender: { select: { username: true } },
        receiver: { select: { username: true } },
        reactions: {
          include: {
            user: { select: { username: true } }
          }
        },
        replyTo: {
          include: {
            sender: { select: { username: true } }
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    // Récupérer les infos du contact
    const contact = await prisma.user.findUnique({
      where: { id: Number(contactId) },
      select: { username: true, email: true }
    });

    // Déchiffrer les messages
    const decryptedMessages = messages.map(msg => ({
      id: msg.id,
      content: decryptMessage(msg.content, msg.iv),
      sender: msg.sender.username,
      receiver: msg.receiver.username,
      timestamp: msg.createdAt,
      isEdited: msg.isEdited,
      reactions: msg.reactions.map(r => ({
        emoji: r.emoji,
        user: r.user.username
      })),
      replyTo: msg.replyTo ? {
        content: decryptMessage(msg.replyTo.content, msg.replyTo.iv),
        sender: msg.replyTo.sender.username
      } : null,
      fileInfo: msg.fileUrl ? {
        name: msg.fileName,
        type: msg.fileType,
        url: msg.fileUrl
      } : null
    }));

    const exportData = {
      exportDate: new Date(),
      conversation: {
        with: contact.username,
        email: contact.email,
        messageCount: decryptedMessages.length,
        dateRange: {
          from: messages[0]?.createdAt || null,
          to: messages[messages.length - 1]?.createdAt || null
        }
      },
      messages: decryptedMessages
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="conversation-${contact.username}-${Date.now()}.json"`);
    res.json(exportData);
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Erreur lors de l\'export' });
  }
};

// Export au format TXT
module.exports.exportToTXT = async (req, res, next) => {
  try {
    const userId = Number(req.params.userId);
    const { contactId, startDate, endDate } = req.query;

    const whereClause = {
      OR: [
        { senderId: userId, receiverId: Number(contactId) },
        { senderId: Number(contactId), receiverId: userId }
      ],
      isDeleted: false
    };

    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) whereClause.createdAt.gte = new Date(startDate);
      if (endDate) whereClause.createdAt.lte = new Date(endDate);
    }

    const messages = await prisma.message.findMany({
      where: whereClause,
      include: {
        sender: { select: { username: true } },
        receiver: { select: { username: true } }
      },
      orderBy: { createdAt: 'asc' }
    });

    const contact = await prisma.user.findUnique({
      where: { id: Number(contactId) },
      select: { username: true }
    });

    // Créer le contenu TXT
    let txtContent = `Conversation avec ${contact.username}\n`;
    txtContent += `Exportée le ${new Date().toLocaleString('fr-FR')}\n`;
    txtContent += `${'='.repeat(50)}\n\n`;

    messages.forEach(msg => {
      const content = decryptMessage(msg.content, msg.iv);
      const date = new Date(msg.createdAt).toLocaleString('fr-FR');
      txtContent += `[${date}] ${msg.sender.username}: ${content}\n`;
      if (msg.isEdited) txtContent += '(modifié)\n';
      txtContent += '\n';
    });

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="conversation-${contact.username}-${Date.now()}.txt"`);
    res.send(txtContent);
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Erreur lors de l\'export' });
  }
};

// Export de toutes les conversations
module.exports.exportAllConversations = async (req, res, next) => {
  try {
    const userId = Number(req.params.userId);

    // Récupérer tous les contacts avec qui l'utilisateur a échangé
    const conversations = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: userId },
          { receiverId: userId }
        ],
        isDeleted: false
      },
      select: {
        senderId: true,
        receiverId: true
      },
      distinct: ['senderId', 'receiverId']
    });

    // Extraire les IDs uniques des contacts
    const contactIds = new Set();
    conversations.forEach(msg => {
      if (msg.senderId !== userId) contactIds.add(msg.senderId);
      if (msg.receiverId !== userId) contactIds.add(msg.receiverId);
    });

    const allConversations = [];

    // Pour chaque contact, récupérer les messages
    for (const contactId of contactIds) {
      const messages = await prisma.message.findMany({
        where: {
          OR: [
            { senderId: userId, receiverId: contactId },
            { senderId: contactId, receiverId: userId }
          ],
          isDeleted: false
        },
        include: {
          sender: { select: { username: true } },
          receiver: { select: { username: true } }
        },
        orderBy: { createdAt: 'asc' }
      });

      const contact = await prisma.user.findUnique({
        where: { id: contactId },
        select: { username: true }
      });

      const decryptedMessages = messages.map(msg => ({
        content: decryptMessage(msg.content, msg.iv),
        sender: msg.sender.username,
        timestamp: msg.createdAt,
        isEdited: msg.isEdited
      }));

      allConversations.push({
        contact: contact.username,
        messageCount: messages.length,
        messages: decryptedMessages
      });
    }

    const exportData = {
      exportDate: new Date(),
      totalConversations: allConversations.length,
      conversations: allConversations
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="all-conversations-${Date.now()}.json"`);
    res.json(exportData);
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Erreur lors de l\'export' });
  }
};
