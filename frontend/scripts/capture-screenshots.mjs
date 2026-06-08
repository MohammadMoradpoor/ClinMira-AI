#!/usr/bin/env node

import fs from "node:fs/promises"
import { existsSync } from "node:fs"
import path from "node:path"
import process from "node:process"
import { spawn } from "node:child_process"
import { chromium } from "playwright-core"

const HOST = process.env.AUDIT_HOST ?? "127.0.0.1"
const PORT = Number(process.env.AUDIT_PORT ?? 3100)
const THEME_STORAGE_KEY = "clinmira-theme"
const REQUEST_TIMEOUT_MS = 60_000
const SERVER_READY_TIMEOUT_MS = 120_000
const ANIMATION_SETTLE_MS = 800
const AUDIT_SKIP_MARKER = "ClinMira audit skip"
const outputRootName = "design-audit-screenshots"
const ignoredErrorSnippets = [
  "/_vercel/insights/script.js",
]

const requestedRoutes = [
  { path: "/", name: "student-clinic", group: "requested" },
  { path: "/student-clinic", name: "student-clinic-redirect", group: "requested" },
  { path: "/cases", name: "case-library", group: "requested" },
  { path: "/virtual-clinic", name: "virtual-clinic", group: "requested" },
  { path: "/debriefing", name: "debriefing", group: "requested" },
  { path: "/faculty", name: "faculty-dashboard", group: "requested" },
  { path: "/scenario-studio", name: "scenario-studio", group: "requested" },
  { path: "/agent-control", name: "agent-control", group: "requested" },
  { path: "/settings", name: "settings", group: "requested" },
]

const routeNameAliases = {
  "/": "student-clinic",
  "/agent-control": "agent-control",
  "/settings": "settings",
  "/cases": "case-library",
  "/debriefing": "debriefing",
  "/faculty": "faculty-dashboard",
  "/scenario-studio": "scenario-studio",
  "/student-clinic": "student-clinic-redirect",
  "/virtual-clinic": "virtual-clinic",
}

const viewports = [
  { name: "desktop", width: 1440, height: 1200 },
  { name: "laptop", width: 1280, height: 900 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "mobile", width: 390, height: 844 },
]

const themes = ["light", "dark"]

const frontendDir = process.cwd()
const appDir = path.join(frontendDir, "app")
const outputRootDir = path.join(frontendDir, outputRootName)
const timestamp = formatTimestamp(new Date())
const runDir = path.join(outputRootDir, timestamp)
const manifestPath = path.join(runDir, "manifest.json")
const reportPath = path.join(runDir, "SCREENSHOT_AUDIT_REPORT.md")
const packageManager = detectPackageManager(frontendDir)
const baseUrl = process.env.AUDIT_BASE_URL ?? `http://${HOST}:${PORT}`

/** @type {Array<ManifestEntry>} */
const manifestEntries = []
/** @type {string[]} */
const missingRoutes = []

await fs.mkdir(runDir, { recursive: true })

const discoveredRoutes = await discoverAppRoutes(appDir)
const captureRoutes = buildCaptureRoutes(requestedRoutes, discoveredRoutes)

let serverHandle = null

