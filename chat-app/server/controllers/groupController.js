require('dotenv').config();
const { PrismaClient } = require('../generated/prisma');
const crypto = require('crypto');

const prisma = new PrismaClient();

// Helpers pour le chiffrement
const encrypt = (msg) => {
  const algorithm = 'aes-256-cbc';
  const key = Buffer.from(process.env.MESSAGE_SECRET_KEY.replace(/"/g, ''), 'hex');
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  const encrypted = Buffer.concat([cipher.update(msg), cipher.final()]);
  return {
    iv: iv.toString('hex'),
    content: encrypted.toString('hex'),
  };
};

const decrypt = (content, iv) => {
  const algorithm = 'aes-256-cbc';
  const key = Buffer.from(process.env.MESSAGE_SECRET_KEY.replace(/"/g, ''), 'hex');
  const decipher = crypto.createDecipheriv(algorithm, key, Buffer.from(iv, 'hex'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(content, 'hex')),
    decipher.final(),
  ]);
  return decrypted.toString();
};

// Créer un groupe
module.exports.createGroup = async (req, res, next) => {
  try {
    const { name, description, memberIds } = req.body;
    const creatorId = Number(req.params.userId);

    // Créer le groupe
    const group = await prisma.group.create({
      data: {
        name,
        description,
        createdBy: creatorId,
        members: {
          create: [
            // Ajouter le créateur comme admin
            { userId: creatorId, role: 'ADMIN' },
            // Ajouter les autres membres
            ...memberIds.map(id => ({ userId: Number(id), role: 'MEMBER' }))
          ]
        }
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatarImage: true
              }
            }
          }
        },
        creator: {
          select: {
            id: true,
            username: true
          }
        }
      }
    });

    // Créer un message système pour annoncer la création
    const systemMessage = `${group.creator.username} a créé le groupe "${name}"`;
    const encrypted = encrypt(systemMessage);
    
    await prisma.groupMessage.create({
      data: {
        content: encrypted.content,
        iv: encrypted.iv,
        groupId: group.id,
        senderId: creatorId
      }
    });

    return res.json({ status: true, group });
  } catch (ex) {
    console.error(ex);
    next(ex);
  }
};

