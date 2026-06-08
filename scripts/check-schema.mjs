// One-off Supabase schema introspection.
// Reads .env locally, checks for each expected table, prints existence +
// row count only. Never prints URLs, keys, or row contents.
//
// Usage: node scripts/check-schema.mjs
import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY

if (!url || !key) {
  console.error('FAIL: SUPABASE_URL and SUPABASE_SERVICE_KEY (or SUPABASE_KEY) must be set in .env')
  process.exit(1)
}

const supabase = createClient(url, key, { auth: { persistSession: false } })

const expected = [
  { table: 'leads', migration: '001_initial.sql' },
  { table: 'search_terms', migration: '001_initial.sql' },
  { table: 'negative_keywords', migration: '001_initial.sql' },
  { table: 'audit_sessions', migration: '001_initial.sql' },
  { table: 'email_messages', migration: '002_email_messages.sql' },
]

console.log('Checking Supabase schema...\n')

let missing = 0
let present = 0
const results = []

for (const { table, migration } of expected) {
  try {
    // Use a real (non-head) select so PostgREST surfaces missing-table errors
    // properly. head:true + count returns {error:null,count:null} on missing
    // tables, which produces false positives.
    const { data, error } = await supabase.from(table).select('*').limit(1)

    if (error) {
      const isMissing = /relation .* does not exist|schema cache|PGRST205|not found/i.test(error.message)
      results.push({ table, migration, status: isMissing ? 'MISSING' : 'ERROR', detail: isMissing ? '—' : error.message.split('\n')[0].slice(0, 80) })
      if (isMissing) missing++
    }
    else {
      // Get an exact count too
      const { count } = await supabase.from(table).select('*', { count: 'exact', head: true })
      results.push({ table, migration, status: 'EXISTS', detail: `${count ?? data?.length ?? 0} rows` })
      present++
    }
  }
  catch (e) {
    results.push({ table, migration, status: 'ERROR', detail: (e instanceof Error ? e.message : String(e)).slice(0, 80) })
  }
}

// Pretty-print
const w1 = Math.max(...results.map(r => r.table.length), 5)
const w2 = Math.max(...results.map(r => r.migration.length), 9)
console.log(`${'Table'.padEnd(w1)}  ${'Migration'.padEnd(w2)}  Status   Detail`)
console.log(`${'-'.repeat(w1)}  ${'-'.repeat(w2)}  -------  ------`)
for (const r of results) {
  console.log(`${r.table.padEnd(w1)}  ${r.migration.padEnd(w2)}  ${r.status.padEnd(7)}  ${r.detail}`)
}

console.log(`\nSummary: ${present} present, ${missing} missing, ${results.length - present - missing} other`)

if (missing === 0) {
  console.log('\nAll expected tables exist. No migrations need to be applied.')
}
else {
  const need = [...new Set(results.filter(r => r.status === 'MISSING').map(r => r.migration))]
  console.log(`\nApply: ${need.join(', ')}`)
}
