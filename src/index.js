import {
  Client,
  GatewayIntentBits,
  Partials,
} from 'discord.js';
import { verificationCommands } from './commands/verify.js';
import { settings } from './config/settings.js';
import { LocalStore } from './database/localStore.js';
import { MemoryRedisStore } from './database/memoryRedis.js';
import { PostgresStore } from './database/postgres.js';
import { RedisStore } from './database/redis.js';
import { registerGuildMemberAddEvent } from './events/guildMemberAdd.js';
import { registerInteractionCreateEvent } from './events/interactionCreate.js';
import { registerMessageCreateEvent } from './events/messageCreate.js';
import { registerReadyEvent } from './events/ready.js';
import { CaptchaService } from './services/captchaService.js';
import { ChallengeService } from './services/challengeService.js';
import { GuildConfigService } from './services/guildConfigService.js';
import { PanelArtService } from './services/panelArtService.js';
import { RaidService } from './services/raidService.js';
import { RiskService } from './services/riskService.js';
import { SecurityLogService } from './services/securityLogService.js';
import { SessionService } from './services/sessionService.js';
import { VerificationService } from './services/verificationService.js';
import { logger } from './utils/logger.js';
import { startupSummary } from './utils/startup.js';

async function createPersistence() {
  let db = new PostgresStore({ logger });

  try {
    await db.connect();
  } catch (error) {
    logger.warn({ error: startupSummary(error) }, 'PostgreSQL offline, using local JSON storage');
    db = new LocalStore({ logger });
    await db.connect();
  }

  let redis = new RedisStore({ logger });

  try {
    await redis.connect();
  } catch (error) {
    logger.warn({ error: startupSummary(error) }, 'Redis offline, using in-memory session storage');
    redis = new MemoryRedisStore({ logger });
    await redis.connect();
  }

  return { db, redis };
}

async function main() {
  const { db, redis } = await createPersistence();

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.GuildModeration,
      GatewayIntentBits.DirectMessages,
      GatewayIntentBits.MessageContent,
    ],
    partials: [Partials.Channel],
  });

  const configService = new GuildConfigService({ db, logger });
  const sessionService = new SessionService({ redis });
  const raidService = new RaidService({ redis });
  const riskService = new RiskService();
  const captchaService = new CaptchaService();
  const challengeService = new ChallengeService({ captcha: captchaService });
  const panelArtService = new PanelArtService();
  const securityLogService = new SecurityLogService({
    db,
    client,
    configService,
    logger,
  });
  const verificationService = new VerificationService({
    client,
    logger,
    configService,
    sessionService,
    raidService,
    riskService,
    challengeService,
    securityLogService,
    panelArtService,
  });

  const services = {
    logger,
    db,
    redis,
    configService,
    sessionService,
    raidService,
    riskService,
    captchaService,
    challengeService,
    panelArtService,
    securityLogService,
    verificationService,
    commands: Object.fromEntries(
      verificationCommands.map((command) => [command.data.name, command]),
    ),
  };

  registerReadyEvent(client, services);
  registerGuildMemberAddEvent(client, services);
  registerInteractionCreateEvent(client, services);
  registerMessageCreateEvent(client, services);

  const shutdown = async (signal) => {
    logger.info({ signal }, 'Shutting down');
    await client.destroy();
    await Promise.allSettled([db.end(), redis.end()]);
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));

  await client.login(settings.discord.token);
}

main().catch((error) => {
  logger.fatal({ error: startupSummary(error) }, 'Application boot failed');
  process.exit(1);
});
