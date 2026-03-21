import 'dotenv/config';
import pg from 'pg';
import { createClient } from 'redis';
import { settings } from './config/settings.js';

async function checkPostgres() {
  const pool = new pg.Pool({
    connectionString: settings.database.url,
  });

  try {
    const client = await pool.connect();
    client.release();
    console.log(`PASS postgres ${new URL(settings.database.url).host}`);
  } catch (error) {
    console.log(`FAIL postgres ${new URL(settings.database.url).host} ${error.code ?? ''}`.trim());
  } finally {
    await pool.end().catch(() => null);
  }
}

async function checkRedis() {
  const client = createClient({
    url: settings.redis.url,
    socket: {
      reconnectStrategy: false,
      connectTimeout: 3000,
    },
  });

  try {
    await client.connect();
    console.log(`PASS redis ${new URL(settings.redis.url).host}`);
  } catch (error) {
    console.log(`FAIL redis ${new URL(settings.redis.url).host} ${error.code ?? ''}`.trim());
  } finally {
    if (client.isOpen) {
      await client.quit().catch(() => null);
    }
  }
}

await checkPostgres();
await checkRedis();
console.log('If either service fails, the bot now falls back to local storage automatically.');
