const { PrismaClient } = require('../generated/prisma');
const aiModerationService = require('../services/aiModerationService');

const prisma = new PrismaClient();
const crypto = require('crypto');

// Encryption helpers
const encrypt = (msg) => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(
    process.env.MESSAGE_ALGORITHM.replace(/"/g, ''), // Remove quotes if present
    Buffer.from(process.env.MESSAGE_SECRET_KEY.replace(/"/g, ''), 'hex'),
    iv
  );
  const encrypted = Buffer.concat([cipher.update(msg), cipher.final()]);
  return {
    iv: iv.toString('hex'),
    content: encrypted.toString('hex'),
  };
};

const decrypt = (hash) => {
  const decipher = crypto.createDecipheriv(
    process.env.MESSAGE_ALGORITHM.replace(/"/g, ''),
    Buffer.from(process.env.MESSAGE_SECRET_KEY.replace(/"/g, ''), 'hex'),
    Buffer.from(hash.iv, 'hex')
  );
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(hash.content, 'hex')),
    decipher.final(),
  ]);
  return decrypted.toString();
};

// Add Message
module.exports.addMessage = async (req, res, next) => {
  try {
    const { from, to, message } = req.body;
    
    // Protection XSS - Analyse du contenu du message avant traitement
    console.log('📨 Message reçu pour analyse:', message);
    
    // Protection XSS - Analyse IA pour détecter le contenu malveillant
    const analysis = await aiModerationService.analyzeWithAI(message);
    
    // Protection XSS - Blocage des messages à haut risque
    if (analysis.riskScore >= 70) {
      console.log('🛑 Message BLOQUÉ - Score:', analysis.riskScore);
      
      // Protection SQL Injection - Utilisation de Prisma avec des paramètres typés
      await prisma.moderationLog.create({
        data: {
          messageId: 0,
          senderId: Number(from), // Conversion sécurisée en nombre
          action: 'BLOCKED',
          riskScore: analysis.riskScore,
          analysis: analysis,
          blocked: true,
          warned: false
        }
      });
      
      return res.status(403).json({ 
        msg: "Message bloqué pour des raisons de sécurité",
        blocked: true,
        analysis: analysis,
        securityTips: aiModerationService.getSecurityTips(analysis)
      });
    }
    
    // Protection XSS - Chiffrement du message avant stockage
    const encryptedData = encrypt(message);

    // Protection SQL Injection - Utilisation de Prisma avec paramètres typés
    const newMessage = await prisma.message.create({
      data: {
        content: encryptedData.content,
        iv: encryptedData.iv,
        senderId: Number(from), // Conversion sécurisée en nombre
        receiverId: Number(to), // Conversion sécurisée en nombre
      },
    });
    
    // Enregistrer l'analyse dans les logs
    await prisma.moderationLog.create({
      data: {
        messageId: newMessage.id,
        senderId: Number(from),
        action: analysis.riskScore >= 40 ? 'WARNED' : 'ALLOWED',
        riskScore: analysis.riskScore,
        analysis: analysis,
        blocked: false,
        warned: analysis.riskScore >= 40
      }
    });

    // Retourner le résultat avec l'analyse si nécessaire
    const response = {
      msg: "Message added successfully.",
      messageId: newMessage.id
    };
    
    // Si le message est suspect (score moyen), ajouter un avertissement
    if (analysis.riskScore >= 40) {
      console.log('⚠️ Message SUSPECT - Score:', analysis.riskScore);
      response.warning = true;
      response.analysis = analysis;
      response.securityTips = aiModerationService.getSecurityTips(analysis);
    } else {
      console.log('✅ Message SÛR - Score:', analysis.riskScore);
    }

    return res.json(response);
  } catch (ex) {
    console.log(ex);
    next(ex);
  }
};

// Get All Messages
module.exports.getAllMessages = async (req, res, next) => {
  try {
    const { from, to } = req.body;
    const currentTime = new Date();
    
    const messages = await prisma.message.findMany({
      where: {
        AND: [
          {
            OR: [
              { senderId: Number(from), receiverId: Number(to) },
              { senderId: Number(to), receiverId: Number(from) },
            ]
          },
          { isDeleted: false }, // Ne pas retourner les messages supprimés
          {
            OR: [
              { expiresAt: null }, // Messages non éphémères
              { expiresAt: { gt: currentTime } } // Messages éphémères non expirés
            ]
          }
        ]
      },
      orderBy: { createdAt: 'asc' },
      include: {
        reactions: {
          include: {
            user: true
          }
        },
        replyTo: {
          include: {
            sender: true
          }
        }
      }
    });

    const allMessages = messages.map((msg) => {
      // Gérer les fichiers différemment
      if (msg.content === "FILE_ATTACHMENT") {
        return {
          id: msg.id,
          fromSelf: msg.senderId === Number(from),
          message: "FILE_ATTACHMENT",
          fileUrl: msg.fileUrl,
          fileName: msg.fileName,
          fileType: msg.fileType,
          isEdited: msg.isEdited,
          createdAt: msg.createdAt,
          updatedAt: msg.updatedAt,
          expiresAt: msg.expiresAt,
          reactions: msg.reactions,
          replyTo: msg.replyTo
        };
      }
      
      // Messages normaux
      return {
        id: msg.id,
        fromSelf: msg.senderId === Number(from),
        message: decrypt({
          iv: msg.iv,
          content: msg.content
        }),
        isEdited: msg.isEdited,
        createdAt: msg.createdAt,
        updatedAt: msg.updatedAt,
        expiresAt: msg.expiresAt,
        reactions: msg.reactions,
        replyTo: msg.replyTo ? {
          id: msg.replyTo.id,
          message: msg.replyTo.content === "FILE_ATTACHMENT" ? 
            "FILE_ATTACHMENT" : 
            decrypt({ iv: msg.replyTo.iv, content: msg.replyTo.content }),
          sender: msg.replyTo.sender
        } : null
      };
    });

    return res.json(allMessages);
  } catch (ex) {
    console.log(ex);
    next(ex);
  }
};

// Rechercher des messages
module.exports.searchMessages = async (req, res, next) => {
  try {
    const userId = Number(req.params.userId);
    const { query, contactId } = req.query;

    if (!query || query.trim().length < 2) {
      return res.json({ messages: [], status: true });
    }

    // Construire la requête de base
    const whereClause = {
      AND: [
        {
          OR: [
            { senderId: userId },
            { receiverId: userId }
          ]
        },
        { isDeleted: false }
      ]
    };

    // Si un contact spécifique est fourni
    if (contactId) {
      whereClause.AND.push({
        OR: [
          { senderId: Number(contactId), receiverId: userId },
          { senderId: userId, receiverId: Number(contactId) }
        ]
      });
    }

    // Récupérer les messages
    const messages = await prisma.message.findMany({
      where: whereClause,
      include: {
        sender: { select: { id: true, username: true, avatarImage: true } },
        receiver: { select: { id: true, username: true, avatarImage: true } },
        replyTo: {
          include: {
            sender: { select: { username: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 100 // Limiter à 100 résultats
    });

    // Filtrer les messages qui correspondent à la recherche après déchiffrement
    const searchResults = [];
    const searchTerm = query.toLowerCase();

    for (const msg of messages) {
      // Ignorer les messages de fichiers pour la recherche textuelle
      if (msg.content === "FILE_ATTACHMENT") continue;
      
      const decryptedContent = decrypt({
        iv: msg.iv,
        content: msg.content
      });
      
      if (decryptedContent && decryptedContent.toLowerCase().includes(searchTerm)) {
        searchResults.push({
          id: msg.id,
          content: decryptedContent,
          senderId: msg.senderId,
          receiverId: msg.receiverId,
          sender: msg.sender,
          receiver: msg.receiver,
          createdAt: msg.createdAt,
          isEdited: msg.isEdited,
          fromSelf: msg.senderId === userId,
          replyTo: msg.replyTo ? {
            content: msg.replyTo.content === "FILE_ATTACHMENT" ? 
              "FILE_ATTACHMENT" : 
              decrypt({ iv: msg.replyTo.iv, content: msg.replyTo.content }),
            sender: msg.replyTo.sender
          } : null,
          // Ajouter le contexte de la conversation
          conversationWith: msg.senderId === userId ? msg.receiver : msg.sender
        });
      }
    }

    return res.json({ 
      messages: searchResults, 
      count: searchResults.length,
      status: true 
    });
  } catch (ex) {
    console.error('Search error:', ex);
    next(ex);
  }
};
