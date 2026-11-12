// NOVA configuration. Keys are used in order; when one hits its limit, NOVA switches to the next.
// WARNING: anything in this file is visible to every visitor of your site.
// Keep this repository PRIVATE, or move the keys to a server. See README.md.
const CONFIG = {
  provider: "openrouter",           // "openrouter" | "anthropic" | "openai" | "gemini"
  model: "openai/gpt-4o-mini",      // OpenRouter model id; change it to any model your account can use
  system: "You are NOVA, a friendly, concise and helpful assistant.",
  keys: [
    "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",
    "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",
    "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",
  ],
};