try {
  if (!process.env.AUDIT_BASE_URL) {
    serverHandle = await startLocalServer({
      frontendDir,
      packageManager,
      host: HOST,
      port: PORT,
      baseUrl,
    })
  } else {
    await waitForUrl(baseUrl, SERVER_READY_TIMEOUT_MS)
  }

  const routeAvailability = await preflightRoutes(baseUrl, requestedRoutes, discoveredRoutes)

  for (const route of captureRoutes) {
    const availability = routeAvailability.get(route.path)
    if (!availability?.ok) {
      for (const theme of themes) {
        for (const viewport of viewports) {
          manifestEntries.push({
            route: route.path,
            routeName: route.name,
            routeGroup: route.group,
            theme,
            viewportName: viewport.name,
            width: viewport.width,
            height: viewport.height,
            screenshotPath: null,
            status: "failed",
            errorMessage: availability?.errorMessage ?? "Route did not pass preflight.",
            httpStatus: availability?.statusCode ?? null,
            consoleErrors: [],
            pageErrors: [],
            requestErrors: [],
            horizontalOverflow: null,
            overflowMetrics: null,
          })
        }
      }

      if (route.group === "requested") {
        missingRoutes.push(route.path)
      }

      continue
    }
  }

  const browser = await chromium.launch({
    headless: true,
    executablePath: resolveChromiumExecutable(),
  })

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
              if (!root) {
                return
              }

              root.setAttribute("data-theme", selectedTheme)
              root.style.colorScheme = selectedTheme

              if (selectedTheme === "dark") {
                root.classList.add("dark")
              } else {
                root.classList.remove("dark")
              }
            }

            try {
              window.localStorage.setItem(storageKey, selectedTheme)
            } catch {}

            applyTheme()
            document.addEventListener("DOMContentLoaded", applyTheme, { once: true })
          },
          {
            storageKey: THEME_STORAGE_KEY,
            selectedTheme: theme,
          },
        )

        for (const route of captureRoutes) {
          const availability = routeAvailability.get(route.path)
          if (!availability?.ok) {
            continue
          }

          const entry = await captureRoute({
            context,
            baseUrl,
            route,
            theme,
            viewport,
            runDir,
          })
          manifestEntries.push(entry)
        }

        await context.close()
      }
    }
  } finally {
    await browser.close()
  }

  await fs.writeFile(manifestPath, JSON.stringify(manifestEntries, null, 2))
  await fs.writeFile(reportPath, buildMarkdownReport({
    timestamp,
    baseUrl,
    requestedRoutes,
    discoveredRoutes,
    captureRoutes,
    manifestEntries,
    missingRoutes,
    viewports,
    themes,
    runDir,
  }))

  const successfulScreenshots = manifestEntries.filter((entry) => entry.status === "success").length
  const failedCaptures = manifestEntries.filter((entry) => entry.status === "failed").length

  console.log(`ClinMira AI screenshot audit complete.`)
  console.log(`Output directory: ${runDir}`)
  console.log(`Successful screenshots: ${successfulScreenshots}`)
  console.log(`Failed capture entries: ${failedCaptures}`)
  console.log(`Report: ${reportPath}`)
} catch (error) {
  console.error("ClinMira AI screenshot audit failed.")
  console.error(error instanceof Error ? error.stack ?? error.message : String(error))
  process.exitCode = 1
} finally {
  if (serverHandle) {
    await stopServer(serverHandle)
  }
}

