import { type NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  return NextResponse.json({ status: "ok", message: "Test endpoint is working" })
}

export async function POST(request: NextRequest) {
  try {
    let body = {}
    try {
      body = await request.json()
    } catch (error) {
      console.error("Error parsing request body:", error)
    }

    console.log("Test endpoint received:", body)

    return NextResponse.json({
      status: "ok",
      received: body,
      bodyType: typeof body,
      hasTitle: body && typeof body === "object" && "title" in body,
      titleType: body && typeof body === "object" && "title" in body ? typeof body.title : "not present",
    })
  } catch (error) {
    console.error("Error in test endpoint:", error)
    return NextResponse.json({ status: "error", message: error.message || "Unknown error" }, { status: 500 })
  }
}
