#!/usr/bin/env node

import fs from "node:fs/promises"
import { existsSync } from "node:fs"
import path from "node:path"
import process from "node:process"
import { chromium } from "playwright-core"

const baseUrl = process.env.I18N_QA_BASE_URL ?? "http://127.0.0.1:3001"
const outputRoot = path.join(process.cwd(), "design-audit-screenshots")
const timestamp = formatTimestamp(new Date())
const outputDir = path.join(outputRoot, `i18n-tr-${timestamp}`)
const reportPath = path.join(outputDir, "I18N_QA_REPORT.md")
const manifestPath = path.join(outputDir, "i18n-manifest.json")

const pages = [
  { name: "student-clinic", route: "/" },
  { name: "case-library", route: "/cases" },
  { name: "virtual-clinic", route: "/virtual-clinic" },
  { name: "debriefing", route: "/debriefing" },
  { name: "faculty-dashboard", route: "/faculty" },
  { name: "scenario-studio", route: "/scenario-studio" },
  { name: "agent-control", route: "/agent-control" },
  { name: "settings", route: "/settings" },
]

const languages = ["en", "tr"]
const viewports = [
  { name: "1440x1200", width: 1440, height: 1200 },
  { name: "1280x900", width: 1280, height: 900 },
  { name: "1024x1366", width: 1024, height: 1366 },
  { name: "820x1180", width: 820, height: 1180 },
  { name: "390x844", width: 390, height: 844 },
  { name: "360x800", width: 360, height: 800 },
]

await fs.mkdir(outputDir, { recursive: true })

const browser = await chromium.launch({
  headless: true,
  executablePath: resolveChromiumExecutable(),
})

const manifest = []

try {
  for (const language of languages) {
    for (const viewport of viewports) {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        colorScheme: "light",
        deviceScaleFactor: 1,
      })

      await context.addInitScript((selectedLanguage) => {
        window.localStorage.setItem("clinmira-locale", selectedLanguage)
        window.localStorage.setItem("clinmira-theme", "light")
        document.documentElement.classList.remove("dark")
        document.documentElement.style.colorScheme = "light"
      }, language)

      for (const pageInfo of pages) {
        manifest.push(await capturePage({ context, pageInfo, viewport, language }))
      }

      await context.close()
    }
  }
} finally {
  await browser.close()
}

await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2))
await fs.writeFile(reportPath, buildReport(manifest))

const successful = manifest.filter((entry) => entry.status === "success")
const failed = manifest.filter((entry) => entry.status === "failed")
const overflow = successful.filter((entry) => entry.overflowDetected)
const consoleErrors = successful.filter((entry) => entry.consoleErrors.length)
const missingLocaleText = successful.filter((entry) => entry.language === "tr" && entry.englishLeakCount > 0)

console.log("ClinMira AI i18n screenshot QA complete.")
console.log(`Output folder: ${outputDir}`)
console.log(`Screenshots: ${successful.length}`)
console.log(`Failed routes: ${failed.length}`)
console.log(`Overflow failures: ${overflow.length}`)
console.log(`Console error entries: ${consoleErrors.length}`)
console.log(`Turkish English-leak heuristic entries: ${missingLocaleText.length}`)

if (failed.length || overflow.length || consoleErrors.length || missingLocaleText.length) {
  process.exitCode = 1
}

