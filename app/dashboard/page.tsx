"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { BarChart, Calendar, CheckCircle, AlertCircle, XCircle, ArrowUpRight, Loader2, Trash2 } from "lucide-react"
import { ScanHistoryChart } from "@/components/scan-history-chart"
import { getScanHistory, deleteScan } from "@/app/actions"
import { toast } from "@/components/ui/use-toast"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

// Types for scan history
interface ScanHistoryItem {
  id: string
  created_at: string
  title: string
  url: string | null
  scam_score: number
}

export default function DashboardPage() {
  const [scanHistory, setScanHistory] = useState<ScanHistoryItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)

  useEffect(() => {
    async function fetchScanHistory() {
      try {
        const { scans, error } = await getScanHistory()

        if (error || !scans) {
          throw new Error(error || "Failed to fetch scan history")
        }

        setScanHistory(scans)
      } catch (error) {
        console.error("Error fetching scan history:", error)
        toast({
          title: "Error",
          description: "Failed to load scan history. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchScanHistory()
  }, [])

  const handleDeleteScan = async (scanId: string) => {
    setIsDeleting(scanId)

    try {
      const { success, error } = await deleteScan(scanId)

      if (error || !success) {
        throw new Error(error || "Failed to delete scan")
      }

      // Update local state
      setScanHistory(scanHistory.filter((scan) => scan.id !== scanId))

      toast({
        title: "Scan deleted",
        description: "The scan has been successfully deleted.",
      })
    } catch (error) {
      console.error("Error deleting scan:", error)
      toast({
        title: "Error",
        description: "Failed to delete scan. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(null)
    }
  }

  // Calculate stats
  const totalScans = scanHistory.length
  const highRiskScans = scanHistory.filter((scan) => scan.scam_score > 70).length
  const averageScore =
    totalScans > 0 ? Math.round(scanHistory.reduce((acc, scan) => acc + scan.scam_score, 0) / totalScans) : 0

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date)
  }

  if (isLoading) {
    return (
      <div className="container max-w-6xl py-12 flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p>Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container max-w-6xl py-12">
      <div className="space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tighter">Your Dashboard</h1>
          <p className="text-muted-foreground">Track your scan history and monitor potential scams</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Scans</CardTitle>
              <BarChart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalScans}</div>
              <p className="text-xs text-muted-foreground">Listings analyzed for potential scams</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">High Risk Listings</CardTitle>
              <AlertCircle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{highRiskScans}</div>
              <p className="text-xs text-muted-foreground">
                {Math.round((highRiskScans / totalScans) * 100) || 0}% of your scanned listings
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Risk Score</CardTitle>
              <div className="h-4 w-4 rounded-full bg-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{averageScore}</div>
              <p className="text-xs text-muted-foreground">Across all your scanned listings</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="history">
          <TabsList>
            <TabsTrigger value="history">Scan History</TabsTrigger>
            <TabsTrigger value="trends">Risk Trends</TabsTrigger>
          </TabsList>
          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Recent Scans</CardTitle>
                <CardDescription>Your most recent listing analyses</CardDescription>
              </CardHeader>
              <CardContent>
                {scanHistory.length === 0 ? (
                  <div className="text-center py-6">
                    <p className="text-muted-foreground">You haven't scanned any listings yet.</p>
                    <Button className="mt-4" asChild>
                      <Link href="/scan">Scan Your First Listing</Link>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {scanHistory.map((scan) => (
                      <div
                        key={scan.id}
                        className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
                      >
                        <div className="flex items-start space-x-4">
                          <div className="pt-1">
                            {scan.scam_score > 70 ? (
                              <XCircle className="h-5 w-5 text-destructive" />
                            ) : scan.scam_score > 30 ? (
                              <AlertCircle className="h-5 w-5 text-amber-500" />
                            ) : (
                              <CheckCircle className="h-5 w-5 text-green-500" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium line-clamp-1">{scan.title}</p>
                            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              <span>{formatDate(scan.created_at)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge
                            variant={
                              scan.scam_score > 70 ? "destructive" : scan.scam_score > 30 ? "warning" : "success"
                            }
                          >
                            {scan.scam_score}
                          </Badge>

                          <Button size="sm" variant="ghost" asChild>
                            <Link href="/scan/results" onClick={() => sessionStorage.setItem("currentScanId", scan.id)}>
                              <ArrowUpRight className="h-4 w-4" />
                            </Link>
                          </Button>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete scan</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this scan? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteScan(scan.id)}
                                  disabled={isDeleting === scan.id}
                                >
                                  {isDeleting === scan.id ? (
                                    <>
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                      Deleting...
                                    </>
                                  ) : (
                                    "Delete"
                                  )}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="trends">
            <Card>
              <CardHeader>
                <CardTitle>Risk Score Trends</CardTitle>
                <CardDescription>Your scan results over time</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ScanHistoryChart data={scanHistory} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Card>
          <CardHeader>
            <CardTitle>Safety Tips</CardTitle>
            <CardDescription>Best practices for avoiding scams online</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start space-x-2">
                <div className="rounded-full bg-green-100 p-1 dark:bg-green-900">
                  <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="font-medium">Research the market value</p>
                  <p className="text-sm text-muted-foreground">
                    If a price seems too good to be true, it probably is. Always check the typical price range.
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <div className="rounded-full bg-green-100 p-1 dark:bg-green-900">
                  <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="font-medium">Meet in safe, public locations</p>
                  <p className="text-sm text-muted-foreground">
                    For in-person transactions, always meet in well-lit, public areas like police stations or coffee
                    shops.
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <div className="rounded-full bg-green-100 p-1 dark:bg-green-900">
                  <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="font-medium">Use secure payment methods</p>
                  <p className="text-sm text-muted-foreground">
                    Avoid wire transfers or gift cards. Use platforms with buyer protection when possible.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
