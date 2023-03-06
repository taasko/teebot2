import { Discord } from "./discord";
import { Teeworlds } from "./teeworlds";
import { wait } from "./util";
import { AI } from "./ai";

const enum Channel {
  General = "general",
  Red = "RED",
  Blue = "BLUE",
}

type TeeworldsMatch = {
  startTime: number;
  flag_captures: { [playerName: string]: number };
  flag_grabs: { [playerName: string]: number };
  kills: { [playerName: string]: number };
  katana_pickups: { [playerName: string]: number };
  killsArray: any[];
};
type TeebotState = {
  fridaymode: boolean;
  currentMatch: TeeworldsMatch;
};
type TeamID = 0 | 1 | 3;

const CHANNEL_MAPPING = { 0: Channel.Red, 1: Channel.Blue, 3: Channel.General };
const aiStatPrompt =
  "Peli on nimeltään Teeworlds." +
  "Annan sinulle JSON-muotoisen statistiikan yhdestä kierroksesta." +
  "Anna minulle mahdollisimman tiivistetty analyysi tästä aineistoista." +
  "Erityisesti kiinnostaa yksittäisten pelaajien merkittävimmät teot." +
  "Statistiikka sisältää nämä toiminnot: lipun nosto (flag_grabs), lipun palautus (flag_captures), tapot (killsArray) ja katanan nosto (katana_pickups)." +
  "Tässä aineisto: ";

function getInitialMatch(): TeeworldsMatch {
  return {
    startTime: Date.now(),
    flag_captures: {},
    flag_grabs: {},
    kills: {},
    katana_pickups: {},
    killsArray: [],
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

    this.teeworlds.client.on("game.start", (e) => {
      if (Date.now() - this.state.currentMatch.startTime < 10000) {
        // Don't count warm up as new match.
        return;
      }

      wait(3000).then(() => {
        const stats = JSON.stringify(this.state.currentMatch);

        this.ai
          .ask(aiStatPrompt + stats)
          .then((response) => {
            if (!response) {
              throw Error("No AI response.");
            }

            const arr = response.match(/.{1,64}/g);

            if (arr) {
              arr.forEach((s) => {
                this.teeworlds.client.send("say " + s);
              });
            }
          })
          .catch(() => {
            this.teeworlds.client.send(
              "broadcast Viime matsin statsit: " + stats
            );
          });

        this.state.currentMatch = {
          ...getInitialMatch(),
          startTime: Date.now(),
        };
      });
    });

    this.teeworlds.client.on("game.flag_grab", (e) => {
      if (this.state.currentMatch.flag_grabs[e.clientName]) {
        this.state.currentMatch.flag_grabs[e.clientName]++;
      } else {
        this.state.currentMatch.flag_grabs[e.clientName] = 1;
      }
    });

    this.teeworlds.client.on("game.flag_capture", (e) => {
      if (this.state.currentMatch.flag_captures[e.clientName]) {
        this.state.currentMatch.flag_captures[e.clientName]++;
      } else {
        this.state.currentMatch.flag_captures[e.clientName] = 1;
      }
    });

    this.teeworlds.client.on("game.kill", (e) => {
      console.log(e);
      this.state.currentMatch.killsArray.push(e);
    });

    this.teeworlds.client.on("game.pickup", (e) => {
      if (e.itemId === 5) {
        if (this.state.currentMatch.katana_pickups[e.clientName]) {
          this.state.currentMatch.katana_pickups[e.clientName]++;
        } else {
          this.state.currentMatch.katana_pickups[e.clientName] = 1;
        }
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
