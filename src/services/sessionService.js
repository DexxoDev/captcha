import { settings } from '../config/settings.js';
import { secondsFromNow } from '../utils/time.js';

export class SessionService {
  constructor({ redis }) {
    this.redis = redis.client;
  }

  key(guildId, userId) {
    return `verify:session:${guildId}:${userId}`;
  }

  activeGuildKey(userId) {
    return `verify:active-user:${userId}`;
  }

  async get(guildId, userId) {
    const raw = await this.redis.get(this.key(guildId, userId));
    return raw ? JSON.parse(raw) : null;
  }

  async set(session) {
    const expiresAt = session.expiresAt ?? secondsFromNow(settings.security.sessionTtlSeconds);
    const ttlSeconds = Math.max(1, Math.ceil((expiresAt - Date.now()) / 1000));

    await this.redis.set(this.key(session.guildId, session.userId), JSON.stringify({
      ...session,
      expiresAt,
    }), {
      EX: ttlSeconds,
    });

    await this.redis.set(this.activeGuildKey(session.userId), session.guildId, {
      EX: ttlSeconds,
    });

    return {
      ...session,
      expiresAt,
    };
  }

  async getActiveGuildId(userId) {
    return this.redis.get(this.activeGuildKey(userId));
  }

  async clear(guildId, userId) {
    await this.redis.del(this.key(guildId, userId));
    await this.redis.del(this.activeGuildKey(userId));
  }
}
