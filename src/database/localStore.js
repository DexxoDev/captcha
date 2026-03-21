import fs from 'node:fs/promises';
import path from 'node:path';

const DAY_MS = 24 * 60 * 60 * 1000;

function createState() {
  return {
    guildConfigs: {},
    verificationAttempts: [],
    securityEvents: [],
  };
}

export class LocalStore {
  constructor({ logger, filePath = path.resolve(process.cwd(), 'data', 'local-store.json') }) {
    this.logger = logger;
    this.filePath = filePath;
    this.state = createState();
  }

  async connect() {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });

    try {
      const raw = await fs.readFile(this.filePath, 'utf8');
      this.state = JSON.parse(raw);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }

      await this.flush();
    }

    this.logger.warn({ file: this.filePath }, 'Local JSON storage enabled');
  }

  async flush() {
    await fs.writeFile(this.filePath, JSON.stringify(this.state, null, 2));
  }

  async query(text, params = []) {
    const normalized = text.replace(/\s+/g, ' ').trim();

    if (normalized.startsWith('SELECT * FROM guild_configs WHERE guild_id = $1')) {
      const guildId = params[0];
      const row = this.state.guildConfigs[guildId];
      return {
        rowCount: row ? 1 : 0,
        rows: row ? [row] : [],
      };
    }

    if (normalized.includes('INSERT INTO guild_configs')) {
      const [
        guildId,
        verificationChannelId,
        panelChannelId,
        logChannelId,
        unverifiedRoleId,
        verifiedRoleId,
        suspiciousRoleId,
        quarantineRoleId,
        moderatorRoleId,
        language,
        difficulty,
        raidMode,
        dmMode,
      ] = params;

      this.state.guildConfigs[guildId] = {
        guild_id: guildId,
        verification_channel_id: verificationChannelId,
        panel_channel_id: panelChannelId,
        log_channel_id: logChannelId,
        unverified_role_id: unverifiedRoleId,
        verified_role_id: verifiedRoleId,
        suspicious_role_id: suspiciousRoleId,
        quarantine_role_id: quarantineRoleId,
        moderator_role_id: moderatorRoleId,
        language,
        difficulty,
        raid_mode: raidMode,
        dm_mode: dmMode,
        updated_at: new Date().toISOString(),
      };

      await this.flush();
      return {
        rowCount: 1,
        rows: [],
      };
    }

    if (normalized.includes('INSERT INTO verification_attempts')) {
      const [
        guildId,
        userId,
        challengeType,
        riskScore,
        riskTier,
        passed,
        deliveryMode,
        failureReason,
        metadata,
      ] = params;

      this.state.verificationAttempts.push({
        guild_id: guildId,
        user_id: userId,
        challenge_type: challengeType,
        risk_score: riskScore,
        risk_tier: riskTier,
        passed,
        delivery_mode: deliveryMode,
        failure_reason: failureReason,
        metadata: JSON.parse(metadata),
        created_at: new Date().toISOString(),
      });

      await this.flush();
      return {
        rowCount: 1,
        rows: [],
      };
    }

    if (normalized.includes('INSERT INTO security_events')) {
      const [
        guildId,
        userId,
        eventType,
        severity,
        summary,
        details,
      ] = params;

      this.state.securityEvents.push({
        guild_id: guildId,
        user_id: userId,
        event_type: eventType,
        severity,
        summary,
        details: JSON.parse(details),
        created_at: new Date().toISOString(),
      });

      await this.flush();
      return {
        rowCount: 1,
        rows: [],
      };
    }

    if (normalized.includes('FROM verification_attempts')) {
      const guildId = params[0];
      const cutoff = Date.now() - DAY_MS;
      const items = this.state.verificationAttempts.filter((item) => {
        return item.guild_id === guildId && new Date(item.created_at).getTime() >= cutoff;
      });

      return {
        rowCount: 1,
        rows: [
          {
            total: items.length,
            passed: items.filter((item) => item.passed).length,
            failed: items.filter((item) => !item.passed).length,
          },
        ],
      };
    }

    if (normalized.includes('FROM security_events')) {
      const guildId = params[0];
      const cutoff = Date.now() - DAY_MS;
      const items = this.state.securityEvents.filter((item) => {
        return item.guild_id === guildId && new Date(item.created_at).getTime() >= cutoff;
      });

      return {
        rowCount: 1,
        rows: [
          {
            suspicious_attempts: items.filter((item) => item.event_type === 'suspicious_attempt').length,
            panels_published: items.filter((item) => item.event_type === 'panel_published').length,
          },
        ],
      };
    }

    throw new Error(`Unsupported local query: ${normalized}`);
  }

  async end() {
    await this.flush();
  }
}
