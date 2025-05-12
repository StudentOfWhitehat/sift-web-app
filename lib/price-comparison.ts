interface PriceComparisonResult {
  averagePrice: number
  lowestPrice: number
  highestPrice: number
  percentageDifference: number
  isSuspiciouslyLow: boolean
  alternatives: Array<{
    title: string
    price: string
    url: string
    trusted: boolean
  }>
}

function safeString(value: any): string {
  if (value === null || value === undefined) return ""
  return String(value)
}

function safeNumber(value: any): number {
  if (value === null || value === undefined) return 0
  const num = Number(value)
  return isNaN(num) ? 0 : num
}

export async function comparePrices(title: any, price: any): Promise<PriceComparisonResult> {
  try {
    const safeTitle = safeString(title)
    const safePrice = safeString(price)
    const cleanPrice = safeNumber(safePrice.replace(/[^0-9.]/g, ""))
    const keywords = extractKeywords(safeTitle)
    const category = detectCategory(safeTitle)
    console.log(`Detected category: ${category} for title: ${safeTitle}`)

    let results = []

    try {
      if (category === "motorcycle" || category === "vehicle") {
        results = await searchVehicles(keywords, category)
      } else if (category === "real_estate") {
        results = await searchRealEstate(keywords)
      } else {
        const [amazonResults, ebayResults, walmartResults] = await Promise.allSettled([
          searchAmazon(keywords, category),
          searchEbay(keywords, category),
          searchWalmart(keywords, category),
        ])

        results = [
          amazonResults.status === "fulfilled" ? amazonResults.value : [],
          ebayResults.status === "fulfilled" ? ebayResults.value : [],
          walmartResults.status === "fulfilled" ? walmartResults.value : [],
        ]
          .flat()
          .filter((item) => item && safeNumber(item.price) > 0)
      }
    } catch (error) {
      console.error("Error searching for prices:", error)
    }

    if (results.length < 2) {
      return createCategoryComparison(safeTitle, cleanPrice, category)
    }

    const prices = results.map((item) => safeNumber(item.price))
    const averagePrice = prices.reduce((sum, price) => sum + price, 0) / prices.length
    const lowestPrice = Math.min(...prices)
    const highestPrice = Math.max(...prices)
    const percentageDifference = averagePrice > 0 ? ((averagePrice - cleanPrice) / averagePrice) * 100 : 0
    const isSuspiciouslyLow = percentageDifference > 40

    const alternatives = results.slice(0, 5).map((item) => ({
      title: safeString(item.title),
      price: `$${safeNumber(item.price).toFixed(2)}`,
      url: safeString(item.url),
      trusted: Boolean(item.trusted),
    }))

    return {
      averagePrice,
      lowestPrice,
      highestPrice,
      percentageDifference,
      isSuspiciouslyLow,
      alternatives,
    }
  } catch (error) {
    console.error("Error in price comparison:", error)
    const category = detectCategory(safeString(title))
    return createCategoryComparison(safeString(title), safeNumber(safeString(price).replace(/[^0-9.]/g, "")), category)
  }
}

function extractKeywords(title: any): string {
  const safeTitle = safeString(title)
  if (!safeTitle) return "product"

  try {
    const words = safeTitle.toLowerCase().split(/\s+/)
    const filteredWords = words.filter(
      (word) =>
        word.length > 2 &&
        !["the", "and", "for", "with", "new", "used", "like", "good", "great", "condition", "sale"].includes(word),
    )

    const modelRegex = /([a-z0-9]+-[a-z0-9]+|[a-z][0-9]+|[0-9]+[a-z]+)/g
    const possibleModels = safeTitle.match(modelRegex) || []

    const yearRegex = /(19|20)\d{2}/g
    const years = safeTitle.match(yearRegex) || []

    const result = [...years, ...possibleModels, ...filteredWords.slice(0, 4)].join(" ")
    return result || "product"
  } catch (error) {
    console.error("Error extracting keywords:", error)
    return "product"
  }
}

