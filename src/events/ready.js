export function registerReadyEvent(client, services) {
  client.once('clientReady', async () => {
    services.logger.info({ user: client.user.tag }, 'Bot ready');
  });
}
