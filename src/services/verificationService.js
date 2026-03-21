import { AttachmentBuilder, MessageFlags, PermissionsBitField } from 'discord.js';
import { emojis } from '../config/emojis.js';
import { normalizeLocale, t, verificationRoleNames } from '../config/i18n.js';
import { settings } from '../config/settings.js';
import { customId, parseCustomId } from '../utils/customIds.js';
import { channelPayload, interactionPayload } from '../utils/discord.js';
import { createFrame, infoSection } from '../ui/components.js';
import { buildPanelPublishedScreen } from '../ui/adminScreens.js';
import {
  buildCooldownScreen,
  buildFailureScreen,
  buildJoinPrompt,
  buildSuccessScreen,
  buildVerificationPanel,
  buildChallengeScreen,
} from '../ui/verificationScreens.js';
import {
  buildFailureLogScreen,
  buildPanelPublishedLogScreen,
  buildSuccessLogScreen,
  buildSuspiciousAttemptLog,
} from '../ui/logScreens.js';

function editPayload(payload) {
  return {
    ...payload,
    flags: MessageFlags.IsComponentsV2,
    withComponents: true,
  };
}

export class VerificationService {
  constructor({
    client,
    logger,
    configService,
    sessionService,
    raidService,
    riskService,
    challengeService,
    securityLogService,
    panelArtService,
  }) {
    this.client = client;
    this.logger = logger;
    this.configService = configService;
    this.sessionService = sessionService;
    this.raidService = raidService;
    this.riskService = riskService;
    this.challengeService = challengeService;
    this.securityLogService = securityLogService;
    this.panelArtService = panelArtService;
  }

  localeOf(value = null) {
    return normalizeLocale(value?.language ?? value?.locale ?? settings.defaults.guildConfig.language);
  }

  notice({
    locale = settings.defaults.guildConfig.language,
    accentColor = settings.ui.accentColors.neutral,
    eyebrow = `${emojis.status} ${settings.brandName}`,
    title,
    summary,
    lines = [],
  }) {
    const activeLocale = this.localeOf({ language: locale });

    return createFrame({
      accentColor,
      eyebrow,
      title,
      summary,
      sections: lines.length
        ? [
            infoSection({
              title: t(activeLocale, 'common.details'),
              lines,
            }),
          ]
        : [],
    });
  }

  async respond(interaction, payload, { ephemeral = interaction.inGuild?.() ?? Boolean(interaction.guildId), update = false } = {}) {
    if (update && typeof interaction.update === 'function') {
      return interaction.update(editPayload(payload));
    }

    if (interaction.deferred || interaction.replied) {
      return interaction.editReply(editPayload(payload));
    }

    return interaction.reply(interactionPayload(payload, { ephemeral }));
  }

  async sendChannelPayload(channel, payload) {
    return channel.send(channelPayload(payload));
  }

  async acknowledgeInteraction(interaction, { ephemeral = Boolean(interaction.guildId) } = {}) {
    if (interaction.deferred || interaction.replied || typeof interaction.deferReply !== 'function') {
      return false;
    }

    await interaction.deferReply({ ephemeral });
    return true;
  }

  componentHasCustomId(component, targetCustomId) {
    const candidate = typeof component?.toJSON === 'function' ? component.toJSON() : component;

    if (!candidate || typeof candidate !== 'object') {
      return false;
    }

    if (candidate.custom_id === targetCustomId || candidate.customId === targetCustomId) {
      return true;
    }

    if (Array.isArray(candidate.components)) {
      return candidate.components.some((child) => this.componentHasCustomId(child, targetCustomId));
    }

    return false;
  }

  isVerificationPanelMessage(message, guildId) {
    if (message.author?.id !== this.client.user?.id) {
      return false;
    }

    const targetCustomId = customId('verify', 'start', guildId);
    return message.components.some((component) => this.componentHasCustomId(component, targetCustomId));
  }

  async clearExistingPanels(channel, guildId) {
    const messages = await channel.messages.fetch({ limit: 25 }).catch(() => null);

    if (!messages) {
      return;
    }

    const panelMessages = [...messages.values()].filter((message) => this.isVerificationPanelMessage(message, guildId));

    for (const panelMessage of panelMessages) {
      await panelMessage.delete().catch(() => null);
    }
  }