function detectCategory(title: any): string {
  try {
    const safeTitle = safeString(title)
    if (!safeTitle) return "electronics"

    const titleLower = safeTitle.toLowerCase()

    if (
      titleLower.includes("car") ||
      titleLower.includes("truck") ||
      titleLower.includes("suv") ||
      titleLower.includes("vehicle") ||
      titleLower.includes("auto") ||
      titleLower.includes("ford") ||
      titleLower.includes("toyota") ||
      titleLower.includes("honda") ||
      titleLower.includes("chevy") ||
      titleLower.includes("chevrolet") ||
      titleLower.includes("nissan") ||
      titleLower.includes("bmw") ||
      titleLower.includes("mercedes") ||
      titleLower.includes("audi") ||
      titleLower.includes("lexus") ||
      titleLower.includes("sedan") ||
      titleLower.includes("coupe")
    ) {
      return "vehicle"
    }

    if (
      titleLower.includes("motorcycle") ||
      titleLower.includes("bike") ||
      titleLower.includes("yamaha") ||
      (titleLower.includes("honda") &&
        (titleLower.includes("cbr") || titleLower.includes("motorcycle") || titleLower.includes("bike"))) ||
      titleLower.includes("kawasaki") ||
      titleLower.includes("suzuki") ||
      titleLower.includes("harley") ||
      titleLower.includes("ducati") ||
      titleLower.includes("triumph") ||
      titleLower.includes("ktm") ||
      (titleLower.includes("bmw") && (titleLower.includes("motorcycle") || titleLower.includes("bike")))
    ) {
      return "motorcycle"
    }

    if (
      titleLower.includes("house") ||
      titleLower.includes("apartment") ||
      titleLower.includes("condo") ||
      titleLower.includes("townhouse") ||
      titleLower.includes("property") ||
      titleLower.includes("real estate") ||
      titleLower.includes("home for sale") ||
      (titleLower.includes("bedroom") && titleLower.includes("bath"))
    ) {
      return "real_estate"
    }

    if (
      titleLower.includes("iphone") ||
      (titleLower.includes("samsung") && (titleLower.includes("galaxy") || titleLower.includes("phone"))) ||
      titleLower.includes("pixel") ||
      titleLower.includes("smartphone") ||
      titleLower.includes("mobile phone") ||
      titleLower.includes("android phone") ||
      titleLower.includes("oneplus")
    ) {
      return "smartphone"
    }

    if (
      titleLower.includes("macbook") ||
      titleLower.includes("laptop") ||
      titleLower.includes("notebook") ||
      (titleLower.includes("computer") && !titleLower.includes("desktop")) ||
      titleLower.includes("dell xps") ||
      titleLower.includes("thinkpad") ||
      titleLower.includes("chromebook") ||
      titleLower.includes("surface pro")
    ) {
      return "laptop"
    }

    if (
      titleLower.includes("playstation") ||
      titleLower.includes("ps5") ||
      titleLower.includes("ps4") ||
      titleLower.includes("xbox") ||
      titleLower.includes("nintendo") ||
      (titleLower.includes("switch") && !titleLower.includes("network switch")) ||
      titleLower.includes("console") ||
      titleLower.includes("gaming") ||
      (titleLower.includes("game") && (titleLower.includes("console") || titleLower.includes("system")))
    ) {
      return "gaming"
    }

    if (
      titleLower.includes("camera") ||
      titleLower.includes("canon") ||
      titleLower.includes("nikon") ||
      (titleLower.includes("sony") && (titleLower.includes("camera") || titleLower.includes("alpha"))) ||
      titleLower.includes("fujifilm") ||
      titleLower.includes("dslr") ||
      titleLower.includes("mirrorless") ||
      (titleLower.includes("lens") && (titleLower.includes("camera") || titleLower.includes("mm")))
    ) {
      return "camera"
    }

    if (
      titleLower.includes("headphones") ||
      titleLower.includes("earbuds") ||
      titleLower.includes("airpods") ||
      titleLower.includes("bose") ||
      titleLower.includes("speaker") ||
      titleLower.includes("audio") ||
      (titleLower.includes("sound") && (titleLower.includes("system") || titleLower.includes("bar"))) ||
      titleLower.includes("sonos") ||
      (titleLower.includes("beats") && !titleLower.includes("beats per"))
    ) {
      return "audio"
    }

    if (
      titleLower.includes("sofa") ||
      titleLower.includes("couch") ||
      titleLower.includes("chair") ||
      titleLower.includes("table") ||
      titleLower.includes("desk") ||
      titleLower.includes("bed") ||
      titleLower.includes("dresser") ||
      titleLower.includes("furniture") ||
      titleLower.includes("cabinet") ||
      titleLower.includes("bookshelf")
    ) {
      return "furniture"
    }

    if (
      titleLower.includes("refrigerator") ||
      titleLower.includes("fridge") ||
      titleLower.includes("washer") ||
      titleLower.includes("dryer") ||
      titleLower.includes("dishwasher") ||
      titleLower.includes("microwave") ||
      titleLower.includes("oven") ||
      titleLower.includes("stove") ||
      titleLower.includes("appliance")
    ) {
      return "appliance"
    }

    if (
      titleLower.includes("ring") ||
      titleLower.includes("necklace") ||
      titleLower.includes("bracelet") ||
      (titleLower.includes("watch") && !titleLower.includes("apple watch")) ||
      titleLower.includes("gold") ||
      titleLower.includes("silver") ||
      titleLower.includes("diamond") ||
      titleLower.includes("jewelry")
    ) {
      return "jewelry"
    }

    if (
      titleLower.includes("shirt") ||
      titleLower.includes("pants") ||
      titleLower.includes("jeans") ||
      titleLower.includes("dress") ||
      titleLower.includes("jacket") ||
      titleLower.includes("coat") ||
      titleLower.includes("shoes") ||
      titleLower.includes("clothing") ||
      titleLower.includes("apparel")
    ) {
      return "clothing"
    }

    return "electronics"
  } catch (error) {
    console.error("Error detecting category:", error)
    return "electronics"
  }
}

