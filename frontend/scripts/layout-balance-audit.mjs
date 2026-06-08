#!/usr/bin/env node

import fs from "node:fs/promises"
import { existsSync } from "node:fs"
import path from "node:path"
import process from "node:process"
import { chromium } from "playwright-core"

const baseUrl = process.env.LAYOUT_BALANCE_AUDIT_BASE_URL ?? "http://127.0.0.1:3001"
const outputRoot = path.join(process.cwd(), "design-audit-screenshots")
const timestamp = formatTimestamp(new Date())
const outputDir = path.join(outputRoot, `layout-balance-${timestamp}`)
const reportPath = path.join(outputDir, "LAYOUT_BALANCE_AUDIT_REPORT.md")
const manifestPath = path.join(outputDir, "manifest.json")
const storageKey = "clinmira-theme"

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

const viewports = [
  { name: "1920x1080", width: 1920, height: 1080 },
  { name: "1440x1200", width: 1440, height: 1200 },
  { name: "1366x768", width: 1366, height: 768 },
  { name: "1280x900", width: 1280, height: 900 },
  { name: "1024x1366", width: 1024, height: 1366 },
  { name: "820x1180", width: 820, height: 1180 },
  { name: "768x1024", width: 768, height: 1024 },
  { name: "430x932", width: 430, height: 932 },
  { name: "390x844", width: 390, height: 844 },
  { name: "375x812", width: 375, height: 812 },
  { name: "360x800", width: 360, height: 800 },
]

await fs.mkdir(outputDir, { recursive: true })

const browser = await chromium.launch({
  headless: true,
  executablePath: resolveChromiumExecutable(),
})

const manifest = []

try {
  for (const viewport of viewports) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      colorScheme: "light",
      deviceScaleFactor: 1,
    })

    await context.addInitScript(
      ({ storageKey }) => {
        const applyTheme = () => {
          const root = document.documentElement
          if (!root) return
          root.setAttribute("data-theme", "light")
          root.style.colorScheme = "light"
          root.classList.remove("dark")
        }

        try {
          window.localStorage.setItem(storageKey, "light")
        } catch {}

        applyTheme()
        document.addEventListener("DOMContentLoaded", applyTheme, { once: true })
      },
      { storageKey },
    )

    for (const pageInfo of pages) {
      manifest.push(await capturePage({ context, pageInfo, viewport }))
    }

    await context.close()
  }
} finally {
  await browser.close()
}

await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2))
await fs.writeFile(reportPath, buildReport(manifest))

const successful = manifest.filter((entry) => entry.status === "success")
const failed = manifest.filter((entry) => entry.status === "failed")
const overflow = successful.filter((entry) => entry.overflowDetected)
const consoleFailures = successful.filter((entry) => entry.consoleErrors.length)
const emptySpace = successful.filter((entry) => entry.excessiveEmptyRightSpace)

console.log("ClinMira layout balance audit complete.")
console.log(`Output folder: ${outputDir}`)
console.log(`Screenshots: ${successful.length}`)
console.log(`Failed routes: ${failed.length}`)
console.log(`Overflow failures: ${overflow.length}`)
console.log(`Excessive empty-space flags: ${emptySpace.length}`)
console.log(`Console error entries: ${consoleFailures.length}`)

if (failed.length || overflow.length || consoleFailures.length || emptySpace.length) {
  process.exitCode = 1
}