async function captureRoute({
  context,
  baseUrl,
  route,
  theme,
  viewport,
  runDir,
}) {
  const page = await context.newPage()
  /** @type {string[]} */
  const consoleErrors = []
  /** @type {string[]} */
  const pageErrors = []
  /** @type {string[]} */
  const requestErrors = []

  page.on("console", (message) => {
    if (message.type() === "error" && !shouldIgnoreAuditError(message.text())) {
      consoleErrors.push(message.text())
    }
  })

  page.on("pageerror", (error) => {
    if (!shouldIgnoreAuditError(error.message)) {
      pageErrors.push(error.message)
    }
  })

  page.on("requestfailed", (request) => {
    const message = `${request.failure()?.errorText ?? "Request failed"} :: ${request.url()}`
    if (!shouldIgnoreAuditError(message)) {
      requestErrors.push(message)
    }
  })

  page.on("response", (response) => {
    const message = `${response.status()} ${response.statusText()} :: ${response.url()}`
    if (response.status() >= 400 && !shouldIgnoreAuditError(message)) {
      requestErrors.push(message)
    }
  })

  const url = new URL(route.path, baseUrl).toString()

  try {
    const response = await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: REQUEST_TIMEOUT_MS,
    })

    await page.waitForLoadState("load", { timeout: REQUEST_TIMEOUT_MS }).catch(() => {})
    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {})
    await ensureTheme(page, theme)
    await page.evaluate(async () => {
      if (document.fonts?.ready) {
        await document.fonts.ready
      }
    })
    await page.waitForTimeout(ANIMATION_SETTLE_MS)

    const notFound = await detectNotFound(page)
    if ((response && response.status() >= 400) || notFound) {
      return {
        route: route.path,
        routeName: route.name,
        routeGroup: route.group,
        theme,
        viewportName: viewport.name,
        width: viewport.width,
        height: viewport.height,
        screenshotPath: null,
        status: "failed",
        errorMessage: response?.status()
          ? `Route returned HTTP ${response.status()}`
          : "Route rendered a not found page.",
        httpStatus: response?.status() ?? null,
        consoleErrors,
        pageErrors,
        requestErrors,
        horizontalOverflow: null,
        overflowMetrics: null,
      }
    }

    const overflowMetrics = await page.evaluate(() => ({
      viewportWidth: window.innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      bodyWidth: document.body?.scrollWidth ?? 0,
    }))
    const horizontalOverflow =
      overflowMetrics.documentWidth > overflowMetrics.viewportWidth + 1 ||
      overflowMetrics.bodyWidth > overflowMetrics.viewportWidth + 1

    const screenshotFilename = `${theme}__${viewport.name}__${route.name}.png`
    const screenshotPath = path.join(runDir, screenshotFilename)

    await page.screenshot({
      path: screenshotPath,
      fullPage: true,
      animations: "disabled",
    })

    return {
      route: route.path,
      routeName: route.name,
      routeGroup: route.group,
      theme,
      viewportName: viewport.name,
      width: viewport.width,
      height: viewport.height,
      screenshotPath,
      status: "success",
      errorMessage: null,
      httpStatus: response?.status() ?? 200,
      consoleErrors,
      pageErrors,
      requestErrors,
      horizontalOverflow,
      overflowMetrics,
    }
  } catch (error) {
    return {
      route: route.path,
      routeName: route.name,
      routeGroup: route.group,
      theme,
      viewportName: viewport.name,
      width: viewport.width,
      height: viewport.height,
      screenshotPath: null,
      status: "failed",
      errorMessage: error instanceof Error ? error.message : String(error),
      httpStatus: null,
      consoleErrors,
      pageErrors,
      requestErrors,
      horizontalOverflow: null,
      overflowMetrics: null,
    }
  } finally {
    await page.close()
  }
}

async function ensureTheme(page, theme) {
  await page.evaluate(
    ({ storageKey, selectedTheme }) => {
      try {
        window.localStorage.setItem(storageKey, selectedTheme)
      } catch {}

      const root = document.documentElement
      root.setAttribute("data-theme", selectedTheme)
      root.style.colorScheme = selectedTheme

      if (selectedTheme === "dark") {
        root.classList.add("dark")
      } else {
        root.classList.remove("dark")
      }
    },
    {
      storageKey: THEME_STORAGE_KEY,
      selectedTheme: theme,
    },
  )

  await page.waitForFunction(
    (selectedTheme) => {
      const root = document.documentElement
      return (
        root.getAttribute("data-theme") === selectedTheme &&
        root.style.colorScheme === selectedTheme
      )
    },
    theme,
    { timeout: 5_000 },
  ).catch(() => {})
}

async function detectNotFound(page) {
  return page.evaluate(() => {
    const bodyText = document.body?.innerText ?? ""
    return bodyText.includes("This page could not be found") || bodyText.includes("404")
  })
}

async function preflightRoutes(baseUrl, requested, discovered) {
  const availability = new Map()
  const routeSet = new Map()

  for (const route of [...requested, ...discovered]) {
    if (!routeSet.has(route.path)) {
      routeSet.set(route.path, route)
    }
  }

  for (const route of routeSet.values()) {
    const url = new URL(route.path, baseUrl).toString()
    try {
      const response = await fetch(url, {
        method: "GET",
        redirect: "follow",
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      })

      availability.set(route.path, {
        ok: response.status < 400,
        statusCode: response.status,
        errorMessage: response.status < 400 ? null : `Route returned HTTP ${response.status}`,
      })
    } catch (error) {
      availability.set(route.path, {
        ok: false,
        statusCode: null,
        errorMessage: error instanceof Error ? error.message : String(error),
      })
    }
  }

  return availability
}

