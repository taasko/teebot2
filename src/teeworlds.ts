import * as dotenv from "dotenv";
dotenv.config();
import * as TeeworldsEcon from "teeworlds-econ/build/TwEconClient";

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
}
