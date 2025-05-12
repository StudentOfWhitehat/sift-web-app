import { type NextRequest, NextResponse } from "next/server"
import * as cheerio from "cheerio"

// Force Node.js runtime
export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json()

    if (!url) {
      return NextResponse.json({ error: "No URL provided" }, { status: 400 })
    }

    // Validate URL
    try {
      new URL(url)
    } catch (e) {
      return NextResponse.json({ error: "Invalid URL format" }, { status: 400 })
    }

    // Fetch the URL content
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch URL: ${response.statusText}`)
      }

      const html = await response.text()

      // Parse the HTML
      const $ = cheerio.load(html)

      // Extract title - try multiple selectors
      let title =
        $('meta[property="og:title"]').attr("content") ||
        $('meta[name="twitter:title"]').attr("content") ||
        $("title").text().trim() ||
        $("h1").first().text().trim() ||
        ""

      // Extract description - try multiple selectors
      let description =
        $('meta[property="og:description"]').attr("content") ||
        $('meta[name="description"]').attr("content") ||
        $('meta[name="twitter:description"]').attr("content") ||
        $("p").first().text().trim() ||
        ""

      // Extract price - try multiple common price selectors
      let price = ""
      const priceSelectors = [
        ".price",
        '[itemprop="price"]',
        ".product-price",
        ".offer-price",
        ".current-price",
        ".sale-price",
        ".product__price",
        ".product-meta__price",
        "span:contains($)",
      ]

      for (const selector of priceSelectors) {
        const priceElement = $(selector).first()
        if (priceElement.length) {
          price = priceElement.text().trim()
          break
        }
      }

      // If no price found, try regex pattern matching for price formats
      if (!price) {
        const pricePattern = /\$\s?[\d,]+\.?\d*/g
        const textWithPrice = $("body").text()
        const priceMatches = textWithPrice.match(pricePattern)
        if (priceMatches && priceMatches.length > 0) {
          price = priceMatches[0]
        }
      }

      // Extract seller info - try multiple common seller selectors
      let sellerInfo = ""
      const sellerSelectors = [
        ".seller-info",
        ".merchant-info",
        '[itemprop="seller"]',
        ".vendor",
        ".store-name",
        ".sold-by",
      ]

      for (const selector of sellerSelectors) {
        const sellerElement = $(selector).first()
        if (sellerElement.length) {
          sellerInfo = sellerElement.text().trim()
          break
        }
      }

      // Extract image URL
      let imageUrl =
        $('meta[property="og:image"]').attr("content") ||
        $('meta[name="twitter:image"]').attr("content") ||
        $('img[itemprop="image"]').attr("src") ||
        $(".product-image img").first().attr("src") ||
        $("img").first().attr("src") ||
        ""

      // Make image URL absolute if it's relative
      if (imageUrl && !imageUrl.startsWith("http")) {
        const baseUrl = new URL(url)
        imageUrl = new URL(imageUrl, baseUrl.origin).toString()
      }

      // Clean up extracted data
      title = title.replace(/\s+/g, " ").trim()
      description = description.replace(/\s+/g, " ").trim()
      price = price.replace(/\s+/g, " ").trim()
      sellerInfo = sellerInfo.replace(/\s+/g, " ").trim()

      return NextResponse.json({
        title,
        description,
        price,
        sellerInfo,
        imageUrl,
      })
    } catch (error) {
      console.error("Error scraping URL:", error)
      return NextResponse.json(
        {
          error: error instanceof Error ? error.message : "Failed to scrape URL",
        },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("Error in URL scraper API:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
