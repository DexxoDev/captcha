import { channelPayload } from '../utils/discord.js';

export class SecurityLogService {
  constructor({ db, client, configService, logger }) {
    this.db = db;
    this.client = client;
    this.configService = configService;
    this.logger = logger;
  }

  async recordAttempt({
    guildId,
    userId,
    challengeType,
    riskScore,
    riskTier,
    passed,
    deliveryMode,
    failureReason = null,
    metadata = {},
  }) {
    await this.db.query(
      `
        INSERT INTO verification_attempts (
          guild_id,
          user_id,
          challenge_type,
          risk_score,
          risk_tier,
          passed,
          delivery_mode,
          failure_reason,
          metadata
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
      `,
      [
        guildId,
        userId,
        challengeType,
        riskScore,
        riskTier,
        passed,
        deliveryMode,
        failureReason,
        JSON.stringify(metadata),
      ],
    );
  }

  async recordEvent({
    guildId,
    userId = null,
    eventType,
    severity,
    summary,
    details = {},
  }) {
    await this.db.query(
      `
        INSERT INTO security_events (
          guild_id,
          user_id,
          event_type,
          severity,
          summary,
          details
        )
        VALUES ($1, $2, $3, $4, $5, $6::jsonb)
      `,
      [
        guildId,
        userId,
        eventType,
        severity,
        summary,
        JSON.stringify(details),
      ],
    );
  }

  async sendToLogChannel(guild, payload) {
    const config = await this.configService.get(guild.id);

    if (!config.logChannelId) {
      return;
    }

    const channel = await guild.channels.fetch(config.logChannelId).catch(() => null);

    if (!channel?.isTextBased()) {
      this.logger.warn({ guildId: guild.id, channelId: config.logChannelId }, 'Configured log channel is not usable');
      return;
    }

    await channel.send(channelPayload(payload));
  }

  async getStats(guildId) {
    const attemptResult = await this.db.query(
      `
        SELECT
          COUNT(*)::INT AS total,
          COUNT(*) FILTER (WHERE passed = true)::INT AS passed,
          COUNT(*) FILTER (WHERE passed = false)::INT AS failed
        FROM verification_attempts
        WHERE guild_id = $1
          AND created_at >= NOW() - INTERVAL '24 hours'
      `,
      [guildId],
    );

    const eventResult = await this.db.query(
      `
        SELECT
          COUNT(*) FILTER (WHERE event_type = 'suspicious_attempt')::INT AS suspicious_attempts,
          COUNT(*) FILTER (WHERE event_type = 'panel_published')::INT AS panels_published
        FROM security_events
        WHERE guild_id = $1
          AND created_at >= NOW() - INTERVAL '24 hours'
      `,
      [guildId],
    );

    return {
      attempts: attemptResult.rows[0],
      events: eventResult.rows[0],
    };
  }
}
