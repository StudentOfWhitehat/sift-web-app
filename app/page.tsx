import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Shield, Search, BarChart3 } from "lucide-react"

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="w-full py-12 md:py-24 lg:py-32 bg-gradient-to-b from-background to-muted">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center space-y-4 text-center">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl">
                Sift: AI-Powered Scam Detection
              </h1>
              <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl">
                Protect yourself from online marketplace scams with our advanced AI detection system.
              </p>
            </div>
            <div className="space-x-4">
              <Link href="/scan">
                <Button size="lg" className="bg-primary hover:bg-primary/90">
                  Start Scanning
                </Button>
              </Link>
              <Link href="#how-it-works">
                <Button size="lg" variant="outline">
                  Learn More
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="w-full py-12 md:py-24 lg:py-32 bg-background" id="how-it-works">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            <div className="space-y-2">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">How Sift Works</h2>
              <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl">
                Our advanced AI analyzes listings to identify potential scams and protect your purchases.
              </p>
            </div>
          </div>
          <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-3 lg:gap-12 mt-12">
            <div className="flex flex-col items-center space-y-2 rounded-lg border p-6 shadow-sm">
              <div className="rounded-full bg-primary/10 p-4">
                <Search className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold">URL Analysis</h3>
              <p className="text-center text-muted-foreground">
                Paste any marketplace listing URL and our AI will analyze it for suspicious patterns.
              </p>
            </div>
            <div className="flex flex-col items-center space-y-2 rounded-lg border p-6 shadow-sm">
              <div className="rounded-full bg-primary/10 p-4">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold">Image Verification</h3>
              <p className="text-center text-muted-foreground">
                Upload a screenshot and we'll check for stolen images and verify authenticity.
              </p>
            </div>
            <div className="flex flex-col items-center space-y-2 rounded-lg border p-6 shadow-sm">
              <div className="rounded-full bg-primary/10 p-4">
                <BarChart3 className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold">Price Comparison</h3>
              <p className="text-center text-muted-foreground">
                We compare prices with major retailers to identify suspiciously low offers.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="w-full py-12 md:py-24 lg:py-32 bg-muted">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            <div className="space-y-2">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">Trusted by Thousands</h2>
              <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl">
                See how Sift has helped people avoid scams and shop with confidence.
              </p>
            </div>
          </div>
          <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-2 lg:gap-12 mt-12">
            <div className="flex flex-col justify-between rounded-lg border bg-background p-6 shadow-sm">
              <div>
                <p className="text-muted-foreground">
                  "Sift saved me from losing $800 on a fake PlayStation listing. The AI detected that the images were
                  stolen from another site."
                </p>
              </div>
              <div className="mt-6 flex items-center">
                <div className="ml-4">
                  <p className="text-sm font-medium">Alex Thompson</p>
                  <p className="text-sm text-muted-foreground">Chicago, IL</p>
                </div>
              </div>
            </div>
            <div className="flex flex-col justify-between rounded-lg border bg-background p-6 shadow-sm">
              <div>
                <p className="text-muted-foreground">
                  "I use Sift for all my Facebook Marketplace purchases now. It's like having a personal security guard
                  for online shopping."
                </p>
              </div>
              <div className="mt-6 flex items-center">
                <div className="ml-4">
                  <p className="text-sm font-medium">Sarah Miller</p>
                  <p className="text-sm text-muted-foreground">Austin, TX</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="w-full py-12 md:py-24 lg:py-32 bg-primary text-primary-foreground">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            <div className="space-y-2">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                Start Protecting Yourself Today
              </h2>
              <p className="mx-auto max-w-[700px] md:text-xl">
                Don't fall victim to online scams. Use Sift before your next purchase.
              </p>
            </div>
            <div className="space-x-4">
              <Link href="/scan">
                <Button size="lg" variant="secondary" className="bg-white text-primary hover:bg-white/90">
                  Scan a Listing Now
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
