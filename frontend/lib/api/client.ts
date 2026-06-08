import {
  getStep17BRouteInventoryEntry,
  isStep17BApprovedRouteTemplate,
  type ClinMiraHttpMethod,
  type Step17BApprovedRouteTemplate,
} from "./contract-inventory"
import {
  ClinMiraApiError,
  isClinMiraApiError,
  normalizeHttpError,
  normalizeNetworkError,
  unknownContractVersionError,
  unknownResponseShapeError,
} from "./errors"

export type ClinMiraResponseValidator<T> = (value: unknown) => value is T

export interface ClinMiraApiClientOptions {
  readonly baseUrl?: string
  readonly fetchImpl?: typeof fetch
  readonly defaultHeaders?: Record<string, string>
  readonly defaultTimeoutMs?: number
}

export interface ClinMiraApiRequestOptions<TResponse> {
  readonly routeTemplate: Step17BApprovedRouteTemplate
  readonly path?: string
  readonly method: ClinMiraHttpMethod
  readonly headers?: Record<string, string>
  readonly body?: unknown
  readonly expectedContractVersion?: string
  readonly validateResponse?: ClinMiraResponseValidator<TResponse>
  readonly signal?: AbortSignal
  readonly timeoutMs?: number
}

function normalizeBaseUrl(baseUrl: string | undefined): string {
  return (baseUrl ?? "").replace(/\/+$/, "")
}

function buildUrl(baseUrl: string, path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`
  return baseUrl ? `${baseUrl}${normalizedPath}` : normalizedPath
}

const UUID_PATH_PARAMETER_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function routeGateError(route: string, message: string): ClinMiraApiError {
  return new ClinMiraApiError({
    kind: "bad_request",
    route,
    message,
  })
}

function isTemplateParameterSegment(segment: string): boolean {
  return /^\{[^/{}]+\}$/.test(segment)
}

function hasPathParameters(routeTemplate: string): boolean {
  return routeTemplate.split("/").some(isTemplateParameterSegment)
}

function hasUnsafePathSyntax(path: string): boolean {
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("?") || path.includes("#")) {
    return true
  }

  if (/^[a-z][a-z0-9+.-]*:/i.test(path) || /[\s\x00-\x1f\x7f]/.test(path) || path.includes("..")) {
    return true
  }

  try {
    return decodeURIComponent(path).includes("..")
  } catch {
    return true
  }
}

function pathMatchesRouteTemplate(routeTemplate: Step17BApprovedRouteTemplate, path: string): boolean {
  if (hasUnsafePathSyntax(path)) {
    return false
  }

  const templateSegments = routeTemplate.split("/")
  const pathSegments = path.split("/")

  if (templateSegments.length !== pathSegments.length) {
    return false
  }

  return templateSegments.every((templateSegment, index) => {
    const pathSegment = pathSegments[index]

    if (isTemplateParameterSegment(templateSegment)) {
      return UUID_PATH_PARAMETER_PATTERN.test(pathSegment)
    }

    return templateSegment === pathSegment
  })
}

function resolveApprovedPath(routeTemplate: Step17BApprovedRouteTemplate, path: string | undefined): string {
  if (!path) {
    if (hasPathParameters(routeTemplate)) {
      throw routeGateError(
        routeTemplate,
        "Route path parameters must be resolved by an approved wrapper before a ClinMira API request is sent.",
      )
    }

    return routeTemplate
  }

  if (!pathMatchesRouteTemplate(routeTemplate, path)) {
    throw routeGateError(
      routeTemplate,
      "Request path does not match the approved ClinMira route template.",
    )
  }

  return path
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

async function parseJsonSafely(response: Response): Promise<unknown> {
  const text = await response.text()

  if (!text) {
    return undefined
  }

  try {
    return JSON.parse(text) as unknown
  } catch {
    throw unknownResponseShapeError(response.url)
  }
}

export class ClinMiraApiClient {
  private readonly baseUrl: string
  private readonly fetchImpl: typeof fetch
  private readonly defaultHeaders: Record<string, string>
  private readonly defaultTimeoutMs?: number

  constructor(options: ClinMiraApiClientOptions = {}) {
    this.baseUrl = normalizeBaseUrl(options.baseUrl)
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch
    this.defaultHeaders = options.defaultHeaders ?? {}
    this.defaultTimeoutMs = options.defaultTimeoutMs
  }

  async request<TResponse>(options: ClinMiraApiRequestOptions<TResponse>): Promise<TResponse> {
    if (!isStep17BApprovedRouteTemplate(options.routeTemplate)) {
      throw routeGateError(
        options.routeTemplate,
        "Route is not approved for the Step 17B frontend API client foundation.",
      )
    }

    const routeInventoryEntry = getStep17BRouteInventoryEntry(options.routeTemplate)

    if (!routeInventoryEntry || options.method !== routeInventoryEntry.method) {
      throw routeGateError(
        options.routeTemplate,
        "Request method does not match the approved ClinMira route inventory.",
      )
    }

    if (!this.fetchImpl) {
      throw normalizeNetworkError(new Error("fetch unavailable"), options.routeTemplate)
    }

    const path = resolveApprovedPath(options.routeTemplate, options.path)
    const url = buildUrl(this.baseUrl, path)
    const headers = new Headers({
      ...this.defaultHeaders,
      ...options.headers,
    })

    let body: BodyInit | undefined
    if (options.body !== undefined) {
      headers.set("Content-Type", "application/json")
      body = JSON.stringify(options.body)
    }

    const abortController = new AbortController()
    const timeoutMs = options.timeoutMs ?? this.defaultTimeoutMs
    const timeoutId =
      timeoutMs && timeoutMs > 0 ? globalThis.setTimeout(() => abortController.abort(), timeoutMs) : undefined

    if (options.signal) {
      if (options.signal.aborted) {
        abortController.abort()
      } else {
        options.signal.addEventListener("abort", () => abortController.abort(), { once: true })
      }
    }

    try {
      const response = await this.fetchImpl(url, {
        method: options.method,
        headers,
        body,
        signal: abortController.signal,
      })
      const parsed = await parseJsonSafely(response)

      if (!response.ok) {
        throw normalizeHttpError(response.status, parsed, options.routeTemplate)
      }

      if (options.expectedContractVersion) {
        if (!isRecord(parsed) || parsed.contract_version !== options.expectedContractVersion) {
          throw unknownContractVersionError(options.expectedContractVersion, options.routeTemplate)
        }
      }

      if (options.validateResponse && !options.validateResponse(parsed)) {
        throw unknownResponseShapeError(options.routeTemplate)
      }

      return parsed as TResponse
    } catch (error) {
      if (isClinMiraApiError(error)) {
        throw error
      }

      throw normalizeNetworkError(error, options.routeTemplate)
    } finally {
      if (timeoutId) {
        globalThis.clearTimeout(timeoutId)
      }
    }
  }
}
