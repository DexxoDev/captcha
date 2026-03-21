import { createClient } from 'redis';
import { settings } from '../config/settings.js';
import { startupError } from '../utils/startup.js';

export class RedisStore {
  constructor({ logger }) {
    this.logger = logger;
    this.client = createClient({
      url: settings.redis.url,
      socket: {
        reconnectStrategy: false,
        connectTimeout: 3000,
      },
    });

    this.client.on('error', (error) => {
      if (this.client.isOpen) {
        this.logger.warn(
          {
            error: {
              code: error?.code ?? null,
              message: error?.message ?? 'Unknown Redis error',
            },
          },
          'Redis connection problem',
        );
      }
    });
  }

  async connect() {
    if (!this.client.isOpen) {
      try {
        await this.client.connect();
        this.logger.info('Redis connected');
      } catch (error) {
        throw startupError('Redis', settings.redis.url, error);
      }
    }
  }

  async end() {
    if (this.client.isOpen) {
      await this.client.quit();
    }
  }
}