async function capturePage({ context, pageInfo, viewport, language }) {
  const page = await context.newPage()
  const consoleErrors = []
  const requestErrors = []
  const screenshotFilename = `${language}__${pageInfo.name}__${viewport.name}.png`
  const screenshotPath = path.join(outputDir, screenshotFilename)

  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text())
    }
  })

  page.on("response", (response) => {
    if (response.status() >= 400) {
      requestErrors.push(`${response.status()} ${response.url()}`)
    }
  })

  try {
    const response = await page.goto(new URL(pageInfo.route, baseUrl).toString(), {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    })

    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {})
    await page.waitForTimeout(500)

    const metrics = await page.evaluate(() => {
      const bodyText = document.body.innerText
      const englishLeakTerms = [
        "Student Clinic",
        "Case Library",
        "Virtual Clinic",
        "Faculty Dashboard",
        "Scenario Studio",
        "Agent Control",
        "Settings",
        "Patient Encounter Conversation",
        "Safety Guardrail Warning",
      ]

      return {
        viewportWidth: window.innerWidth,
        documentWidth: document.documentElement.scrollWidth,
        bodyWidth: document.body.scrollWidth,
        bodyTextLength: bodyText.length,
        englishLeakCount: englishLeakTerms.filter((term) => bodyText.includes(term)).length,
      }
    })

    const overflowDetected =
      metrics.documentWidth > metrics.viewportWidth + 1 ||
      metrics.bodyWidth > metrics.viewportWidth + 1

    await page.screenshot({
      path: screenshotPath,
      fullPage: true,
      animations: "disabled",
    })

    return {
      route: pageInfo.route,
      pageName: pageInfo.name,
      language,
      viewport: viewport.name,
      width: viewport.width,
      height: viewport.height,
      screenshotPath,
      overflowDetected,
      consoleErrors: [...consoleErrors, ...requestErrors],
      englishLeakCount: language === "tr" ? metrics.englishLeakCount : 0,
      status: response && response.status() >= 400 ? "failed" : "success",
      error: response && response.status() >= 400 ? `HTTP ${response.status()}` : null,
      metrics,
    }
  } catch (error) {
    return {
      route: pageInfo.route,
      pageName: pageInfo.name,
      language,
      viewport: viewport.name,
      width: viewport.width,
      height: viewport.height,
      screenshotPath: null,
      overflowDetected: null,
      consoleErrors,
      englishLeakCount: null,
      status: "failed",
      error: error instanceof Error ? error.message : String(error),
      metrics: null,
    }
  } finally {
    await page.close()
  }
}

function buildReport(entries) {
  const successful = entries.filter((entry) => entry.status === "success")
  const failed = entries.filter((entry) => entry.status === "failed")
  const overflow = successful.filter((entry) => entry.overflowDetected)
  const consoleErrors = successful.filter((entry) => entry.consoleErrors.length)
  const trLeakRows = successful.filter((entry) => entry.language === "tr" && entry.englishLeakCount > 0)

  return `# ClinMira AI I18N QA Report

- Timestamp: \`${timestamp}\`
- Base URL: \`${baseUrl}\`
- Output Folder: \`${outputDir}\`
- Pages Tested: ${pages.map((page) => `\`${page.name}\``).join(", ")}
- Languages Tested: ${languages.map((language) => `\`${language}\``).join(", ")}
- Viewports Tested: ${viewports.map((viewport) => `\`${viewport.name}\``).join(", ")}
- Screenshots Generated: \`${successful.length}\`
- Failed Routes: \`${failed.length}\`
- Overflow Failures: \`${overflow.length}\`
- Console Error Entries: \`${consoleErrors.length}\`
- Turkish English-Leak Heuristic Entries: \`${trLeakRows.length}\`

## Results
${entries
  .map((entry) => {
    const result =
      entry.status === "success"
        ? `overflow=${entry.overflowDetected ? "fail" : "pass"}, consoleErrors=${entry.consoleErrors.length}, englishLeakCount=${entry.englishLeakCount}`
        : `failed=${entry.error}`
    return `- \`${entry.language}\` / \`${entry.pageName}\` / \`${entry.viewport}\`: ${result}`
  })
  .join("\n")}

## Missing Translation Keys
- Dictionary parity is checked by \`pnpm i18n:audit\`.

## Turkish Overflow Issues Found/Fix Status
${overflow.length ? "- Review overflow rows above." : "- None detected by automated scroll-width checks."}

## Console Errors
${consoleErrors.length ? consoleErrors.map((entry) => `- \`${entry.language}\` / \`${entry.pageName}\` / \`${entry.viewport}\`: ${entry.consoleErrors.join("; ")}`).join("\n") : "- None detected."}

## Screenshots
${successful.map((entry) => `- \`${path.basename(entry.screenshotPath)}\``).join("\n")}

## Remaining Limitations
- The English-leak check is heuristic. Manual screenshot review remains the final arbiter for natural translation and product polish.
`
}

function resolveChromiumExecutable() {
  const envPath = process.env.PLAYWRIGHT_EXECUTABLE_PATH
  if (envPath && existsSync(envPath)) {
    return envPath
  }

  const candidates = [
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
    "/snap/bin/chromium",
  ]

  const match = candidates.find((candidate) => existsSync(candidate))
  if (!match) {
    throw new Error("No Chromium executable found. Set PLAYWRIGHT_EXECUTABLE_PATH to a valid browser binary.")
  }

  return match
}

function formatTimestamp(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  const hours = String(date.getHours()).padStart(2, "0")
  const minutes = String(date.getMinutes()).padStart(2, "0")

  return `${year}-${month}-${day}-${hours}${minutes}`
}
