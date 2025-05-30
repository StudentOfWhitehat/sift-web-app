import { type NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    let requestData = {}
    try {
      requestData = await request.json()
    } catch (error) {
      console.log("Error parsing JSON:", error)
    }

    const title = typeof requestData?.title === "string" ? requestData.title : ""
    const description = typeof requestData?.description === "string" ? requestData.description : ""
    const price = typeof requestData?.price === "string" ? requestData.price : ""
    const sellerInfo = typeof requestData?.sellerInfo === "string" ? requestData.sellerInfo : ""

    console.log("Analyzing text for:", { title, description: description.substring(0, 50) + "..." })

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      throw new Error("Missing OpenAI API key")
    }

    const openai = new OpenAI({
      apiKey,
      dangerouslyAllowBrowser: true,
    })

    const prompt = `
      Analyze this online marketplace listing for potential scam indicators:
      
      Title: ${title || "Unknown title"}
      Description: ${description || "No description provided"}
      Price: ${price || "Unknown price"}
      Seller Information: ${sellerInfo || "No seller information"}
      
      Provide your analysis in the following JSON format:
      {
        "title": "The listing title",
        "scamScore": [A number from 0-100 indicating the likelihood of a scam, with 100 being definitely a scam],
        "analysis": "A detailed paragraph explaining why this listing might be a scam or appears legitimate",
        "redFlags": [
          {
            "severity": "high/medium/low",
            "description": "Description of the red flag"
          }
        ]
      }
      
      Focus on these common scam indicators:
      1. Price too good to be true
      2. Vague description lacking specific details
      3. Poor grammar or spelling
      4. Urgency language ("act fast", "won't last")
      5. Unusual payment methods requested
      6. New seller account
      7. Generic stock photos
      8. Requests to continue communication off-platform
    `

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content:
              "You are an expert in detecting online marketplace scams. Analyze the listing and provide your assessment in the requested JSON format.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        response_format: { type: "json_object" },
      })

      const content = response.choices[0]?.message?.content
      if (!content) {
        throw new Error("No content in OpenAI response")
      }

      try {
        const parsedContent = JSON.parse(content)
        return NextResponse.json(parsedContent)
      } catch (parseError) {
        console.error("Error parsing OpenAI response:", parseError)
        throw new Error("Failed to parse OpenAI response")
      }
    } catch (openaiError) {
      console.error("OpenAI API error:", openaiError)
      throw new Error(`OpenAI API error: ${openaiError instanceof Error ? openaiError.message : "Unknown error"}`)
    }
  } catch (error) {
    console.error("Error in text analysis API:", error)

    return NextResponse.json({
      title: "Analysis unavailable",
      scamScore: 50,
      analysis: "We couldn't analyze this listing due to a technical error. Please try again with more information.",
      redFlags: [
        {
          severity: "medium",
          description: "Analysis failed due to technical issues",
        },
      ],
    })
  }
}
