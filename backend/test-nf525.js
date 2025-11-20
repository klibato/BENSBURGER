const http = require('http');

// Fonction helper pour faire des requêtes HTTP
function httpRequest(path, method = 'GET', token = null, postData = null) {
  return new Promise((resolve, reject) => {
    let bodyData = null;

    const options = {
      hostname: 'localhost',
      port: 3000,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    if (postData) {
      bodyData = JSON.stringify(postData);
      options.headers['Content-Length'] = Buffer.byteLength(bodyData);
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);

    if (bodyData) {
      req.write(bodyData);
    }
    req.end();
  });
}

async function testNF525Endpoints() {
  console.log('\n🔐 TEST ENDPOINTS NF525\n');
  console.log('='.repeat(60));

  try {
    // 1. Login
    console.log('\n1️⃣  Login avec admin/1234...');
    const loginRes = await httpRequest('/api/auth/login', 'POST', null, {
      username: 'admin',
      pin_code: '1234'
    });

    if (loginRes.status !== 200 || !loginRes.body.token) {
      console.log('❌ Login échoué:', loginRes);
      return;
    }

    const token = loginRes.body.token;
    console.log('✅ Login réussi');
    console.log('   Token:', token.substring(0, 30) + '...');

    // 2. Test GET /api/nf525/stats
    console.log('\n2️⃣  Test GET /api/nf525/stats...');
    const statsRes = await httpRequest('/api/nf525/stats', 'GET', token);
    console.log(`   Status: ${statsRes.status}`);
    console.log('   Response:', JSON.stringify(statsRes.body, null, 2));

    // 3. Test GET /api/nf525/verify-integrity
    console.log('\n3️⃣  Test GET /api/nf525/verify-integrity...');
    const integrityRes = await httpRequest('/api/nf525/verify-integrity', 'GET', token);
    console.log(`   Status: ${integrityRes.status}`);
    console.log('   Response:', JSON.stringify(integrityRes.body, null, 2));

    // 4. Test GET /api/nf525/export?format=json
    console.log('\n4️⃣  Test GET /api/nf525/export?format=json...');
    const exportRes = await httpRequest('/api/nf525/export?format=json', 'GET', token);
    console.log(`   Status: ${exportRes.status}`);
    if (exportRes.status === 200) {
      console.log('   ✅ Export réussi');
      console.log(`   Entries: ${exportRes.body.entries ? exportRes.body.entries.length : 0}`);
    } else {
      console.log('   Response:', JSON.stringify(exportRes.body, null, 2));
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ TESTS TERMINÉS\n');

  } catch (error) {
    console.error('\n❌ Erreur:', error.message);
  }
}

// Exécuter les tests
testNF525Endpoints();
