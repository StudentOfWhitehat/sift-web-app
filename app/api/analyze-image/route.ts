import { type NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"

// Force Node.js runtime
export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    // Get request data with safe defaults
    let requestData
    try {
      requestData = await request.json()
    } catch (error) {
      requestData = {}
    }

    // Ensure imageUrl is a string
    const imageUrl = typeof requestData.imageUrl === "string" ? requestData.imageUrl : null

    if (!imageUrl) {
      throw new Error("No image URL provided")
    }

    // Always use real OpenAI
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      throw new Error("Missing OpenAI API key")
    }

    // Add dangerouslyAllowBrowser: true to fix the error
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

    return NextResponse.json(JSON.parse(content))
  } catch (error) {
    console.error("Error in image analysis API:", error)

    // Return a fallback response with default values
    return NextResponse.json({
      isStockImage: false,
      containsText: false,
      description: "We couldn't analyze this image due to a technical error.",
      suspiciousElements: [],
    })
  }
}
