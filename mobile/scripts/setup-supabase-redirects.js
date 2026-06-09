#!/usr/bin/env node
/**
 * run-once setup: adds mobile OAuth redirect URLs to the remote Supabase project.
 * Usage: node scripts/setup-supabase-redirects.js <SUPABASE_ACCESS_TOKEN>
 *
 * Get your access token from: https://supabase.com/dashboard/account/tokens
 */

const https = require('https');

const PROJECT_REF = 'hgomlxujcuiedubjszjd';
const token = process.argv[2] || process.env.SUPABASE_ACCESS_TOKEN;

if (!token) {
  console.error('ERROR: Provide your Supabase access token as the first argument.');
  console.error('  node scripts/setup-supabase-redirects.js <TOKEN>');
  console.error('  Get it from: https://supabase.com/dashboard/account/tokens');
  process.exit(1);
}

function apiRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const bodyStr = body ? JSON.stringify(body) : undefined;
    const options = {
      hostname: 'api.supabase.com',
      path,
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(bodyStr ? { 'Content-Length': Buffer.byteLength(bodyStr) } : {}),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

async function main() {
  console.log(`\n📡 Fetching current auth config for project: ${PROJECT_REF}\n`);

  // GET current config
  const getRes = await apiRequest('GET', `/v1/projects/${PROJECT_REF}/config/auth`);
  if (getRes.status !== 200) {
    console.error('Failed to fetch config:', getRes.status, getRes.body);
    process.exit(1);
  }

  const config = getRes.body;
  const currentRedirects = config.uri_allow_list || '';
  console.log('Current redirect URLs:', currentRedirects || '(none)');

  // Build new redirect list
  const existing = currentRedirects
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  const toAdd = [
    'promptpilot://',
    'exp://**',
    'https://prompt-pilot-ochre.vercel.app/api/auth/callback',
  ];

  const updated = [...new Set([...existing, ...toAdd])].join(',');
  console.log('\n✅ Updated redirect URLs:');
  updated.split(',').forEach(u => console.log('  -', u));

  // PATCH the config
  const patchRes = await apiRequest('PATCH', `/v1/projects/${PROJECT_REF}/config/auth`, {
    uri_allow_list: updated,
  });

  if (patchRes.status === 200) {
    console.log('\n🎉 Successfully updated Supabase redirect URLs!');
    console.log('\nNOTE: Also make sure Google OAuth is configured in:');
    console.log('  Supabase Dashboard → Authentication → Providers → Google');
    console.log('  And the Google Cloud Console Authorized redirect URIs includes:');
    console.log(`  https://${PROJECT_REF}.supabase.co/auth/v1/callback`);
  } else {
    console.error('\n❌ Failed to update config:', patchRes.status, JSON.stringify(patchRes.body, null, 2));
    process.exit(1);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
