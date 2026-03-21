import pg from 'pg';
import { settings } from '../config/settings.js';
import { startupError } from '../utils/startup.js';

export class PostgresStore {
  constructor({ logger }) {
    this.logger = logger;
    this.pool = new pg.Pool({
      connectionString: settings.database.url,
    });
  }

  async connect() {
    try {
      const client = await this.pool.connect();
      client.release();
      this.logger.info('PostgreSQL connected');
    } catch (error) {
      throw startupError('PostgreSQL', settings.database.url, error);
    }
  }

  async query(text, params = []) {
    return this.pool.query(text, params);
  }

  async end() {
    await this.pool.end();
  }
}
