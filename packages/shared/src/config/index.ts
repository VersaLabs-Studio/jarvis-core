export { ENTITY_CONFIG, type EntityKey } from './entities.js'

export const APP_CONFIG = {
  name: 'JARVIS',
  version: '1.5.0',
  api: {
    port: Number(process.env['PORT'] ?? 3001),
    host: process.env['HOST'] ?? '0.0.0.0',
    cors_origins: process.env['CORS_ORIGINS']?.split(',') ?? ['http://localhost:3000'],
  },
  web: {
    port: Number(process.env['WEB_PORT'] ?? 3000),
    url: process.env['NEXT_PUBLIC_APP_URL'] ?? 'http://localhost:3000',
  },
  pagination: {
    default_page: 1,
    default_per_page: 20,
    max_per_page: 100,
  },
} as const
