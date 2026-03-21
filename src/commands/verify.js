import {
  ChannelType,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from 'discord.js';
import { emojis } from '../config/emojis.js';
import { localeLabel, normalizeLocale, t } from '../config/i18n.js';
import { settings } from '../config/settings.js';
import { interactionPayload } from '../utils/discord.js';
import {
  buildConfigScreen,
  buildLanguageUpdatedScreen,
  buildLogsUpdatedScreen,
  buildPanelPublishedScreen,
  buildSetupScreen,
  buildStatsScreen,
} from '../ui/adminScreens.js';
import { createFrame, infoSection } from '../ui/components.js';

function buildPermissionScreen(locale = 'ar') {
  const activeLocale = normalizeLocale(locale);

  return createFrame({
    accentColor: settings.ui.accentColors.warning,
    eyebrow: `${emojis.warning} ${t(activeLocale, 'admin.permissionEyebrow')}`,
    title: t(activeLocale, 'admin.permissionTitle'),
    summary: t(activeLocale, 'admin.permissionSummary'),
    sections: [
      infoSection({
        title: t(activeLocale, 'common.access'),
        lines: [
          `${emojis.admin} ${t(activeLocale, 'admin.permissionLine')}`,
        ],
      }),
    ],
  });
}

async function replyOrEdit(interaction, payload) {
  if (interaction.deferred || interaction.replied) {
    return interaction.editReply(
      interactionPayload(payload, {
        ephemeral: true,
      }),
    );
  }

  return interaction.reply(
    interactionPayload(payload, {
      ephemeral: true,
    }),
  );
}

async function ensureManageGuild(interaction, services) {
  if (interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
    return true;
  }

  let locale = settings.defaults.guildConfig.language;

  if (interaction.guildId) {
    const config = await services.configService.get(interaction.guildId).catch(() => null);
    locale = config?.language ?? locale;
  }

  await replyOrEdit(interaction, buildPermissionScreen(locale));

  return false;
}

export const verifySetupCommand = {
  data: new SlashCommandBuilder()
    .setName('verify-setup')
    .setDescription(t('ar', 'commands.verifySetup'))
    .setDefaultMemberPermissions(null)
    .addChannelOption((option) =>
      option
        .setName('panel_channel')
        .setDescription(t('ar', 'commands.panelChannel'))
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        .setRequired(true),
    )
    .addChannelOption((option) =>
      option
        .setName('logs_channel')
        .setDescription(t('ar', 'commands.logsChannel'))
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        .setRequired(true),
    ),

  async execute(interaction, services) {
    if (!(await ensureManageGuild(interaction, services))) {
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    const panelChannel = interaction.options.getChannel('panel_channel', true);
    const logsChannel = interaction.options.getChannel('logs_channel', true);
    const currentConfig = await services.configService.get(interaction.guildId);

    let config = await services.configService.upsert(interaction.guildId, {
      verificationChannelId: panelChannel.id,
      panelChannelId: panelChannel.id,
      logChannelId: logsChannel.id,
      dmMode: 'prefer_dm',
      language: currentConfig.language ?? settings.defaults.guildConfig.language,
    });

    ({ config } = await services.verificationService.ensureVerificationRoles(interaction.guild, config));

    return interaction.editReply(
      interactionPayload(buildSetupScreen(config), {
        ephemeral: true,
      }),
    );
  },
};

export const verifyPanelCommand = {
  data: new SlashCommandBuilder()
    .setName('verify-panel')
    .setDescription(t('ar', 'commands.verifyPanel'))
    .setDefaultMemberPermissions(null),

  async execute(interaction, services) {
    if (!(await ensureManageGuild(interaction, services))) {
      return;
    }

    await interaction.deferReply({ ephemeral: true });
    const config = await services.configService.get(interaction.guildId);
    const locale = config.language ?? settings.defaults.guildConfig.language;
    const channelId = await services.verificationService.publishPanel(interaction.guildId, null, interaction.user.id);

    return interaction.editReply(
      interactionPayload(buildPanelPublishedScreen(channelId, locale), {
        ephemeral: true,
      }),
    );
  },
};

export const verifyLogsCommand = {
  data: new SlashCommandBuilder()
    .setName('verify-logs')
    .setDescription(t('ar', 'commands.verifyLogs'))
    .setDefaultMemberPermissions(null)
    .addChannelOption((option) =>
      option
        .setName('channel')
        .setDescription(t('ar', 'commands.logsChannel'))
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        .setRequired(true),
    ),

  async execute(interaction, services) {
    if (!(await ensureManageGuild(interaction, services))) {
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    const channel = interaction.options.getChannel('channel', true);
    const config = await services.configService.upsert(interaction.guildId, {
      logChannelId: channel.id,
    });

    return interaction.editReply(
      interactionPayload(buildLogsUpdatedScreen(channel.id, config.language), {
        ephemeral: true,
      }),
    );
  },
};

export const verifyConfigCommand = {
  data: new SlashCommandBuilder()
    .setName('verify-config')
    .setDescription(t('ar', 'commands.verifyConfig'))
    .setDefaultMemberPermissions(null),

  async execute(interaction, services) {
    if (!(await ensureManageGuild(interaction, services))) {
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    const config = await services.configService.get(interaction.guildId);

    return interaction.editReply(
      interactionPayload(buildConfigScreen(config), {
        ephemeral: true,
      }),
    );
  },
};

export const verifyStatsCommand = {
  data: new SlashCommandBuilder()
    .setName('verify-stats')
    .setDescription(t('ar', 'commands.verifyStats'))
    .setDefaultMemberPermissions(null),

  async execute(interaction, services) {
    if (!(await ensureManageGuild(interaction, services))) {
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    const config = await services.configService.get(interaction.guildId);
    const stats = await services.securityLogService.getStats(interaction.guildId);

    return interaction.editReply(
      interactionPayload(buildStatsScreen(stats, config.language), {
        ephemeral: true,
      }),
    );
  },
};

export const verifyLanguageCommand = {
  data: new SlashCommandBuilder()
    .setName('verify-language')
    .setDescription(t('ar', 'commands.verifyLanguage'))
    .setDefaultMemberPermissions(null)
    .addStringOption((option) =>
      option
        .setName('language')
        .setDescription(t('ar', 'commands.languageChoice'))
        .setRequired(true)
        .addChoices(
          {
            name: localeLabel('ar', 'ar'),
            value: 'ar',
          },
          {
            name: localeLabel('en', 'ar'),
            value: 'en',
          },
        ),
    ),

  async execute(interaction, services) {
    if (!(await ensureManageGuild(interaction, services))) {
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    const language = interaction.options.getString('language', true);
    await services.configService.upsert(interaction.guildId, {
      language,
    });

    return interaction.editReply(
      interactionPayload(buildLanguageUpdatedScreen(language), {
        ephemeral: true,
      }),
    );
  },
};

export const verificationCommands = [
  verifySetupCommand,
  verifyPanelCommand,
  verifyLogsCommand,
  verifyConfigCommand,
  verifyStatsCommand,
  verifyLanguageCommand,
];
