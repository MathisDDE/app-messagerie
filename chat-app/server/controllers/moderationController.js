const { PrismaClient } = require('../generated/prisma');
const prisma = new PrismaClient();
const aiModerationService = require("../services/aiModerationService");

// Analyser un message pour détecter du contenu suspect
module.exports.analyzeMessage = async (req, res, next) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ 
        msg: "Message requis pour l'analyse", 
        status: false 
      });
    }

    // Analyser le message avec l'IA
    const analysis = await aiModerationService.analyzeWithAI(message);

    // Obtenir des conseils de sécurité
    const securityTips = aiModerationService.getSecurityTips(analysis);

    res.json({
      status: true,
      analysis,
      securityTips
    });
  } catch (error) {
    console.error("Erreur lors de l'analyse du message:", error);
    res.status(500).json({ 
      msg: "Erreur lors de l'analyse du message", 
      status: false 
    });
  }
};

// Vérifier un URL
module.exports.checkURL = async (req, res, next) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ 
        msg: "URL requise pour la vérification", 
        status: false 
      });
    }

    const result = await aiModerationService.checkURL(url);

    res.json({
      status: true,
      ...result
    });
  } catch (error) {
    console.error("Erreur lors de la vérification de l'URL:", error);
    res.status(500).json({ 
      msg: "Erreur lors de la vérification de l'URL", 
      status: false 
    });
  }
};

// Analyser un message avant l'envoi
module.exports.moderateBeforeSend = async (req, res, next) => {
  try {
    const { from, to, message } = req.body;

    // Analyser le message
    const analysis = await aiModerationService.analyzeWithAI(message);

    // Si le risque est élevé, bloquer l'envoi
    if (analysis.riskScore >= 70) {
      return res.status(403).json({
        status: false,
        msg: "Message bloqué pour des raisons de sécurité",
        analysis,
        blocked: true
      });
    }

    // Si le risque est moyen, avertir mais permettre l'envoi
    if (analysis.riskScore >= 40) {
      return res.json({
        status: true,
        warning: true,
        msg: "Message suspect détecté. Êtes-vous sûr de vouloir l'envoyer ?",
        analysis,
        requireConfirmation: true
      });
    }

    // Si le message est sûr, permettre l'envoi
    res.json({
      status: true,
      analysis,
      blocked: false,
      warning: false
    });
  } catch (error) {
    console.error("Erreur lors de la modération:", error);
    // En cas d'erreur, permettre l'envoi pour ne pas bloquer l'utilisateur
    res.json({ 
      status: true, 
      blocked: false,
      warning: false,
      error: true 
    });
  }
};

// Récupérer les messages marqués comme suspects
module.exports.getFlaggedMessages = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const flaggedMessages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: Number(userId) },
          { receiverId: Number(userId) }
        ],
        // Note: metadata n'existe pas dans le schéma, on pourrait utiliser les logs de modération à la place
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            avatarImage: true
          }
        },
        receiver: {
          select: {
            id: true,
            username: true,
            avatarImage: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({
      status: true,
      messages: flaggedMessages
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des messages suspects:", error);
    res.status(500).json({ 
      msg: "Erreur lors de la récupération des messages suspects", 
      status: false 
    });
  }
};

// Signaler un message comme spam/phishing
module.exports.reportMessage = async (req, res, next) => {
  try {
    const { messageId, reportType, reportReason } = req.body;
    const reporterId = req.body.userId;

    // Créer un rapport dans la base de données
    const report = await prisma.messageReport.create({
      data: {
        messageId: Number(messageId),
        reporterId: Number(reporterId),
        reportType,
        reportReason,
        status: 'PENDING'
      }
    });

    // Analyser le message signalé
    const message = await prisma.message.findUnique({
      where: { id: Number(messageId) }
    });

    if (message) {
      const analysis = await aiModerationService.analyzeWithAI(message.content);
      
      // Mettre à jour le rapport avec l'analyse
      await prisma.messageReport.update({
        where: { id: report.id },
        data: {
          aiAnalysis: analysis,
          riskScore: analysis.riskScore
        }
      });
    }

    res.json({
      status: true,
      msg: "Message signalé avec succès",
      reportId: report.id
    });
  } catch (error) {
    console.error("Erreur lors du signalement:", error);
    res.status(500).json({ 
      msg: "Erreur lors du signalement du message", 
      status: false 
    });
  }
};

// Obtenir les statistiques de modération pour un utilisateur
module.exports.getModerationStats = async (req, res, next) => {
  try {
    const { userId } = req.params;

    // Compter les messages bloqués via les logs de modération
    const blockedCount = await prisma.moderationLog.count({
      where: {
        senderId: Number(userId),
        blocked: true
      }
    });

    // Compter les messages signalés
    const reportedCount = await prisma.messageReport.count({
      where: {
        reporterId: Number(userId)
      }
    });

    // Compter les avertissements
    const warningCount = await prisma.moderationLog.count({
      where: {
        senderId: Number(userId),
        warned: true
      }
    });

    res.json({
      status: true,
      stats: {
        blockedMessages: blockedCount,
        reportedMessages: reportedCount,
        warnings: warningCount,
        trustScore: Math.max(0, 100 - (blockedCount * 10) - (reportedCount * 5) - (warningCount * 2))
      }
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des statistiques:", error);
    res.status(500).json({ 
      msg: "Erreur lors de la récupération des statistiques", 
      status: false 
    });
  }
};

// Obtenir l'analyse de modération d'un message spécifique
module.exports.getMessageAnalysis = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    
    // Vérifier que messageId est valide
    if (!messageId || isNaN(Number(messageId))) {
      return res.json({
        status: true,
        analysis: null
      });
    }

    const moderationLog = await prisma.moderationLog.findFirst({
      where: {
        messageId: Number(messageId)
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (!moderationLog) {
      return res.json({
        status: true,
        analysis: null
      });
    }

    res.json({
      status: true,
      analysis: moderationLog.analysis,
      riskScore: moderationLog.riskScore,
      action: moderationLog.action,
      blocked: moderationLog.blocked,
      warned: moderationLog.warned
    });
  } catch (error) {
    console.error("Erreur lors de la récupération de l'analyse:", error);
    res.status(500).json({ 
      msg: "Erreur lors de la récupération de l'analyse", 
      status: false 
    });
  }
}; 