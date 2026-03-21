import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  LabelBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  ModalBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  StringSelectMenuBuilder,
  TextDisplayBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';
import { emojis } from '../config/emojis.js';
import { settings } from '../config/settings.js';
import { joinLines } from '../utils/strings.js';

export function text(content) {
  return new TextDisplayBuilder().setContent(content);
}

export function separator({
  divider = true,
  spacing = SeparatorSpacingSize.Small,
} = {}) {
  return new SeparatorBuilder().setDivider(divider).setSpacing(spacing);
}

export function button({
  id,
  label,
  style = ButtonStyle.Secondary,
  emoji,
  disabled = false,
}) {
  const component = new ButtonBuilder()
    .setCustomId(id)
    .setLabel(label)
    .setStyle(style);

  if (emoji) {
    component.setEmoji(emoji);
  }

  if (disabled) {
    component.setDisabled(true);
  }

  return component;
}

export function row(...components) {
  return new ActionRowBuilder().addComponents(...components);
}

export function selectMenu({
  id,
  placeholder,
  options,
  minValues = 1,
  maxValues = 1,
}) {
  return new StringSelectMenuBuilder()
    .setCustomId(id)
    .setPlaceholder(placeholder)
    .setMinValues(minValues)
    .setMaxValues(maxValues)
    .addOptions(options);
}

export function mediaGalleryComponent(items) {
  const gallery = new MediaGalleryBuilder();

  gallery.addItems(
    ...items.map((item) =>
      new MediaGalleryItemBuilder()
        .setURL(item.url)
        .setDescription(item.description),
    ),
  );

  return gallery;
}

export function infoSection({ title, lines, accessoryButton = null }) {
  const prefix = accessoryButton ? `${accessoryButton.data?.emoji?.name ?? ''} ` : '';
  return text(`### ${prefix}${title}\n${joinLines(lines)}`);
}

export function createFrame({
  accentColor = settings.ui.accentColors.neutral,
  eyebrow = `${emojis.premium} ${settings.brandName}`,
  title,
  summary,
  sections = [],
  media = [],
  actions = [],
  footer = [],
}) {
  const container = new ContainerBuilder().setAccentColor(accentColor);

  container.addTextDisplayComponents(
    text(eyebrow),
    text(`## ${title}`),
    text(summary),
  );

  if (sections.length) {
    container.addSeparatorComponents(separator());
    container.addTextDisplayComponents(...sections);
  }

  if (media.length) {
    container.addSeparatorComponents(separator());
    container.addMediaGalleryComponents(...media);
  }

  if (actions.length) {
    container.addSeparatorComponents(separator());
    container.addActionRowComponents(...actions);
  }

  if (footer.length) {
    container.addSeparatorComponents(
      separator({
        divider: false,
        spacing: SeparatorSpacingSize.Small,
      }),
    );
    container.addTextDisplayComponents(
      text(joinLines(footer)),
    );
  }

  return {
    components: [container],
  };
}

export function modalTextInput({
  id,
  title,
  label,
  description,
  placeholder,
  minLength = 1,
  maxLength = 100,
}) {
  return new ModalBuilder()
    .setCustomId(id)
    .setTitle(title)
    .addTextDisplayComponents(
      text(`${emojis.lock} Secure console input`),
    )
    .addLabelComponents(
      new LabelBuilder()
        .setLabel(label)
        .setDescription(description)
        .setTextInputComponent(
          new TextInputBuilder()
            .setCustomId('value')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder(placeholder)
            .setRequired(true)
            .setMinLength(minLength)
            .setMaxLength(maxLength),
        ),
    );
}

export { ButtonStyle };
