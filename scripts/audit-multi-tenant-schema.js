/**
 * Audit Multi-Tenant - Schéma Base de Données
 * Vérifie que toutes les tables critiques ont la colonne organization_id
 */

const { Sequelize } = require('sequelize');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { generateTaskReport } = require('./generate-task-report');

// Tables critiques qui DOIVENT avoir organization_id
const CRITICAL_TABLES = [
  'products', 'sales', 'sale_items',
  'users', 'cash_registers', 'audit_logs',
  'store_settings', 'menu_compositions', 'hash_chains',
  'nf525_archives'
];

// Tables exemptées (système global)
const EXEMPT_TABLES = [
  'organizations', 'subscriptions', 'invoices', 'admin_users'
];

async function auditMultiTenantSchema() {
  const startTime = Date.now();
  const taskData = {
    name: 'Audit Multi-Tenant - Schéma BDD',
    objectives: [
      'Vérifier présence organization_id sur toutes tables critiques',
      'Valider indexes de performance',
      'Confirmer foreign keys vers organizations',
      'Tester intégrité données'
    ],
    actions: [],
    metrics: {},
    filesChanged: [],
    issues: [],
    nextSteps: [],
    logs: '',
    commands: ['node scripts/audit-multi-tenant-schema.js']
  };

  console.log('🔍 AUDIT MULTI-TENANT - Schéma BDD\n');
  console.log('=' .repeat(60));

  let sequelize;
  const issues = [];
  const logs = [];

  try {
    // Connexion à la base de données
    const dbUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/flexpos';
    sequelize = new Sequelize(dbUrl, {
      logging: false,
      dialectOptions: {
        ssl: process.env.NODE_ENV === 'production' ? {
          require: true,
          rejectUnauthorized: false
        } : false
      }
    });

    await sequelize.authenticate();
    console.log('✅ Connexion base de données établie\n');
    logs.push('Connexion BDD réussie');

    // Vérifier chaque table critique
    for (const table of CRITICAL_TABLES) {
      try {
        // 1. Vérifier colonne organization_id
        const [columns] = await sequelize.query(`
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns
          WHERE table_name = '${table}' AND column_name = 'organization_id'
        `);

        if (columns.length === 0) {
          issues.push({
            severity: 'CRITIQUE',
            description: `Table "${table}" n'a PAS de colonne organization_id`,
            file: 'database/schema',
            line: '-',
            solution: `Ajouter migration pour colonne organization_id NOT NULL avec FK vers organizations`
          });
          console.log(`❌ CRITIQUE: Table "${table}" → Colonne organization_id MANQUANTE`);
          logs.push(`ERREUR: ${table} - organization_id manquant`);
        } else {
          const col = columns[0];

          if (col.is_nullable === 'YES') {
            issues.push({
              severity: 'WARNING',
              description: `Table "${table}" → organization_id est NULLABLE`,
              file: 'database/schema',
              line: '-',
              solution: 'Modifier la colonne pour être NOT NULL'
            });
            console.log(`⚠️  WARNING: Table "${table}" → organization_id est NULLABLE (devrait être NOT NULL)`);
            logs.push(`WARNING: ${table} - organization_id nullable`);
          } else {
            console.log(`✅ Table "${table}" → organization_id présent et NOT NULL`);
            logs.push(`OK: ${table} - organization_id conforme`);
          }
        }

        // 2. Vérifier index
        const [indexes] = await sequelize.query(`
          SELECT indexname, indexdef
          FROM pg_indexes
          WHERE tablename = '${table}' AND indexdef LIKE '%organization_id%'
        `);

        if (indexes.length === 0) {
          issues.push({
            severity: 'WARNING',
            description: `Table "${table}" → Pas d'index sur organization_id`,
            file: 'database/schema',
            line: '-',
            solution: `Créer index: CREATE INDEX idx_${table}_organization_id ON ${table}(organization_id);`
          });
          console.log(`   ⚠️  PERFORMANCE: Pas d'index sur organization_id`);
          logs.push(`WARNING: ${table} - index manquant`);
        } else {
          console.log(`   ✓ Index présent sur organization_id (${indexes.length})`);
          logs.push(`OK: ${table} - index présent`);
        }

        // 3. Vérifier foreign keys
        const [fks] = await sequelize.query(`
          SELECT
            tc.constraint_name,
            kcu.column_name,
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name
          FROM information_schema.table_constraints AS tc
          JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
          JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
          WHERE tc.constraint_type = 'FOREIGN KEY'
            AND tc.table_name = '${table}'
            AND kcu.column_name = 'organization_id'
        `);

        if (fks.length === 0 && columns.length > 0) {
          issues.push({
            severity: 'WARNING',
            description: `Table "${table}" → Pas de FK sur organization_id vers organizations`,
            file: 'database/schema',
            line: '-',
            solution: `Ajouter FK: ALTER TABLE ${table} ADD CONSTRAINT fk_${table}_organization FOREIGN KEY (organization_id) REFERENCES organizations(id);`
          });
          console.log(`   ⚠️  INTEGRITY: Pas de FK vers organizations`);
          logs.push(`WARNING: ${table} - FK manquante`);
        } else if (fks.length > 0) {
          console.log(`   ✓ Foreign Key vers organizations.id`);
          logs.push(`OK: ${table} - FK présente`);
        }

        console.log(''); // Ligne vide

      } catch (error) {
        issues.push({
          severity: 'ERREUR',
          description: `Table "${table}" → ${error.message}`,
          file: 'database/schema',
          line: '-',
          solution: 'Vérifier que la table existe et est accessible'
        });
        console.log(`❌ ERREUR: Table "${table}" → ${error.message}\n`);
        logs.push(`ERREUR: ${table} - ${error.message}`);
      }
    }

    // Résumé
    console.log('=' .repeat(60));
    console.log('\n📊 RÉSUMÉ:\n');

    const criticalIssues = issues.filter(i => i.severity === 'CRITIQUE');
    const warnings = issues.filter(i => i.severity === 'WARNING');
    const errors = issues.filter(i => i.severity === 'ERREUR');

    if (issues.length === 0) {
      console.log('✅ Schéma multi-tenant CONFORME');
      console.log('   Toutes les tables critiques ont organization_id avec index et FK\n');
      taskData.status = '✅ CONFORME';
      taskData.nextSteps = [
        'Passer à l\'audit des controllers',
        'Exécuter tests d\'intrusion multi-tenant'
      ];
    } else {
      console.log(`❌ ${issues.length} problème(s) détecté(s):\n`);

      if (criticalIssues.length > 0) {
        console.log(`   🔴 ${criticalIssues.length} CRITIQUE(S)`);
        criticalIssues.forEach(issue => console.log(`      - ${issue.description}`));
      }

      if (warnings.length > 0) {
        console.log(`   ⚠️  ${warnings.length} WARNING(S)`);
      }

      if (errors.length > 0) {
        console.log(`   ❌ ${errors.length} ERREUR(S)`);
      }

      console.log('');
      taskData.status = criticalIssues.length > 0 ? '❌ NON CONFORME' : '⚠️  WARNINGS';
      taskData.nextSteps = [
        'Corriger les problèmes CRITIQUES immédiatement',
        'Créer migrations pour colonnes manquantes',
        'Ajouter indexes et FK manquants',
        'Re-exécuter cet audit après corrections'
      ];
    }

    // Métriques
    taskData.metrics = {
      'Tables auditées': CRITICAL_TABLES.length,
      'Tables conformes': CRITICAL_TABLES.length - criticalIssues.length,
      'Problèmes critiques': criticalIssues.length,
      'Warnings': warnings.length,
      'Erreurs': errors.length,
      'Score': `${Math.round((CRITICAL_TABLES.length - criticalIssues.length) / CRITICAL_TABLES.length * 100)}%`
    };

    taskData.actions = [
      {
        description: 'Vérification colonne organization_id sur toutes tables',
        files: CRITICAL_TABLES,
        result: `${CRITICAL_TABLES.length - criticalIssues.length}/${CRITICAL_TABLES.length} conformes`
      },
      {
        description: 'Vérification indexes de performance',
        files: CRITICAL_TABLES,
        result: `${warnings.filter(w => w.description.includes('index')).length} index manquants`
      },
      {
        description: 'Vérification foreign keys',
        files: CRITICAL_TABLES,
        result: `${warnings.filter(w => w.description.includes('FK')).length} FK manquantes`
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

    await sequelize.close();

    // Code de sortie selon résultat
    process.exit(criticalIssues.length > 0 ? 1 : 0);

  } catch (error) {
    console.error('\n❌ ERREUR FATALE:', error.message);
    console.error(error.stack);

    taskData.status = '❌ ÉCHEC';
    taskData.duration = `${((Date.now() - startTime) / 1000).toFixed(1)}s`;
    taskData.issues.push({
      severity: 'CRITIQUE',
      description: `Erreur fatale: ${error.message}`,
      file: 'scripts/audit-multi-tenant-schema.js',
      solution: 'Vérifier la connexion à la base de données et les variables d\'environnement'
    });
    taskData.logs = logs.join('\n') + '\n\nERREUR:\n' + error.stack;

    generateTaskReport(taskData);

    if (sequelize) {
      await sequelize.close();
    }

    process.exit(1);
  }
}

// Exécuter l'audit
auditMultiTenantSchema().catch(console.error);
