import { REST, Routes } from 'discord.js';
import { settings } from './config/settings.js';
import { verificationCommands } from './commands/verify.js';

const rest = new REST({ version: '10' }).setToken(settings.discord.token);
const commands = verificationCommands.map((command) => command.data.toJSON());

async function main() {
  if (settings.discord.testGuildId) {
    await rest.put(
      Routes.applicationGuildCommands(settings.discord.clientId, settings.discord.testGuildId),
      {
        body: commands,
      },
    );
    console.log(`Registered guild commands for ${settings.discord.testGuildId}`);
    return;
  }

  await rest.put(Routes.applicationCommands(settings.discord.clientId), {
    body: commands,
  });
  console.log('Registered global commands');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
