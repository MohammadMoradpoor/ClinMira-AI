#!/usr/bin/env node

import fs from "node:fs/promises"
import { existsSync } from "node:fs"
import path from "node:path"
import process from "node:process"
import { chromium } from "playwright-core"

const baseUrl = process.env.VIRTUAL_CLINIC_AUDIT_BASE_URL ?? "http://127.0.0.1:3001"
const outputRoot = path.join(process.cwd(), "design-audit-screenshots")
const timestamp = formatTimestamp(new Date())
const outputDir = path.join(outputRoot, `virtual-clinic-uiux-${timestamp}`)
const reportPath = path.join(outputDir, "RESPONSIVE_UIUX_AUDIT_REPORT.md")
const manifestPath = path.join(outputDir, "manifest.json")
const storageKey = "clinmira-theme"
const theme = "light"

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

    manifest.push(await captureViewport({ context, viewport }))
    await context.close()
  }
} finally {
  await browser.close()
}

await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2))
await fs.writeFile(reportPath, buildReport(manifest))

const failed = manifest.filter((entry) => entry.status === "failed")
const overflow = manifest.filter((entry) => entry.overflowDetected)
const consoleFailures = manifest.filter((entry) => entry.consoleErrors.length)
const composerFailures = manifest.filter((entry) => entry.status === "success" && !entry.composerVisible)

console.log("ClinMira Virtual Clinic UI/UX audit complete.")
console.log(`Output folder: ${outputDir}`)
console.log(`Viewports: ${manifest.length}`)
console.log(`Screenshots: ${manifest.filter((entry) => entry.status === "success").length * 2}`)
console.log(`Failed routes: ${failed.length}`)
console.log(`Overflow failures: ${overflow.length}`)
console.log(`Composer visibility failures: ${composerFailures.length}`)
console.log(`Console error entries: ${consoleFailures.length}`)

if (failed.length || overflow.length || consoleFailures.length || composerFailures.length) {
  process.exitCode = 1
}

