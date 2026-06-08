// Apply Supabase migrations via the Management API.
// Reads SUPABASE_MGMT_TOKEN + SUPABASE_URL from .env. Never echoes
// secret values; only prints HTTP status + table-level results.
//
// Usage: node scripts/apply-migrations.mjs
import 'dotenv/config'
import { readFile } from 'node:fs/promises'

const url = process.env.SUPABASE_URL
const pat = process.env.SUPABASE_MGMT_TOKEN

if (!url || !pat) {
  console.error('FAIL: SUPABASE_URL and SUPABASE_MGMT_TOKEN must be set in .env')
  process.exit(1)
}

// Extract project ref from URL (e.g. https://abcdefg.supabase.co → abcdefg)
const refMatch = url.match(/https:\/\/([a-z0-9]+)\.supabase\.co/i)
if (!refMatch) {
  console.error('FAIL: Could not parse project ref from SUPABASE_URL')
  process.exit(1)
}
const projectRef = refMatch[1]

const endpoint = `https://api.supabase.com/v1/projects/${projectRef}/database/query`

async function runSql(label, sql) {
  process.stdout.write(`[${label}] sending ${sql.length} chars... `)
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${pat}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  })
  const status = res.status
  let body
  try { body = await res.json() }
  catch { body = await res.text() }

  if (status >= 200 && status < 300) {
    console.log(`OK (${status})`)
    return true
  }
  else {
    const msg = typeof body === 'object' ? (body.message || body.error || JSON.stringify(body)) : String(body)
    console.log(`FAIL (${status}): ${String(msg).slice(0, 200)}`)
    return false
  }
}

const migrations = [
  'supabase/migrations/001_initial.sql',
  'supabase/migrations/002_email_messages.sql',
]

console.log(`Applying migrations to project ref: ${projectRef}\n`)

let allOk = true
for (const path of migrations) {
  const sql = await readFile(path, 'utf8')
  const ok = await runSql(path, sql)
  if (!ok) allOk = false
}

console.log(`\n${allOk ? 'All migrations applied successfully.' : 'Some migrations failed — inspect output above.'}`)
process.exit(allOk ? 0 : 1)
