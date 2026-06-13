// scripts/test-regex.mjs — one-off regex test
const re = /from\s+(['"])(\.{1,2}\/[^'"?#]+?)\1/g;
const tests = [
  `from './types/database.types'`,
  `from '../../types/fastify'`,
  `from '../../types/fastify.js'`,
  `from '../types/fastify'`,
  `from '../types/fastify.ts'`,
  `from './schemas/tenant.schema'`,
  `from '@jarvis/shared'`,
  `from './types'`,
  `from '../config'`,
  `import "../../types/fastify";`,
];
for (const line of tests) {
  const matches = [...line.matchAll(re)];
  const replaced = line.replace(re, (m, q, p) =>
    p.endsWith(".js") ? m : `from ${q}${p}.js${q}`
  );
  console.log(`INPUT:    ${line}`);
  console.log(`MATCHES:  ${matches.map(m => JSON.stringify(m[2])).join(", ") || "(none)"}`);
  console.log(`OUTPUT:   ${replaced}`);
  console.log(`CHANGED:  ${line !== replaced}`);
  console.log("");
}

