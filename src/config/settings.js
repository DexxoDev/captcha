import 'dotenv/config';
import { z } from 'zod';

const intString = z.string().regex(/^\d+$/).transform(Number);

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DISCORD_TOKEN: z.string().min(1, 'DISCORD_TOKEN is required'),
  DISCORD_CLIENT_ID: z.string().min(1, 'DISCORD_CLIENT_ID is required'),
  DISCORD_TEST_GUILD_ID: z.string().optional(),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  VERIFICATION_SESSION_TTL_SECONDS: intString.default('60'),
  MAX_ATTEMPTS: intString.default('3'),
  FAILURE_COOLDOWN_SECONDS: intString.default('45'),
  RAID_WINDOW_SECONDS: intString.default('25'),
  RAID_JOIN_THRESHOLD: intString.default('7'),
  RAID_MODE_TTL_SECONDS: intString.default('180'),
  QUARANTINE_TIMEOUT_MINUTES: intString.default('10'),
  BRAND_NAME: z.string().default('Faster Shop'),
});

const env = envSchema.parse(process.env);

export const settings = {
  env: env.NODE_ENV,
  brandName: env.BRAND_NAME,
  discord: {
    token: env.DISCORD_TOKEN,
    clientId: env.DISCORD_CLIENT_ID,
    testGuildId: env.DISCORD_TEST_GUILD_ID ?? null,
    intents: [
      'Guilds',
      'GuildMembers',
      'GuildMessages',
      'GuildModeration',
      'DirectMessages',
      'MessageContent',
    ],
  },
  database: {
    url: env.DATABASE_URL,
  },
  redis: {
    url: env.REDIS_URL,
  },
  logging: {
    level: env.LOG_LEVEL,
  },
  ui: {
    accentColors: {
      brand: 0x0e1b12,
      success: 0x16a34a,
      danger: 0xb91c1c,
      warning: 0xd97706,
      admin: 0x14532d,
      raid: 0x052e16,
      neutral: 0x050807,
    },
    cadenceLabel: 'Black and green premium verification',
    footerNote: 'Luxury dark interface | Components V2',
  },
  security: {
    sessionTtlSeconds: env.VERIFICATION_SESSION_TTL_SECONDS,
    maxAttempts: env.MAX_ATTEMPTS,
    failureCooldownSeconds: env.FAILURE_COOLDOWN_SECONDS,
    quarantineTimeoutMinutes: env.QUARANTINE_TIMEOUT_MINUTES,
    raid: {
      windowSeconds: env.RAID_WINDOW_SECONDS,
      joinThreshold: env.RAID_JOIN_THRESHOLD,
      ttlSeconds: env.RAID_MODE_TTL_SECONDS,
    },
    difficultyProfiles: {
      relaxed: {
        lowRiskSteps: 1,
        mediumRiskSteps: 1,
        cooldownMultiplier: 1,
        highRiskManualReview: false,
      },
    },
    risk: {
      mediumThreshold: 22,
      highThreshold: 45,
      accountAge: {
        day: 24,
        threeDays: 72,
        week: 168,
      },
    },
  },
  defaults: {
    guildConfig: {
      difficulty: 'relaxed',
      raidMode: 'off',
      dmMode: 'prefer_dm',
      language: 'ar',
      verificationChannelId: null,
      panelChannelId: null,
      logChannelId: null,
      unverifiedRoleId: null,
      verifiedRoleId: null,
      suspiciousRoleId: null,
      quarantineRoleId: null,
      moderatorRoleId: null,
    },
  },
};
