import { settings } from '../config/settings.js';

export class RaidService {
  constructor({ redis }) {
    this.redis = redis.client;
  }

  joinKey(guildId) {
    return `raid:joins:${guildId}`;
  }

  activeKey(guildId) {
    return `raid:active:${guildId}`;
  }

  async getBurstSize(guildId) {
    return this.redis.zCard(this.joinKey(guildId));
  }

  async recordJoin(guildId) {
    const currentTime = Date.now();
    const minScore = currentTime - settings.security.raid.windowSeconds * 1000;
    const memberId = `${currentTime}:${Math.random().toString(36).slice(2, 8)}`;

    await this.redis.zAdd(this.joinKey(guildId), {
      score: currentTime,
      value: memberId,
    });
    await this.redis.zRemRangeByScore(this.joinKey(guildId), 0, minScore);
    await this.redis.expire(this.joinKey(guildId), settings.security.raid.windowSeconds + 5);

    const burstSize = await this.redis.zCard(this.joinKey(guildId));
    const isActive = await this.redis.exists(this.activeKey(guildId));
    let triggeredNow = false;

    if (burstSize >= settings.security.raid.joinThreshold) {
      if (!isActive) {
        triggeredNow = true;
      }

      await this.redis.set(this.activeKey(guildId), JSON.stringify({
        triggeredAt: currentTime,
        burstSize,
      }), {
        EX: settings.security.raid.ttlSeconds,
      });
    }

    return {
      burstSize,
      active: Boolean(await this.redis.exists(this.activeKey(guildId))),
      triggeredNow,
    };
  }

  async getState(guildId, mode = 'auto') {
    const burstSize = await this.getBurstSize(guildId);

    if (mode === 'on') {
      return {
        active: true,
        source: 'manual',
        burstSize,
      };
    }

    if (mode === 'off') {
      return {
        active: false,
        source: 'manual',
        burstSize,
      };
    }

    return {
      active: Boolean(await this.redis.exists(this.activeKey(guildId))),
      source: 'auto',
      burstSize,
    };
  }
}