async function searchVehicles(keywords: string, category: string) {
  try {
    const isMotorcycle = category === "motorcycle"
    const yearMatch = keywords.match(/(19|20)\d{2}/)
    const year = yearMatch ? yearMatch[0] : null
    const makes = isMotorcycle
      ? ["Yamaha", "Honda", "Kawasaki", "Suzuki", "Harley-Davidson", "Ducati", "BMW", "Triumph", "KTM"]
      : ["Toyota", "Honda", "Ford", "Chevrolet", "Nissan", "BMW", "Mercedes", "Audi", "Lexus"]

    let detectedMake = "Unknown"
    for (const make of makes) {
      if (keywords.toLowerCase().includes(make.toLowerCase())) {
        detectedMake = make
        break
      }
    }

    const count = Math.floor(Math.random() * 3) + 3
    const results = []
    let basePrice = isMotorcycle ? 5000 : 15000
    if (year) {
      const currentYear = new Date().getFullYear()
      const age = currentYear - Number.parseInt(year)
      basePrice = isMotorcycle ? Math.max(2000, 12000 - age * 500) : Math.max(5000, 35000 - age * 1500)
    }

    for (let i = 0; i < count; i++) {
      const priceVariation = Math.random() * 0.4 - 0.2
      const price = basePrice * (1 + priceVariation)
      let listingYear = year ? Number.parseInt(year) : 2015 + Math.floor(Math.random() * 8)
      if (year) {
        listingYear = Number.parseInt(year) + (Math.floor(Math.random() * 7) - 3)
      }

      const listingMake = detectedMake !== "Unknown" ? detectedMake : makes[Math.floor(Math.random() * makes.length)]
      const models = isMotorcycle ? getMotorcycleModels(listingMake) : getCarModels(listingMake)
      const model = models[Math.floor(Math.random() * models.length)]
      const conditions = ["Excellent", "Good", "Fair", "Like New"]
      const condition = conditions[Math.floor(Math.random() * conditions.length)]
      const sources = isMotorcycle
        ? ["CycleTrader", "Motorcycle.com", "RevZilla", "Craigslist", "Facebook Marketplace"]
        : ["AutoTrader", "Cars.com", "CarGurus", "Craigslist", "Facebook Marketplace"]

      const source = sources[Math.floor(Math.random() * sources.length)]

      results.push({
        title: `${source}: ${listingYear} ${listingMake} ${model} - ${condition} Condition`,
        price: price,
        url: `https://www.example.com/${listingMake.toLowerCase()}-${model.toLowerCase().replace(/\s+/g, "-")}-${listingYear}`,
        trusted: source !== "Craigslist" && source !== "Facebook Marketplace",
      })
    }

    return results
  } catch (error) {
    console.error("Error searching vehicles:", error)
    return []
  }
}

