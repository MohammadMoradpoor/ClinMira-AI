"use client"

import { Card } from "@/components/ui/card"
import { useState } from "react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts"
import { useI18n } from "@/lib/i18n/i18n-provider"

const chartData = [
  { day: "Mon", value: 72, label: "Medication safety case" },
  { day: "Tue", value: 76, label: "Periodontal progression case" },
  { day: "Wed", value: 81, label: "Dental anxiety encounter" },
  { day: "Thu", value: 84, label: "Acute swelling encounter" },
  { day: "Fri", value: 88, label: "CBCT interpretation lab" },
  { day: "Sat", value: 83, label: "Oral ulcer differential" },
  { day: "Sun", value: 86, label: "Faculty replay review" },
]

const barColors = ["#00b6c6", "#009aaa", "#42d5df", "#007f8c", "#00b6c6", "#009aaa", "#42d5df"]

type PerformanceTooltipProps = {
  active?: boolean
  payload?: Array<{
    value: number
    payload: {
      label: string
    }
  }>
}

function PerformanceTooltip({ active, payload }: PerformanceTooltipProps) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-foreground text-background px-3 py-2 rounded-lg text-xs font-semibold shadow-lg">
        <p className="font-bold">{payload[0].value}%</p>
        <p className="text-[10px] opacity-80">{payload[0].payload.label}</p>
      </div>
    )
  }

  return null
}

export function RecentPerformance() {
  const [hoveredBar, setHoveredBar] = useState<number | null>(null)
  const { tx } = useI18n()
  const localizedChartData = chartData.map((item) => ({ ...item, day: tx(item.day), label: tx(item.label) }))
  const maxValue = Math.max(...chartData.map((d) => d.value))
  const average = Math.round(chartData.reduce((acc, d) => acc + d.value, 0) / chartData.length)

  return (
    <Card
      className="p-6 transition-all duration-500 hover:shadow-xl animate-slide-in-up bg-gradient-to-br from-background to-muted/20"
      style={{ animationDelay: "400ms" }}
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-foreground">{tx("Recent Performance")}</h2>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="w-2 h-2 rounded-full bg-primary"></div>
          <span>{tx("Skill Progression")}</span>
        </div>
      </div>

      <div className="h-64 mb-4 relative">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={localizedChartData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#42d5df" />
                <stop offset="100%" stopColor="#009aaa" />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-muted/20" />
            <XAxis
              dataKey="day"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "currentColor", fontSize: 14 }}
              className="text-muted-foreground"
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "currentColor", fontSize: 12 }}
              className="text-muted-foreground"
              ticks={[0, 25, 50, 75, 100]}
            />
            <Tooltip content={<PerformanceTooltip />} cursor={{ fill: "transparent" }} />
            <Bar
              dataKey="value"
              fill="url(#barGradient)"
              radius={[12, 12, 12, 12]}
              maxBarSize={60}
              onMouseEnter={(data, index) => setHoveredBar(index)}
              onMouseLeave={() => setHoveredBar(null)}
            >
              {localizedChartData.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={barColors[index]}
                  className="transition-all duration-300"
                  style={{
                    filter:
                      hoveredBar === index ? "brightness(1.15) drop-shadow(0 4px 8px rgba(0, 182, 198, 0.35))" : "none",
                    transformOrigin: "center bottom",
                  }}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="pt-4 border-t border-muted/50 flex items-center justify-between">
        <div className="text-sm">
          <span className="text-muted-foreground">{tx("Average score: ")}</span>
          <span className="font-semibold text-foreground">{average}%</span>
        </div>
        <div className="text-sm">
          <span className="text-muted-foreground">{tx("Peak case: ")}</span>
          <span className="font-semibold text-primary">{maxValue}%</span>
        </div>
      </div>
    </Card>
  )
}
