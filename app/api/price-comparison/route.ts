import { type NextRequest, NextResponse } from "next/server"
import { comparePrices } from "@/lib/price-comparison"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    let data
    try {
      data = await request.json()
    } catch (error) {
      data = {}
    }

    const title = typeof data.title === "string" ? data.title : ""
    const price = typeof data.price === "string" ? data.price : "0"

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 })
    }

    console.log("Testing price comparison for:", { title, price })

    const result = await comparePrices(title, price)

    console.log("Price comparison result:", {
      category: "Detected from keywords",
      alternatives: result.alternatives.map((alt) => alt.title),
      averagePrice: result.averagePrice,
      percentageDifference: result.percentageDifference,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error in price comparison API:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to compare prices",
      },
      { status: 500 },
    )
  }
}
