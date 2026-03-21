import { settings } from '../config/settings.js';

const selectableFields = [
  'verificationChannelId',
  'panelChannelId',
  'logChannelId',
  'unverifiedRoleId',
  'verifiedRoleId',
  'suspiciousRoleId',
  'quarantineRoleId',
  'moderatorRoleId',
  'language',
  'difficulty',
  'raidMode',
  'dmMode',
];

function mapRow(row) {
  return {
    guildId: row.guild_id,
    verificationChannelId: row.verification_channel_id,
    panelChannelId: row.panel_channel_id,
    logChannelId: row.log_channel_id,
    unverifiedRoleId: row.unverified_role_id,
    verifiedRoleId: row.verified_role_id,
    suspiciousRoleId: row.suspicious_role_id,
    quarantineRoleId: row.quarantine_role_id,
    moderatorRoleId: row.moderator_role_id,
    language: row.language,
    difficulty: row.difficulty,
    raidMode: row.raid_mode,
    dmMode: row.dm_mode,
  };
}

export class GuildConfigService {
  constructor({ db, logger }) {
    this.db = db;
    this.logger = logger;
  }

  createDefault(guildId) {
    return {
      guildId,
      ...settings.defaults.guildConfig,
    };
  }

  sanitizePatch(patch) {
    return Object.fromEntries(
      Object.entries(patch).filter(([key]) => selectableFields.includes(key)),
    );
  }

  async get(guildId) {
    const result = await this.db.query('SELECT * FROM guild_configs WHERE guild_id = $1', [guildId]);

    if (!result.rowCount) {
      return this.createDefault(guildId);
    }

    return {
      ...this.createDefault(guildId),
      ...mapRow(result.rows[0]),
    };
  }

  async upsert(guildId, patch) {
    const current = await this.get(guildId);
    const next = {
      ...current,
      ...this.sanitizePatch(patch),
    };

    await this.db.query(
      `
        INSERT INTO guild_configs (
          guild_id,
          verification_channel_id,
          panel_channel_id,
          log_channel_id,
          unverified_role_id,
          verified_role_id,
          suspicious_role_id,
          quarantine_role_id,
          moderator_role_id,
          language,
          difficulty,
          raid_mode,
          dm_mode
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT (guild_id)
        DO UPDATE SET
          verification_channel_id = EXCLUDED.verification_channel_id,
          panel_channel_id = EXCLUDED.panel_channel_id,
          log_channel_id = EXCLUDED.log_channel_id,
          unverified_role_id = EXCLUDED.unverified_role_id,
          verified_role_id = EXCLUDED.verified_role_id,
          suspicious_role_id = EXCLUDED.suspicious_role_id,
          quarantine_role_id = EXCLUDED.quarantine_role_id,
          moderator_role_id = EXCLUDED.moderator_role_id,
          language = EXCLUDED.language,
          difficulty = EXCLUDED.difficulty,
          raid_mode = EXCLUDED.raid_mode,
          dm_mode = EXCLUDED.dm_mode,
          updated_at = NOW()
      `,
      [
        guildId,
        next.verificationChannelId,
        next.panelChannelId,
        next.logChannelId,
        next.unverifiedRoleId,
        next.verifiedRoleId,
        next.suspiciousRoleId,
        next.quarantineRoleId,
        next.moderatorRoleId,
        next.language,
        next.difficulty,
        next.raidMode,
        next.dmMode,
      ],
    );

    this.logger.info({ guildId, patch: this.sanitizePatch(patch) }, 'Guild config updated');
    return next;
  }

  isReady(config) {
    return Boolean(
      config.verificationChannelId &&
        config.panelChannelId &&
        config.unverifiedRoleId &&
        config.verifiedRoleId,
    );
  }
}
