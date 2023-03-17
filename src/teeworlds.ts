import * as dotenv from "dotenv";
dotenv.config();
import * as TeeworldsEcon from "teeworlds-econ/build/TwEconClient";
import TeeworldsHighlights from "./teeworldsHighlights";

export type TeeworldsPlayer = {
  kills: number;
  deaths: number;
  suicides: number;
  katana_pickups: number;
  flag_captures: number;
  flag_grabs: number;
};

export type TeeworldsMatch = {
  startTime: number;
  players: {
    [playerName: string]: TeeworldsPlayer;
  };
};

export class Teeworlds {
  client;

  constructor() {
    const { TEEWORLDS_HOST, TEEWORLDS_PORT, TEEWORLDS_SECRET } = process.env;

    if (!TEEWORLDS_HOST || !TEEWORLDS_PORT || !TEEWORLDS_SECRET) {
      throw Error("Teeworlds configurations missing.");
    }

    this.client = new TeeworldsEcon.TwEconClient(
      TEEWORLDS_HOST,
      parseInt(TEEWORLDS_PORT, 10),
      TEEWORLDS_SECRET
    );

    this.client
      .connect()
      .then(() => console.log("Teeworlds integration ready."))
      .catch(console.error);
  }

  getMatchReport(match: TeeworldsMatch): string {
    let reportString = "MATCH REPORT\n------------\n\n";

    const matchDate = new Date(match.startTime);
    reportString += `Start time: ${matchDate.toLocaleDateString(
      "fi-FI"
    )} ${matchDate.toLocaleTimeString("fi-FI")}\n\n`;

    reportString += this.getMatchHighlights(match).join("\n");

    reportString += "\n";

    return reportString;
  }

  /**
   * @TODO Ideas:
   *   - Slicer: Over 5 katana kills.
   *   - WNB Ninja: Most katana pickups without any katana kills.
   *   - Flag Runner: Kuka on yhteensä laskettuna pisimpään lippu kädessä pakenemassa kun vastapuolella on myös lippu. Yht. lask sekuntiaika ja tapot lippujuoksujen ajalta.
   *   - Terminator: Jos tappoja on eniten, ja 15 enemmän kuin seuraavaks eniten tappaneella.
   *   - MVP: 20% enemmän pisteitä kuin toiseks parhaalla.
   *   - Suicide bomber: Jos on kuollut omaan pommiin yli x kertaa.
   *   - Underdogs: Jos voittaa alivoimalla.
   */
  getMatchHighlights(match: TeeworldsMatch): string[] {
    let highlightStringArray = [];

    const topKills = TeeworldsHighlights.topKills(match);
    const topKDRatio = TeeworldsHighlights.topKDRatio(match);
    if (
      topKDRatio.result &&
      topKills.result &&
      topKDRatio.playerName === topKills.playerName
    ) {
      highlightStringArray.push(
        `Iron Man: ${topKDRatio.playerName} | KD: ${topKDRatio.result.toFixed(
          2
        )}, ${topKills.result} kills`
      );
    } else if (topKills.result) {
      highlightStringArray.push(
        `Top Kills: ${topKills.playerName} | ${topKills.result} kills`
      );
    }

    const topFlagCaptures = TeeworldsHighlights.topFlagCaptures(match);
    if (topFlagCaptures.result) {
      highlightStringArray.push(
        `Conqueror: ${topFlagCaptures.playerName} | ${topFlagCaptures.result} captures`
      );
    }

    const worstKDRatio = TeeworldsHighlights.worstKDRatio(match);
    if (worstKDRatio.result !== undefined && worstKDRatio.result < 1) {
      highlightStringArray.push(
        `Kamikaze: ${worstKDRatio.playerName} | ${worstKDRatio.result.toFixed(
          2
        )} kill/death ratio`
      );
    }

    const mostGrabsWithoutCapture =
      TeeworldsHighlights.mostGrabsWithoutCapture(match);
    if (mostGrabsWithoutCapture.result) {
      highlightStringArray.push(
        `Tumputtaja: ${mostGrabsWithoutCapture.playerName} | ${mostGrabsWithoutCapture.result} grabs without capture`
      );
    }

    const mostKatanaPickups = TeeworldsHighlights.mostKatanaPickups(match);
    if (mostKatanaPickups.result >= 3) {
      highlightStringArray.push(
        `Ninja: ${mostKatanaPickups.playerName} | ${mostKatanaPickups.result} katana pickups`
      );
    }

    return highlightStringArray;
  }
}
