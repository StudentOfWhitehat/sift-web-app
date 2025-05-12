"use client"

import { useEffect, useRef } from "react"

interface ScanHistoryItem {
  id: string
  created_at: string
  title: string
  url: string | null
  scam_score: number
}

interface ScanHistoryChartProps {
  data: ScanHistoryItem[]
}

export function ScanHistoryChart({ data }: ScanHistoryChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!canvasRef.current || data.length === 0) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas dimensions
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)

    // Sort data by date
    const sortedData = [...data].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

    // Chart dimensions
    const width = rect.width
    const height = rect.height
    const padding = 40
    const chartWidth = width - padding * 2
    const chartHeight = height - padding * 2

    // Clear canvas
    ctx.clearRect(0, 0, width, height)

    // Draw axes
    ctx.beginPath()
    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue("--border")
    ctx.lineWidth = 1
    ctx.moveTo(padding, padding)
    ctx.lineTo(padding, height - padding)
    ctx.lineTo(width - padding, height - padding)
    ctx.stroke()

    // Draw y-axis labels
    ctx.textAlign = "right"
    ctx.textBaseline = "middle"
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--muted-foreground")
    ctx.font = "12px sans-serif"

    for (let i = 0; i <= 100; i += 25) {
      const y = height - padding - (i / 100) * chartHeight
      ctx.fillText(i.toString(), padding - 10, y)

      // Draw horizontal grid lines
      ctx.beginPath()
      ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue("--border")
      ctx.setLineDash([2, 2])
      ctx.moveTo(padding, y)
      ctx.lineTo(width - padding, y)
      ctx.stroke()
      ctx.setLineDash([])
    }

    // Draw data points
    if (sortedData.length > 0) {
      // Calculate x positions
      const xStep = chartWidth / (sortedData.length - 1 || 1)

      // Draw line
      ctx.beginPath()
      ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue("--primary")
      ctx.lineWidth = 2

      sortedData.forEach((item, index) => {
        const x = padding + index * xStep
        const y = height - padding - (item.scam_score / 100) * chartHeight

        if (index === 0) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }

        // Draw date labels for first, middle and last points
        if (index === 0 || index === sortedData.length - 1 || index === Math.floor(sortedData.length / 2)) {
          const date = new Date(item.created_at)
          const formattedDate = new Intl.DateTimeFormat("en-US", {
            month: "short",
            day: "numeric",
          }).format(date)

          ctx.textAlign = "center"
          ctx.fillText(formattedDate, x, height - padding + 15)
        }
      })

      ctx.stroke()

      // Draw points
      sortedData.forEach((item, index) => {
        const x = padding + index * xStep
        const y = height - padding - (item.scam_score / 100) * chartHeight

        // Determine point color based on score
        let pointColor
        if (item.scam_score > 70) {
          pointColor = "#ef4444" // Red for high risk
        } else if (item.scam_score > 30) {
          pointColor = "#f59e0b" // Amber for medium risk
        } else {
          pointColor = "#22c55e" // Green for low risk
        }

        ctx.beginPath()
        ctx.fillStyle = pointColor
        ctx.arc(x, y, 5, 0, Math.PI * 2)
        ctx.fill()

        ctx.beginPath()
        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--background")
        ctx.arc(x, y, 2, 0, Math.PI * 2)
        ctx.fill()
      })
    }
  }, [data])

  return (
    <div className="w-full h-full flex items-center justify-center">
      {data.length === 0 ? (
        <p className="text-muted-foreground">Not enough data to display trends</p>
      ) : (
        <canvas ref={canvasRef} className="w-full h-full" style={{ width: "100%", height: "100%" }} />
      )}
    </div>
  )
}
