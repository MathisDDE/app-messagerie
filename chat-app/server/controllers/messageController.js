const decryptMessage = (encryptedContent, iv) => {
  const algorithm = 'aes-256-cbc';
  const key = Buffer.from(process.env.MESSAGE_SECRET_KEY.replace(/"/g, ''), 'hex');
  
  try {
    const decipher = crypto.createDecipheriv(algorithm, key, Buffer.from(iv, 'hex'));
    let decrypted = decipher.update(encryptedContent, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    return null;
  }
};

// Supprimer définitivement les messages éphémères expirés
const cleanupExpiredMessages = async () => {
  try {
    await prisma.message.updateMany({
      where: {
        expiresAt: {
          lte: new Date()
        },
        isDeleted: false
      },
      data: {
        isDeleted: true,
        deletedAt: new Date()
      }
    });
  } catch (error) {
    console.error('Error cleaning up expired messages:', error);
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
      const decryptedContent = decryptMessage(msg.content, msg.iv);
      
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
            content: msg.replyTo.content ? decryptMessage(msg.replyTo.content, msg.replyTo.iv) : null,
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

// Lancer le nettoyage périodiquement
setInterval(cleanupExpiredMessages, 60000); // Toutes les minutes 