async function capturePage({ context, pageInfo, viewport }) {
  const page = await context.newPage()
  const consoleErrors = []
  const requestErrors = []
  const screenshotFilename = `${pageInfo.name}__light__${viewport.name}.png`
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
      const viewportWidth = window.innerWidth
      const main = document.querySelector("main")
      const mainRect = main?.getBoundingClientRect()
      let contentRight = mainRect?.left ?? 0

      if (main) {
        for (const element of main.querySelectorAll("*")) {
          const rect = element.getBoundingClientRect()
          if (rect.width < 8 || rect.height < 8 || rect.bottom < 0 || rect.top > window.innerHeight * 1.4) continue
          contentRight = Math.max(contentRight, rect.right)
        }
      }

      const mainAvailableWidth = mainRect ? viewportWidth - mainRect.left : viewportWidth
      const unusedRightPx = Math.max(0, viewportWidth - contentRight)
      const unusedRightRatio = mainAvailableWidth > 0 ? unusedRightPx / mainAvailableWidth : 0

      return {
        viewportWidth,
        documentWidth: document.documentElement.scrollWidth,
        bodyWidth: document.body.scrollWidth,
        mainLeft: mainRect?.left ?? null,
        mainAvailableWidth,
        contentRight,
        unusedRightPx: Math.round(unusedRightPx),
        unusedRightRatio: Number(unusedRightRatio.toFixed(3)),
      }
    })

    const overflowDetected =
      metrics.documentWidth > metrics.viewportWidth + 1 ||
      metrics.bodyWidth > metrics.viewportWidth + 1

    const excessiveEmptyRightSpace = viewport.width >= 1280 && metrics.unusedRightRatio > 0.3

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
      theme: "light",
      screenshotPath,
      overflowDetected,
      excessiveEmptyRightSpace,
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
      theme: "light",
      screenshotPath: null,
      overflowDetected: null,
      excessiveEmptyRightSpace: null,
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
  const emptySpace = successful.filter((entry) => entry.excessiveEmptyRightSpace)

  return `# ClinMira AI Layout Balance Audit

- Timestamp: \`${timestamp}\`
- Base URL: \`${baseUrl}\`
- Output Folder: \`${outputDir}\`
- Pages Tested: ${pages.map((page) => `\`${page.route}\``).join(", ")}
- Viewports Tested: ${viewports.map((viewport) => `\`${viewport.name}\``).join(", ")}
- Theme: \`light\`
- Screenshots Captured: \`${successful.length}\`
- Failed Routes: \`${failed.length}\`
- Overflow Failures: \`${overflow.length}\`
- Excessive Empty-Space Flags: \`${emptySpace.length}\`
- Console Error Entries: \`${consoleErrors.length}\`

## Layout Balance Results
${entries
  .map((entry) => {
    if (entry.status !== "success") {
      return `- \`${entry.pageName}\` / \`${entry.viewport}\`: failed=${entry.error}`
    }

    return `- \`${entry.pageName}\` / \`${entry.viewport}\`: overflow=${
      entry.overflowDetected ? "fail" : "pass"
    }, emptyRight=${entry.excessiveEmptyRightSpace ? "review" : "pass"}, unusedRight=${
      entry.metrics.unusedRightPx
    }px (${Math.round(entry.metrics.unusedRightRatio * 100)}%), consoleErrors=${entry.consoleErrors.length}`
  })
  .join("\n")}

## Visual Review Guidance
- Scenario Studio should use a main content area plus right rail for preview, readiness, faculty validation, and safety.
- Settings should use a main profile/preferences area plus right rail for account, privacy, and training safety.
- Other pages should avoid random narrow max-width wrappers and keep cards aligned after the sidebar.

## Screenshots
${successful.map((entry) => `- \`${path.basename(entry.screenshotPath)}\``).join("\n")}

## Remaining Issues
${failed.length || overflow.length || consoleErrors.length || emptySpace.length ? "- Review rows marked above." : "- None detected by automated route, overflow, console, or desktop empty-space checks."}
`
}

function resolveChromiumExecutable() {
  const envPath = process.env.PLAYWRIGHT_EXECUTABLE_PATH
  if (envPath && existsSync(envPath)) {
    return envPath
  }

  const candidates = [
    path.join(process.env.HOME ?? "", ".cache/ms-playwright/chromium-1217/chrome-linux64/chrome"),
    "/home/mohammad/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
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
