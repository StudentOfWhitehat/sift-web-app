"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { AlertTriangle, CheckCircle, XCircle, AlertCircle, ArrowLeft, ExternalLink } from "lucide-react"
import { ScamGauge } from "@/components/scam-gauge"
import { getScanDetails } from "@/app/actions"
import { toast } from "@/components/ui/use-toast"

interface RedFlag {
  id: string
  severity: string
  description: string
}

interface Alternative {
  id: string
  title: string
  price: string
  url: string
  trusted: boolean
}

interface ScanResult {
  id: string
  title: string
  url: string | null
  image_url: string | null
  scam_score: number
  analysis: string
  created_at: string
  redFlags: RedFlag[]
  alternatives: Alternative[]
}

export default function ResultsPage() {
  const [results, setResults] = useState<ScanResult | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchScanResults() {
      try {
        // Get the scan ID from session storage
        const scanId = sessionStorage.getItem("currentScanId")

        if (!scanId) {
          // If no scan ID is found, use the most recent scan
          const response = await fetch("/api/scan-history")

          if (!response.ok) {
            throw new Error(`Failed to fetch scan history: ${response.statusText}`)
          }

          const scans = await response.json()

          if (scans && scans.length > 0) {
            const mostRecentScan = scans[0]
            setResults({
              ...mostRecentScan,
              redFlags: mostRecentScan.redFlags || [],
              alternatives: mostRecentScan.alternatives || [],
            })
          } else {
            throw new Error("No scan results found")
          }
        } else {
          // Fetch the specific scan
          const { scan, redFlags, alternatives, error } = await getScanDetails(scanId)

          if (error || !scan) {
            throw new Error(error || "Failed to fetch scan details")
          }

          setResults({
            ...scan,
            redFlags: redFlags || [],
            alternatives: alternatives || [],
          })
        }
      } catch (error) {
        console.error("Error fetching scan results:", error)
        toast({
          title: "Error",
          description: "Failed to load scan results. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchScanResults()
  }, [])

  if (isLoading) {
    return (
      <div className="container max-w-4xl py-12 flex flex-col items-center justify-center min-h-[50vh]">
        <div className="space-y-4 text-center">
          <h2 className="text-2xl font-bold">Analyzing your listing...</h2>
          <Progress value={45} className="w-[300px]" />
          <p className="text-muted-foreground">
            We're checking for price discrepancies, image reuse, and text patterns...
          </p>
        </div>
      </div>
    )
  }

  if (!results) {
    return (
      <div className="container max-w-4xl py-12">
        <div className="space-y-4 text-center">
          <h2 className="text-2xl font-bold">Something went wrong</h2>
          <p className="text-muted-foreground">We couldn't analyze this listing. Please try again.</p>
          <Button asChild>
            <Link href="/scan">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Scan
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container max-w-4xl py-12">
      <div className="mb-8">
        <Button variant="outline" asChild>
          <Link href="/scan">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Scan
          </Link>
        </Button>
      </div>

      <div className="space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tighter">Scan Results</h1>
          <p className="text-muted-foreground">
            Analysis for: <span className="font-medium">{results.title}</span>
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Scam Score</CardTitle>
              <CardDescription>Based on our comprehensive analysis</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center pb-2">
              <ScamGauge value={results.scam_score} />
            </CardContent>
            <CardFooter className="flex justify-center">
              <Badge
                variant={results.scam_score > 70 ? "destructive" : results.scam_score > 30 ? "warning" : "success"}
                className="text-sm py-1 px-3"
              >
                {results.scam_score > 70 ? (
                  <>
                    <XCircle className="mr-1 h-4 w-4" /> High Risk
                  </>
                ) : results.scam_score > 30 ? (
                  <>
                    <AlertCircle className="mr-1 h-4 w-4" /> Moderate Risk
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-1 h-4 w-4" /> Low Risk
                  </>
                )}
              </Badge>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Listing Details</CardTitle>
              <CardDescription>Information about the analyzed listing</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium">Title</p>
                <p className="text-sm text-muted-foreground">{results.title}</p>
              </div>
              {results.url && (
                <div>
                  <p className="text-sm font-medium">URL</p>
                  <p className="text-sm text-muted-foreground flex items-center">
                    {results.url}
                    <ExternalLink className="ml-1 h-3 w-3" />
                  </p>
                </div>
              )}
              {results.image_url && (
                <div>
                  <p className="text-sm font-medium">Image</p>
                  <div className="mt-1 rounded-md overflow-hidden border">
                    <img
                      src={results.image_url || "/placeholder.svg"}
                      alt={results.title}
                      className="w-full h-auto max-h-32 object-contain"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Red Flags Detected</CardTitle>
            <CardDescription>Issues we found with this listing</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {results.redFlags.length === 0 ? (
                <p className="text-sm text-muted-foreground">No significant red flags detected.</p>
              ) : (
                results.redFlags.map((flag) => (
                  <div key={flag.id} className="flex items-start">
                    <div className="mr-2 mt-0.5">
                      {flag.severity === "high" ? (
                        <AlertTriangle className="h-5 w-5 text-destructive" />
                      ) : flag.severity === "medium" ? (
                        <AlertCircle className="h-5 w-5 text-amber-500" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-blue-500" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">
                        {flag.severity.charAt(0).toUpperCase() + flag.severity.slice(1)} Severity
                      </p>
                      <p className="text-sm text-muted-foreground">{flag.description}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>AI Analysis</CardTitle>
            <CardDescription>Detailed assessment of the listing</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{results.analysis}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Verified Alternatives</CardTitle>
            <CardDescription>Similar items from trusted sources</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {results.alternatives.length === 0 ? (
                <p className="text-sm text-muted-foreground">No alternatives found for this item.</p>
              ) : (
                results.alternatives.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
                  >
                    <div>
                      <p className="font-medium">{item.title}</p>
                      <p className="text-sm text-muted-foreground">{item.price}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {item.trusted && (
                        <Badge
                          variant="outline"
                          className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800"
                        >
                          <CheckCircle className="mr-1 h-3 w-3" /> Verified
                        </Badge>
                      )}
                      <Button size="sm" variant="outline" asChild>
                        <Link href={item.url} target="_blank" rel="noopener noreferrer">
                          View <ExternalLink className="ml-1 h-3 w-3" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-center">
          <Button asChild>
            <Link href="/dashboard">View Your Scan History</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
