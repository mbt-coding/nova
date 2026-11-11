// NOVA configuration. Add your API keys below, in the order they should be used.
// When one key hits its limit, NOVA switches to the next automatically.
// WARNING: anything in this file is visible to every visitor of your site.
// Do NOT commit real keys to a public GitHub repo; see README.md.
const CONFIG = {
  provider: "anthropic",            // "anthropic" | "openai" | "gemini"
  model: "claude-sonnet-4-5",       // edit if the model name changes
  system: "You are NOVA, a friendly, concise and helpful assistant.",
  keys: [
    // "key-1",
    // "key-2",
    // "key-3",
    // "key-4",
  ],
};
