export function registerMessageCreateEvent(client, services) {
  client.on('messageCreate', async (message) => {
    try {
      await services.verificationService.handleDirectMessage(message);
    } catch (error) {
      services.logger.error({ error, userId: message.author?.id ?? null }, 'messageCreate handler failed');
    }
  });
}