async function startLocalServer({
  frontendDir,
  packageManager,
  host,
  port,
  baseUrl,
}) {
  const hasBuild = existsSync(path.join(frontendDir, ".next", "BUILD_ID"))
  const serverScript = hasBuild ? "start" : "dev"
  const args = buildRunArgs(packageManager, serverScript, host, port)

  const child = spawn(args.command, args.args, {
    cwd: frontendDir,
    env: {
      ...process.env,
      PORT: String(port),
      HOSTNAME: host,
    },
    stdio: ["ignore", "pipe", "pipe"],
  })

  const output = []
  const captureOutput = (chunk) => {
    const lines = chunk.toString().split(/\r?\n/).filter(Boolean)
    output.push(...lines)
    if (output.length > 50) {
      output.splice(0, output.length - 50)
    }
  }

  child.stdout.on("data", captureOutput)
  child.stderr.on("data", captureOutput)

  const exitPromise = new Promise((resolve) => {
    child.once("exit", (code, signal) => resolve({ code, signal }))
  })

  try {
    await waitForUrl(baseUrl, SERVER_READY_TIMEOUT_MS, exitPromise, output)
  } catch (error) {
    child.kill("SIGTERM")
    throw error
  }

  return { child, exitPromise }
}

async function stopServer(serverHandle) {
  const { child, exitPromise } = serverHandle
  if (child.exitCode !== null) {
    return
  }

  child.kill("SIGTERM")

  const timeout = new Promise((resolve) => setTimeout(resolve, 5_000))
  await Promise.race([exitPromise, timeout])

  if (child.exitCode === null) {
    child.kill("SIGKILL")
  }
}

async function waitForUrl(baseUrl, timeoutMs, exitPromise = null, output = []) {
  const startedAt = Date.now()

  while (Date.now() - startedAt < timeoutMs) {
    if (exitPromise) {
      const result = await Promise.race([
        exitPromise,
        new Promise((resolve) => setTimeout(() => resolve(null), 200)),
      ])

      if (result) {
        const details = output.length ? `\nServer output:\n${output.join("\n")}` : ""
        throw new Error(`Local server exited before becoming ready.${details}`)
      }
    }

    try {
      const response = await fetch(baseUrl, {
        method: "GET",
        signal: AbortSignal.timeout(3_000),
      })

      if (response.status < 500) {
        return
      }
    } catch {}

    await new Promise((resolve) => setTimeout(resolve, 1_000))
  }

  throw new Error(`Timed out waiting for ${baseUrl}`)
}

function buildRunArgs(packageManager, script, host, port) {
  const nextArgs = ["next", script, "--hostname", host, "--port", String(port)]

  if (packageManager === "pnpm") {
    return {
      command: "pnpm",
      args: ["exec", ...nextArgs],
    }
  }

  if (packageManager === "yarn") {
    return {
      command: "yarn",
      args: nextArgs,
    }
  }

  if (packageManager === "bun") {
    return {
      command: "bun",
      args: ["x", ...nextArgs],
    }
  }

  return {
    command: "npx",
    args: nextArgs,
  }
}

function detectPackageManager(frontendDir) {
  if (existsSync(path.join(frontendDir, "pnpm-lock.yaml"))) {
    return "pnpm"
  }
  if (existsSync(path.join(frontendDir, "package-lock.json"))) {
    return "npm"
  }
  if (existsSync(path.join(frontendDir, "yarn.lock"))) {
    return "yarn"
  }
  if (existsSync(path.join(frontendDir, "bun.lockb"))) {
    return "bun"
  }

  return "npm"
}

