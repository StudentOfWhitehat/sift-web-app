import { put } from "@vercel/blob"
import { getOpenAIClient } from "./openai"

export async function uploadImage(file: File): Promise<string> {
  try {
    const blob = await put(file.name, file, {
      access: "public",
    })

    return blob.url
  } catch (error) {
    console.error("Error uploading image:", error)
    throw new Error("Failed to upload image")
  }
}

// Mock image analysis for client-side preview
export const mockAnalyzeImage = () => {
  return {
    isStockImage: false,
    containsText: true,
    description: "This is a mock image analysis for preview purposes.",
    suspiciousElements: [],
  }
}

// This function should only be called from server components or API routes
export async function analyzeImage(imageUrl: string): Promise<{
  isStockImage: boolean
  containsText: boolean
  description: string
  suspiciousElements: string[]
}> {
  // Ensure we're on the server
  if (typeof window !== "undefined") {
    throw new Error("Image analysis can only be performed on the server")
  }

  try {
    const openai = getOpenAIClient()

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are an expert in detecting suspicious elements in marketplace listing images. Analyze the image and provide your assessment in JSON format.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analyze this marketplace listing image for suspicious elements. Look for signs that it might be a stock photo, contains watermarks, has been edited, or shows inconsistencies. Provide your analysis in JSON format with the following fields: isStockImage (boolean), containsText (boolean), description (string), suspiciousElements (array of strings).",
            },
            { type: "image_url", image_url: { url: imageUrl } },
          ],
        },
      ],
      response_format: { type: "json_object" },
    })

    const content = response.choices[0].message.content
    if (!content) {
      throw new Error("No content in OpenAI response")
    }

    return JSON.parse(content)
  } catch (error) {
    console.error("Error analyzing image:", error)
    throw error
  }
}
