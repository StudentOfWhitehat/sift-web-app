"use client"

import { useEffect, useState } from "react"

interface ScamGaugeProps {
  value: number
}

export function ScamGauge({ value }: ScamGaugeProps) {
  const [animatedValue, setAnimatedValue] = useState(0)

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedValue(value)
    }, 500)

    return () => clearTimeout(timer)
  }, [value])

  // Calculate the angle for the needle
  const angle = (animatedValue / 100) * 180 - 90

  // Determine color based on value
  const getColor = (val: number) => {
    if (val <= 30) return "#22c55e" // Green for safe
    if (val <= 70) return "#f59e0b" // Amber for caution
    return "#ef4444" // Red for danger
  }

  const color = getColor(animatedValue)

  return (
    <div className="relative w-48 h-24 flex flex-col items-center">
      {/* Gauge background */}
      <div className="w-full h-full overflow-hidden relative">
        <div className="absolute bottom-0 left-0 w-full h-full bg-muted rounded-t-full"></div>

        {/* Colored segments */}
        <div className="absolute bottom-0 left-0 w-full h-full">
          <div className="absolute bottom-0 left-0 w-full h-full overflow-hidden">
            <div className="absolute bottom-0 left-0 w-full h-full bg-green-500 opacity-20 rounded-t-full clip-path-[0_0_33%_100%]"></div>
          </div>
          <div className="absolute bottom-0 left-0 w-full h-full overflow-hidden">
            <div className="absolute bottom-0 left-0 w-full h-full bg-amber-500 opacity-20 rounded-t-full clip-path-[33%_0_67%_100%]"></div>
          </div>
          <div className="absolute bottom-0 left-0 w-full h-full overflow-hidden">
            <div className="absolute bottom-0 left-0 w-full h-full bg-red-500 opacity-20 rounded-t-full clip-path-[67%_0_100%_100%]"></div>
          </div>
        </div>

        {/* Gauge markings */}
        <div className="absolute bottom-0 left-0 w-full h-full">
          <div className="absolute bottom-0 left-[10%] h-2 w-0.5 bg-foreground/30"></div>
          <div className="absolute bottom-0 left-[33%] h-3 w-0.5 bg-foreground/50"></div>
          <div className="absolute bottom-0 left-[50%] h-2 w-0.5 bg-foreground/30"></div>
          <div className="absolute bottom-0 left-[67%] h-3 w-0.5 bg-foreground/50"></div>
          <div className="absolute bottom-0 left-[90%] h-2 w-0.5 bg-foreground/30"></div>
        </div>

        {/* Gauge labels */}
        <div className="absolute bottom-4 left-[33%] transform -translate-x-1/2 text-xs font-medium">Low</div>
        <div className="absolute bottom-4 left-[67%] transform -translate-x-1/2 text-xs font-medium">High</div>

        {/* Gauge needle */}
        <div
          className="absolute bottom-0 left-1/2 w-1 h-20 origin-bottom transform -translate-x-1/2 transition-transform duration-1000 ease-out"
          style={{ transform: `translateX(-50%) rotate(${angle}deg)` }}
        >
          <div className="w-1 h-16 bg-gradient-to-t from-foreground to-transparent rounded-t-full"></div>
          <div className="w-5 h-5 rounded-full bg-foreground absolute bottom-0 left-1/2 transform -translate-x-1/2"></div>
        </div>
      </div>

      {/* Value display */}
      <div className="mt-2 text-2xl font-bold" style={{ color }}>
        {Math.round(animatedValue)}
      </div>
    </div>
  )
}
