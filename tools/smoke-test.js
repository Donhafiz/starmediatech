const http = require('http');

const checks = [
  { path: '/', expect: 200 },
  { path: '/index.html', expect: 200 },
  { path: '/pages/about.html', expect: 200 },
  { path: '/css/style.css', expect: 200 },
  { path: '/js/api.js', expect: 200 },
  { path: '/api', expect: 200 },
  { path: '/api/health', expect: 200 }
];

function checkOne(path) {
  return new Promise((resolve) => {
    const opts = { hostname: 'localhost', port: process.env.PORT || 5000, path, method: 'GET', timeout: 5000 };
    const req = http.request(opts, (res) => {
      resolve({ path, status: res.statusCode });
    });
    req.on('error', (e) => resolve({ path, error: e.message }));
    req.on('timeout', () => { req.destroy(); resolve({ path, error: 'timeout' }); });
    req.end();
  });
}

(async () => {
  console.log('Running smoke tests against http://localhost:%s', process.env.PORT || 5000);
  const results = await Promise.all(checks.map(c => checkOne(c.path)));
  let ok = true;
  for (const r of results) {
    if (r.error) {
      ok = false;
      console.log(`FAIL ${r.path} -> ERROR: ${r.error}`);
    } else {
      const expected = checks.find(c => c.path === r.path).expect;
      const pass = r.status === expected;
      console.log(`${pass ? 'OK  ' : 'FAIL'} ${r.path} -> ${r.status} (expected ${expected})`);
      if (!pass) ok = false;
    }
  }
  console.log(ok ? '\nSMOKE TESTS PASSED' : '\nSMOKE TESTS FAILED');
  process.exit(ok ? 0 : 2);
})();
