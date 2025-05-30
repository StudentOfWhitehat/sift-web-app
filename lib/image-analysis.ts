import { put } from "@vercel/blob"
import OpenAI from "openai"

export async function uploadImage(file: File): Promise<string> {
  try {
    console.log(`Uploading image: ${file.name}, size: ${file.size} bytes`)

    const blob = await put(file.name, file, {
      access: "public",
    })

    console.log(`Image uploaded successfully: ${blob.url}`)
    return blob.url
  } catch (error) {
    console.error("Error uploading image:", error)
    throw new Error("Failed to upload image")
  }
}

export async function analyzeImage(imageUrl: string): Promise<{
  isStockImage: boolean
  containsText: boolean
  description: string
  suspiciousElements: string[]
}> {
  if (typeof window !== "undefined") {
    throw new Error("Image analysis can only be performed on the server")
  }

  try {
    console.log(`Analyzing image: ${imageUrl}`)

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      throw new Error("Missing OpenAI API key")
    }

    const openai = new OpenAI({
      apiKey,
      dangerouslyAllowBrowser: true,
    })

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are an expert in detecting suspicious elements in marketplace listing images. Analyze the image thoroughly and provide your assessment in JSON format. Look for signs of stock photos, watermarks, image editing, inconsistencies, and other red flags that might indicate a scam listing.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze this marketplace listing image for suspicious elements. Provide a detailed analysis in JSON format with these fields:

1. isStockImage (boolean): Is this likely a stock photo or professional product image not taken by the seller?
2. containsText (boolean): Does the image contain any text, watermarks, or overlays?
3. description (string): Detailed description of what you see in the image
4. suspiciousElements (array of strings): List any suspicious elements like:
   - Watermarks or stock photo indicators
   - Professional studio lighting inconsistent with personal sale
   - Multiple products in one image suggesting catalog photo
   - Image quality too high for typical marketplace photo
   - Background inconsistencies
   - Signs of image editing or manipulation
   - Generic product shots without personal context
   - Any other red flags

Be thorough in your analysis and err on the side of caution when identifying potential issues.`,
            },
            { type: "image_url", image_url: { url: imageUrl } },
          ],
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 1000,
    })

    const content = response.choices[0].message.content
    if (!content) {
      throw new Error("No content in OpenAI response")
    }

    const analysis = JSON.parse(content)
    console.log(`Image analysis complete:`, {
      isStockImage: analysis.isStockImage,
      containsText: analysis.containsText,
      suspiciousElements: analysis.suspiciousElements?.length || 0,
    })

    return analysis
  } catch (error) {
    console.error("Error analyzing image:", error)
    throw error
  }
}
