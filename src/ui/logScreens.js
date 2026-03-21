import { emojis } from '../config/emojis.js';
import { normalizeLocale, t } from '../config/i18n.js';
import { settings } from '../config/settings.js';
import { createFrame, infoSection } from './components.js';

export function buildSuccessLogScreen({ member, locale = 'ar' }) {
  const activeLocale = normalizeLocale(locale);

  return createFrame({
    accentColor: settings.ui.accentColors.success,
    eyebrow: `${emojis.logs} ${t(activeLocale, 'logs.eyebrow')}`,
    title: t(activeLocale, 'logs.successTitle'),
    summary: t(activeLocale, 'logs.successSummary', {
      user: `<@${member.id}>`,
    }),
    sections: [
      infoSection({
        title: t(activeLocale, 'common.details'),
        lines: [
          `${emojis.role} ${t(activeLocale, 'logs.verifiedRoleApplied')}`,
          `${emojis.channel} ${t(activeLocale, 'logs.serverLabel', {
            server: member.guild.name,
          })}`,
        ],
      }),
    ],
  });
}

export function buildFailureLogScreen({ member, attemptsLeft, reason, locale = 'ar' }) {
  const activeLocale = normalizeLocale(locale);

  return createFrame({
    accentColor: settings.ui.accentColors.warning,
    eyebrow: `${emojis.logs} ${t(activeLocale, 'logs.eyebrow')}`,
    title: t(activeLocale, 'logs.failureTitle'),
    summary: t(activeLocale, 'logs.failureSummary', {
      user: `<@${member.id}>`,
    }),
    sections: [
      infoSection({
        title: t(activeLocale, 'common.details'),
        lines: [
          `${emojis.alert} ${t(activeLocale, 'logs.reasonLabel', { reason })}`,
          `${emojis.retry} ${t(activeLocale, 'logs.attemptsLeft', { count: attemptsLeft })}`,
        ],
      }),
    ],
  });
}

export function buildSuspiciousAttemptLog({ member, cooldownSeconds, locale = 'ar' }) {
  const activeLocale = normalizeLocale(locale);

  return createFrame({
    accentColor: settings.ui.accentColors.danger,
    eyebrow: `${emojis.logs} ${t(activeLocale, 'logs.eyebrow')}`,
    title: t(activeLocale, 'logs.suspiciousTitle'),
    summary: t(activeLocale, 'logs.suspiciousSummary', {
      user: `<@${member.id}>`,
    }),
    sections: [
      infoSection({
        title: t(activeLocale, 'common.action'),
        lines: [
          `${emojis.cooldown} ${t(activeLocale, 'logs.cooldownApplied', {
            seconds: cooldownSeconds,
          })}`,
          `${emojis.warning} ${t(activeLocale, 'logs.reviewRepeated')}`,
        ],
      }),
    ],
  });
}

export function buildPanelPublishedLogScreen({ channelId, actorId = null, locale = 'ar' }) {
  const activeLocale = normalizeLocale(locale);

  return createFrame({
    accentColor: settings.ui.accentColors.admin,
    eyebrow: `${emojis.logs} ${t(activeLocale, 'logs.eyebrow')}`,
    title: t(activeLocale, 'logs.panelPublishedTitle'),
    summary: t(activeLocale, 'logs.panelPublishedSummary', {
      channel: `<#${channelId}>`,
    }),
    sections: actorId
      ? [
          infoSection({
            title: t(activeLocale, 'common.publishedBy'),
            lines: [
              `<@${actorId}>`,
            ],
          }),
        ]
      : [],
  });
}