function getMotorcycleModels(make: string): string[] {
  const modelsByMake: Record<string, string[]> = {
    Yamaha: ["YZF-R6", "YZF-R1", "MT-07", "MT-09", "Bolt", "V-Star", "FZ-07", "FZ-09", "Tenere 700"],
    Honda: ["CBR600RR", "CBR1000RR", "Rebel 500", "Rebel 1100", "Gold Wing", "Africa Twin", "Shadow", "CB500F"],
    Kawasaki: ["Ninja 400", "Ninja 650", "Ninja ZX-6R", "Ninja ZX-10R", "Z650", "Z900", "Vulcan", "Versys"],
    Suzuki: ["GSX-R600", "GSX-R750", "GSX-R1000", "Boulevard", "V-Strom", "Hayabusa", "SV650", "Katana"],
    "Harley-Davidson": ["Sportster", "Street Glide", "Road Glide", "Fat Boy", "Softail", "Iron 883", "Road King"],
    Ducati: ["Panigale V4", "Monster", "Multistrada", "Diavel", "Scrambler", "SuperSport", "Streetfighter"],
    BMW: ["R 1250 GS", "S 1000 RR", "F 900 R", "R nineT", "K 1600", "G 310 R", "F 850 GS"],
    Triumph: ["Street Triple", "Speed Triple", "Bonneville", "Tiger", "Rocket 3", "Trident", "Daytona"],
    KTM: ["390 Duke", "790 Duke", "1290 Super Duke", "RC 390", "Adventure 1290", "690 Enduro"],
  }

  return modelsByMake[make] || ["Model Unknown"]
}

function getCarModels(make: string): string[] {
  const modelsByMake: Record<string, string[]> = {
    Toyota: ["Camry", "Corolla", "RAV4", "Highlander", "Tacoma", "4Runner", "Prius", "Sienna"],
    Honda: ["Civic", "Accord", "CR-V", "Pilot", "Odyssey", "HR-V", "Ridgeline", "Fit"],
    Ford: ["F-150", "Escape", "Explorer", "Mustang", "Edge", "Bronco", "Ranger", "Expedition"],
    Chevrolet: ["Silverado", "Equinox", "Tahoe", "Malibu", "Traverse", "Camaro", "Suburban", "Colorado"],
    Nissan: ["Altima", "Rogue", "Sentra", "Pathfinder", "Murano", "Frontier", "Maxima", "Kicks"],
    BMW: ["3 Series", "5 Series", "X3", "X5", "7 Series", "X1", "M3", "M5"],
    Mercedes: ["C-Class", "E-Class", "GLC", "GLE", "S-Class", "A-Class", "GLA", "GLS"],
    Audi: ["A4", "Q5", "A6", "Q7", "A3", "Q3", "e-tron", "A8"],
    Lexus: ["RX", "ES", "NX", "IS", "GX", "UX", "LS", "LC"],
  }

  return modelsByMake[make] || ["Model Unknown"]
}