  async ensureVerificationRoles(guild, config) {
    const locale = this.localeOf(config);
    const roleNames = verificationRoleNames(locale);
    const blueprints = [
      {
        key: 'unverifiedRoleId',
        name: roleNames.unverified.name,
        aliases: roleNames.unverified.aliases,
        color: 0x334155,
      },
      {
        key: 'verifiedRoleId',
        name: roleNames.verified.name,
        aliases: roleNames.verified.aliases,
        color: 0x16a34a,
      },
    ];

    await guild.roles.fetch();
    const patch = {};

    for (const blueprint of blueprints) {
      let role = null;

      if (config[blueprint.key]) {
        role = guild.roles.cache.get(config[blueprint.key]) ?? null;
      }

      if (!role) {
        role =
          guild.roles.cache.find((candidate) =>
            [blueprint.name, ...(blueprint.aliases ?? [])].some(
              (name) => candidate.name.toLowerCase() === name.toLowerCase(),
            ),
          ) ?? null;
      }

      if (!role) {
        role = await guild.roles.create({
          name: blueprint.name,
          colors: {
            primaryColor: blueprint.color,
          },
          mentionable: false,
          hoist: false,
          reason: 'Auto-created verification role',
        });
      }

      if (config[blueprint.key] !== role.id) {
        patch[blueprint.key] = role.id;
      }
    }

    if (!Object.keys(patch).length) {
      return { config };
    }

    return {
      config: await this.configService.upsert(guild.id, patch),
    };
  }

  async publishPanel(guildId, channelId = null, actorId = null) {
    const guild = await this.client.guilds.fetch(guildId);
    let config = await this.configService.get(guildId);
    ({ config } = await this.ensureVerificationRoles(guild, config));
    const locale = this.localeOf(config);
    const targetChannelId = channelId ?? config.panelChannelId;
    const channel = await guild.channels.fetch(targetChannelId).catch(() => null);

    if (!channel?.isTextBased()) {
      throw new Error('Configured panel channel is not a text channel');
    }

    await this.clearExistingPanels(channel, guildId);

    const hero = await this.panelArtService.renderVerificationBanner({
      guildName: settings.brandName,
      locale,
    });

    await channel.send({
      ...buildVerificationPanel({
        guildId,
        heroFilename: hero.filename,
        locale,
      }),
      files: [new AttachmentBuilder(hero.buffer, { name: hero.filename })],
      flags: MessageFlags.IsComponentsV2,
      withComponents: true,
    });

    await this.securityLogService.recordEvent({
      guildId,
      userId: actorId,
      eventType: 'panel_published',
      severity: 'info',
      summary: 'Verification panel published',
      details: {
        channelId: targetChannelId,
      },
    });

    await this.securityLogService.sendToLogChannel(
      guild,
      buildPanelPublishedLogScreen({
        channelId: targetChannelId,
        actorId,
        locale,
      }),
    );

    return targetChannelId;
  }

  async ensureMember(guildId, userId) {
    const guild = await this.client.guilds.fetch(guildId).catch(() => null);

    if (!guild) {
      return { guild: null, member: null };
    }

    const member = await guild.members.fetch(userId).catch(() => null);
    return { guild, member };
  }

  async applyJoinRoles(member, config) {
    if (config.unverifiedRoleId && !member.roles.cache.has(config.unverifiedRoleId)) {
      await member.roles.add(config.unverifiedRoleId, 'Verification required').catch(() => null);
    }
  }

  isAlreadyVerified(member, config) {
    return Boolean(
      config.verifiedRoleId &&
        member.roles.cache.has(config.verifiedRoleId) &&
        (!config.unverifiedRoleId || !member.roles.cache.has(config.unverifiedRoleId)),
    );
  }

  async normalizeVerifiedState(member, config) {
    if (
      config.verifiedRoleId &&
      config.unverifiedRoleId &&
      member.roles.cache.has(config.verifiedRoleId) &&
      member.roles.cache.has(config.unverifiedRoleId)
    ) {
      await member.roles.remove(config.unverifiedRoleId, 'Member already verified').catch(() => null);
    }
  }

