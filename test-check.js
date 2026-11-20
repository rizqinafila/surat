const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8');
const lines = env.split(/\r?\n/);
const envVars = {};
for (const line of lines) {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    envVars[match[1]] = value;
  }
}
const { createClient } = require('@supabase/supabase-js');
const client = createClient(envVars.EXPO_PUBLIC_SUPABASE_URL, envVars.EXPO_PUBLIC_SUPABASE_ANON_KEY);

async function check() {
  const { data: authData, error: uErr } = await client.auth.signInWithPassword({
    email: 'informatika@suratin.local',
    password: 'Informatika2026!'
  });
  if (uErr) {
    console.log('Login error:', uErr.message);
    return;
  }
  console.log('Login success! User ID:', authData.user.id);
  const { data: prof, error: pErr } = await client.from('profil').select('*');
  console.log('Profil table:', prof, 'Error:', pErr);
  const { data: lem, error: lErr } = await client.from('lembaga').select('*');
  console.log('Lembaga table count:', lem?.length, 'Data:', lem, 'Error:', lErr);
  const { data: per, error: perErr } = await client.from('periode').select('*');
  console.log('Periode table:', per, 'Error:', perErr);
}
check();

