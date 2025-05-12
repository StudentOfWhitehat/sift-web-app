"use server"

import { createServerSupabaseClient } from "@/lib/supabase"
import { uploadImage } from "@/lib/image-analysis"
import { revalidatePath } from "next/cache"

export async function getScanHistory() {
  try {
    const supabase = createServerSupabaseClient()

    // Get scans
    const { data: scans, error: scansError } = await supabase
      .from("scans")
      .select("*")
      .order("created_at", { ascending: false })

    if (scansError) {
      throw new Error(`Error fetching scans: ${scansError.message}`)
    }

    return { scans }
  } catch (error) {
    console.error("Error fetching scan history:", error)
    return { error: "Failed to fetch scan history" }
  }
}

export async function getScanDetails(scanId: string) {
  try {
    const supabase = createServerSupabaseClient()

    // Get scan details
    const { data: scan, error: scanError } = await supabase.from("scans").select("*").eq("id", scanId).single()

    if (scanError) {
      throw new Error(`Error fetching scan: ${scanError.message}`)
    }

    // Get red flags
    const { data: redFlags } = await supabase.from("red_flags").select("*").eq("scan_id", scanId)

    // Get alternatives
    const { data: alternatives } = await supabase.from("alternatives").select("*").eq("scan_id", scanId)

    return {
      scan,
      redFlags: redFlags || [],
      alternatives: alternatives || [],
    }
  } catch (error) {
    console.error("Error fetching scan details:", error)
    return { error: "Failed to fetch scan details" }
  }
}

export async function uploadImageFile(formData: FormData) {
  try {
    const file = formData.get("image") as File

    if (!file) {
      return { error: "No image file provided" }
    }

    const imageUrl = await uploadImage(file)
    return { imageUrl }
  } catch (error) {
    console.error("Error uploading image:", error)
    return { error: "Failed to upload image" }
  }
}

export async function deleteScan(scanId: string) {
  try {
    const supabase = createServerSupabaseClient()

    const { error } = await supabase.from("scans").delete().eq("id", scanId)

    if (error) {
      throw new Error(`Error deleting scan: ${error.message}`)
    }

    revalidatePath("/dashboard")
    return { success: true }
  } catch (error) {
    console.error("Error deleting scan:", error)
    return { error: "Failed to delete scan" }
  }
}