  async applyVerificationSuccess(member, config) {
    const addRoles = [config.verifiedRoleId].filter(Boolean);
    const removeRoles = [config.unverifiedRoleId].filter(Boolean);

    if (removeRoles.length) {
      await member.roles.remove(removeRoles, 'Verification successful').catch(() => null);
    }

    if (addRoles.length) {
      await member.roles.add(addRoles, 'Verification successful').catch(() => null);
    }

    if (member.communicationDisabledUntilTimestamp) {
      await member.timeout(null, 'Verification successful').catch(() => null);
    }
  }

  async handleMemberJoin(member) {
    if (member.user.bot) {
      return;
    }

    let config = await this.configService.get(member.guild.id);
    ({ config } = await this.ensureVerificationRoles(member.guild, config));

    if (!this.configService.isReady(config)) {
      this.logger.warn({ guildId: member.guild.id }, 'Guild is not configured for verification');
      return;
    }

    await this.normalizeVerifiedState(member, config);

    if (this.isAlreadyVerified(member, config)) {
      return;
    }

    await this.applyJoinRoles(member, config);

    try {
      const dmChannel = await member.createDM();
      await dmChannel.send({
        ...buildJoinPrompt({
          member,
          locale: this.localeOf(config),
        }),
        flags: MessageFlags.IsComponentsV2,
        withComponents: true,
      });
    } catch (error) {
      this.logger.warn({ error, userId: member.id }, 'Failed to send DM verification prompt');
    }
  }

  async ensureActiveSession(interaction, guildId) {
    const defaultLocale = settings.defaults.guildConfig.language;
    const { guild, member } = await this.ensureMember(guildId, interaction.user.id);

    if (!guild || !member) {
      return {
        error: this.notice({
          locale: defaultLocale,
          accentColor: settings.ui.accentColors.danger,
          eyebrow: `${emojis.error} ${t(defaultLocale, 'notices.memberMissingEyebrow')}`,
          title: t(defaultLocale, 'notices.memberMissingTitle'),
          summary: t(defaultLocale, 'notices.memberMissingSummary'),
        }),
      };
    }

    let config = await this.configService.get(guildId);
    ({ config } = await this.ensureVerificationRoles(guild, config));
    const locale = this.localeOf(config);

    if (!this.configService.isReady(config)) {
      return {
        error: this.notice({
          locale,
          accentColor: settings.ui.accentColors.warning,
          eyebrow: `${emojis.warning} ${t(locale, 'notices.setupIncompleteEyebrow')}`,
          title: t(locale, 'notices.setupIncompleteTitle'),
          summary: t(locale, 'notices.setupIncompleteSummary'),
        }),
      };
    }

    await this.normalizeVerifiedState(member, config);

    if (this.isAlreadyVerified(member, config)) {
      await this.sessionService.clear(guildId, member.id);

      return {
        error: this.notice({
          locale,
          accentColor: settings.ui.accentColors.success,
          eyebrow: `${emojis.success} ${t(locale, 'notices.alreadyVerifiedEyebrow')}`,
          title: t(locale, 'notices.alreadyVerifiedTitle'),
          summary: t(locale, 'notices.alreadyVerifiedSummary'),
        }),
      };
    }

    let session = await this.sessionService.get(guildId, member.id);

    if (session && session.expiresAt <= Date.now()) {
      await this.sessionService.clear(guildId, member.id);
      session = null;
    }

    if (session && !session.locale) {
      session.locale = locale;
      session = await this.sessionService.set(session);
    }

    if (!session) {
      session = await this.sessionService.set({
        guildId,
        userId: member.id,
        deliveryMode: 'dm',
        createdAt: Date.now(),
        expiresAt: Date.now() + settings.security.sessionTtlSeconds * 1000,
        cooldownUntil: 0,
        attempts: 0,
        status: 'active',
        stepIndex: 0,
        steps: this.challengeService.selectPlan().steps,
        lastDmSentAt: 0,
        locale,
        risk: {
          score: 0,
          tier: 'low',
          reasons: [],
        },
      });
    }

    return { guild, member, config, session };
  }

  async renderCurrentStep(interaction, session, { update = false } = {}) {
    const step = session.steps[session.stepIndex];
    const payload = await buildChallengeScreen({
      challengeService: this.challengeService,
      guildId: session.guildId,
      session,
      step,
      locale: this.localeOf(session),
    });

    return this.respond(interaction, payload, {
      ephemeral: Boolean(interaction.guildId),
      update,
    });
  }