async function discoverAppRoutes(rootDir) {
  /** @type {Array<{path: string, name: string, group: "detected"}>} */
  const routes = []

  async function walk(currentDir) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name)

      if (entry.isDirectory()) {
        if (entry.name.startsWith("_")) {
          continue
        }
        await walk(fullPath)
        continue
      }

      if (!entry.isFile() || entry.name !== "page.tsx") {
        continue
      }

      const source = await fs.readFile(fullPath, "utf8")
      if (source.includes(AUDIT_SKIP_MARKER)) {
        continue
      }

      const relativeDir = path.relative(rootDir, path.dirname(fullPath))
      const routePath =
        relativeDir === "" ? "/" : `/${relativeDir.split(path.sep).join("/")}`

      routes.push({
        path: routePath,
        name: routeNameAliases[routePath] ?? sanitizeRouteName(routePath),
        group: "detected",
      })
    }
  }

  if (!existsSync(rootDir)) {
    return routes
  }

  await walk(rootDir)

  return routes.sort((left, right) => left.path.localeCompare(right.path))
}

function buildCaptureRoutes(requested, discovered) {
  const captureMap = new Map()

  for (const route of requested) {
    captureMap.set(route.path, route)
  }

  for (const route of discovered) {
    if (!captureMap.has(route.path)) {
      captureMap.set(route.path, route)
    }
  }

  return Array.from(captureMap.values())
}

function sanitizeRouteName(routePath) {
  if (routePath === "/") {
    return "home"
  }

  return routePath
    .replace(/^\/+|\/+$/g, "")
    .replace(/[^\w/-]+/g, "-")
    .replace(/\//g, "-")
    .replace(/_+/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase()
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
    throw new Error(
      "No Chromium executable found. Set PLAYWRIGHT_EXECUTABLE_PATH to a valid browser binary.",
    )
  }

  return match
}

function shouldIgnoreAuditError(message) {
  return ignoredErrorSnippets.some((snippet) => message.includes(snippet))
}

function formatTimestamp(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  const hours = String(date.getHours()).padStart(2, "0")
  const minutes = String(date.getMinutes()).padStart(2, "0")

  return `${year}-${month}-${day}-${hours}${minutes}`
}

function buildMarkdownReport({
  timestamp,
  baseUrl,
  requestedRoutes,
  discoveredRoutes,
  captureRoutes,
  manifestEntries,
  missingRoutes,
  viewports,
  themes,
  runDir,
}) {
  const successfulEntries = manifestEntries.filter((entry) => entry.status === "success")
  const failedEntries = manifestEntries.filter((entry) => entry.status === "failed")
  const screenshotFiles = successfulEntries.map((entry) =>
    path.relative(runDir, entry.screenshotPath).replaceAll(path.sep, "/"),
  )
  const overflowEntries = successfulEntries.filter((entry) => entry.horizontalOverflow)
  const errorEntries = successfulEntries.filter(
    (entry) => entry.consoleErrors.length || entry.pageErrors.length || entry.requestErrors.length,
  )
  const failedRouteSummaries = dedupeBy(
    failedEntries.map((entry) => ({
      route: entry.route,
      routeName: entry.routeName,
      group: entry.routeGroup,
      errorMessage: entry.errorMessage,
      httpStatus: entry.httpStatus,
    })),
    (entry) => `${entry.route}::${entry.errorMessage}`,
  )

  return `# ClinMira AI Design Audit Report

- Timestamp: \`${timestamp}\`
- Base URL: \`${baseUrl}\`
- Output Directory: \`${runDir}\`
- Product Areas: \`Student Clinic\`, \`Case Library\`, \`Virtual Clinic\`, \`Patient Twin\`, \`Agent Control\`, \`Scenario Studio\`, \`Debriefing\`, \`Faculty Dashboard\`
- Requested Routes: ${requestedRoutes.map((route) => `\`${route.path}\``).join(", ")}
- Detected App Routes: ${discoveredRoutes.map((route) => `\`${route.path}\``).join(", ")}
- Capture Route Set: ${captureRoutes.map((route) => `\`${route.path}\``).join(", ")}
- Viewports: ${viewports.map((viewport) => `\`${viewport.name} (${viewport.width}x${viewport.height})\``).join(", ")}
- Themes: ${themes.map((theme) => `\`${theme}\``).join(", ")}
- Successful Screenshots: \`${successfulEntries.length}\`
- Failed Capture Entries: \`${failedEntries.length}\`

## Screenshot Files
${screenshotFiles.length ? screenshotFiles.map((file) => `- \`${file}\``).join("\n") : "- None"}

