/**
 * Générateur de rapports de tâches FlexPOS
 * Crée des rapports détaillés pour chaque tâche d'audit/développement
 */

const fs = require('fs');
const path = require('path');

/**
 * Génère un rapport de tâche complet
 * @param {Object} taskData - Données de la tâche
 * @returns {string} - Chemin du fichier de rapport généré
 */
function generateTaskReport(taskData) {
  const timestamp = new Date().toISOString();
  const reportPath = path.join(__dirname, '../docs/task-reports');

  if (!fs.existsSync(reportPath)) {
    fs.mkdirSync(reportPath, { recursive: true });
  }

  const report = `# 📋 Rapport de Tâche - ${taskData.name}

**Date :** ${new Date().toLocaleString('fr-FR')}
**Durée :** ${taskData.duration}
**Statut :** ${taskData.status}

---

## ✅ Objectifs

${taskData.objectives.map(obj => `- ${obj}`).join('\n')}

---

## 🔧 Actions Réalisées

${taskData.actions.map((action, i) => `${i + 1}. ${action.description}
   - Fichiers concernés : ${action.files.length > 0 ? action.files.join(', ') : 'N/A'}
   - Résultat : ${action.result}
`).join('\n')}

---

## 📊 Résultats

### Métriques
${Object.entries(taskData.metrics).map(([key, value]) => `- **${key}** : ${value}`).join('\n')}

### Fichiers Créés/Modifiés
${taskData.filesChanged && taskData.filesChanged.length > 0 ?
  taskData.filesChanged.map(file => `- \`${file}\``).join('\n') :
  'Aucun fichier modifié'}

---

## ⚠️ Problèmes Détectés

${taskData.issues.length === 0 ? 'Aucun problème détecté' :
  taskData.issues.map((issue, i) => `${i + 1}. **[${issue.severity}]** ${issue.description}
   - Fichier : \`${issue.file || 'N/A'}\`
   - Ligne : ${issue.line || 'N/A'}
   - Solution : ${issue.solution || 'À définir'}
`).join('\n')}

---

## 🎯 Prochaines Étapes

${taskData.nextSteps.map((step, i) => `${i + 1}. ${step}`).join('\n')}

---

## 📎 Annexes

### Logs d'exécution
\`\`\`
${taskData.logs || 'Aucun log'}
\`\`\`

### Commandes exécutées
\`\`\`bash
${taskData.commands && taskData.commands.length > 0 ? taskData.commands.join('\n') : 'Aucune commande'}
\`\`\`

---

**Rapport généré automatiquement par FlexPOS Audit System**
**Version :** 1.0.0
**Auditeur :** Claude Sonnet 4.5
`;

  const filename = `${timestamp.split('T')[0]}-${taskData.name.replace(/\s+/g, '-').toLowerCase()}.md`;
  const fullPath = path.join(reportPath, filename);

  fs.writeFileSync(fullPath, report);
  console.log(`\n✅ Rapport sauvegardé : ${fullPath}`);

  return fullPath;
}

module.exports = { generateTaskReport };

// Si exécuté directement (test)
if (require.main === module) {
  const testData = {
    name: 'Test Rapport',
    duration: '5min',
    status: '✅ SUCCÈS',
    objectives: ['Tester le générateur de rapports'],
    actions: [{ description: 'Création du script', files: ['generate-task-report.js'], result: 'Succès' }],
    metrics: { 'Fichiers créés': 1 },
    filesChanged: ['scripts/generate-task-report.js'],
    issues: [],
    nextSteps: ['Créer les autres scripts d\'audit'],
    logs: 'Test réussi',
    commands: ['node scripts/generate-task-report.js']
  };

  generateTaskReport(testData);
}