  async sendCurrentStepToDm(member, session) {
    const step = session.steps[session.stepIndex];
    const payload = await buildChallengeScreen({
      challengeService: this.challengeService,
      guildId: session.guildId,
      session,
      step,
      locale: this.localeOf(session),
    });

    const dmChannel = await member.createDM();
    await this.sendChannelPayload(dmChannel, payload);
    session.lastDmSentAt = Date.now();
    await this.sessionService.set(session);
    return dmChannel;
  }

  async completeSession(interaction, member, config, session) {
    const locale = this.localeOf(config ?? session);

    await this.applyVerificationSuccess(member, config);
    await this.sessionService.clear(member.guild.id, member.id);

    await this.securityLogService.recordEvent({
      guildId: member.guild.id,
      userId: member.id,
      eventType: 'verification_success',
      severity: 'info',
      summary: 'Verification completed successfully',
      details: {
        deliveryMode: session.deliveryMode,
      },
    });

    await this.securityLogService.sendToLogChannel(
      member.guild,
      buildSuccessLogScreen({
        member,
        locale,
      }),
    );

    return this.respond(interaction, buildSuccessScreen({
      member,
      locale,
    }), {
      ephemeral: Boolean(interaction.guildId),
      update: typeof interaction.update === 'function' || interaction.isFromMessage?.(),
    });
  }

  async failCurrentStep(interaction, member, session, reason) {
    const locale = this.localeOf(session);
    const step = session.steps[session.stepIndex];

    await this.securityLogService.recordAttempt({
      guildId: member.guild.id,
      userId: member.id,
      challengeType: step.type,
      riskScore: 0,
      riskTier: 'low',
      passed: false,
      deliveryMode: session.deliveryMode,
      failureReason: reason,
      metadata: {
        stepIndex: session.stepIndex,
      },
    });

    session.attempts += 1;
    session.cooldownUntil = Date.now() + settings.security.failureCooldownSeconds * 1000;

    const attemptsLeft = Math.max(0, settings.security.maxAttempts - session.attempts);

    await this.securityLogService.sendToLogChannel(
      member.guild,
      buildFailureLogScreen({
        member,
        attemptsLeft,
        reason,
        locale,
      }),
    );

    if (session.attempts >= settings.security.maxAttempts) {
      const suspiciousCooldownSeconds = settings.security.failureCooldownSeconds * 3;
      session.attempts = 0;
      session.cooldownUntil = Date.now() + suspiciousCooldownSeconds * 1000;
      session.steps[session.stepIndex] = this.challengeService.createStep();
      await this.sessionService.set(session);

      await this.securityLogService.recordEvent({
        guildId: member.guild.id,
        userId: member.id,
        eventType: 'suspicious_attempt',
        severity: 'warn',
        summary: 'Member reached captcha retry limit',
        details: {
          cooldownSeconds: suspiciousCooldownSeconds,
        },
      });

      await this.securityLogService.sendToLogChannel(
        member.guild,
        buildSuspiciousAttemptLog({
          member,
          cooldownSeconds: suspiciousCooldownSeconds,
          locale,
        }),
      );

      return this.respond(interaction, buildFailureScreen({
        session,
        reason: t(locale, 'verify.tooManyReason'),
        final: true,
        locale,
      }), {
        ephemeral: Boolean(interaction.guildId),
        update: typeof interaction.update === 'function' || interaction.isFromMessage?.(),
      });
    }

    session.steps[session.stepIndex] = this.challengeService.createStep();
    await this.sessionService.set(session);

    return this.respond(interaction, buildFailureScreen({
      session,
      reason,
      locale,
    }), {
      ephemeral: Boolean(interaction.guildId),
      update: typeof interaction.update === 'function' || interaction.isFromMessage?.(),
    });
  }

  async passCurrentStep(interaction, member, config, session) {
    const step = session.steps[session.stepIndex];

    await this.securityLogService.recordAttempt({
      guildId: member.guild.id,
      userId: member.id,
      challengeType: step.type,
      riskScore: 0,
      riskTier: 'low',
      passed: true,
      deliveryMode: session.deliveryMode,
      metadata: {
        stepIndex: session.stepIndex,
      },
    });

    session.stepIndex += 1;
    session.expiresAt = Date.now() + settings.security.sessionTtlSeconds * 1000;

    if (session.stepIndex >= session.steps.length) {
      return this.completeSession(interaction, member, config, session);
    }

    await this.sessionService.set(session);
    return this.renderCurrentStep(interaction, session, {
      update: typeof interaction.update === 'function' || interaction.isFromMessage?.(),
    });
  }