async function searchRealEstate(keywords: string) {
  try {
    const bedroomMatch = keywords.match(/(\d+)\s*(?:bed|bedroom|br)/i)
    const bathroomMatch = keywords.match(/(\d+)\s*(?:bath|bathroom|ba)/i)
    const bedrooms = bedroomMatch ? Number.parseInt(bedroomMatch[1]) : Math.floor(Math.random() * 3) + 2
    const bathrooms = bathroomMatch ? Number.parseInt(bathroomMatch[1]) : Math.floor(Math.random() * 2) + 1
    const locationMatch = keywords.match(/in\s+([a-z\s]+)/i)
    const location = locationMatch ? locationMatch[1] : "the area"
    const count = Math.floor(Math.random() * 2) + 3
    const results = []
    const basePrice = 250000 + bedrooms * 50000 + bathrooms * 25000
    const propertyTypes = ["House", "Condo", "Townhouse", "Apartment"]

    for (let i = 0; i < count; i++) {
      const priceVariation = Math.random() * 0.3 - 0.15
      const price = basePrice * (1 + priceVariation)
      const listingBedrooms = bedrooms + (Math.floor(Math.random() * 3) - 1)
      const listingBathrooms = bathrooms + (Math.floor(Math.random() * 2) - 0.5)
      const propertyType = propertyTypes[Math.floor(Math.random() * propertyTypes.length)]
      const sources = ["Zillow", "Redfin", "Trulia", "Realtor.com", "Century 21"]
      const source = sources[Math.floor(Math.random() * sources.length)]

      results.push({
        title: `${source}: ${listingBedrooms} bed, ${listingBathrooms} bath ${propertyType} in ${location}`,
        price: price,
        url: `https://www.example.com/property-${Math.floor(Math.random() * 10000)}`,
        trusted: true,
      })
    }

    return results
  } catch (error) {
    console.error("Error searching real estate:", error)
    return []
  }
}

async function searchAmazon(keywords: string, category: string) {
  try {
    return simulateAmazonResults(keywords, category)
  } catch (error) {
    console.error("Error searching Amazon:", error)
    return []
  }
}

async function searchEbay(keywords: string, category: string) {
  try {
    return simulateEbayResults(keywords, category)
  } catch (error) {
    console.error("Error searching eBay:", error)
    return []
  }
}

async function searchWalmart(keywords: string, category: string) {
  try {
    return simulateWalmartResults(keywords, category)
  } catch (error) {
    console.error("Error searching Walmart:", error)
    return []
  }
}

function createCategoryComparison(title: any, price: any, category: string): PriceComparisonResult {
  try {
    const safeTitle = safeString(title)
    const safePrice = safeNumber(price)
    const { avgPrice, minPrice, maxPrice } = getPriceRangeForCategory(category, safePrice)
    const percentageDifference = avgPrice > 0 ? ((avgPrice - safePrice) / avgPrice) * 100 : 0
    const isSuspiciouslyLow = percentageDifference > 40
    const alternatives = generateAlternativesForCategory(category, avgPrice, safeTitle)

    return {
      averagePrice: avgPrice,
      lowestPrice: minPrice,
      highestPrice: maxPrice,
      percentageDifference,
      isSuspiciouslyLow,
      alternatives,
    }
  } catch (error) {
    console.error("Error creating category comparison:", error)
    return {
      averagePrice: 100,
      lowestPrice: 80,
      highestPrice: 120,
      percentageDifference: 0,
      isSuspiciouslyLow: false,
      alternatives: [
        {
          title: "Similar Product",
          price: "$100",
          url: "https://www.amazon.com",
          trusted: true,
        },
      ],
    }
  }
}

function getPriceRangeForCategory(
  category: string,
  price: number,
): { avgPrice: number; minPrice: number; maxPrice: number } {
  try {
    const safeCategory = safeString(category)
    const safePrice = safeNumber(price)

    const ranges: Record<string, { avgPrice: number; minPrice: number; maxPrice: number }> = {
      smartphone: { avgPrice: 800, minPrice: 600, maxPrice: 1200 },
      laptop: { avgPrice: 1500, minPrice: 1200, maxPrice: 2500 },
      gaming: { avgPrice: 500, minPrice: 450, maxPrice: 700 },
      camera: { avgPrice: 1200, minPrice: 800, maxPrice: 2000 },
      audio: { avgPrice: 300, minPrice: 200, maxPrice: 400 },
      electronics: { avgPrice: 500, minPrice: 300, maxPrice: 700 },
      furniture: { avgPrice: 800, minPrice: 400, maxPrice: 1500 },
      appliance: { avgPrice: 1000, minPrice: 500, maxPrice: 2000 },
      jewelry: { avgPrice: 1500, minPrice: 500, maxPrice: 5000 },
      clothing: { avgPrice: 100, minPrice: 50, maxPrice: 200 },
      motorcycle: { avgPrice: 8000, minPrice: 3000, maxPrice: 15000 },
      vehicle: { avgPrice: 25000, minPrice: 15000, maxPrice: 40000 },
      real_estate: { avgPrice: 350000, minPrice: 200000, maxPrice: 500000 },
    }

    return ranges[safeCategory] || { avgPrice: safePrice * 1.2, minPrice: safePrice * 0.8, maxPrice: safePrice * 1.5 }
  } catch (error) {
    console.error("Error getting price range:", error)
    return { avgPrice: 100, minPrice: 80, maxPrice: 120 }
  }
}

