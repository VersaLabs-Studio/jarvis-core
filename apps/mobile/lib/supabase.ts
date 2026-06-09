// D-SEC-1: Session at rest in SecureStore ONLY. No AsyncStorage, no service-role key.

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@jarvis/shared';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// ---------------------------------------------------------------------------
// SecureStore chunking adapter
// SecureStore has a ~2048 byte value limit. Supabase sessions (especially with
// refresh tokens and provider data) can exceed that. This adapter transparently
// splits large values into numbered chunks and reassembles on read.
// ---------------------------------------------------------------------------

const CHUNK_SIZE = 2048;

const secureStoreAdapter = {
  async getItem(key: string): Promise<string | null> {
    // Check if the value was stored as chunks
    const countRaw = await SecureStore.getItemAsync(`${key}_chunk_count`);

    if (countRaw !== null) {
      const count = Number(countRaw);
      const chunks: string[] = [];

      for (let i = 0; i < count; i++) {
        const chunk = await SecureStore.getItemAsync(`${key}_chunk_${i}`);
        if (chunk === null) {
          // Corrupt chunk set — clean up and return null
          await secureStoreAdapter.removeItem(key);
          return null;
        }
        chunks.push(chunk);
      }

      return chunks.join('');
    }

    // Not chunked — return single value
    return SecureStore.getItemAsync(key);
  },

  async setItem(key: string, value: string): Promise<void> {
    // Always clean up any previous chunks first
    await secureStoreAdapter.removeItem(key);

    if (value.length > CHUNK_SIZE) {
      const count = Math.ceil(value.length / CHUNK_SIZE);

      for (let i = 0; i < count; i++) {
        const chunk = value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
        await SecureStore.setItemAsync(`${key}_chunk_${i}`, chunk);
      }

      await SecureStore.setItemAsync(`${key}_chunk_count`, String(count));
    } else {
      await SecureStore.setItemAsync(key, value);
    }
  },

  async removeItem(key: string): Promise<void> {
    const countRaw = await SecureStore.getItemAsync(`${key}_chunk_count`);

    if (countRaw !== null) {
      const count = Number(countRaw);

      for (let i = 0; i < count; i++) {
        await SecureStore.deleteItemAsync(`${key}_chunk_${i}`);
      }

      await SecureStore.deleteItemAsync(`${key}_chunk_count`);
    } else {
      await SecureStore.deleteItemAsync(key);
    }
  },
};

// ---------------------------------------------------------------------------
// Supabase client — ANON KEY ONLY (never service-role on device)
// ---------------------------------------------------------------------------

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: secureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
