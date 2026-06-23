// ============================================================
// MCP HTTP Gateway
// Routes MCP JSON-RPC requests to the appropriate MCP server.
// Operates in stateless mode with JSON responses (no SSE).
// Clients send proper MCP protocol messages:
//   { jsonrpc: "2.0", method: "tools/call", params: { name, arguments }, id }
// ============================================================
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'
import { createCRMMCPServer } from '~/server/mcp/crm/index'
import { createGoogleAdsMCPServer } from '~/server/mcp/google-ads/index'
import { createMetaAdsMCPServer } from '~/server/mcp/meta-ads/index'
import { createLinkedInAdsMCPServer } from '~/server/mcp/linkedin-ads/index'
import { createGoogleAnalyticsMCPServer } from '~/server/mcp/google-analytics/index'

export default defineEventHandler(async (event) => {
  const serverName = getRouterParam(event, 'server') as string

  let mcpServer
  switch (serverName) {
    case 'crm':
      mcpServer = createCRMMCPServer()
      break
    case 'google-ads':
      mcpServer = createGoogleAdsMCPServer()
      break
    case 'meta-ads':
      mcpServer = createMetaAdsMCPServer()
      break
    case 'linkedin-ads':
      mcpServer = createLinkedInAdsMCPServer()
      break
    case 'google-analytics':
      mcpServer = createGoogleAnalyticsMCPServer()
      break
    default:
      throw createError({ statusCode: 404, message: `MCP server not found: ${serverName}` })
  }

  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // stateless — each request is independent
    enableJsonResponse: true,      // return JSON, not SSE
  })

  await mcpServer.connect(transport)

  const webRequest = toWebRequest(event)
  return transport.handleRequest(webRequest)
})
