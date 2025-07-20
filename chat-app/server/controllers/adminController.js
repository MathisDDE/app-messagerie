const { PrismaClient } = require('../generated/prisma');
const crypto = require('crypto');

const prisma = new PrismaClient();

// Obtenir les statistiques du dashboard
module.exports.getDashboardStats = async (req, res, next) => {
  try {
    const userId = Number(req.params.userId);
    
    // Vérifier que l'utilisateur est admin
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (!user || user.role !== 'ADMIN') {
      return res.status(403).json({ msg: "Accès refusé", status: false });
    }

    // Statistiques des utilisateurs
    const totalUsers = await prisma.user.count();
    const activeUsers = await prisma.user.count({
      where: {
        lastLogin: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Actifs dans les dernières 24h
        }
      }
    });
    const bannedUsers = await prisma.user.count({
      where: { isBanned: true }
    });

    // Statistiques des messages
    const totalMessages = await prisma.message.count();
    const todayMessages = await prisma.message.count({
      where: {
        createdAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0))
        }
      }
    });
    const weekMessages = await prisma.message.count({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        }
      }
    });

    // Nouveaux utilisateurs cette semaine
    const newUsersThisWeek = await prisma.user.count({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        }
      }
    });

    return res.json({
      stats: {
        totalUsers,
        activeUsers,
        bannedUsers,
        newUsersThisWeek,
        totalMessages,
        todayMessages,
        weekMessages
      },
      status: true
    });
  } catch (ex) {
    console.error(ex);
    next(ex);
  }
};

// Obtenir tous les utilisateurs avec infos détaillées
module.exports.getAllUsersAdmin = async (req, res, next) => {
  try {
    const userId = Number(req.params.userId);
    
    // Vérifier que l'utilisateur est admin
    const admin = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (!admin || admin.role !== 'ADMIN') {
      return res.status(403).json({ msg: "Accès refusé", status: false });
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        avatarImage: true,
        role: true,
        isBanned: true,
        bannedAt: true,
        bannedReason: true,
        lastLogin: true,
        createdAt: true,
        _count: {
          select: {
            messagesSent: true,
            messagesReceived: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return res.json({ users, status: true });
  } catch (ex) {
    console.error(ex);
    next(ex);
  }
};

// Bannir/Débannir un utilisateur
module.exports.toggleBanUser = async (req, res, next) => {
  try {
    const adminId = Number(req.params.adminId);
    const targetUserId = Number(req.params.userId);
    const { reason } = req.body;

    // Vérifier que l'utilisateur est admin
    const admin = await prisma.user.findUnique({
      where: { id: adminId }
    });
    
    if (!admin || admin.role !== 'ADMIN') {
      return res.status(403).json({ msg: "Accès refusé", status: false });
    }

    // Obtenir l'utilisateur cible
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId }
    });

    if (!targetUser) {
      return res.status(404).json({ msg: "Utilisateur non trouvé", status: false });
    }

    // Ne pas permettre de bannir un admin
    if (targetUser.role === 'ADMIN') {
      return res.status(403).json({ msg: "Impossible de bannir un administrateur", status: false });
    }

    // Toggle ban status
    const updatedUser = await prisma.user.update({
      where: { id: targetUserId },
      data: {
        isBanned: !targetUser.isBanned,
        bannedAt: !targetUser.isBanned ? new Date() : null,
        bannedReason: !targetUser.isBanned ? reason : null
      }
    });

    // Log l'action
    await prisma.activityLog.create({
      data: {
        userId: adminId,
        action: !targetUser.isBanned ? 'USER_BANNED' : 'USER_UNBANNED',
        details: JSON.stringify({
          targetUserId,
          targetUsername: targetUser.username,
          reason
        })
      }
    });

    return res.json({ 
      user: updatedUser, 
      status: true,
      msg: !targetUser.isBanned ? "Utilisateur banni" : "Utilisateur débanni"
    });
  } catch (ex) {
    console.error(ex);
    next(ex);
  }
};

// Obtenir les logs d'activité
module.exports.getActivityLogs = async (req, res, next) => {
  try {
    const userId = Number(req.params.userId);
    const { limit = 50, offset = 0 } = req.query;

    // Vérifier que l'utilisateur est admin
    const admin = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (!admin || admin.role !== 'ADMIN') {
      return res.status(403).json({ msg: "Accès refusé", status: false });
    }

    const logs = await prisma.activityLog.findMany({
      include: {
        user: {
          select: {
            username: true,
            avatarImage: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: parseInt(limit),
      skip: parseInt(offset)
    });

    const totalLogs = await prisma.activityLog.count();

    return res.json({ logs, total: totalLogs, status: true });
  } catch (ex) {
    console.error(ex);
    next(ex);
  }
};

// Récupérer les logs de modération
module.exports.getModerationLogs = async (req, res, next) => {
  try {
    const { userId } = req.params;
    
    // Vérifier que l'utilisateur est admin
    const admin = await prisma.user.findUnique({
      where: { id: parseInt(userId) }
    });
    
    if (!admin || admin.role !== 'ADMIN') {
      return res.json({ 
        msg: "Accès non autorisé", 
        status: false 
      });
    }

    // Récupérer les logs de modération avec les détails des messages et utilisateurs
    const moderationLogs = await prisma.moderationLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100, // Limiter aux 100 derniers logs
    });

    // Récupérer les messages et utilisateurs associés
    const logsWithDetails = await Promise.all(moderationLogs.map(async (log) => {
      let messageData = null;
      let senderData = null;
      let receiverData = null;
      
      try {
        const message = await prisma.message.findUnique({
          where: { id: log.messageId },
          include: {
            sender: {
              select: {
                id: true,
                username: true,
                email: true,
                avatarImage: true
              }
            },
            receiver: {
              select: {
                id: true,
                username: true
              }
            }
          }
        });
        
        if (message) {
          messageData = message;
          senderData = message.sender;
          receiverData = message.receiver;
        }
      } catch (error) {
        console.error("Error fetching message details:", error);
      }
      
      return {
        ...log,
        message: messageData,
        sender: senderData,
        receiver: receiverData
      };
    }));

    // Formater les logs pour l'affichage
    const formattedLogs = logsWithDetails.map(log => ({
      id: log.id,
      messageId: log.messageId,
      sender: log.sender || null,
      receiver: log.receiver || null,
      messageContent: log.message?.content || 'Message supprimé',
      action: log.action,
      riskScore: log.riskScore,
      analysis: log.analysis,
      blocked: log.blocked,
      warned: log.warned,
      createdAt: log.createdAt
    }));

    // Statistiques de modération
    const stats = {
      totalAnalyzed: moderationLogs.length,
      blocked: moderationLogs.filter(log => log.blocked).length,
      warned: moderationLogs.filter(log => log.warned).length,
      allowed: moderationLogs.filter(log => !log.blocked && !log.warned).length,
      averageRiskScore: Math.round(
        moderationLogs.reduce((sum, log) => sum + log.riskScore, 0) / moderationLogs.length || 0
      )
    };

    return res.json({ 
      status: true, 
      logs: formattedLogs,
      stats
    });
  } catch (error) {
    console.error("Error fetching moderation logs:", error);
    return res.json({ 
      msg: "Erreur lors de la récupération des logs de modération", 
      status: false 
    });
  }
}; 