import { type NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase"

// Force Node.js runtime
export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()

    // Get scans with their related red flags and alternatives
    const { data: scans, error: scansError } = await supabase
      .from("scans")
      .select("*")
      .order("created_at", { ascending: false })

    if (scansError) {
      throw new Error(`Error fetching scans: ${scansError.message}`)
    }

    // For each scan, get its red flags and alternatives
    const scanDetails = await Promise.all(
      scans.map(async (scan) => {
        const { data: redFlags } = await supabase.from("red_flags").select("*").eq("scan_id", scan.id)

        const { data: alternatives } = await supabase.from("alternatives").select("*").eq("scan_id", scan.id)

        return {
          ...scan,
          redFlags: redFlags || [],
          alternatives: alternatives || [],
        }
      }),
    )

    return NextResponse.json(scanDetails)
  } catch (error) {
    console.error("Error in scan history API:", error)
    return NextResponse.json({ error: "Failed to fetch scan history" }, { status: 500 })
  }
}