function generateAlternativesForCategory(
  category: any,
  avgPrice: any,
  title = "",
): Array<{ title: string; price: string; url: string; trusted: boolean }> {
  try {
    const safeCategory = safeString(category)
    const safeAvgPrice = safeNumber(avgPrice)
    const safeTitle = safeString(title)
    const yearMatch = safeTitle.match(/(19|20)\d{2}/)
    const year = yearMatch ? yearMatch[0] : null
    const words = safeTitle.split(/\s+/)
    const possibleBrands = words.filter((word) => word.length > 2)
    const brand = possibleBrands.length > 0 ? possibleBrands[0] : null

    if (safeCategory === "motorcycle") {
      const motorcycleMakes = ["Yamaha", "Honda", "Kawasaki", "Suzuki", "Harley", "Ducati", "BMW", "Triumph", "KTM"]
      let detectedMake = "Unknown"

      for (const make of motorcycleMakes) {
        if (safeTitle.toLowerCase().includes(make.toLowerCase())) {
          detectedMake = make
          break
        }
      }

      if (detectedMake === "Unknown" && brand) {
        detectedMake = brand
      }

      return [
        {
          title: `${year || "Recent"} ${detectedMake} Motorcycle - Excellent Condition`,
          price: `$${Math.round(safeAvgPrice * 0.95).toLocaleString()}`,
          url: "https://www.cycletrader.com/",
          trusted: true,
        },
        {
          title: `${year || "Recent"} ${detectedMake} Motorcycle - Good Condition`,
          price: `$${Math.round(safeAvgPrice * 0.85).toLocaleString()}`,
          url: "https://www.motorcycles.autotrader.com/",
          trusted: true,
        },
        {
          title: `Similar ${detectedMake} Model - Low Miles`,
          price: `$${Math.round(safeAvgPrice * 1.05).toLocaleString()}`,
          url: "https://www.revzilla.com/",
          trusted: true,
        },
      ]
    }

    if (safeCategory === "vehicle") {
      const vehicleMakes = ["Toyota", "Honda", "Ford", "Chevrolet", "Nissan", "BMW", "Mercedes", "Audi", "Lexus"]
      let detectedMake = "Unknown"

      for (const make of vehicleMakes) {
        if (safeTitle.toLowerCase().includes(make.toLowerCase())) {
          detectedMake = make
          break
        }
      }

      if (detectedMake === "Unknown" && brand) {
        detectedMake = brand
      }

      return [
        {
          title: `${year || "Recent"} ${detectedMake} - Certified Pre-Owned`,
          price: `$${Math.round(safeAvgPrice * 1.05).toLocaleString()}`,
          url: "https://www.autotrader.com/",
          trusted: true,
        },
        {
          title: `${year || "Recent"} ${detectedMake} - Excellent Condition`,
          price: `$${Math.round(safeAvgPrice * 0.95).toLocaleString()}`,
          url: "https://www.cars.com/",
          trusted: true,
        },
        {
          title: `Similar ${detectedMake} Model - Low Miles`,
          price: `$${Math.round(safeAvgPrice * 0.9).toLocaleString()}`,
          url: "https://www.cargurus.com/",
          trusted: true,
        },
      ]
    }

    const alternatives: Record<string, Array<{ title: string; price: string; url: string; trusted: boolean }>> = {
      smartphone: [
        {
          title: "iPhone 13 Pro - Certified Refurbished",
          price: "$699",
          url: "https://www.amazon.com/dp/B09G9HD6PD",
          trusted: true,
        },
        {
          title: "Samsung Galaxy S22 - New",
          price: "$749",
          url: "https://www.bestbuy.com/site/samsung-galaxy-s22",
          trusted: true,
        },
      ],
      laptop: [
        {
          title: "MacBook Pro M1 - Apple Certified",
          price: "$1299",
          url: "https://www.apple.com/shop/refurbished/mac/macbook-pro",
          trusted: true,
        },
        {
          title: "Dell XPS 13 - New",
          price: "$1199",
          url: "https://www.dell.com/en-us/shop/dell-laptops/xps-13-laptop",
          trusted: true,
        },
      ],
      gaming: [
        {
          title: "PlayStation 5 - New",
          price: "$499",
          url: "https://direct.playstation.com/en-us/consoles/console/playstation5-console",
          trusted: true,
        },
        {
          title: "Xbox Series X - New",
          price: "$499",
          url: "https://www.xbox.com/en-US/consoles/xbox-series-x",
          trusted: true,
        },
      ],
      camera: [
        {
          title: "Sony Alpha a7 III - New",
          price: "$1999",
          url: "https://www.bhphotovideo.com/c/product/1433231-REG",
          trusted: true,
        },
        { title: "Canon EOS R6 - New", price: "$2299", url: "https://www.adorama.com/car6.html", trusted: true },
      ],
      audio: [
        {
          title: "Bose QuietComfort 45 - New",
          price: "$329",
          url: "https://www.bose.com/en_us/products/headphones",
          trusted: true,
        },
        {
          title: "Sony WH-1000XM4 - New",
          price: "$349",
          url: "https://electronics.sony.com/audio/headphones",
          trusted: true,
        },
      ],
      furniture: [
        {
          title: "Modern Sofa - New",
          price: "$899",
          url: "https://www.wayfair.com/",
          trusted: true,
        },
        {
          title: "Dining Table Set - New",
          price: "$649",
          url: "https://www.ikea.com/",
          trusted: true,
        },
      ],
      appliance: [
        {
          title: "Samsung Refrigerator - New",
          price: "$1299",
          url: "https://www.homedepot.com/",
          trusted: true,
        },
        {
          title: "LG Washing Machine - New",
          price: "$899",
          url: "https://www.bestbuy.com/",
          trusted: true,
        },
      ],
      jewelry: [
        {
          title: "Diamond Necklace - New",
          price: "$1499",
          url: "https://www.bluenile.com/",
          trusted: true,
        },
        {
          title: "Gold Watch - New",
          price: "$899",
          url: "https://www.jared.com/",
          trusted: true,
        },
      ],
      clothing: [
        {
          title: "Designer Jacket - New",
          price: "$199",
          url: "https://www.nordstrom.com/",
          trusted: true,
        },
        {
          title: "Premium Jeans - New",
          price: "$129",
          url: "https://www.macys.com/",
          trusted: true,
        },
      ],
      electronics: [
        {
          title: "Similar Product - Verified Seller",
          price: `$${Math.round(safeAvgPrice).toString()}`,
          url: "https://www.amazon.com",
          trusted: true,
        },
        {
          title: "Alternative Product - Top Rated",
          price: `$${Math.round(safeAvgPrice * 0.9).toString()}`,
          url: "https://www.bestbuy.com",
          trusted: true,
        },
      ],
    }

    return alternatives[safeCategory] || alternatives.electronics
  } catch (error) {
    console.error("Error generating alternatives:", error)
    return [
      {
        title: "Similar Product",
        price: "$100",
        url: "https://www.amazon.com",
        trusted: true,
      },
    ]
  }
}

