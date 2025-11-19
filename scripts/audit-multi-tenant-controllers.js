/**
 * Audit Multi-Tenant - Controllers
 * Analyse tous les controllers pour détecter les requêtes non filtrées par organization_id
 */

const fs = require('fs');
const path = require('path');
const { generateTaskReport } = require('./generate-task-report');

// Méthodes Sequelize critiques qui doivent avoir filtrage organization_id
const CRITICAL_METHODS = [
  'findAll',
  'findOne',
  'findByPk',
  'findAndCountAll',
  'create',
  'update',
  'destroy',
  'bulkCreate',
  'count'
];

// Patterns dangereux
const DANGEROUS_PATTERNS = [
  'sequelize.query',
  'SELECT \\* FROM',
  'DELETE FROM',
  'UPDATE .*SET',
  'INSERT INTO'
];

function auditMultiTenantControllers() {
  const startTime = Date.now();
  const taskData = {
    name: 'Audit Multi-Tenant - Controllers',
    objectives: [
      'Analyser tous les controllers pour filtrage organization_id',
      'Détecter requêtes Sequelize non filtrées',
      'Identifier requêtes SQL raw dangereuses',
      'Vérifier protection contre accès cross-org'
    ],
    actions: [],
    metrics: {},
    filesChanged: [],
    issues: [],
    nextSteps: [],
    logs: '',
    commands: ['node scripts/audit-multi-tenant-controllers.js']
  };

  console.log('🔍 AUDIT MULTI-TENANT - Controllers\n');
  console.log('='.repeat(60));

  const controllersPath = path.join(__dirname, '../backend/src/controllers');
  const files = fs.readdirSync(controllersPath)
    .filter(f => f.endsWith('.js') && f !== 'index.js');

  const issues = [];
  const logs = [];
  let totalMethodsChecked = 0;
  let totalIssuesFound = 0;

  files.forEach(file => {
    const filePath = path.join(controllersPath, file);
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    console.log(`\n📄 ${file}`);
    console.log('-'.repeat(60));
    logs.push(`\nAnalyse: ${file}`);

    let fileIssues = 0;

    // 1. Détecter méthodes Sequelize
    CRITICAL_METHODS.forEach(method => {
      const regex = new RegExp(`\\b${method}\\s*\\(`, 'g');
      let match;

      while ((match = regex.exec(content)) !== null) {
        totalMethodsChecked++;
        const lineNumber = content.substring(0, match.index).split('\n').length;
        const line = lines[lineNumber - 1];

        // Chercher le contexte (5 lignes avant et après)
        const contextStart = Math.max(0, lineNumber - 6);
        const contextEnd = Math.min(lines.length, lineNumber + 5);
        const context = lines.slice(contextStart, contextEnd).join('\n');

        // Vérifier si organization_id est dans le contexte
        const hasOrgFilter =
          context.includes('organization_id') ||
          context.includes('organizationId') ||
          context.includes('req.organizationId') ||
          context.includes('req.organization');

        // Cas spéciaux : méthodes qui n'ont pas besoin de filtre
        const isExempt =
          file === 'authController.js' ||
          file === 'publicController.js' ||
          context.includes('Organization.') || // Requête sur organizations
          context.includes('AdminUser.') || // Admin users
          context.includes('Subscription.') || // Subscriptions
          context.includes('Invoice.'); // Invoices

        if (!hasOrgFilter && !isExempt) {
          const severity = ['findAll', 'findAndCountAll', 'count'].includes(method) ? 'CRITIQUE' : 'WARNING';

          issues.push({
            severity,
            description: `${method} sans filtre organization_id`,
            file,
            line: lineNumber,
            code: line.trim(),
            solution: `Ajouter where: { organization_id: req.organizationId } ou vérifier organization_id après récupération`
          });

          console.log(`   ${severity === 'CRITIQUE' ? '❌' : '⚠️'}  Ligne ${lineNumber}: ${method}() sans filtre organization_id`);
          console.log(`      Code: ${line.trim().substring(0, 80)}...`);
          logs.push(`${severity}: ${file}:${lineNumber} - ${method} sans filtre`);
          fileIssues++;
          totalIssuesFound++;
        }
      }
    });

    // 2. Détecter requêtes SQL raw dangereuses
    DANGEROUS_PATTERNS.forEach(pattern => {
      const regex = new RegExp(pattern, 'gi');
      let match;

      while ((match = regex.exec(content)) !== null) {
        const lineNumber = content.substring(0, match.index).split('\n').length;
        const line = lines[lineNumber - 1];

        // Vérifier si c'est dans un commentaire
        if (line.trim().startsWith('//') || line.trim().startsWith('*')) {
          continue;
        }

        issues.push({
          severity: 'CRITIQUE',
          description: `Requête SQL raw détectée: ${pattern}`,
          file,
          line: lineNumber,
          code: line.trim(),
          solution: 'Utiliser Sequelize ORM avec filtrage organization_id ou ajouter WHERE organization_id = $1 dans la requête raw'
        });

        console.log(`   ❌ Ligne ${lineNumber}: Requête SQL raw détectée`);
        console.log(`      Code: ${line.trim().substring(0, 80)}...`);
        logs.push(`CRITIQUE: ${file}:${lineNumber} - SQL raw`);
        fileIssues++;
        totalIssuesFound++;
      }
    });

    // 3. Vérifier que req.organizationId est utilisé
    const usesOrgId = content.includes('req.organizationId') || content.includes('req.organization');

    if (!usesOrgId && !['authController.js', 'publicController.js'].includes(file)) {
      issues.push({
        severity: 'WARNING',
        description: `Controller n'utilise jamais req.organizationId`,
        file,
        line: 0,
        solution: 'Vérifier que le middleware d\'authentification est appliqué et que les requêtes filtrent par organization_id'
      });

      console.log(`   ⚠️  WARNING: req.organizationId jamais utilisé dans ce controller`);
      logs.push(`WARNING: ${file} - req.organizationId non utilisé`);
      fileIssues++;
    }

    // Résumé du fichier
    if (fileIssues === 0) {
      console.log(`   ✅ Aucun problème détecté`);
      logs.push(`OK: ${file} - Aucun problème`);
    } else {
      console.log(`   ⚠️  ${fileIssues} problème(s) détecté(s)`);
    }
  });

  // Résumé global
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 RÉSUMÉ:\n');

  const criticalIssues = issues.filter(i => i.severity === 'CRITIQUE');
  const warnings = issues.filter(i => i.severity === 'WARNING');

  console.log(`📁 Fichiers analysés : ${files.length}`);
  console.log(`🔍 Méthodes vérifiées : ${totalMethodsChecked}`);
  console.log(`❌ Problèmes détectés : ${totalIssuesFound}\n`);

  if (issues.length === 0) {
    console.log('✅ CONTROLLERS CONFORMES');
    console.log('   Tous les controllers filtrent correctement par organization_id\n');
    taskData.status = '✅ CONFORME';
    taskData.nextSteps = [
      'Passer aux tests d\'intrusion multi-tenant',
      'Valider avec tests automatisés'
    ];
  } else {
    console.log(`   🔴 ${criticalIssues.length} CRITIQUE(S)`);
    console.log(`   ⚠️  ${warnings.length} WARNING(S)\n`);

    console.log('🔴 PROBLÈMES CRITIQUES:\n');
    criticalIssues.forEach((issue, i) => {
      console.log(`${i + 1}. ${issue.file}:${issue.line}`);
      console.log(`   ${issue.description}`);
      console.log(`   Solution: ${issue.solution}\n`);
    });

    taskData.status = criticalIssues.length > 0 ? '❌ NON CONFORME' : '⚠️  WARNINGS';
    taskData.nextSteps = [
      'URGENT: Corriger tous les problèmes CRITIQUES',
      'Ajouter filtrage organization_id dans toutes les requêtes',
      'Remplacer requêtes SQL raw par Sequelize ORM',
      'Re-exécuter cet audit après corrections',
      'NE PAS déployer en production tant que des CRITIQUES existent'
    ];
  }

  // Métriques
  taskData.metrics = {
    'Controllers analysés': files.length,
    'Méthodes vérifiées': totalMethodsChecked,
    'Problèmes critiques': criticalIssues.length,
    'Warnings': warnings.length,
    'Controllers conformes': files.length - new Set(issues.map(i => i.file)).size,
    'Score': criticalIssues.length === 0 ? '100%' : `${Math.round((1 - criticalIssues.length / totalMethodsChecked) * 100)}%`
  };

  taskData.actions = [
    {
      description: 'Analyse méthodes Sequelize',
      files: files,
      result: `${totalMethodsChecked} méthodes vérifiées`
    },
    {
      description: 'Détection requêtes SQL raw',
      files: files,
      result: `${issues.filter(i => i.description.includes('SQL raw')).length} requêtes raw détectées`
    },
    {
      description: 'Vérification utilisation req.organizationId',
      files: files,
      result: `${files.length - issues.filter(i => i.description.includes('jamais utilisé')).length}/${files.length} controllers OK`
    }
  ];

  taskData.issues = issues;
  taskData.logs = logs.join('\n');
  taskData.duration = `${((Date.now() - startTime) / 1000).toFixed(1)}s`;

  // Générer rapport
  console.log('\n📄 Génération du rapport...');
  const reportPath = generateTaskReport(taskData);
  console.log(`\n✅ Audit terminé en ${taskData.duration}`);
  console.log(`📄 Rapport : ${reportPath}\n`);

  // Code de sortie selon résultat
  process.exit(criticalIssues.length > 0 ? 1 : 0);
}

// Exécuter l'audit
auditMultiTenantControllers();