## Missing Routes
${missingRoutes.length ? dedupeStrings(missingRoutes).map((route) => `- \`${route}\``).join("\n") : "- None"}

## Failed Or Missing Pages
${failedRouteSummaries.length
    ? failedRouteSummaries
        .map(
          (entry) =>
            `- \`${entry.route}\` (${entry.group})${entry.httpStatus ? ` - HTTP ${entry.httpStatus}` : ""}: ${entry.errorMessage ?? "Unknown error"}`,
        )
        .join("\n")
    : "- None"}

## Pages With Horizontal Overflow
${overflowEntries.length
    ? overflowEntries
        .map(
          (entry) =>
            `- \`${entry.route}\` / \`${entry.theme}\` / \`${entry.viewportName}\` - document width ${entry.overflowMetrics?.documentWidth}, viewport ${entry.overflowMetrics?.viewportWidth}`,
        )
        .join("\n")
    : "- None detected"}

## Pages With Console Or Load Errors
${errorEntries.length
    ? errorEntries
        .map((entry) => {
          const issues = [
            ...entry.consoleErrors.map((message) => `console: ${message}`),
            ...entry.pageErrors.map((message) => `page: ${message}`),
            ...entry.requestErrors.map((message) => `request: ${message}`),
          ]
          return `- \`${entry.route}\` / \`${entry.theme}\` / \`${entry.viewportName}\`\n  ${issues
            .slice(0, 6)
            .map((issue) => `- ${issue}`)
            .join("\n  ")}`
        })
        .join("\n")
    : "- None detected"}

## Pages That Failed To Load
${failedEntries.length
    ? dedupeBy(
        failedEntries.map((entry) => ({
          key: `${entry.route}::${entry.theme}::${entry.viewportName}`,
          text:
            `- \`${entry.route}\` / \`${entry.theme}\` / \`${entry.viewportName}\`: ` +
            `${entry.errorMessage ?? "Unknown load failure"}`,
        })),
        (entry) => entry.key,
      )
        .map((entry) => entry.text)
        .join("\n")
    : "- None"}

## Recommended ClinMira Review Steps
- Review the Virtual Clinic first for Patient Twin conversation, Safety Guardrail states, imaging results, and Agent Glassbox behavior.
- Compare light and dark captures page by page to catch contrast or theme-specific regressions.
- Inspect mobile and tablet screenshots for text wrapping, clipped controls, and sidebar behavior.
- Prioritize any page flagged for horizontal overflow or console errors before product review.
- Re-run the audit after ClinMira content updates to create a new timestamped snapshot set for regression comparison.
`
}

function dedupeStrings(items) {
  return Array.from(new Set(items)).sort((left, right) => left.localeCompare(right))
}

function dedupeBy(items, getKey) {
  const seen = new Set()
  const result = []

  for (const item of items) {
    const key = getKey(item)
    if (!seen.has(key)) {
      seen.add(key)
      result.push(item)
    }
  }

  return result
}

/**
 * @typedef {{
 *   route: string
 *   routeName: string
 *   routeGroup: "requested" | "detected"
 *   theme: string
 *   viewportName: string
 *   width: number
 *   height: number
 *   screenshotPath: string | null
 *   status: "success" | "failed"
 *   errorMessage: string | null
 *   httpStatus: number | null
 *   consoleErrors: string[]
 *   pageErrors: string[]
 *   requestErrors: string[]
 *   horizontalOverflow: boolean | null
 *   overflowMetrics: { viewportWidth: number, documentWidth: number, bodyWidth: number } | null
 * }} ManifestEntry
 */