function simulateAmazonResults(keywords: string, category: string) {
  try {
    const safeKeywords = safeString(keywords)
    const safeCategory = safeString(category)
    const { avgPrice } = getPriceRangeForCategory(safeCategory, 0)
    const count = Math.floor(Math.random() * 3) + 2
    const results = []

    for (let i = 0; i < count; i++) {
      const priceVariation = Math.random() * 0.3 - 0.15
      const price = avgPrice * (1 + priceVariation)

      results.push({
        title: `Amazon: ${getProductNameForCategory(safeCategory)} ${i === 0 ? "(New)" : "(Renewed)"}`,
        price: price,
        url: `https://www.amazon.com/dp/${generateRandomId()}`,
        trusted: true,
      })
    }

    return results
  } catch (error) {
    console.error("Error simulating Amazon results:", error)
    return []
  }
}

function simulateEbayResults(keywords: string, category: string) {
  try {
    const safeKeywords = safeString(keywords)
    const safeCategory = safeString(category)
    const { avgPrice } = getPriceRangeForCategory(safeCategory, 0)
    const count = Math.floor(Math.random() * 3) + 1
    const results = []

    for (let i = 0; i < count; i++) {
      const priceVariation = Math.random() * 0.5 - 0.25
      const price = avgPrice * (1 + priceVariation)

      results.push({
        title: `eBay: ${getProductNameForCategory(safeCategory)} ${i === 0 ? "(Like New)" : "(Used)"}`,
        price: price,
        url: `https://www.ebay.com/itm/${generateRandomId()}`,
        trusted: i === 0,
      })
    }

    return results
  } catch (error) {
    console.error("Error simulating eBay results:", error)
    return []
  }
}

