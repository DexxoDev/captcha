import { MessageFlags } from 'discord.js';
import { emojis } from '../config/emojis.js';
import { normalizeLocale } from '../config/i18n.js';
import { settings } from '../config/settings.js';
import { interactionPayload } from '../utils/discord.js';
import { createFrame, infoSection } from '../ui/components.js';

export function registerInteractionCreateEvent(client, services) {
  client.on('interactionCreate', async (interaction) => {
    try {
      if (interaction.isChatInputCommand()) {
        const command = services.commands[interaction.commandName];

        if (command) {
          await command.execute(interaction, services);
        }

        return;
      }

      if (interaction.isButton()) {
        await services.verificationService.routeComponent(interaction);
        return;
      }

      if (interaction.isStringSelectMenu()) {
        await services.verificationService.routeSelectMenu(interaction);
        return;
      }

      if (interaction.isModalSubmit()) {
        await services.verificationService.routeModal(interaction);
      }
    } catch (error) {
      if (error?.code === 10062 || error?.code === 40060) {
        services.logger.warn(
          {
            error: {
              code: error.code,
              message: error.message,
            },
            interactionId: interaction.id,
            customId: interaction.isMessageComponent() || interaction.isModalSubmit() ? interaction.customId : null,
          },
          'Ignored expired interaction',
        );
        return;
      }

      services.logger.error(
        {
          error,
          interactionId: interaction.id,
          customId: interaction.isMessageComponent() || interaction.isModalSubmit() ? interaction.customId : null,
        },
        'interactionCreate handler failed',
      );

      const locale = normalizeLocale(
        interaction.guildId
          ? (await services.configService.get(interaction.guildId).catch(() => null))?.language
          : settings.defaults.guildConfig.language,
      );

      const payload = createFrame({
        accentColor: settings.ui.accentColors.danger,
        eyebrow: `${emojis.error} ${settings.brandName}`,
        title: locale === 'ar' ? 'حدث خطأ في التحقق' : 'Verification Error',
        summary: locale === 'ar'
          ? 'فشل تنفيذ العملية بشكل غير متوقع. حاول مرة أخرى بعد لحظات.'
          : 'The operation failed unexpectedly. Please try again in a few seconds.',
        sections: [
          infoSection({
            title: locale === 'ar' ? 'المعالجة' : 'Recovery',
            lines: [
              locale === 'ar'
                ? `${emojis.retry} أعد المحاولة مرة واحدة.`
                : `${emojis.retry} Retry the interaction once.`,
              locale === 'ar'
                ? `${emojis.manual} إذا استمرت المشكلة فراجع الإدارة أو قناة السجلات.`
                : `${emojis.manual} If it keeps failing, ask a moderator to review the log channel.`,
            ],
          }),
        ],
      });

      if (interaction.isRepliable()) {
        if (interaction.deferred || interaction.replied) {
          await interaction
            .editReply({
              ...payload,
              flags: MessageFlags.IsComponentsV2,
              withComponents: true,
            })
            .catch(() => null);
        } else {
          await interaction.reply(
            interactionPayload(payload, {
              ephemeral: true,
            }),
          ).catch(() => null);
        }
      }
    }
  });
}
