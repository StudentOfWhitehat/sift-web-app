import OpenAI from "openai"

export const getOpenAIClient = () => {
  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey) {
    throw new Error("Missing OpenAI API key")
  }

  // Add dangerouslyAllowBrowser: true to fix the error
  // This is safe because we're only using this in API routes
  return new OpenAI({
    apiKey,
    dangerouslyAllowBrowser: true,
  })
}
