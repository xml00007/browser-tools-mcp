
// Global type definitions for the browser extension

declare global {
  interface RequestData {
    type: string
    origin: string
    path: string
    method: string
    requestBody: string
    requestCookies: unknown[]
    requestHeaders: Record<string, unknown>
    responseStatus: number
    responseHeaders: Record<string, unknown>
    responseBody: string
  }

  interface BrowserConnectorSettings {
    logLimit: number
    queryLimit: number
    stringSizeLimit: number
    showRequestHeaders: boolean
    showResponseHeaders: boolean
    maxLogSize: number
    screenshotPath: string
    serverHost: string
    serverPort: number
    allowAutoPaste: boolean
  }
}

export {}
