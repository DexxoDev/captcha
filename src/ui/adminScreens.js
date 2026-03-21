import { ButtonStyle } from 'discord.js';
import { emojis } from '../config/emojis.js';
import { settings } from '../config/settings.js';
import { localeLabel, normalizeLocale, t } from '../config/i18n.js';
import { customId } from '../utils/customIds.js';
import { mentionChannel, mentionRole } from '../utils/strings.js';
import { button, createFrame, infoSection, row } from './components.js';

export function buildSetupScreen(config) {
  const locale = normalizeLocale(config.language);

  return createFrame({
    accentColor: settings.ui.accentColors.brand,
    eyebrow: `${emojis.settings} ${t(locale, 'admin.setupEyebrow')}`,
    title: t(locale, 'admin.setupTitle'),
    summary: t(locale, 'admin.setupSummary'),
    sections: [
      infoSection({
        title: t(locale, 'common.channels'),
        lines: [
          `${emojis.channel} ${t(locale, 'admin.panelLabel')}: ${mentionChannel(config.panelChannelId)}`,
          `${emojis.logs} ${t(locale, 'admin.logsLabel')}: ${mentionChannel(config.logChannelId)}`,
        ],
      }),
      infoSection({
        title: t(locale, 'common.roles'),
        lines: [
          `${emojis.role} ${t(locale, 'admin.unverifiedLabel')}: ${mentionRole(config.unverifiedRoleId)}`,
          `${emojis.role} ${t(locale, 'admin.verifiedLabel')}: ${mentionRole(config.verifiedRoleId)}`,
        ],
      }),
      infoSection({
        title: t(locale, 'common.language'),
        lines: [
          `${emojis.settings} ${localeLabel(config.language, locale)}`,
        ],
      }),
    ],
    actions: [
      row(
        button({
          id: customId('admin', 'publish_panel', config.guildId),
          label: t(locale, 'admin.publishPanel'),
          style: ButtonStyle.Success,
          emoji: emojis.verify,
        }),
      ),
    ],
    footer: [
      `${emojis.premium} ${settings.brandName}`,
    ],
  });
}

export function buildLogsUpdatedScreen(channelId, locale) {
  const activeLocale = normalizeLocale(locale);

  return createFrame({
    accentColor: settings.ui.accentColors.brand,
    eyebrow: `${emojis.logs} ${t(activeLocale, 'admin.logsUpdatedEyebrow')}`,
    title: t(activeLocale, 'admin.logsUpdatedTitle'),
    summary: t(activeLocale, 'admin.logsUpdatedSummary', {
      channel: `<#${channelId}>`,
    }),
    footer: [
      `${emojis.premium} ${settings.brandName}`,
    ],
  });
}

export function buildConfigScreen(config) {
  const locale = normalizeLocale(config.language);

  return createFrame({
    accentColor: settings.ui.accentColors.admin,
    eyebrow: `${emojis.settings} ${t(locale, 'admin.configEyebrow')}`,
    title: t(locale, 'admin.configTitle', {
      brand: settings.brandName,
    }),
    summary: t(locale, 'admin.configSummary'),
    sections: [
      infoSection({
        title: t(locale, 'common.channels'),
        lines: [
          `${emojis.channel} ${t(locale, 'admin.panelLabel')}: ${mentionChannel(config.panelChannelId)}`,
          `${emojis.logs} ${t(locale, 'admin.logsLabel')}: ${mentionChannel(config.logChannelId)}`,
        ],
      }),
      infoSection({
        title: t(locale, 'common.roles'),
        lines: [
          `${emojis.role} ${t(locale, 'admin.unverifiedLabel')}: ${mentionRole(config.unverifiedRoleId)}`,
          `${emojis.role} ${t(locale, 'admin.verifiedLabel')}: ${mentionRole(config.verifiedRoleId)}`,
        ],
      }),
      infoSection({
        title: t(locale, 'common.language'),
        lines: [
          `${emojis.settings} ${localeLabel(config.language, locale)}`,
        ],
      }),
    ],
  });
}

export function buildPanelPublishedScreen(channelId, locale) {
  const activeLocale = normalizeLocale(locale);

  return createFrame({
    accentColor: settings.ui.accentColors.success,
    eyebrow: `${emojis.success} ${t(activeLocale, 'admin.panelPublishedEyebrow')}`,
    title: t(activeLocale, 'admin.panelPublishedTitle'),
    summary: t(activeLocale, 'admin.panelPublishedSummary', {
      channel: `<#${channelId}>`,
    }),
    footer: [
      `${emojis.shop} ${settings.brandName}`,
    ],
  });
}

export function buildStatsScreen(stats, locale) {
  const activeLocale = normalizeLocale(locale);

  return createFrame({
    accentColor: settings.ui.accentColors.admin,
    eyebrow: `${emojis.stats} ${t(activeLocale, 'admin.statsEyebrow')}`,
    title: t(activeLocale, 'admin.statsTitle'),
    summary: t(activeLocale, 'admin.statsSummary'),
    sections: [
      infoSection({
        title: t(activeLocale, 'common.attempts'),
        lines: [
          `${emojis.stats} ${t(activeLocale, 'admin.totalLabel')}: ${stats.attempts.total}`,
          `${emojis.success} ${t(activeLocale, 'admin.successLabel')}: ${stats.attempts.passed}`,
          `${emojis.error} ${t(activeLocale, 'admin.failedLabel')}: ${stats.attempts.failed}`,
        ],
      }),
      infoSection({
        title: t(activeLocale, 'common.events'),
        lines: [
          `${emojis.warning} ${t(activeLocale, 'admin.suspiciousLabel')}: ${stats.events.suspicious_attempts}`,
          `${emojis.logs} ${t(activeLocale, 'admin.panelsPublishedLabel')}: ${stats.events.panels_published}`,
        ],
      }),
    ],
  });
}

export function buildLanguageUpdatedScreen(locale) {
  const activeLocale = normalizeLocale(locale);

  return createFrame({
    accentColor: settings.ui.accentColors.success,
    eyebrow: `${emojis.settings} ${t(activeLocale, 'admin.languageUpdatedEyebrow')}`,
    title: t(activeLocale, 'admin.languageUpdatedTitle'),
    summary: t(activeLocale, 'admin.languageUpdatedSummary', {
      language: localeLabel(activeLocale, activeLocale),
    }),
    footer: [
      `${emojis.premium} ${settings.brandName}`,
    ],
  });
}
