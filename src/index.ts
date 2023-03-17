import { Discord } from "./discord";
import { Teeworlds, TeeworldsMatch, TeeworldsPlayer } from "./teeworlds";
import { wait } from "./util";
import { AI } from "./ai";

const enum Channel {
  General = "general",
  Red = "RED",
  Blue = "BLUE",
}

type TeebotState = {
  fridaymode: boolean;
  currentMatch: TeeworldsMatch;
};
type TeamID = 0 | 1 | 3;

const CHANNEL_MAPPING = { 0: Channel.Red, 1: Channel.Blue, 3: Channel.General };
const aiStatPrompt =
  "Peli on nimeltään Teeworlds." +
  "Annan sinulle JSON-muotoisen aineiston yhdestä kierroksesta." +
  "Aineisto sisältää nämä toiminnot per pelaaja: 1. lipun nostot (flag_grabs), 2. lipun valloitukset (flag_captures), 3. tapot (kills) ja 4. katanan nosto (katana_pickups)." +
  "Anna minulle analyysi tästä aineistoista, joka on mieluiten mahdollisimman lyhyt." +
  "Erityistermi jota voi käyttää tarvittaessa on 'tumputus', joka tarkoittaa sitä kun pelaaja on nostanut lipun todella monta kertaa mutta ei ole saanut lippua valloitettua." +
  "Kerro ainakin kierroksen arvokkain pelaaja (MVP), eli joku joka on valloittanut todella monta lippua tai tappanut poikkeuksellisen paljon muita pelaajia." +
  "Tämän lisäksi kerro kaksi muuta mielenkiintoista havaintoa aineiston perusteella." +
  "Tässä aineisto: ";

function getInitialMatch(): TeeworldsMatch {
  return {
    startTime: Date.now(),
    players: {},
  };
}

function getInitialPlayer(): TeeworldsPlayer {
  return {
    flag_captures: 0,
    flag_grabs: 0,
    kills: 0,
    deaths: 0,
    suicides: 0,
    katana_pickups: 0,
  };
}

class Teebot {
  state: TeebotState = {
    fridaymode: true,
    currentMatch: getInitialMatch(),
  };

  discord;
  teeworlds;
  ai;

  constructor() {
    this.discord = new Discord();
    this.teeworlds = new Teeworlds();
    this.ai = new AI();

    this.teeworlds.client.on("game.start", async () => {
      if (Date.now() - this.state.currentMatch.startTime < 10000) {
        // Don't count warm up as new match.
        return;
      }

      await wait(1000);

      const stats = JSON.stringify(this.state.currentMatch);

      console.log(stats);

      let aiResponse: string = "AI failed.";

      try {
        const res = await this.ai.ask(aiStatPrompt + stats);

        if (res) {
          aiResponse = res;
        }
      } catch (e) {
        console.error(e);
      }

      console.log(aiResponse);

      const periodIndex = aiResponse
        .split("")
        .findIndex((char) => char === ".");
      const firstSentence = aiResponse.slice(0, periodIndex + 1);

      // Print first sentence to Teeworlds chat.
      try {
        await this.teeworlds.client.send("say " + firstSentence);
      } catch (e) {
        console.error(e);
      }

      // Print full message to Discord.
      try {
        await this.discord.send(Channel.General, aiResponse);
      } catch (e) {
        console.error(e);
      }

      this.state.currentMatch = {
        ...getInitialMatch(),
        startTime: Date.now(),
      };
    });

    this.teeworlds.client.on("game.flag_grab", (e) => {
      this.createPlayerFromEvent(e);

      this.state.currentMatch.players[e.clientName].flag_grabs++;
    });

    this.teeworlds.client.on("game.flag_capture", (e) => {
      this.createPlayerFromEvent(e);

      this.state.currentMatch.players[e.clientName].flag_captures++;
    });

    this.teeworlds.client.on("game.kill", (e) => {
      // TODO: Fix econ
      // Remove id from names. Only this event has ids.
      e.victimName = e.victimName.substring(2);
      e.clientName = e.clientName.substring(2);

      this.createPlayerFromEvent(e);

      // Victim gets always one death.
      this.state.currentMatch.players[e.victimName].deaths++;

      if (e.clientName === e.victimName) {
        // If killer same as victim, add suicide.
        this.state.currentMatch.players[e.clientName].suicides++;
      } else {
        // Otherwise it's kill.
        this.state.currentMatch.players[e.clientName].kills++;
      }
    });

    this.teeworlds.client.on("game.pickup", (e) => {
      if (e.itemId === 5) {
        this.createPlayerFromEvent(e);

        this.state.currentMatch.players[e.clientName].katana_pickups++;
      }
    });

    this.teeworlds.client.on("game.team_join", (e) => {
      if (this.state.fridaymode) return;

      const { clientName: playerName, teamId } = e;
      if (!playerName || teamId === undefined) return;

      return this.changeTeam(playerName, teamId);
    });

    this.teeworlds.client.on("chat.chat", (e) => {
      const command =
        e.text && typeof e.text === "string" && e.text.charAt(0) === "!"
          ? e.text.substring(1)
          : null;

      if (!command) return;

      const commandResponse = this.commandHandler(command);

      if (commandResponse) {
        this.teeworlds.client.send(commandResponse);
      }
    });

    console.log("Teebot started.");
  }

  commandHandler(command: string): void | string {
    switch (command) {
      case "fridaymode":
        return `say fridaymode: ${this.state.fridaymode} (!fridaymode <enable|disable>)`;
      case "fridaymode enable":
        this.state.fridaymode = true;
        this.moveAllMembersToGeneral().catch(console.error);
        return `broadcast fridaymode enabled`;
      case "fridaymode disable":
        this.state.fridaymode = false;
        return `broadcast fridaymode disabled`;
    }
  }

  createPlayerFromEvent(e: { clientName: string; victimName?: string }): void {
    if (!this.state.currentMatch.players[e.clientName]) {
      this.state.currentMatch.players[e.clientName] = getInitialPlayer();
    }

    if (e.victimName && !this.state.currentMatch.players[e.victimName]) {
      this.state.currentMatch.players[e.victimName] = getInitialPlayer();
    }
  }

  async changeTeam(playerName: string, teamId: TeamID): Promise<void> {
    const channel = this.discord.getChannelByName(CHANNEL_MAPPING[teamId]);
    if (!channel) return;

    const member = await this.discord.getMemberByName(playerName);
    if (!member) return;

    return this.discord.setChannelForMember(member, channel.id);
  }

  async moveAllMembersToGeneral(): Promise<void> {
    const channel = this.discord.getChannelByName(Channel.General);
    if (!channel) return;

    return this.discord.setChannelForAllMembers(channel.id);
  }
}

new Teebot();