  async handleStart(interaction, guildId) {
    await this.acknowledgeInteraction(interaction, {
      ephemeral: Boolean(interaction.guildId),
    });

    const context = await this.ensureActiveSession(interaction, guildId);

    if (context.error) {
      return this.respond(interaction, context.error, {
        ephemeral: true,
      });
    }

    const locale = this.localeOf(context.session);

    if (context.session.cooldownUntil > Date.now()) {
      return this.respond(interaction, buildCooldownScreen({
        session: context.session,
        locale,
      }), {
        ephemeral: Boolean(interaction.guildId),
      });
    }

    if (interaction.guildId) {
      if (context.session.lastDmSentAt && Date.now() - context.session.lastDmSentAt < 10_000) {
        return this.respond(
          interaction,
          this.notice({
            locale,
            accentColor: settings.ui.accentColors.success,
            eyebrow: `${emojis.dm} ${t(locale, 'notices.checkDmEyebrow')}`,
            title: t(locale, 'notices.checkDmTitle'),
            summary: t(locale, 'notices.checkDmRepeatSummary'),
          }),
          {
            ephemeral: true,
          },
        );
      }

      try {
        await this.sendCurrentStepToDm(context.member, context.session);
      } catch {
        return this.respond(
          interaction,
          this.notice({
            locale,
            accentColor: settings.ui.accentColors.warning,
            eyebrow: `${emojis.warning} ${t(locale, 'notices.dmRequiredEyebrow')}`,
            title: t(locale, 'notices.dmRequiredTitle'),
            summary: t(locale, 'notices.dmRequiredSummary'),
          }),
          {
            ephemeral: true,
          },
        );
      }

      return this.respond(
        interaction,
        this.notice({
          locale,
          accentColor: settings.ui.accentColors.success,
          eyebrow: `${emojis.dm} ${t(locale, 'notices.checkDmEyebrow')}`,
          title: t(locale, 'notices.checkDmTitle'),
          summary: t(locale, 'notices.checkDmSummary'),
        }),
        {
          ephemeral: true,
        },
      );
    }

    return this.renderCurrentStep(interaction, context.session, {
      update: false,
    });
  }

  async handleRetry(interaction, guildId) {
    await this.acknowledgeInteraction(interaction, {
      ephemeral: Boolean(interaction.guildId),
    });

    const context = await this.ensureActiveSession(interaction, guildId);

    if (context.error) {
      return this.respond(interaction, context.error, {
        ephemeral: true,
        update: true,
      });
    }

    const locale = this.localeOf(context.session);

    if (context.session.cooldownUntil > Date.now()) {
      return this.respond(interaction, buildCooldownScreen({
        session: context.session,
        locale,
      }), {
        ephemeral: Boolean(interaction.guildId),
        update: true,
      });
    }

    context.session.cooldownUntil = 0;
    await this.sessionService.set(context.session);
    return this.renderCurrentStep(interaction, context.session, {
      update: false,
    });
  }

  async handleAbort(interaction, guildId) {
    await this.acknowledgeInteraction(interaction, {
      ephemeral: Boolean(interaction.guildId),
    });

    const config = guildId ? await this.configService.get(guildId).catch(() => null) : null;
    const locale = this.localeOf(config);
    await this.sessionService.clear(guildId, interaction.user.id);

    return this.respond(
      interaction,
      this.notice({
        locale,
        accentColor: settings.ui.accentColors.warning,
        eyebrow: `${emojis.warning} ${t(locale, 'notices.sessionClosedEyebrow')}`,
        title: t(locale, 'notices.sessionClosedTitle'),
        summary: t(locale, 'notices.sessionClosedSummary'),
      }),
      {
        ephemeral: Boolean(interaction.guildId),
      },
    );
  }