// Obtenir tous les groupes d'un utilisateur
module.exports.getUserGroups = async (req, res, next) => {
  try {
    const userId = Number(req.params.userId);

    const groups = await prisma.group.findMany({
      where: {
        members: {
          some: {
            userId
          }
        }
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatarImage: true
              }
            }
          }
        },
        _count: {
          select: {
            messages: true
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    return res.json({ status: true, groups });
  } catch (ex) {
    console.error(ex);
    next(ex);
  }
};

// Obtenir les messages d'un groupe
module.exports.getGroupMessages = async (req, res, next) => {
  try {
    const groupId = Number(req.params.groupId);
    const userId = Number(req.params.userId);

    // Vérifier que l'utilisateur est membre du groupe
    const membership = await prisma.groupMember.findFirst({
      where: {
        groupId,
        userId
      }
    });

    if (!membership) {
      return res.status(403).json({ msg: "Vous n'êtes pas membre de ce groupe", status: false });
    }

    const messages = await prisma.groupMessage.findMany({
      where: {
        groupId,
        isDeleted: false
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            avatarImage: true
          }
        },
        replyTo: {
          include: {
            sender: {
              select: {
                username: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    // Déchiffrer les messages
    const decryptedMessages = messages.map(msg => {
      if (msg.content === "FILE_ATTACHMENT") {
        return {
          id: msg.id,
          fromSelf: msg.senderId === userId,
          message: "FILE_ATTACHMENT",
          fileUrl: msg.fileUrl,
          fileName: msg.fileName,
          fileType: msg.fileType,
          sender: msg.sender,
          isEdited: msg.isEdited,
          createdAt: msg.createdAt,
          updatedAt: msg.updatedAt
        };
      }

      return {
        id: msg.id,
        fromSelf: msg.senderId === userId,
        message: decrypt(msg.content, msg.iv),
        sender: msg.sender,
        isEdited: msg.isEdited,
        createdAt: msg.createdAt,
        updatedAt: msg.updatedAt,
        replyTo: msg.replyTo ? {
          id: msg.replyTo.id,
          message: msg.replyTo.content === "FILE_ATTACHMENT" ?
            "FILE_ATTACHMENT" :
            decrypt(msg.replyTo.content, msg.replyTo.iv),
          sender: msg.replyTo.sender
        } : null
      };
    });

    return res.json({ status: true, messages: decryptedMessages });
  } catch (ex) {
    console.error(ex);
    next(ex);
  }
};

// Envoyer un message dans un groupe
module.exports.sendGroupMessage = async (req, res, next) => {
  try {
    const { groupId, message } = req.body;
    const senderId = Number(req.params.userId);

    // Vérifier que l'utilisateur est membre du groupe
    const membership = await prisma.groupMember.findFirst({
      where: {
        groupId: Number(groupId),
        userId: senderId
      }
    });

    if (!membership) {
      return res.status(403).json({ msg: "Vous n'êtes pas membre de ce groupe", status: false });
    }

    // Chiffrer et enregistrer le message
    const encrypted = encrypt(message);
    const groupMessage = await prisma.groupMessage.create({
      data: {
        content: encrypted.content,
        iv: encrypted.iv,
        groupId: Number(groupId),
        senderId
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            avatarImage: true
          }
        }
      }
    });

    // Mettre à jour la date de dernière activité du groupe
    await prisma.group.update({
      where: { id: Number(groupId) },
      data: { updatedAt: new Date() }
    });

    return res.json({ 
      status: true, 
      message: {
        ...groupMessage,
        message: message,
        fromSelf: true
      }
    });
  } catch (ex) {
    console.error(ex);
    next(ex);
  }
};

// Ajouter des membres à un groupe
module.exports.addGroupMembers = async (req, res, next) => {
  try {
    const groupId = Number(req.params.groupId);
    const adminId = Number(req.params.userId);
    const { memberIds } = req.body;

    // Vérifier que l'utilisateur est admin du groupe
    const adminMembership = await prisma.groupMember.findFirst({
      where: {
        groupId,
        userId: adminId,
        role: 'ADMIN'
      }
    });

    if (!adminMembership) {
      return res.status(403).json({ msg: "Seuls les admins peuvent ajouter des membres", status: false });
    }

    // Ajouter les nouveaux membres
    const newMembers = await Promise.all(
      memberIds.map(async (userId) => {
        // Vérifier si l'utilisateur n'est pas déjà membre
        const existing = await prisma.groupMember.findFirst({
          where: { groupId, userId: Number(userId) }
        });

        if (!existing) {
          return await prisma.groupMember.create({
            data: {
              groupId,
              userId: Number(userId),
              role: 'MEMBER'
            },
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  avatarImage: true
                }
              }
            }
          });
        }
        return null;
      })
    );

    // Filtrer les null (membres déjà existants)
    const addedMembers = newMembers.filter(m => m !== null);

    // Créer un message système pour annoncer les nouveaux membres
    if (addedMembers.length > 0) {
      const admin = await prisma.user.findUnique({
        where: { id: adminId },
        select: { username: true }
      });

      const memberNames = addedMembers.map(m => m.user.username).join(', ');
      const systemMessage = `${admin.username} a ajouté ${memberNames} au groupe`;
      const encrypted = encrypt(systemMessage);

      await prisma.groupMessage.create({
        data: {
          content: encrypted.content,
          iv: encrypted.iv,
          groupId,
          senderId: adminId
        }
      });
    }

    return res.json({ status: true, addedMembers });
  } catch (ex) {
    console.error(ex);
    next(ex);
  }
};

// Quitter un groupe
module.exports.leaveGroup = async (req, res, next) => {
  try {
    const groupId = Number(req.params.groupId);
    const userId = Number(req.params.userId);

    // Supprimer le membre
    await prisma.groupMember.deleteMany({
      where: {
        groupId,
        userId
      }
    });

    // Créer un message système
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { username: true }
    });

    const systemMessage = `${user.username} a quitté le groupe`;
    const encrypted = encrypt(systemMessage);

    await prisma.groupMessage.create({
      data: {
        content: encrypted.content,
        iv: encrypted.iv,
        groupId,
        senderId: userId
      }
    });

    return res.json({ status: true, msg: "Vous avez quitté le groupe" });
  } catch (ex) {
    console.error(ex);
    next(ex);
  }
}; 