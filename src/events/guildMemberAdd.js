export function registerGuildMemberAddEvent(client, services) {
  client.on('guildMemberAdd', async (member) => {
    try {
      await services.verificationService.handleMemberJoin(member);
    } catch (error) {
      services.logger.error({ error, guildId: member.guild.id, userId: member.id }, 'guildMemberAdd handler failed');
    }
  });
}
