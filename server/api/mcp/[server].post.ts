// ============================================================
// MCP HTTP Gateway
// Routes POST /api/mcp/:server to the appropriate MCP server.
// Accepts { tool: string, arguments: Record<string, unknown> }
// ============================================================
import { createCRMMCPServer } from '~/server/mcp/crm/index'
import { createGoogleAdsMCPServer } from '~/server/mcp/google-ads/index'
import { createMetaAdsMCPServer } from '~/server/mcp/meta-ads/index'
import { createLinkedInAdsMCPServer } from '~/server/mcp/linkedin-ads/index'

export default defineEventHandler(async (event) => {
  const serverName = getRouterParam(event, 'server') as string
  const body = await readBody(event)

  if (!body.tool) {
    throw createError({ statusCode: 400, message: 'tool name is required' })
  }

  // Get the right MCP server
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
    default:
      throw createError({ statusCode: 404, message: `MCP server not found: ${serverName}` })
  }

  // Call the tool directly via the server's tool registry
  // This is a simplified HTTP adapter — in production use StreamableHTTPServerTransport
  try {
    // @ts-expect-error — accessing internal tool registry for HTTP adapter
    const tools = mcpServer._registeredTools
    const tool = tools?.[body.tool]

    if (!tool) {
      throw createError({
        statusCode: 404,
        message: `Tool "${body.tool}" not found in server "${serverName}"`,
      })
    }

    const result = await tool.callback(body.arguments ?? {})
    return result
  }
  catch (e: unknown) {
    if (e instanceof Error && 'statusCode' in e) throw e
    throw createError({
      statusCode: 500,
      message: e instanceof Error ? e.message : `Tool call failed`,
    })
  }
})
