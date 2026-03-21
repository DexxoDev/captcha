import { MessageFlags } from 'discord.js';

export function createMessageFlags({ ephemeral = false } = {}) {
  let flags = MessageFlags.IsComponentsV2;

  if (ephemeral) {
    flags |= MessageFlags.Ephemeral;
  }

  return flags;
}

export function interactionPayload(payload, { ephemeral = false } = {}) {
  return {
    ...payload,
    flags: createMessageFlags({ ephemeral }),
    withComponents: true,
  };
}

export function channelPayload(payload) {
  return {
    ...payload,
    flags: MessageFlags.IsComponentsV2,
    withComponents: true,
  };
}
