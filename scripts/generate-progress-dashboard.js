/**
 * Générateur de Dashboard de Progression FlexPOS
 * Agrège tous les rapports de tâches pour afficher la progression globale
 */

const fs = require('fs');
const path = require('path');

function generateProgressDashboard() {
  const reportsPath = path.join(__dirname, '../docs/task-reports');

  // Créer le dossier si inexistant
  if (!fs.existsSync(reportsPath)) {
    fs.mkdirSync(reportsPath, { recursive: true });
  }

  const reportFiles = fs.existsSync(reportsPath)
    ? fs.readdirSync(reportsPath).filter(f => f.endsWith('.md'))
    : [];

  const tasks = {
    'Phase 1 - Audit Multi-Tenant': [
      { name: 'Audit Schéma BDD', status: '⏳', file: null, duration: '-' },
      { name: 'Audit Controllers', status: '⏳', file: null, duration: '-' },
      { name: 'Tests Intrusion', status: '⏳', file: null, duration: '-' }
    ],
    'Phase 2 - Audit Conformité': [
      { name: 'Audit NF525', status: '⏳', file: null, duration: '-' },
      { name: 'Audit Sécurité', status: '⏳', file: null, duration: '-' },
      { name: 'Audit Performance', status: '⏳', file: null, duration: '-' }
    ],
    'Phase 3 - Nettoyage': [
      { name: 'Nettoyage Documentation', status: '⏳', file: null, duration: '-' },
      { name: 'Nettoyage Code Backend', status: '⏳', file: null, duration: '-' },
      { name: 'Nettoyage Code Frontend', status: '⏳', file: null, duration: '-' }
    ],
    'Phase 4 - MVP': [
      { name: 'Landing Page', status: '⏳', file: null, duration: '-' },
      { name: 'Admin Dashboard', status: '⏳', file: null, duration: '-' },
      { name: 'Upload Images', status: '⏳', file: null, duration: '-' },
      { name: 'Tests Finaux', status: '⏳', file: null, duration: '-' }
    ]
  };

  // Parcourir les rapports et mettre à jour les statuts
  reportFiles.forEach(reportFile => {
    const content = fs.readFileSync(path.join(reportsPath, reportFile), 'utf8');

    // Extraire statut et durée
    const statusMatch = content.match(/\*\*Statut :\*\* (.+)/);
    const durationMatch = content.match(/\*\*Durée :\*\* (.+)/);

    const status = statusMatch ? statusMatch[1].trim() : '⏳';
    const duration = durationMatch ? durationMatch[1].trim() : '-';

    // Trouver la tâche correspondante
    Object.keys(tasks).forEach(phase => {
      tasks[phase].forEach(task => {
        const taskSlug = task.name.toLowerCase().replace(/\s+/g, '-');
        if (reportFile.toLowerCase().includes(taskSlug) ||
            reportFile.toLowerCase().includes(task.name.toLowerCase())) {
          task.status = status;
          task.file = reportFile;
          task.duration = duration;
        }
      });
    });
  });

  // Générer le dashboard
  let dashboard = `# 📊 Dashboard de Progression FlexPOS MVP

**Dernière mise à jour :** ${new Date().toLocaleString('fr-FR')}

---

`;

  // Pour chaque phase
  Object.entries(tasks).forEach(([phase, taskList]) => {
    const completed = taskList.filter(t =>
      t.status.includes('✅') ||
      t.status.includes('CONFORME') ||
      t.status.includes('SUCCÈS') ||
      t.status.includes('SÉCURISÉ')
    ).length;

    const failed = taskList.filter(t =>
      t.status.includes('❌') ||
      t.status.includes('NON CONFORME') ||
      t.status.includes('ÉCHEC')
    ).length;

    const warnings = taskList.filter(t =>
      t.status.includes('⚠️') ||
      t.status.includes('WARNING')
    ).length;

    const total = taskList.length;
    const percentage = ((completed / total) * 100).toFixed(0);

    dashboard += `## ${phase} (${completed}/${total} - ${percentage}%)\n\n`;

    // Barre de progression
    const barLength = 40;
    const filledLength = Math.floor((completed / total) * barLength);
    const bar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength);
    dashboard += `\`${bar}\` ${percentage}%\n\n`;

    // Liste des tâches
    taskList.forEach(task => {
      let statusIcon = '⏳';

      if (task.status.includes('✅') || task.status.includes('CONFORME') || task.status.includes('SÉCURISÉ')) {
        statusIcon = '✅';
      } else if (task.status.includes('❌') || task.status.includes('NON CONFORME') || task.status.includes('ÉCHEC')) {
        statusIcon = '❌';
      } else if (task.status.includes('⚠️') || task.status.includes('WARNING')) {
        statusIcon = '⚠️';
      }

      dashboard += `- ${statusIcon} **${task.name}**`;

      if (task.duration !== '-') {
        dashboard += ` (${task.duration})`;
      }

      if (task.file) {
        dashboard += ` → [Rapport](./task-reports/${task.file})`;
      }

      dashboard += '\n';
    });

    dashboard += '\n';

    // Alertes si problèmes
    if (failed > 0) {
      dashboard += `> 🚨 **ATTENTION:** ${failed} tâche(s) en échec - Correction urgente requise\n\n`;
    } else if (warnings > 0) {
      dashboard += `> ⚠️  **AVERTISSEMENT:** ${warnings} tâche(s) avec warnings - À surveiller\n\n`;
    }
  });

  // Progression globale
  const allTasks = Object.values(tasks).flat();
  const totalCompleted = allTasks.filter(t =>
    t.status.includes('✅') ||
    t.status.includes('CONFORME') ||
    t.status.includes('SUCCÈS') ||
    t.status.includes('SÉCURISÉ')
  ).length;

  const totalFailed = allTasks.filter(t =>
    t.status.includes('❌') ||
    t.status.includes('NON CONFORME') ||
    t.status.includes('ÉCHEC')
  ).length;

  const totalWarnings = allTasks.filter(t =>
    t.status.includes('⚠️') ||
    t.status.includes('WARNING')
  ).length;

  const totalTasks = allTasks.length;
  const globalPercentage = ((totalCompleted / totalTasks) * 100).toFixed(0);

  dashboard += `---\n\n## 🎯 Progression Globale : ${globalPercentage}%\n\n`;

  const globalBarLength = 50;
  const globalFilledLength = Math.floor((totalCompleted / totalTasks) * globalBarLength);
  const globalBar = '█'.repeat(globalFilledLength) + '░'.repeat(globalBarLength - globalFilledLength);
  dashboard += `\`${globalBar}\` ${globalPercentage}%\n\n`;

  dashboard += `**${totalCompleted}** / **${totalTasks}** tâches complétées\n\n`;

  // Métriques globales
  dashboard += `### 📈 Métriques\n\n`;
  dashboard += `- ✅ Complétées : ${totalCompleted}\n`;
  dashboard += `- ⏳ En attente : ${totalTasks - totalCompleted - totalFailed - totalWarnings}\n`;
  dashboard += `- ⚠️  Warnings : ${totalWarnings}\n`;
  dashboard += `- ❌ Échecs : ${totalFailed}\n\n`;

  // État du projet
  if (globalPercentage == 100 && totalFailed === 0) {
    dashboard += `## 🎉 PROJET COMPLET !\n\n`;
    dashboard += `✅ Tous les audits et développements sont terminés.\n`;
    dashboard += `✅ FlexPOS est prêt pour la production.\n\n`;
  } else if (totalFailed > 0) {
    dashboard += `## 🚨 ACTION REQUISE\n\n`;
    dashboard += `❌ **${totalFailed} tâche(s) en échec** - Le déploiement en production est BLOQUÉ\n\n`;
    dashboard += `### Tâches en échec:\n\n`;

    Object.entries(tasks).forEach(([phase, taskList]) => {
      const failedTasks = taskList.filter(t =>
        t.status.includes('❌') ||
        t.status.includes('NON CONFORME') ||
        t.status.includes('ÉCHEC')
      );

      if (failedTasks.length > 0) {
        dashboard += `**${phase}:**\n`;
        failedTasks.forEach(task => {
          dashboard += `- ❌ ${task.name}`;
          if (task.file) {
            dashboard += ` → [Voir rapport](./task-reports/${task.file})`;
          }
          dashboard += '\n';
        });
        dashboard += '\n';
      }
    });
  } else {
    const remaining = totalTasks - totalCompleted - totalWarnings;
    dashboard += `## 📋 Prochaines Étapes\n\n`;

    if (remaining > 0) {
      dashboard += `Il reste **${remaining} tâche(s)** à compléter :\n\n`;

      const pendingTasks = allTasks.filter(t => t.status === '⏳').slice(0, 5);
      pendingTasks.forEach(task => {
        dashboard += `- ${task.name}\n`;
      });

      if (remaining > 5) {
        dashboard += `\n... et ${remaining - 5} autres tâches\n`;
      }
    }

    if (totalWarnings > 0) {
      dashboard += `\n⚠️  **${totalWarnings} tâche(s) avec warnings** - À corriger avant production\n`;
    }
  }

  dashboard += `\n---\n\n`;
  dashboard += `**Généré automatiquement par FlexPOS Audit System**\n`;
  dashboard += `**Version :** 1.0.0\n`;
  dashboard += `**Auditeur :** Claude Sonnet 4.5\n`;

  // Sauvegarder
  const dashboardPath = path.join(__dirname, '../docs/PROGRESS-DASHBOARD.md');
  fs.writeFileSync(dashboardPath, dashboard);

  console.log(`\n✅ Dashboard généré : ${dashboardPath}`);
  console.log(`📊 Progression globale : ${globalPercentage}%`);
  console.log(`✅ Complétées : ${totalCompleted}/${totalTasks}`);

  if (totalFailed > 0) {
    console.log(`❌ Échecs : ${totalFailed}`);
  }
  if (totalWarnings > 0) {
    console.log(`⚠️  Warnings : ${totalWarnings}`);
  }

  return dashboardPath;
}

// Exécuter si appelé directement
if (require.main === module) {
  generateProgressDashboard();
}

module.exports = { generateProgressDashboard };
