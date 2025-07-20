const aiModerationService = require('./services/aiModerationService');

console.log('🧪 Test du service de modération\n');

const testMessages = [
  "Bonjour, comment allez-vous ?",
  "Click here immediately to verify your account",
  "Congratulations! You won $1000",
  "Update your payment information now",
  "Free money! Work from home! Guaranteed income!",
  "Visit this link: bit.ly/xyz123",
  "Check out my website at 192.168.1.1",
  "Download this file: virus.exe"
];

async function runTests() {
  for (const message of testMessages) {
    console.log(`\n📝 Message: "${message}"`);
    const analysis = await aiModerationService.analyzeWithAI(message);
    console.log(`🔍 Score de risque: ${analysis.riskScore}/100`);
    console.log(`📊 Niveau: ${analysis.riskLevel || 'N/A'}`);
    console.log(`🚨 Spam: ${analysis.isSpam ? 'OUI' : 'NON'}`);
    console.log(`🎣 Phishing: ${analysis.isPhishing ? 'OUI' : 'NON'}`);
    console.log(`🔗 Liens malveillants: ${analysis.hasMaliciousLinks ? 'OUI' : 'NON'}`);
    if (analysis.detectedIssues.length > 0) {
      console.log(`⚠️ Problèmes détectés:`, analysis.detectedIssues);
    }
    console.log('---');
  }
}

runTests(); 