function simulateWalmartResults(keywords: string, category: string) {
  try {
    const safeKeywords = safeString(keywords)
    const safeCategory = safeString(category)
    const { avgPrice } = getPriceRangeForCategory(safeCategory, 0)
    const count = Math.floor(Math.random() * 2) + 1
    const results = []

    for (let i = 0; i < count; i++) {
      const priceVariation = Math.random() * 0.2 - 0.1
      const price = avgPrice * (1 + priceVariation)

      results.push({
        title: `Walmart: ${getProductNameForCategory(safeCategory)} ${i === 0 ? "(New)" : "(Refurbished)"}`,
        price: price,
        url: `https://www.walmart.com/ip/${generateRandomId()}`,
        trusted: true,
      })
    }

    return results
  } catch (error) {
    console.error("Error simulating Walmart results:", error)
    return []
  }
}

function getProductNameForCategory(category: any): string {
  try {
    const safeCategory = safeString(category)

    const productNames: Record<string, string[]> = {
      smartphone: ["iPhone 13 Pro", "Samsung Galaxy S22", "Google Pixel 6", "OnePlus 10 Pro"],
      laptop: ["MacBook Pro M1", "Dell XPS 13", "HP Spectre x360", "Lenovo ThinkPad X1"],
      gaming: ["PlayStation 5", "Xbox Series X", "Nintendo Switch OLED", "Steam Deck"],
      camera: ["Sony Alpha a7 III", "Canon EOS R6", "Nikon Z6 II", "Fujifilm X-T4"],
      audio: ["Bose QuietComfort 45", "Sony WH-1000XM4", "Apple AirPods Pro", "Sennheiser Momentum 3"],
      furniture: ["Sectional Sofa", "Queen Bed Frame", "Dining Table Set", "Office Desk"],
      appliance: ["Samsung Refrigerator", "LG Washing Machine", "KitchenAid Mixer", "Dyson Vacuum"],
      jewelry: ["Diamond Necklace", "Gold Watch", "Silver Bracelet", "Pearl Earrings"],
      clothing: ["Designer Jacket", "Premium Jeans", "Leather Boots", "Cashmere Sweater"],
      motorcycle: ["Yamaha YZF-R6", "Honda CBR600RR", "Kawasaki Ninja 650", "Harley-Davidson Sportster"],
      vehicle: ["Toyota Camry", "Honda Civic", "Ford F-150", "Chevrolet Silverado"],
      electronics: ["Premium Electronics", "Smart Device", "Tech Gadget", "Digital Device"],
    }

    const options = productNames[safeCategory] || productNames.electronics
    return options[Math.floor(Math.random() * options.length)]
  } catch (error) {
    console.error("Error getting product name:", error)
    return "Product"
  }
}

function generateRandomId(): string {
  try {
    return Math.random().toString(36).substring(2, 10).toUpperCase()
  } catch (error) {
    console.error("Error generating random ID:", error)
    return "ABCDEFGH"
  }
}
