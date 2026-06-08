#!/usr/bin/env node

import fs from "node:fs/promises"
import { existsSync } from "node:fs"
import path from "node:path"
import process from "node:process"
import { chromium } from "playwright-core"

const baseUrl = process.env.RESPONSIVE_AUDIT_BASE_URL ?? "http://127.0.0.1:3001"
const outputRoot = path.join(process.cwd(), "design-audit-screenshots")
const timestamp = formatTimestamp(new Date())
const outputDir = path.join(outputRoot, `responsive-fix-${timestamp}`)
const reportPath = path.join(outputDir, "RESPONSIVE_AUDIT_REPORT.md")
const manifestPath = path.join(outputDir, "manifest.json")
const storageKey = "clinmira-theme"

const pages = [
  { name: "case-library", route: "/cases" },
  { name: "debriefing", route: "/debriefing" },
  { name: "faculty-dashboard", route: "/faculty" },
  { name: "scenario-studio", route: "/scenario-studio" },
  { name: "agent-control", route: "/agent-control" },
  { name: "settings", route: "/settings" },
  { name: "virtual-clinic", route: "/virtual-clinic" },
]

const viewports = [
  { name: "1440x1200", width: 1440, height: 1200 },
  { name: "1280x900", width: 1280, height: 900 },
  { name: "1024x1366", width: 1024, height: 1366 },
  { name: "820x1180", width: 820, height: 1180 },
  { name: "768x1024", width: 768, height: 1024 },
  { name: "430x932", width: 430, height: 932 },
  { name: "390x844", width: 390, height: 844 },
  { name: "360x800", width: 360, height: 800 },
]

const themes = ["light", "dark"]

await fs.mkdir(outputDir, { recursive: true })

const browser = await chromium.launch({
  headless: true,
  executablePath: resolveChromiumExecutable(),
})

const manifest = []

try {
  for (const theme of themes) {
    for (const viewport of viewports) {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        colorScheme: theme,
        deviceScaleFactor: 1,
      })

      await context.addInitScript(
        ({ storageKey, selectedTheme }) => {
          const applyTheme = () => {
            const root = document.documentElement
            if (!root) return
            root.setAttribute("data-theme", selectedTheme)
            root.style.colorScheme = selectedTheme
            root.classList.toggle("dark", selectedTheme === "dark")
          }

          try {
            window.localStorage.setItem(storageKey, selectedTheme)
          } catch {}

          applyTheme()
          document.addEventListener("DOMContentLoaded", applyTheme, { once: true })
        },
        { storageKey, selectedTheme: theme },
      )

      for (const pageInfo of pages) {
        manifest.push(await capturePage({ context, pageInfo, viewport, theme }))
      }

      await context.close()
    }
  }
} finally {
  await browser.close()
}

await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2))
await fs.writeFile(reportPath, buildReport(manifest))

const failed = manifest.filter((entry) => entry.status === "failed")
const overflow = manifest.filter((entry) => entry.overflowDetected)
const consoleFailures = manifest.filter((entry) => entry.consoleErrors.length)

console.log(`ClinMira responsive audit complete.`)
console.log(`Output folder: ${outputDir}`)
console.log(`Screenshots: ${manifest.filter((entry) => entry.status === "success").length}`)
console.log(`Failed routes: ${failed.length}`)
console.log(`Overflow failures: ${overflow.length}`)
console.log(`Console error entries: ${consoleFailures.length}`)

if (failed.length || overflow.length || consoleFailures.length) {
  process.exitCode = 1
}

async function capturePage({ context, pageInfo, viewport, theme }) {
  const page = await context.newPage()
  const consoleErrors = []
  const requestErrors = []
  const screenshotFilename = `${pageInfo.name}__${theme}__${viewport.name}.png`
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

    const metrics = await page.evaluate(() => ({
      viewportWidth: window.innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      bodyWidth: document.body.scrollWidth,
      bodyTextLength: document.body.innerText.length,
    }))

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
      viewport: viewport.name,
      width: viewport.width,
      height: viewport.height,
      theme,
      screenshotPath,
      overflowDetected,
      consoleErrors: [...consoleErrors, ...requestErrors],
      status: response && response.status() >= 400 ? "failed" : "success",
      error: response && response.status() >= 400 ? `HTTP ${response.status()}` : null,
      metrics,
    }
  } catch (error) {
    return {
      route: pageInfo.route,
      pageName: pageInfo.name,
      viewport: viewport.name,
      width: viewport.width,
      height: viewport.height,
      theme,
      screenshotPath: null,
      overflowDetected: null,
      consoleErrors,
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

  return `# ClinMira AI Responsive Fix Audit

- Timestamp: \`${timestamp}\`
- Base URL: \`${baseUrl}\`
- Output Folder: \`${outputDir}\`
- Routes Tested: ${pages.map((page) => `\`${page.route}\``).join(", ")}
- Viewports Tested: ${viewports.map((viewport) => `\`${viewport.name}\``).join(", ")}
- Themes: ${themes.map((theme) => `\`${theme}\``).join(", ")}
- Screenshots Generated: \`${successful.length}\`
- Failed Routes: \`${failed.length}\`
- Overflow Failures: \`${overflow.length}\`
- Console Error Entries: \`${consoleErrors.length}\`

## Fixes Applied
- Fixed mobile/tablet app-shell behavior so target pages do not render the fixed desktop sidebar below \`lg\`.
- Added local \`min-w-0\`, wrapping, and safe horizontal scrolling for filters, tabs, badges, rows, buttons, and long clinical copy.
- Kept the approved template card style, typography, color system, topbar, and sidebar visual identity intact.

## Results
${entries
  .map((entry) => {
    const result =
      entry.status === "success"
        ? `overflow=${entry.overflowDetected ? "fail" : "pass"}, consoleErrors=${entry.consoleErrors.length}`
        : `failed=${entry.error}`
    return `- \`${entry.pageName}\` / \`${entry.theme}\` / \`${entry.viewport}\`: ${result}`
  })
  .join("\n")}

## Screenshots
${successful.map((entry) => `- \`${path.basename(entry.screenshotPath)}\``).join("\n")}

## Responsive Issues Found
${overflow.length || consoleErrors.length || failed.length ? "- Review failed rows above." : "- None detected by automated overflow and console checks."}

## Remaining Limitations
- This audit verifies route load, screenshots, console errors, and horizontal overflow. Manual visual review is still required for product taste and polish.
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
