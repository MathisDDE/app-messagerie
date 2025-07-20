const { PrismaClient } = require('../generated/prisma');
const prisma = new PrismaClient();
const fs = require('fs').promises;
const path = require('path');

// Enregistrer le consentement utilisateur
module.exports.recordConsent = async (req, res) => {
  try {
    const { userId, consentType, given } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];

    const consent = await prisma.userConsent.upsert({
      where: {
        userId_consentType: {
          userId: Number(userId),
          consentType
        }
      },
      update: {
        given,
        givenAt: given ? new Date() : undefined,
        withdrawnAt: !given ? new Date() : null,
        ipAddress,
        userAgent
      },
      create: {
        userId: Number(userId),
        consentType,
        given,
        ipAddress,
        userAgent
      }
    });

    // Log l'action
    await prisma.privacyLog.create({
      data: {
        action: given ? 'consent_given' : 'consent_withdrawn',
        userId: Number(userId),
        details: { consentType },
        ipAddress,
        userAgent
      }
    });

    res.json({ success: true, consent });
  } catch (error) {
    console.error('Erreur lors de l\'enregistrement du consentement:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// Obtenir tous les consentements d'un utilisateur
module.exports.getUserConsents = async (req, res) => {
  try {
    const { userId } = req.params;

    const consents = await prisma.userConsent.findMany({
      where: { userId: Number(userId) }
    });

    res.json({ consents });
  } catch (error) {
    console.error('Erreur lors de la récupération des consentements:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// Demande d'accès aux données (Article 15 RGPD)
module.exports.requestDataAccess = async (req, res) => {
  try {
    const { userId } = req.body;

    const request = await prisma.dataRequest.create({
      data: {
        userId: Number(userId),
        requestType: 'ACCESS',
        status: 'PENDING'
      }
    });

    // Log l'action
    await prisma.privacyLog.create({
      data: {
        action: 'data_access_request',
        userId: Number(userId),
        details: { requestId: request.id },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      }
    });

    // Déclencher le processus d'export des données (async)
    processDataExport(userId, request.id);

    res.json({ 
      success: true, 
      requestId: request.id,
      message: 'Votre demande a été enregistrée. Vous recevrez vos données dans les 30 jours.'
    });
  } catch (error) {
    console.error('Erreur lors de la demande d\'accès:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// Demande de rectification (Article 16 RGPD)
module.exports.requestDataRectification = async (req, res) => {
  try {
    const { userId, field, newValue, reason } = req.body;

    const request = await prisma.dataRequest.create({
      data: {
        userId: Number(userId),
        requestType: 'RECTIFICATION',
        status: 'PENDING',
        notes: JSON.stringify({ field, newValue, reason })
      }
    });

    await prisma.privacyLog.create({
      data: {
        action: 'data_rectification_request',
        userId: Number(userId),
        details: { field, requestId: request.id },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      }
    });

    res.json({ 
      success: true, 
      requestId: request.id,
      message: 'Votre demande de rectification a été enregistrée.'
    });
  } catch (error) {
    console.error('Erreur lors de la demande de rectification:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// Demande de suppression (Article 17 RGPD - Droit à l'oubli)
module.exports.requestDataDeletion = async (req, res) => {
  try {
    const { userId, reason } = req.body;

    // Vérifier si une demande existe déjà
    const existingRequest = await prisma.deletionRequest.findUnique({
      where: { userId: Number(userId) }
    });

    if (existingRequest && !existingRequest.cancelled) {
      return res.status(400).json({ 
        error: 'Une demande de suppression est déjà en cours.' 
      });
    }

    // Créer la demande avec un délai de 30 jours
    const scheduledFor = new Date();
    scheduledFor.setDate(scheduledFor.getDate() + 30);

    const deletionRequest = await prisma.deletionRequest.create({
      data: {
        userId: Number(userId),
        reason,
        scheduledFor
      }
    });

    await prisma.privacyLog.create({
      data: {
        action: 'deletion_request',
        userId: Number(userId),
        details: { requestId: deletionRequest.id, reason },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      }
    });

    res.json({ 
      success: true, 
      requestId: deletionRequest.id,
      scheduledFor,
      message: 'Votre compte sera supprimé dans 30 jours. Vous pouvez annuler cette demande à tout moment.'
    });
  } catch (error) {
    console.error('Erreur lors de la demande de suppression:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// Annuler une demande de suppression
module.exports.cancelDeletionRequest = async (req, res) => {
  try {
    const { userId } = req.body;

    const deletionRequest = await prisma.deletionRequest.update({
      where: { userId: Number(userId) },
      data: {
        cancelled: true,
        cancelledAt: new Date()
      }
    });

    await prisma.privacyLog.create({
      data: {
        action: 'deletion_request_cancelled',
        userId: Number(userId),
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      }
    });

    res.json({ 
      success: true, 
      message: 'Votre demande de suppression a été annulée.'
    });
  } catch (error) {
    console.error('Erreur lors de l\'annulation:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// Demande de portabilité des données (Article 20 RGPD)
module.exports.requestDataPortability = async (req, res) => {
  try {
    const { userId } = req.body;

    const request = await prisma.dataRequest.create({
      data: {
        userId: Number(userId),
        requestType: 'PORTABILITY',
        status: 'PENDING'
      }
    });

    await prisma.privacyLog.create({
      data: {
        action: 'data_portability_request',
        userId: Number(userId),
        details: { requestId: request.id },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      }
    });

    // Déclencher l'export au format JSON structuré
    processDataExport(userId, request.id, true);

    res.json({ 
      success: true, 
      requestId: request.id,
      message: 'Vos données seront exportées dans un format portable dans les 30 jours.'
    });
  } catch (error) {
    console.error('Erreur lors de la demande de portabilité:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// Obtenir le statut des demandes RGPD
module.exports.getDataRequests = async (req, res) => {
  try {
    const { userId } = req.params;

    const requests = await prisma.dataRequest.findMany({
      where: { userId: Number(userId) },
      orderBy: { requestedAt: 'desc' }
    });

    const deletionRequest = await prisma.deletionRequest.findUnique({
      where: { userId: Number(userId) }
    });

    res.json({ 
      dataRequests: requests,
      deletionRequest
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des demandes:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// Enregistrer le consentement des cookies
module.exports.recordCookieConsent = async (req, res) => {
  try {
    const { sessionId, essential, analytics, marketing, preferences } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];

    const consent = await prisma.cookieConsent.upsert({
      where: { sessionId },
      update: {
        essential,
        analytics,
        marketing,
        preferences,
        consentedAt: new Date(),
        ipAddress,
        userAgent
      },
      create: {
        sessionId,
        essential,
        analytics,
        marketing,
        preferences,
        ipAddress,
        userAgent
      }
    });

    res.json({ success: true, consent });
  } catch (error) {
    console.error('Erreur lors de l\'enregistrement du consentement cookies:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// Fonction helper pour traiter l'export de données
async function processDataExport(userId, requestId, portable = false) {
  try {
    // Récupérer toutes les données de l'utilisateur
    const userData = await prisma.user.findUnique({
      where: { id: Number(userId) },
      include: {
        messagesSent: true,
        messagesReceived: true,
        reactions: true,
        activityLogs: {
          take: 100 // Limiter aux 100 dernières activités
        },
        groupMemberships: {
          include: {
            group: true
          }
        },
        groupMessages: true,
        consents: true
      }
    });

    // Nettoyer les données sensibles
    delete userData.password;

    // Créer le fichier d'export
    const exportData = {
      exportDate: new Date(),
      userData,
      format: portable ? 'portable_json' : 'full_export'
    };

    // Sauvegarder le fichier
    const fileName = `user_data_${userId}_${Date.now()}.json`;
    const filePath = path.join(__dirname, '../exports', fileName);
    
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(exportData, null, 2));

    // Mettre à jour la demande
    await prisma.dataRequest.update({
      where: { id: requestId },
      data: {
        status: 'COMPLETED',
        processedAt: new Date(),
        responseUrl: `/exports/${fileName}`
      }
    });

    // TODO: Envoyer un email à l'utilisateur avec le lien de téléchargement
  } catch (error) {
    console.error('Erreur lors de l\'export des données:', error);
    
    await prisma.dataRequest.update({
      where: { id: requestId },
      data: {
        status: 'REJECTED',
        processedAt: new Date(),
        notes: 'Erreur lors de l\'export'
      }
    });
  }
}

// Signaler une violation de données (pour les admins)
module.exports.reportDataBreach = async (req, res) => {
  try {
    const { affectedUsers, dataTypes, severity, description, measures } = req.body;

    const breach = await prisma.dataBreach.create({
      data: {
        affectedUsers,
        dataTypes,
        severity,
        description,
        measures
      }
    });

    // Si la violation est grave, marquer pour notification CNIL
    if (severity === 'HIGH' || severity === 'CRITICAL') {
      await prisma.dataBreach.update({
        where: { id: breach.id },
        data: {
          reportedToCnil: true,
          reportedAt: new Date()
        }
      });
    }

    res.json({ 
      success: true, 
      breach,
      message: 'Violation enregistrée. Les utilisateurs affectés seront notifiés.'
    });
  } catch (error) {
    console.error('Erreur lors du signalement de violation:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// Obtenir les logs de confidentialité (pour les admins)
module.exports.getPrivacyLogs = async (req, res) => {
  try {
    const { userId, action, limit = 100 } = req.query;

    const where = {};
    if (userId) where.userId = Number(userId);
    if (action) where.action = action;

    const logs = await prisma.privacyLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Number(limit)
    });

    res.json({ logs });
  } catch (error) {
    console.error('Erreur lors de la récupération des logs:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}; 