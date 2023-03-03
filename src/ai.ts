import { Configuration, OpenAIApi } from "openai";

export class AI {
  private openai: OpenAIApi;
  private readonly model = process.env.OPENAI_MODEL || "text-ada-001";
  private readonly maxTokens = process.env.OPENAI_MAX_TOKENS
    ? parseInt(process.env.OPENAI_MAX_TOKENS, 10)
    : null; // OpenAI default, at the time of writing 16.

  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw Error("AI configurations missing.");
    }

    this.openai = new OpenAIApi(
      new Configuration({
        apiKey: process.env.OPENAI_API_KEY,
      })
    );

    console.log("AI ready.");
  }

  async ask(prompt: string): Promise<string | void> {
    try {
      const completion = await this.openai.createCompletion({
        model: this.model,
        prompt,
        max_tokens: this.maxTokens,
      });

      if (completion.data.choices[0].text) {
        return completion.data.choices[0].text.replace(/[\r\n"]+/gm, "");
      }
    } catch (e) {
      console.error(e);
    }
  }
}