async function captureViewport({ context, viewport }) {
  const page = await context.newPage()
  const consoleErrors = []
  const requestErrors = []
  const viewportScreenshot = path.join(outputDir, `virtual-clinic__${theme}__${viewport.name}__viewport.png`)
  const fullScreenshot = path.join(outputDir, `virtual-clinic__${theme}__${viewport.name}__full.png`)

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
    const response = await page.goto(new URL("/virtual-clinic", baseUrl).toString(), {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    })

    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {})
    await page.waitForTimeout(500)

    const metrics = await page.evaluate(() => {
      const rectFor = (selector) => {
        const element = document.querySelector(selector)
        if (!element) return null
        const rect = element.getBoundingClientRect()
        return {
          top: Math.round(rect.top),
          bottom: Math.round(rect.bottom),
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        }
      }

      const isVisible = (rect) =>
        Boolean(rect && rect.bottom > 0 && rect.right > 0 && rect.top < window.innerHeight && rect.left < window.innerWidth)

      const composer = rectFor("[data-qa='encounter-composer']")
      const encounter = rectFor("[data-qa='patient-encounter-card']")
      const messages = rectFor("[data-qa='patient-encounter-messages']")
      const workspace = rectFor("[data-qa='clinical-workspace']")
      const documentWidth = document.documentElement.scrollWidth
      const bodyWidth = document.body.scrollWidth
      const viewportWidth = window.innerWidth

      return {
        viewportWidth,
        viewportHeight: window.innerHeight,
        documentWidth,
        bodyWidth,
        composer,
        encounter,
        messages,
        workspace,
        composerVisible: isVisible(composer),
        encounterVisible: isVisible(encounter),
        messagesVisible: isVisible(messages),
        workspaceVisibleInFirstViewport: Boolean(workspace && workspace.top < window.innerHeight),
        workspaceAppearsTooFarBelow: Boolean(workspace && workspace.top > window.innerHeight * 1.15),
        overflowDetected: documentWidth > viewportWidth + 1 || bodyWidth > viewportWidth + 1,
      }
    })

    await page.screenshot({
      path: viewportScreenshot,
      fullPage: false,
      animations: "disabled",
    })

    await page.screenshot({
      path: fullScreenshot,
      fullPage: true,
      animations: "disabled",
    })

    return {
      route: "/virtual-clinic",
      viewport: viewport.name,
      width: viewport.width,
      height: viewport.height,
      theme,
      viewportScreenshot,
      fullScreenshot,
      overflowDetected: metrics.overflowDetected,
      composerVisible: metrics.composerVisible,
      encounterVisible: metrics.encounterVisible,
      messagesVisible: metrics.messagesVisible,
      workspaceVisibleInFirstViewport: metrics.workspaceVisibleInFirstViewport,
      workspaceAppearsTooFarBelow: metrics.workspaceAppearsTooFarBelow,
      consoleErrors: [...consoleErrors, ...requestErrors],
      status: response && response.status() >= 400 ? "failed" : "success",
      error: response && response.status() >= 400 ? `HTTP ${response.status()}` : null,
      metrics,
    }
  } catch (error) {
    return {
      route: "/virtual-clinic",
      viewport: viewport.name,
      width: viewport.width,
      height: viewport.height,
      theme,
      viewportScreenshot: null,
      fullScreenshot: null,
      overflowDetected: null,
      composerVisible: false,
      encounterVisible: false,
      messagesVisible: false,
      workspaceVisibleInFirstViewport: false,
      workspaceAppearsTooFarBelow: null,
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
  const composerFailures = successful.filter((entry) => !entry.composerVisible)
  const workspaceLate = successful.filter((entry) => entry.workspaceAppearsTooFarBelow)

  return `# ClinMira AI Virtual Clinic Responsive UI/UX Audit

- Timestamp: \`${timestamp}\`
- Base URL: \`${baseUrl}\`
- Output Folder: \`${outputDir}\`
- Route Tested: \`/virtual-clinic\`
- Theme: \`${theme}\`
- Viewports Tested: ${viewports.map((viewport) => `\`${viewport.name}\``).join(", ")}
- Screenshots Generated: \`${successful.length * 2}\`
- Failed Routes: \`${failed.length}\`
- Overflow Failures: \`${overflow.length}\`
- Composer Visibility Failures: \`${composerFailures.length}\`
- Console Error Entries: \`${consoleErrors.length}\`

## UI/UX Checks
${entries
  .map((entry) => {
    if (entry.status !== "success") {
      return `- \`${entry.viewport}\`: failed=${entry.error}`
    }

    return `- \`${entry.viewport}\`: overflow=${entry.overflowDetected ? "fail" : "pass"}, composerVisible=${
      entry.composerVisible ? "yes" : "no"
    }, patientEncounterVisible=${entry.encounterVisible ? "yes" : "no"}, workspaceInFirstViewport=${
      entry.workspaceVisibleInFirstViewport ? "yes" : "no"
    }, workspaceTooFarBelow=${entry.workspaceAppearsTooFarBelow ? "yes" : "no"}, consoleErrors=${
      entry.consoleErrors.length
    }`
  })
  .join("\n")}

## Empty Space Review
${workspaceLate.length ? "- Some viewports should be visually reviewed for workspace position." : "- Automated checks did not flag excessive above-the-fold spacing."}
- Patient Encounter uses the open center area for messages, safety state, next safe actions, evidence, agent interpretation, and an attached composer.
- Clinical Workspace is placed in the same responsive grid instead of a disconnected lower block.

## Screenshots
${successful
  .flatMap((entry) => [path.basename(entry.viewportScreenshot), path.basename(entry.fullScreenshot)])
  .map((filename) => `- \`${filename}\``)
  .join("\n")}

## Remaining Issues
${overflow.length || consoleErrors.length || failed.length || composerFailures.length ? "- Review failed rows above." : "- None detected by automated overflow, composer visibility, route, or console checks."}
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
