#!/usr/bin/env node
// Create a Supabase auth user from the command line.
//
// Usage:
//   node scripts/create-user.mjs
//
// Prompts interactively for email, full name, and password. The password
// is read with echo disabled, never echoed, never written to argv, and
// never logged. Requires SUPABASE_URL and SUPABASE_SERVICE_KEY in .env
// (the same values the dev server uses).
//
// What this does:
//   1. Calls supabase.auth.admin.createUser with email_confirm: true
//      so the user can sign in immediately (no confirmation email).
//   2. Stores full_name in user_metadata.
//   3. Prints the new user's id and email on success.
//
// What this does NOT do:
//   - Send invite emails (use the dashboard for that).
//   - Reset existing users' passwords (use the dashboard or the
//      app's /account page).

import { createClient } from '@supabase/supabase-js'
import { createInterface } from 'node:readline/promises'
import { stdin, stdout, exit } from 'node:process'
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

// Minimal .env loader so the script doesn't pull in dotenv as a dep.
const here = dirname(fileURLToPath(import.meta.url))
const envPath = resolve(here, '..', '.env')
if (existsSync(envPath)) {
  for (const rawLine of readFileSync(envPath, 'utf8').split('\n')) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq <= 0) continue
    const k = line.slice(0, eq).trim()
    if (!/^[A-Z_][A-Z0-9_]*$/.test(k)) continue
    if (process.env[k]) continue
    let v = line.slice(eq + 1).trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith('\'') && v.endsWith('\''))) v = v.slice(1, -1)
    process.env[k] = v
  }
}

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in environment / .env')
  exit(1)
}

// Read a secret from stdin with echo disabled. Returns the trimmed string.
async function readSecret(prompt) {
  stdout.write(prompt)
  const wasRaw = stdin.isRaw
  const wasTTY = stdin.isTTY
  if (wasTTY) stdin.setRawMode(true)
  stdin.resume()
  stdin.setEncoding('utf8')
  let buf = ''
  return await new Promise((resolveFn) => {
    const onData = (ch) => {
      if (ch === '\r' || ch === '\n' || ch === '\u0004') {
        if (wasTTY) stdin.setRawMode(wasRaw)
        stdin.removeListener('data', onData)
        stdin.pause()
        stdout.write('\n')
        resolveFn(buf)
        return
      }
      if (ch === '\u0003') { stdout.write('\n'); exit(130) }
      if (ch === '\u007F' || ch === '\b') { buf = buf.slice(0, -1); return }
      buf += ch
    }
    stdin.on('data', onData)
  })
}

const rl = createInterface({ input: stdin, output: stdout })
const email = (await rl.question('Email: ')).trim()
const fullName = (await rl.question('Full name: ')).trim()
rl.close()

if (!email || !fullName) {
  console.error('Email and full name are required.')
  exit(1)
}

const password = await readSecret('Password (hidden): ')
const confirm = await readSecret('Confirm password: ')
if (password !== confirm) { console.error('Passwords do not match.'); exit(1) }
if (password.length < 8) { console.error('Password must be at least 8 characters.'); exit(1) }

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const { data, error } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { full_name: fullName },
})

if (error) {
  console.error(`Failed: ${error.message}`)
  exit(1)
}

console.log(`Created user ${data.user?.id} (${data.user?.email})`)
console.log('They can now sign in at /login.')
