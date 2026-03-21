import { AttachmentBuilder, ButtonStyle } from 'discord.js';
import { emojis } from '../config/emojis.js';
import { localeLabel, normalizeLocale, t } from '../config/i18n.js';
import { settings } from '../config/settings.js';
import { customId } from '../utils/customIds.js';
import { discordRelativeTimestamp, formatDuration } from '../utils/time.js';
import { button, createFrame, infoSection, mediaGalleryComponent, row } from './components.js';

export function buildVerificationPanel({ guildId, heroFilename = null, locale = 'ar' }) {
  const activeLocale = normalizeLocale(locale);

  return createFrame({
    accentColor: settings.ui.accentColors.brand,
    eyebrow: `${emojis.shield} ${t(activeLocale, 'verify.panelEyebrow')}`,
    title: t(activeLocale, 'verify.panelTitle', {
      brand: settings.brandName,
    }),
    summary: t(activeLocale, 'verify.panelSummary'),
    sections: [
      infoSection({
        title: t(activeLocale, 'verify.quickAccessTitle'),
        lines: [
          `${emojis.lock} ${t(activeLocale, 'verify.privateCaptchaLine')}`,
          `${emojis.timer} ${t(activeLocale, 'verify.fewSecondsLine')}`,
          `${emojis.settings} ${localeLabel(activeLocale, activeLocale)}`,
        ],
      }),
    ],
    media: heroFilename
      ? [
          mediaGalleryComponent([
            {
              url: `attachment://${heroFilename}`,
              description: `${settings.brandName} verification panel`,
            },
          ]),
        ]
      : [],
    actions: [
      row(
        button({
          id: customId('verify', 'start', guildId),
          label: t(activeLocale, 'verify.panelButton'),
          style: ButtonStyle.Success,
          emoji: emojis.verify,
        }),
      ),
    ],
    footer: [
      `${emojis.premium} ${t(activeLocale, 'verify.panelFooter')}`,
    ],
  });
}

export function buildJoinPrompt({ member, locale = 'ar' }) {
  const activeLocale = normalizeLocale(locale);

  return createFrame({
    accentColor: settings.ui.accentColors.brand,
    eyebrow: `${emojis.join} ${t(activeLocale, 'verify.joinEyebrow')}`,
    title: t(activeLocale, 'verify.joinTitle', {
      brand: settings.brandName,
    }),
    summary: t(activeLocale, 'verify.joinSummary'),
    actions: [
      row(
        button({
          id: customId('verify', 'start', member.guild.id),
          label: t(activeLocale, 'verify.panelButton'),
          style: ButtonStyle.Success,
          emoji: emojis.verify,
        }),
      ),
    ],
  });
}

export async function buildChallengeScreen({
  challengeService,
  guildId,
  session,
  step,
  locale = 'ar',
}) {
  const activeLocale = normalizeLocale(locale);
  const asset = await challengeService.buildCaptchaAsset(step);
  const files = [new AttachmentBuilder(asset.buffer, { name: asset.filename })];

  return {
    ...createFrame({
      accentColor: settings.ui.accentColors.brand,
      eyebrow: `${emojis.captcha} ${t(activeLocale, 'verify.challengeEyebrow', {
        brand: settings.brandName,
      })}`,
      title: t(activeLocale, 'verify.challengeTitle'),
      summary: t(activeLocale, 'verify.challengeSummary'),
      sections: [
        infoSection({
          title: t(activeLocale, 'verify.challengeSectionTitle'),
          lines: [
            `${emojis.image} ${t(activeLocale, 'verify.challengeReadImage')}`,
            `${emojis.timer} ${t(activeLocale, 'verify.challengeExpires', {
              time: discordRelativeTimestamp(session.expiresAt),
            })}`,
            `${emojis.retry} ${t(activeLocale, 'verify.challengeAttempt', {
              current: session.attempts + 1,
              max: settings.security.maxAttempts,
            })}`,
            `${emojis.dm} ${t(activeLocale, 'verify.challengeSendDm')}`,
          ],
        }),
      ],
      media: [
        mediaGalleryComponent([
          {
            url: `attachment://${asset.filename}`,
            description: 'Captcha image',
          },
        ]),
      ],
      actions: [
        row(
          button({
            id: customId('verify', 'abort', guildId),
            label: t(activeLocale, 'verify.cancelButton'),
            style: ButtonStyle.Secondary,
            emoji: emojis.alert,
          }),
        ),
      ],
      footer: [
        `${emojis.dm} ${t(activeLocale, 'verify.challengeFooter')}`,
      ],
    }),
    files,
  };
}

export function buildFailureScreen({ session, reason, final = false, locale = 'ar' }) {
  const activeLocale = normalizeLocale(locale);
  const cooldownSeconds = Math.max(0, Math.ceil((session.cooldownUntil - Date.now()) / 1000));
  const attemptsLeft = final ? 0 : Math.max(0, settings.security.maxAttempts - session.attempts);

  return createFrame({
    accentColor: final ? settings.ui.accentColors.warning : settings.ui.accentColors.danger,
    eyebrow: `${emojis.warning} ${t(activeLocale, 'verify.failureEyebrow')}`,
    title: final ? t(activeLocale, 'verify.finalTitle') : t(activeLocale, 'verify.failureTitle'),
    summary: final ? t(activeLocale, 'verify.finalSummary') : t(activeLocale, 'verify.failureSummary'),
    sections: [
      infoSection({
        title: t(activeLocale, 'common.status'),
        lines: [
          `${emojis.alert} ${reason}`,
          `${emojis.timer} ${t(activeLocale, 'verify.retryIn', {
            duration: formatDuration(cooldownSeconds),
          })}`,
          !final
            ? `${emojis.retry} ${t(activeLocale, 'verify.attemptsLeft', {
                count: attemptsLeft,
              })}`
            : null,
        ],
      }),
    ],
    actions: [
      row(
        button({
          id: customId('verify', 'retry', session.guildId),
          label: t(activeLocale, 'verify.retryButton'),
          style: ButtonStyle.Success,
          emoji: emojis.retry,
        }),
      ),
    ],
  });
}

export function buildCooldownScreen({ session, locale = 'ar' }) {
  const activeLocale = normalizeLocale(locale);
  const cooldownSeconds = Math.max(0, Math.ceil((session.cooldownUntil - Date.now()) / 1000));

  return createFrame({
    accentColor: settings.ui.accentColors.warning,
    eyebrow: `${emojis.cooldown} ${t(activeLocale, 'verify.cooldownEyebrow')}`,
    title: t(activeLocale, 'verify.cooldownTitle'),
    summary: t(activeLocale, 'verify.cooldownSummary'),
    sections: [
      infoSection({
        title: t(activeLocale, 'common.timer'),
        lines: [
          `${emojis.timer} ${t(activeLocale, 'verify.remainingLabel', {
            duration: formatDuration(cooldownSeconds),
          })}`,
        ],
      }),
    ],
  });
}

export function buildSuccessScreen({ member, locale = 'ar' }) {
  const activeLocale = normalizeLocale(locale);
  const prefix = activeLocale === 'ar' ? `<@${member.id}>، ` : `<@${member.id}>, `;

  return createFrame({
    accentColor: settings.ui.accentColors.success,
    eyebrow: `${emojis.success} ${t(activeLocale, 'verify.successEyebrow')}`,
    title: t(activeLocale, 'verify.successTitle'),
    summary: `${prefix}${t(activeLocale, 'verify.successSummary')}`,
    footer: [
      `${emojis.shop} ${t(activeLocale, 'verify.successFooter', {
        brand: settings.brandName,
      })}`,
    ],
  });
}
