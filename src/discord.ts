import * as dotenv from "dotenv";
dotenv.config();
import {
  Client,
  Collection,
  GatewayIntentBits,
  Guild,
  GuildMember,
  GuildVoiceChannelResolvable,
} from "discord.js";

export class Discord {
  client;
  currentGuild: Guild | undefined;

  constructor() {
    const { DISCORD_TOKEN, DISCORD_GUILD_ID } = process.env;

    if (!DISCORD_TOKEN || !DISCORD_GUILD_ID) {
      throw Error("Discord configurations missing.");
    }

    this.client = new Client({
      intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
    });

    this.client.login(DISCORD_TOKEN);

    this.client.on("ready", async () => {
      this.currentGuild = this.client.guilds.cache.find(
        (g) => g.id === DISCORD_GUILD_ID
      );

      console.log(`Discord integration ready.`);
    });
  }

  get channels() {
    if (!this.currentGuild) return;

    return this.currentGuild.channels.cache.filter((c) => c.type === 2); // Only voice channels.
  }

  async getMembers(): Promise<Collection<string, GuildMember> | undefined> {
    if (!this.currentGuild) return;

    try {
      const members = await this.currentGuild.members.fetch({ force: true });

      return members.filter((m) => !m.user.bot);
    } catch (e) {
      console.error(e);
    }

    return;
  }

  async getMemberByName(name: string): Promise<GuildMember | undefined> {
    const members = await this.getMembers();

    if (!members) return;

    return members.find(
      (m) =>
        (m.nickname && m.nickname.toLowerCase() === name.toLowerCase()) ||
        m.displayName.toLowerCase() === name.toLowerCase() ||
        m.user.username.toLowerCase() === name.toLowerCase()
    );
  }

  getChannelByName(name: string) {
    if (!this.channels) return;

    return this.channels.find((c) => c.name.includes(name));
  }

  async setChannelForMember(
    member: GuildMember,
    channelId: GuildVoiceChannelResolvable
  ) {
    try {
      await member.voice.setChannel(channelId);

      console.log("Channel changed for", member.nickname, "to", channelId);
    } catch (e) {
      console.error("Changing member channel failed.", e);
    }
  }

  async setChannelForAllMembers(
    channelId: GuildVoiceChannelResolvable
  ): Promise<void> {
    const members = await this.getMembers();

    if (!members) return;

    members.forEach((m) => m.voice.setChannel(channelId).catch(console.error));
  }
}
