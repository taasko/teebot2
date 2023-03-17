import { TeeworldsMatch } from "./teeworlds";

export default {
  topKDRatio: (
    match: TeeworldsMatch
  ): { playerName: string; result: number } => {
    let playerName = "";
    let result = 0;

    for (const p in match.players) {
      const player = match.players[p];
      let kdRatio = 0;

      if (player.kills === 0) {
        // Stays zero
      } else {
        // If someone ends up not dying, One death ~ One life
        kdRatio = player.kills / (player.deaths || 1);
      }

      if (kdRatio > result) {
        result = kdRatio;
        playerName = p;
      }
    }

    return { playerName, result };
  },

  topKills: (match: TeeworldsMatch): { playerName: string; result: number } => {
    let playerName = "";
    let result = 0;

    for (const p in match.players) {
      const player = match.players[p];

      if (player.kills > result) {
        result = player.kills;
        playerName = p;
      }
    }

    return { playerName, result };
  },

  topFlagCaptures: (
    match: TeeworldsMatch
  ): { playerName: string; result: number } => {
    let playerName = "";
    let result = 0;

    for (const p in match.players) {
      const player = match.players[p];

      if (player.flag_captures > result) {
        result = player.flag_captures;
        playerName = p;
      }
    }

    return { playerName, result };
  },

  worstKDRatio: (
    match: TeeworldsMatch
  ): { playerName: string; result?: number } => {
    let playerName = "";
    let result = undefined;

    for (const p in match.players) {
      const player = match.players[p];
      let kdRatio = 0;

      if (player.kills === 0) {
        // Stays zero
      } else {
        // If someone ends up not dying, One death ~ One life
        kdRatio = player.kills / (player.deaths || 1);
      }

      if (result === undefined || kdRatio < result) {
        result = kdRatio;
        playerName = p;
      }
    }

    return { playerName, result };
  },

  mostGrabsWithoutCapture: (
    match: TeeworldsMatch
  ): { playerName: string; result?: number } => {
    let playerName = "";
    let result = undefined;

    for (const p in match.players) {
      const player = match.players[p];

      if (player.flag_captures) continue;

      if (result === undefined || player.flag_grabs > result) {
        result = player.flag_grabs;
        playerName = p;
      }
    }

    return { playerName, result };
  },

  mostKatanaPickups: (
    match: TeeworldsMatch
  ): { playerName: string; result: number } => {
    let playerName = "";
    let result = 0;

    for (const p in match.players) {
      const player = match.players[p];

      if (player.katana_pickups > result) {
        result = player.katana_pickups;
        playerName = p;
      }
    }

    return { playerName, result };
  },
};
