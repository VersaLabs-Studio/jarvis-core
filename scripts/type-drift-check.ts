import { createHash } from 'node:crypto'
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const MIGRATIONS_DIR = join(ROOT, 'supabase', 'migrations')
const TYPES_FILE = join(ROOT, 'packages', 'shared', 'src', 'types', 'database.types.ts')
const HASH_FILE = join(ROOT, '.migration-hash')

function hashMigrations(): string {
  const hash = createHash('sha256')

  // Only hash schema-changing migrations. GRANT / REVOKE / COMMENT-only
  // migrations (e.g. supabase/migrations/0004_role_grants.sql) don't
  // change the generated types, so including them in the hash produces
  // false-positive drift. The CREATE/ALTER/DROP regex is a cheap
  // heuristic — if a future migration is "GRANTs + a CREATE", it's
  // caught (CREATE matches), which is the right behavior.
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .filter((f) => {
      const content = readFileSync(join(MIGRATIONS_DIR, f), 'utf-8')
      return /CREATE|ALTER|DROP/i.test(content)
    })

  if (files.length === 0) {
    console.error('No schema-changing migration files found in supabase/migrations/')
    process.exit(1)
  }

  for (const file of files) {
    const filePath = join(MIGRATIONS_DIR, file)
    const content = readFileSync(filePath, 'utf-8')
    hash.update(file)
    hash.update(content)
  }

  return hash.digest('hex')
}

function hashTypesFile(): string {
  try {
    const content = readFileSync(TYPES_FILE, 'utf-8')
    return createHash('sha256').update(content).digest('hex')
  } catch {
    console.error('Types file not found:', TYPES_FILE)
    process.exit(1)
  }
}

function main() {
  const migrationHash = hashMigrations()
  const typesHash = hashTypesFile()

  let storedHash = ''
  try {
    storedHash = readFileSync(HASH_FILE, 'utf-8').trim()
  } catch {
    // No stored hash yet
  }

  if (storedHash && storedHash !== migrationHash) {
    console.error('\x1b[31mTYPE DRIFT DETECTED\x1b[0m')
    console.error('')
    console.error('Migration files have changed since types were last generated.')
    console.error('Run the following to regenerate types:')
    console.error('')
    console.error('  npx supabase gen types typescript --project-id <id> > packages/shared/src/types/database.types.ts')
    console.error('')
    console.error(`Expected hash: ${migrationHash}`)
    console.error(`Stored hash:   ${storedHash}`)
    process.exit(1)
  }

  writeFileSync(HASH_FILE, migrationHash, 'utf-8')

  console.log('\x1b[32m✓ Type drift check passed\x1b[0m')
  console.log(`  Migration hash: ${migrationHash}`)
  console.log(`  Types hash:     ${typesHash}`)
}

main()
