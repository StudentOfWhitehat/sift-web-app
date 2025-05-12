import { type NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase"
import { comparePrices } from "@/lib/price-comparison"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()

    let data = {}
    try {
      data = await request.json()
    } catch (error) {
      console.error("Error parsing request JSON:", error)
    }

    const url = typeof data?.url === "string" ? data.url : null
    const title = typeof data?.title === "string" ? data.title : "Unknown listing"
    const description = typeof data?.description === "string" ? data.description : ""
    const price = typeof data?.price === "string" ? data.price : ""
    const sellerInfo = typeof data?.sellerInfo === "string" ? data.sellerInfo : ""
    const imageUrl = typeof data?.imageUrl === "string" ? data.imageUrl : null

    console.log("Processing scan for:", { title, price })

    let textAnalysis
    try {
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
      textAnalysis = {
        title: title || "Unknown listing",
        scamScore: 50,
        analysis: "We couldn't fully analyze this listing. Please provide more details for a better assessment.",
        redFlags: [],
      }
    }

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
      priceComparison = {
        averagePrice: 0,
        lowestPrice: 0,
        highestPrice: 0,
        percentageDifference: 0,
        isSuspiciouslyLow: false,
        alternatives: [],
      }
    }

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
        imageAnalysis = {
          isStockImage: false,
          containsText: false,
          description: "Image analysis unavailable",
          suspiciousElements: [],
        }
      }
    }

    let finalScamScore = textAnalysis?.scamScore || 50

    if (priceComparison?.isSuspiciouslyLow) {
      finalScamScore += 15
    }

    if (imageAnalysis) {
      if (imageAnalysis.isStockImage) {
        finalScamScore += 10
      }

      if (imageAnalysis.suspiciousElements && imageAnalysis.suspiciousElements.length > 0) {
        finalScamScore += 5 * imageAnalysis.suspiciousElements.length
      }
    }

    finalScamScore = Math.min(finalScamScore, 100)

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

      if (redFlags.length > 0) {
        const redFlagsToInsert = redFlags.map((flag) => ({
          scan_id: scan.id,
          severity: flag.severity || "medium",
          description: flag.description || "Unknown issue",
        }))

        await supabase.from("red_flags").insert(redFlagsToInsert)
      }

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
