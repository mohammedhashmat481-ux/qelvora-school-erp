import http from 'http';

const BASE_URL = 'http://localhost:8000';

function makeRequest(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const start = process.hrtime.bigint();

    const reqOptions = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: options.method || 'GET',
      headers: {
        'Accept-Encoding': 'gzip, deflate',
        ...(options.headers || {})
      }
    };

    const req = http.request(reqOptions, (res) => {
      let data = [];
      res.on('data', chunk => data.push(chunk));
      res.on('end', () => {
        const end = process.hrtime.bigint();
        const durationMs = Number(end - start) / 1_000_000;
        const bodyBuffer = Buffer.concat(data);
        resolve({
          status: res.statusCode,
          durationMs,
          contentEncoding: res.headers['content-encoding'],
          contentLength: bodyBuffer.length,
          headers: res.headers
        });
      });
    });

    req.on('error', reject);

    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }

    req.end();
  });
}

async function runBenchmark(name, fn, iterations = 50, concurrency = 10) {
  const times = [];
  let errors = 0;
  let totalBytes = 0;
  let encoding = 'none';

  console.log(`\n⏳ Running benchmark: "${name}" (${iterations} total requests, concurrency: ${concurrency})...`);

  for (let i = 0; i < iterations; i += concurrency) {
    const batch = [];
    const count = Math.min(concurrency, iterations - i);
    for (let c = 0; c < count; c++) {
      batch.push(
        fn().then(res => {
          times.push(res.durationMs);
          totalBytes += res.contentLength;
          if (res.contentEncoding) encoding = res.contentEncoding;
          if (res.status >= 400) errors++;
        }).catch(() => {
          errors++;
        })
      );
    }
    await Promise.all(batch);
  }

  times.sort((a, b) => a - b);
  const p50 = times[Math.floor(times.length * 0.50)] || 0;
  const p95 = times[Math.floor(times.length * 0.95)] || 0;
  const p99 = times[Math.floor(times.length * 0.99)] || 0;
  const avg = times.reduce((s, t) => s + t, 0) / times.length;
  const min = times[0] || 0;
  const max = times[times.length - 1] || 0;

  return {
    name,
    iterations,
    min: min.toFixed(2),
    avg: avg.toFixed(2),
    p50: p50.toFixed(2),
    p95: p95.toFixed(2),
    p99: p99.toFixed(2),
    max: max.toFixed(2),
    errorRate: ((errors / iterations) * 100).toFixed(1) + '%',
    encoding,
    avgPayloadBytes: Math.round(totalBytes / iterations)
  };
}

async function main() {
  console.log('🚀 Starting System Performance Benchmark Suite...');

  // 1. Health Endpoint
  const healthRes = await makeRequest('/health');
  console.log('Health check response:', healthRes.status, `(${healthRes.durationMs.toFixed(1)}ms)`);

  // 2. Login to get a valid JWT
  console.log('Logging in as Admin...');
  const loginRes = await makeRequest('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { email: 'admin@qelvora.in', password: 'password123' }
  });

  // If login endpoint returned token or demo token
  let token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImFkbWluLXV1aWQtMTAxIiwiZW1haWwiOiJhZG1pbkBpbmtlZHUuY29tIiwicm9sZSI6ImFkbWluIiwibmFtZSI6IkFkbWluIFVzZXIifQ.sample';
  try {
    // Generate valid jwt using same secret
    const jwt = (await import('jsonwebtoken')).default;
    token = jwt.sign(
      { id: 'admin-uuid-101', email: 'admin@qelvora.in', role: 'admin', name: 'Admin User' },
      process.env.JWT_SECRET || 'super_secret_jwt_key_school_crm_platform_2026',
      { expiresIn: '7d' }
    );
  } catch (_) {}

  const authHeader = { 'Authorization': `Bearer ${token}` };

  const results = [];

  // Benchmarks:
  results.push(await runBenchmark('GET /health (System Liveness & DB Ping)', () =>
    makeRequest('/health')
  , 100, 20));

  results.push(await runBenchmark('GET /api/settings (School Settings - Cached)', () =>
    makeRequest('/api/settings', { headers: authHeader })
  , 100, 20));

  results.push(await runBenchmark('GET /api/dashboard/admin (Admin Ops - Cached)', () =>
    makeRequest('/api/dashboard/admin', { headers: authHeader })
  , 100, 20));

  results.push(await runBenchmark('GET /api/dashboard/teacher (Teacher Timetable)', () =>
    makeRequest('/api/dashboard/teacher', { headers: authHeader })
  , 100, 20));

  results.push(await runBenchmark('GET /api/examination/my-marks (Student/Parent Results)', () =>
    makeRequest('/api/examination/my-marks', { headers: authHeader })
  , 100, 20));

  results.push(await runBenchmark('GET /api/examination/types (Exam Configurations)', () =>
    makeRequest('/api/examination/types', { headers: authHeader })
  , 100, 20));

  console.log('\n========================================================================================');
  console.log('🏁 PERFORMANCE BENCHMARK RESULTS');
  console.log('========================================================================================');
  console.table(results);
}

main().catch(console.error);
