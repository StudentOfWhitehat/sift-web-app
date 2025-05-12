"use client"

import type React from "react"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Upload, AlertTriangle, Loader2, Search, DollarSign } from "lucide-react"
import { uploadImageFile } from "../actions"
import { toast } from "@/components/ui/use-toast"

export default function ScanPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [url, setUrl] = useState("")
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [price, setPrice] = useState("")
  const [sellerInfo, setSellerInfo] = useState("")

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const [isUploading, setIsUploading] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const [isFetchingUrl, setIsFetchingUrl] = useState(false)
  const [isTestingPrice, setIsTestingPrice] = useState(false)

  const handleFetchUrl = async () => {
    if (!url) {
      toast({
        title: "Missing URL",
        description: "Please enter a URL to fetch",
        variant: "destructive",
      })
      return
    }

    setIsFetchingUrl(true)

    try {
      const response = await fetch("/api/url-scraper", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }))
        throw new Error(errorData.error || `Failed to fetch URL: ${response.statusText}`)
      }

      const data = await response.json()

      // Update form fields with scraped data
      if (data.title) setTitle(data.title)
      if (data.description) setDescription(data.description)
      if (data.price) setPrice(data.price)

      toast({
        title: "URL fetched successfully",
        description: "The listing details have been extracted from the URL",
      })
    } catch (error) {
      console.error("Error fetching URL:", error)
      toast({
        title: "Error fetching URL",
        description: error instanceof Error ? error.message : "Failed to fetch URL details",
        variant: "destructive",
      })
    } finally {
      setIsFetchingUrl(false)
    }
  }

  const handleTestPriceComparison = async () => {
    if (!title) {
      toast({
        title: "Missing title",
        description: "Please enter a title to test price comparison",
        variant: "destructive",
      })
      return
    }

    setIsTestingPrice(true)

    try {
      const response = await fetch("/api/price-comparison", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title, price }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }))
        throw new Error(errorData.error || `Failed to test price comparison: ${response.statusText}`)
      }

      const result = await response.json()

      toast({
        title: "Price comparison test",
        description: `Found ${result.alternatives.length} alternatives with average price $${Math.round(result.averagePrice)}`,
      })

      // Show the alternatives in the console for debugging
      console.log("Price comparison alternatives:", result.alternatives)
    } catch (error) {
      console.error("Error testing price comparison:", error)
      toast({
        title: "Error testing price comparison",
        description: error instanceof Error ? error.message : "Failed to test price comparison",
        variant: "destructive",
      })
    } finally {
      setIsTestingPrice(false)
    }
  }

  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!url && !title) {
      toast({
        title: "Missing information",
        description: "Please provide at least a URL or title",
        variant: "destructive",
      })
      return
    }

    setIsScanning(true)

    try {
      // Send all data to the server-side API endpoint
      const response = await fetch("/api/scan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url,
          title,
          description,
          price,
          sellerInfo,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }))
        throw new Error(errorData.error || `Failed to scan listing: ${response.statusText}`)
      }

      const result = await response.json()

      // Store the scan ID in session storage to retrieve on results page
      sessionStorage.setItem("currentScanId", result.id)
      router.push("/scan/results")
    } catch (error) {
      console.error("Error scanning listing:", error)
      toast({
        title: "Scan failed",
        description:
          error instanceof Error ? error.message : "There was an error analyzing the listing. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsScanning(false)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return

    const file = e.target.files[0]
    setSelectedFile(file)

    // Create preview
    const objectUrl = URL.createObjectURL(file)
    setPreviewUrl(objectUrl)
  }

  const handleImageSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedFile) {
      toast({
        title: "No image selected",
        description: "Please select an image to scan",
        variant: "destructive",
      })
      return
    }

    setIsUploading(true)

    try {
      const formData = new FormData()
      formData.append("image", selectedFile)

      const { imageUrl, error } = await uploadImageFile(formData)

      if (error || !imageUrl) {
        throw new Error(error || "Failed to upload image")
      }

      setIsUploading(false)
      setIsScanning(true)

      const response = await fetch("/api/scan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageUrl,
          title: title || selectedFile.name,
          description,
          price,
          sellerInfo,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }))
        throw new Error(errorData.error || "Failed to scan image")
      }

      const result = await response.json()

      // Store the scan ID in session storage to retrieve on results page
      sessionStorage.setItem("currentScanId", result.id)
      router.push("/scan/results")
    } catch (error) {
      console.error("Error scanning image:", error)
      toast({
        title: "Scan failed",
        description:
          error instanceof Error ? error.message : "There was an error analyzing the image. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
      setIsScanning(false)
    }
  }

  return (
    <div className="container max-w-4xl py-12">
      <div className="flex flex-col items-center space-y-6 text-center">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">Scan a Listing</h1>
          <p className="text-muted-foreground md:text-xl">
            Paste a URL or upload a screenshot to check for potential scams
          </p>
        </div>

        <Tabs defaultValue="url" className="w-full max-w-2xl">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="url">URL</TabsTrigger>
            <TabsTrigger value="image">Image Upload</TabsTrigger>
          </TabsList>

          <TabsContent value="url">
            <Card>
              <CardHeader>
                <CardTitle>Analyze by URL</CardTitle>
                <CardDescription>
                  Paste the URL of any marketplace listing to analyze it for potential scams.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleUrlSubmit}>
                  <div className="grid w-full items-center gap-4">
                    <div className="flex flex-col space-y-1.5">
                      <Label htmlFor="url">Listing URL</Label>
                      <div className="flex gap-2">
                        <Input
                          id="url"
                          placeholder="https://marketplace.example.com/item/123"
                          value={url}
                          onChange={(e) => setUrl(e.target.value)}
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleFetchUrl}
                          disabled={isFetchingUrl || !url}
                        >
                          {isFetchingUrl ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Search className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Click the search icon to extract details from the URL
                      </p>
                    </div>

                    <div className="flex flex-col space-y-1.5">
                      <Label htmlFor="title">Listing Title</Label>
                      <Input
                        id="title"
                        placeholder="iPhone 13 Pro - Like New"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                      />
                    </div>

                    <div className="flex flex-col space-y-1.5">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        placeholder="Enter the listing description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={3}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col space-y-1.5">
                        <Label htmlFor="price">Price</Label>
                        <div className="flex gap-2">
                          <Input
                            id="price"
                            placeholder="$999"
                            value={price}
                            onChange={(e) => setPrice(e.target.value)}
                            className="flex-1"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleTestPriceComparison}
                            disabled={isTestingPrice || !title}
                            title="Test price comparison"
                          >
                            {isTestingPrice ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <DollarSign className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>

                      <div className="flex flex-col space-y-1.5">
                        <Label htmlFor="sellerInfo">Seller Information</Label>
                        <Input
                          id="sellerInfo"
                          placeholder="Joined 2 months ago, 3 reviews"
                          value={sellerInfo}
                          onChange={(e) => setSellerInfo(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </form>
              </CardContent>
              <CardFooter className="flex justify-between">
                <div className="flex items-center text-sm text-muted-foreground">
                  <AlertTriangle className="mr-1 h-4 w-4" />
                  We don't store the actual listings
                </div>
                <Button onClick={handleUrlSubmit} disabled={isScanning}>
                  {isScanning ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Scanning...
                    </>
                  ) : (
                    "Scan Now"
                  )}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="image">
            <Card>
              <CardHeader>
                <CardTitle>Analyze by Image</CardTitle>
                <CardDescription>Upload a screenshot of the listing to analyze it for potential scams.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleImageSubmit}>
                  <div className="grid w-full items-center gap-4">
                    <div className="flex flex-col space-y-1.5">
                      <Label htmlFor="image">Upload Screenshot</Label>
                      <div
                        className="flex flex-col items-center justify-center border-2 border-dashed rounded-md p-10 cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        {previewUrl ? (
                          <div className="relative w-full">
                            <img
                              src={previewUrl || "/placeholder.svg"}
                              alt="Preview"
                              className="max-h-48 mx-auto object-contain rounded-md"
                            />
                            <p className="text-xs text-muted-foreground mt-2">Click to change image</p>
                          </div>
                        ) : (
                          <>
                            <Upload className="h-10 w-10 text-muted-foreground mb-2" />
                            <p className="text-sm text-muted-foreground mb-1">Drag and drop or click to upload</p>
                            <p className="text-xs text-muted-foreground">PNG, JPG or WEBP (max. 5MB)</p>
                          </>
                        )}
                        <Input
                          ref={fileInputRef}
                          id="image"
                          type="file"
                          className="hidden"
                          accept="image/png, image/jpeg, image/webp"
                          onChange={handleImageUpload}
                        />
                      </div>
                    </div>

                    <div className="flex flex-col space-y-1.5">
                      <Label htmlFor="imageTitle">Listing Title</Label>
                      <Input
                        id="imageTitle"
                        placeholder="iPhone 13 Pro - Like New"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col space-y-1.5">
                        <Label htmlFor="imagePrice">Price</Label>
                        <div className="flex gap-2">
                          <Input
                            id="imagePrice"
                            placeholder="$999"
                            value={price}
                            onChange={(e) => setPrice(e.target.value)}
                            className="flex-1"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleTestPriceComparison}
                            disabled={isTestingPrice || !title}
                            title="Test price comparison"
                          >
                            {isTestingPrice ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <DollarSign className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>

                      <div className="flex flex-col space-y-1.5">
                        <Label htmlFor="imageSellerInfo">Seller Information</Label>
                        <Input
                          id="imageSellerInfo"
                          placeholder="Joined 2 months ago, 3 reviews"
                          value={sellerInfo}
                          onChange={(e) => setSellerInfo(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </form>
              </CardContent>
              <CardFooter className="flex justify-between">
                <div className="flex items-center text-sm text-muted-foreground">
                  <AlertTriangle className="mr-1 h-4 w-4" />
                  We don't store your images
                </div>
                <Button onClick={handleImageSubmit} disabled={isUploading || isScanning || !selectedFile}>
                  {isUploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : isScanning ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Scanning...
                    </>
                  ) : (
                    "Upload & Scan"
                  )}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
