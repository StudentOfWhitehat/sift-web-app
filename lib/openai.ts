import OpenAI from "openai"

export const getOpenAIClient = () => {
  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey) {
    throw new Error("Missing OpenAI API key")
  }

  return new OpenAI({
    apiKey,
    dangerouslyAllowBrowser: true,
  })
}