  async handleDirectMessage(message) {
    if (message.author.bot || !message.channel.isDMBased()) {
      return null;
    }

    const guildId = await this.sessionService.getActiveGuildId(message.author.id);

    if (!guildId) {
      return null;
    }

    const { guild, member } = await this.ensureMember(guildId, message.author.id);

    if (!guild || !member) {
      await this.sessionService.clear(guildId, message.author.id);
      return null;
    }

    let config = await this.configService.get(guildId);
    ({ config } = await this.ensureVerificationRoles(guild, config));
    await this.normalizeVerifiedState(member, config);
    const locale = this.localeOf(config);

    if (this.isAlreadyVerified(member, config)) {
      await this.sessionService.clear(guildId, member.id);
      await this.sendChannelPayload(
        message.channel,
        this.notice({
          locale,
          accentColor: settings.ui.accentColors.success,
          eyebrow: `${emojis.success} ${t(locale, 'notices.alreadyVerifiedEyebrow')}`,
          title: t(locale, 'notices.alreadyVerifiedTitle'),
          summary: t(locale, 'notices.alreadyVerifiedSummary'),
        }),
      );
      return null;
    }

    let session = await this.sessionService.get(guildId, member.id);

    if (!session) {
      return null;
    }

    if (!session.locale) {
      session.locale = locale;
      session = await this.sessionService.set(session);
    }

    if (session.expiresAt <= Date.now()) {
      await this.sessionService.clear(guildId, member.id);
      await this.sendChannelPayload(
        message.channel,
        this.notice({
          locale,
          accentColor: settings.ui.accentColors.warning,
          eyebrow: `${emojis.timer} ${t(locale, 'notices.sessionExpiredEyebrow')}`,
          title: t(locale, 'notices.sessionExpiredTitle'),
          summary: t(locale, 'notices.sessionExpiredSummary'),
        }),
      );
      return null;
    }

    if (session.cooldownUntil > Date.now()) {
      await this.sendChannelPayload(message.channel, buildCooldownScreen({
        session,
        locale: this.localeOf(session),
      }));
      return null;
    }

    const step = session.steps[session.stepIndex];

    if (!step || step.type !== 'captcha') {
      await this.sendChannelPayload(
        message.channel,
        this.notice({
          locale: this.localeOf(session),
          accentColor: settings.ui.accentColors.warning,
          eyebrow: `${emojis.warning} ${t(this.localeOf(session), 'notices.captchaInactiveEyebrow')}`,
          title: t(this.localeOf(session), 'notices.captchaInactiveTitle'),
          summary: t(this.localeOf(session), 'notices.captchaInactiveSummary'),
        }),
      );
      return null;
    }

    const submitted = message.content.trim().replace(/\s+/g, '').toUpperCase();

    if (!submitted) {
      return null;
    }

    if (submitted !== step.code.toUpperCase()) {
      return this.failCurrentStep(message, member, session, t(this.localeOf(session), 'verify.incorrectReason'));
    }

    return this.passCurrentStep(message, member, config, session);
  }

  async handleAdminPublish(interaction, guildId) {
    await this.acknowledgeInteraction(interaction, {
      ephemeral: true,
    });

    const config = await this.configService.get(guildId).catch(() => null);
    const locale = this.localeOf(config);
    const permitted = interaction.memberPermissions?.has(PermissionsBitField.Flags.ManageGuild);

    if (!permitted) {
      return this.respond(
        interaction,
        this.notice({
          locale,
          accentColor: settings.ui.accentColors.danger,
          eyebrow: `${emojis.error} ${t(locale, 'admin.permissionEyebrow')}`,
          title: t(locale, 'admin.permissionTitle'),
          summary: t(locale, 'admin.permissionSummary'),
        }),
        {
          ephemeral: true,
        },
      );
    }

    const channelId = await this.publishPanel(guildId, null, interaction.user.id);
    return this.respond(interaction, buildPanelPublishedScreen(channelId, locale), {
      ephemeral: true,
    });
  }

  async routeComponent(interaction) {
    const parts = parseCustomId(interaction.customId);
    const [scope, action, guildId] = parts;

    if (scope === 'verify') {
      switch (action) {
        case 'start':
          return this.handleStart(interaction, guildId);
        case 'retry':
          return this.handleRetry(interaction, guildId);
        case 'abort':
          return this.handleAbort(interaction, guildId);
        default:
          return null;
      }
    }

    if (scope === 'admin' && action === 'publish_panel') {
      return this.handleAdminPublish(interaction, guildId);
    }

    return null;
  }

  async routeSelectMenu() {
    return null;
  }

  async routeModal() {
    return null;
  }
}
