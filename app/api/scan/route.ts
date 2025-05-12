import { type NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase"
import { comparePrices } from "@/lib/price-comparison"

// Force Node.js runtime
export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()

    // Get request data with safe defaults
    let data = {}
    try {
      data = await request.json()
    } catch (error) {
      console.error("Error parsing request JSON:", error)
      // Continue with empty object
    }

    // Ensure all values are strings with safe defaults
    const url = typeof data?.url === "string" ? data.url : null
    const title = typeof data?.title === "string" ? data.title : "Unknown listing"
    const description = typeof data?.description === "string" ? data.description : ""
    const price = typeof data?.price === "string" ? data.price : ""
    const sellerInfo = typeof data?.sellerInfo === "string" ? data.sellerInfo : ""
    const imageUrl = typeof data?.imageUrl === "string" ? data.imageUrl : null

    console.log("Processing scan for:", { title, price })

    // Analyze listing text using separate API endpoint
    let textAnalysis
    try {
      // Create a safe payload with no undefined values
      const textAnalysisPayload = {
        title: title || "Unknown listing",
        description: description || "",
        price: price || "",
        sellerInfo: sellerInfo || "",
      }

      console.log("Sending to analyze-text:", textAnalysisPayload)

      const textAnalysisResponse = await fetch(new URL("/api/analyze-text", request.url), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(textAnalysisPayload),
      })

      if (!textAnalysisResponse.ok) {
        const errorText = await textAnalysisResponse.text().catch(() => "Unknown error")
        throw new Error(`Text analysis failed: ${textAnalysisResponse.statusText}. ${errorText}`)
      }

      textAnalysis = await textAnalysisResponse.json()
    } catch (error) {
      console.error("Error calling text analysis API:", error)
      // Provide default values if analysis fails
      textAnalysis = {
        title: title || "Unknown listing",
        scamScore: 50,
        analysis: "We couldn't fully analyze this listing. Please provide more details for a better assessment.",
        redFlags: [],
      }
    }

    // Compare prices with real e-commerce data
    let priceComparison
    try {
      console.log("Calling comparePrices with:", { title, price })
      priceComparison = await comparePrices(title || "", price || "")
      console.log("Price comparison result:", {
        alternatives: priceComparison.alternatives?.length || 0,
        averagePrice: priceComparison.averagePrice,
      })
    } catch (error) {
      console.error("Error in price comparison:", error)
      // Provide default values if comparison fails
      priceComparison = {
        averagePrice: 0,
        lowestPrice: 0,
        highestPrice: 0,
        percentageDifference: 0,
        isSuspiciouslyLow: false,
        alternatives: [],
      }
    }

    // Analyze image if provided
    let imageAnalysis = null
    if (imageUrl) {
      try {
        const imageAnalysisResponse = await fetch(new URL("/api/analyze-image", request.url), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageUrl }),
        })

        if (!imageAnalysisResponse.ok) {
          throw new Error(`Image analysis failed: ${imageAnalysisResponse.statusText}`)
        }

        imageAnalysis = await imageAnalysisResponse.json()
      } catch (error) {
        console.error("Error calling image analysis API:", error)
        // Provide default values if analysis fails
        imageAnalysis = {
          isStockImage: false,
          containsText: false,
          description: "Image analysis unavailable",
          suspiciousElements: [],
        }
      }
    }

    // Calculate final scam score
    let finalScamScore = textAnalysis?.scamScore || 50

    // Adjust score based on price comparison
    if (priceComparison?.isSuspiciouslyLow) {
      finalScamScore += 15
    }

    // Adjust score based on image analysis
    if (imageAnalysis) {
      if (imageAnalysis.isStockImage) {
        finalScamScore += 10
      }

      if (imageAnalysis.suspiciousElements && imageAnalysis.suspiciousElements.length > 0) {
        finalScamScore += 5 * imageAnalysis.suspiciousElements.length
      }
    }

    // Cap the score at 100
    finalScamScore = Math.min(finalScamScore, 100)

    // Combine red flags
    const redFlags = [...(textAnalysis?.redFlags || [])]

    if (priceComparison?.isSuspiciouslyLow) {
      redFlags.push({
        severity: "high",
        description: `Price is ${Math.round(priceComparison.percentageDifference)}% below market value`,
      })
    }

    if (imageAnalysis?.isStockImage) {
      redFlags.push({
        severity: "medium",
        description: "Image appears to be a stock photo",
      })
    }

    if (imageAnalysis?.suspiciousElements && imageAnalysis.suspiciousElements.length > 0) {
      redFlags.push({
        severity: "medium",
        description: `Suspicious elements in image: ${imageAnalysis.suspiciousElements.join(", ")}`,
      })
    }

    // Store scan results in database
    let scan
    try {
      const { data: scanData, error: scanError } = await supabase
        .from("scans")
        .insert({
          title: title || "Unknown listing",
          url: url,
          image_url: imageUrl,
          scam_score: finalScamScore,
          analysis: textAnalysis?.analysis || "Analysis unavailable",
        })
        .select()
        .single()

      if (scanError) {
        throw new Error(`Error storing scan: ${scanError.message}`)
      }

      scan = scanData

      // Store red flags
      if (redFlags.length > 0) {
        const redFlagsToInsert = redFlags.map((flag) => ({
          scan_id: scan.id,
          severity: flag.severity || "medium",
          description: flag.description || "Unknown issue",
        }))

        await supabase.from("red_flags").insert(redFlagsToInsert)
      }

      // Store alternatives
      if (priceComparison?.alternatives && priceComparison.alternatives.length > 0) {
        const alternativesToInsert = priceComparison.alternatives.map((alt) => ({
          scan_id: scan.id,
          title: alt.title || "Unknown product",
          price: alt.price || "$0",
          url: alt.url || "#",
          trusted: alt.trusted || false,
        }))

        await supabase.from("alternatives").insert(alternativesToInsert)
      }
    } catch (error) {
      console.error("Error storing scan data:", error)
      // Create a mock scan object if database storage fails
      scan = {
        id: `temp-${Date.now()}`,
        title: title || "Unknown listing",
        url: url,
        image_url: imageUrl,
        scam_score: finalScamScore,
        analysis: textAnalysis?.analysis || "Analysis unavailable",
        created_at: new Date().toISOString(),
      }
    }

    // Return the complete analysis
    return NextResponse.json({
      id: scan.id,
      title: title || "Unknown listing",
      url: url,
      imageUrl: imageUrl,
      scamScore: finalScamScore,
      analysis: textAnalysis?.analysis || "Analysis unavailable",
      redFlags,
      alternatives: priceComparison?.alternatives || [],
      priceComparison: {
        averagePrice: priceComparison?.averagePrice || 0,
        percentageDifference: priceComparison?.percentageDifference || 0,
        isSuspiciouslyLow: priceComparison?.isSuspiciouslyLow || false,
      },
      imageAnalysis: imageAnalysis || null,
    })
  } catch (error) {
    console.error("Error in scan API:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to analyze listing",
        // Provide a minimal response so the UI doesn't break
        id: `error-${Date.now()}`,
        title: "Error analyzing listing",
        scamScore: 50,
        analysis: "An error occurred while analyzing this listing. Please try again.",
        redFlags: [
          {
            severity: "medium",
            description: "Analysis failed due to technical issues",
          },
        ],
        alternatives: [],
      },
      { status: 500 },
    )
  }
}
