"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Search, Filter, Calendar, Tag, LockKeyhole, ShieldCheck } from "lucide-react"
import { useState } from "react"
import { cases as libraryCases } from "@/lib/mock-data"
import { useI18n } from "@/lib/i18n/i18n-provider"

export function CaseLibraryContent() {
  const [filter, setFilter] = useState("all")
  const [query, setQuery] = useState("")
  const { tx } = useI18n()

  const statusFilteredCases =
    filter === "all"
      ? libraryCases
      : filter === "completed"
        ? libraryCases.filter((item) => item.status === "Completed")
        : filter === "osce"
          ? libraryCases.filter((item) => item.difficulty === "OSCE-level")
          : filter === "imaging"
            ? libraryCases.filter((item) => item.modalities.includes("Imaging"))
            : filter === "safety"
              ? libraryCases.filter((item) => item.targetCompetencies.some((tag) => tag.toLowerCase().includes("safety")))
              : filter === "communication"
                ? libraryCases.filter((item) =>
                    item.targetCompetencies.some((tag) => tag.toLowerCase().includes("communication")),
                  )
                : libraryCases.filter((item) => item.assignedToday)

  const filteredCases = statusFilteredCases.filter((item) => {
    const searchText = [
      item.title,
      item.summary,
      item.specialty,
      item.difficulty,
      item.personaLabel,
      item.targetCompetencies.join(" "),
      item.modalities.join(" "),
      item.status,
    ]
      .join(" ")
      .toLowerCase()

    return searchText.includes(query.toLowerCase())
  })

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col lg:flex-row gap-4 min-w-0">
        <div className="min-w-0 flex-1 relative">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={tx("Search cases, specialty, persona, competency, or status")}
            className="pl-10"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex lg:shrink-0">
          <Button variant="outline" className="gap-2 bg-transparent min-w-0">
            <Filter className="w-4 h-4" />
            {tx("Specialty")}
          </Button>
          <Button variant="outline" className="gap-2 bg-transparent min-w-0">
            <Calendar className="w-4 h-4" />
            {tx("Duration")}
          </Button>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto scrollbar-premium pb-1 sm:flex-wrap">
        <Button variant={filter === "all" ? "default" : "outline"} onClick={() => setFilter("all")} size="sm" className="shrink-0">
          {tx("All")} ({libraryCases.length})
        </Button>
        <Button variant={filter === "active" ? "default" : "outline"} onClick={() => setFilter("active")} size="sm" className="shrink-0">
          {tx("Assigned")} ({libraryCases.filter((item) => item.assignedToday).length})
        </Button>
        <Button variant={filter === "osce" ? "default" : "outline"} onClick={() => setFilter("osce")} size="sm" className="shrink-0">
          {tx("OSCE-ready")}
        </Button>
        <Button variant={filter === "imaging" ? "default" : "outline"} onClick={() => setFilter("imaging")} size="sm" className="shrink-0">
          {tx("Imaging required")}
        </Button>
        <Button variant={filter === "safety" ? "default" : "outline"} onClick={() => setFilter("safety")} size="sm" className="shrink-0">
          {tx("High safety risk")}
        </Button>
        <Button
          variant={filter === "communication" ? "default" : "outline"}
          onClick={() => setFilter("communication")}
          size="sm"
          className="shrink-0"
        >
          {tx("Communication-heavy")}
        </Button>
        <Button
          variant={filter === "completed" ? "default" : "outline"}
          onClick={() => setFilter("completed")}
          size="sm"
          className="shrink-0"
        >
          {tx("Completed")} ({libraryCases.filter((item) => item.status === "Completed").length})
        </Button>
      </div>

      <div className="grid gap-4">
        {filteredCases.map((caseItem, index) => (
          <Card
            key={caseItem.id}
            className="p-4 hover:shadow-lg transition-all duration-300 cursor-pointer animate-slide-in"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="flex items-start gap-3 sm:gap-4 min-w-0">
              <Checkbox checked={caseItem.status === "Completed"} className="mt-1 shrink-0" />
              <div className="min-w-0 flex-1 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <h3
                      className={`font-semibold text-foreground break-words ${
                        caseItem.status === "Completed" ? "line-through opacity-60" : ""
                      }`}
                    >
                      {tx(caseItem.title)}
                    </h3>
                    <p className="text-sm text-muted-foreground break-words">{tx(caseItem.summary)}</p>
                  </div>
                  <Badge
                    variant={
                      caseItem.difficulty === "Advanced" || caseItem.difficulty === "OSCE-level"
                        ? "destructive"
                        : caseItem.difficulty === "Intermediate"
                          ? "default"
                          : "secondary"
                    }
                    className="shrink-0 self-start"
                  >
                    {tx(caseItem.difficulty)}
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted-foreground">
                  <span className="flex min-w-0 items-center gap-1">
                    <Tag className="w-4 h-4" />
                    <span className="break-words">{tx(caseItem.specialty)}</span>
                  </span>
                  <span className="flex items-center gap-1 shrink-0">
                    <Calendar className="w-4 h-4" />
                    {caseItem.durationMinutes} {tx("min")}
                  </span>
                  <span className="flex min-w-0 items-center gap-1">
                    <ShieldCheck className="w-4 h-4" />
                    <span>{caseItem.facultyApproved ? tx("Faculty-approved") : tx("Faculty review")}</span>
                  </span>
                  <span className="flex min-w-0 items-center gap-1">
                    <LockKeyhole className="w-4 h-4" />
                    <span>{tx("Hidden diagnosis locked")}</span>
                  </span>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {[
                    caseItem.personaLabel,
                    caseItem.targetCompetencies[0],
                    caseItem.modalities.includes("Imaging") ? "Chat + Imaging" : caseItem.modalities[0],
                    caseItem.status,
                  ].map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs whitespace-normal text-left">
                      {tx(tag)}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
