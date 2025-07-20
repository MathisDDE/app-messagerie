const router = require('express').Router();
const {
  recordConsent,
  getUserConsents,
  requestDataAccess,
  requestDataRectification,
  requestDataDeletion,
  cancelDeletionRequest,
  requestDataPortability,
  getDataRequests,
  recordCookieConsent,
  reportDataBreach,
  getPrivacyLogs
} = require('../controllers/gdprController');

// Routes de consentement
router.post('/consent/record', recordConsent);
router.get('/consent/:userId', getUserConsents);
router.post('/consent/cookies', recordCookieConsent);

// Routes des droits RGPD
router.post('/request/access', requestDataAccess);
router.post('/request/rectification', requestDataRectification);
router.post('/request/deletion', requestDataDeletion);
router.post('/request/deletion/cancel', cancelDeletionRequest);
router.post('/request/portability', requestDataPortability);
router.get('/requests/:userId', getDataRequests);

// Routes admin
router.post('/breach/report', reportDataBreach);
router.get('/logs', getPrivacyLogs);

module.exports = router; 