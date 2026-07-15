// ═══════════════════════════════════════════════════════════════
// MCP 协议客户端 — Model Context Protocol 集成
// 支持连接 MCP 服务器，发现工具/资源/提示，调用 MCP 工具
// MCP Protocol Client — Model Context Protocol integration
// Supports connecting to MCP servers, discovering tools/resources/prompts, calling MCP tools
// ═══════════════════════════════════════════════════════════════

// ── MCP 消息类型 / MCP message types ──
interface JSONRPCRequest {
  jsonrpc: "2.0";
  id: number;
  method: string;
  params?: Record<string, unknown>;
}

interface JSONRPCResponse {
  jsonrpc: "2.0";
  id: number;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

// ── MCP 工具定义 / MCP tool definition ──
export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, { type: string; description?: string; enum?: string[] }>;
    required?: string[];
  };
}

// ── MCP 资源定义 / MCP resource definition ──
export interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

// ── MCP 服务器配置 / MCP server configuration ──
export interface MCPServerConfig {
  id: string;
  name: string;
  /** HTTP/SSE 端点 / HTTP/SSE endpoint */
  url: string;
  /** 可选的 API Key / Optional API key */
  apiKey?: string;
  /** 是否启用 / Whether enabled */
  enabled: boolean;
}

// ── MCP 客户端状态 / MCP client state ──
export interface MCPClientState {
  server: MCPServerConfig;
  tools: MCPTool[];
  resources: MCPResource[];
  connected: boolean;
  lastConnected: number;
}

// ── MCP 客户端 / MCP Client ──
class MCPClient {
  private servers: Map<string, MCPClientState> = new Map();
  private requestId = 0;

  // ── 注册 MCP 服务器 / Register MCP server ──
  async registerServer(config: MCPServerConfig): Promise<MCPClientState> {
    const state: MCPClientState = {
      server: config,
      tools: [],
      resources: [],
      connected: false,
      lastConnected: 0,
    };

    if (config.enabled) {
      try {
        await this.initialize(state);
        state.connected = true;
        state.lastConnected = Date.now();
      } catch (err) {
        state.connected = false;
        console.warn(`[MCP] Failed to connect to ${config.name}:`, err);
      }
    }

    this.servers.set(config.id, state);
    return state;
  }

  // ── 初始化：发现工具和资源 / Initialize: discover tools and resources ──
  private async initialize(state: MCPClientState): Promise<void> {
    // 发送 initialize 请求 / Send initialize request
    const initResult = await this.sendRequest(state.server, "initialize", {
      protocolVersion: "2024-11-05",
      capabilities: { tools: {}, resources: {} },
      clientInfo: { name: "every-agents", version: "1.0.0" },
    });

    // 发送 initialized 通知 / Send initialized notification
    await this.sendNotification(state.server, "notifications/initialized", {});

    // 发现工具 / Discover tools
    const toolsResult = await this.sendRequest(state.server, "tools/list", {});
    if (toolsResult && (toolsResult as Record<string, unknown>).tools) {
      state.tools = (toolsResult as Record<string, unknown>).tools as MCPTool[];
    }

    // 发现资源 / Discover resources
    try {
      const resourcesResult = await this.sendRequest(state.server, "resources/list", {});
      if (resourcesResult && (resourcesResult as Record<string, unknown>).resources) {
        state.resources = (resourcesResult as Record<string, unknown>).resources as MCPResource[];
      }
    } catch {
      // 资源发现是可选的 / Resource discovery is optional
    }
  }

  // ── 调用 MCP 工具 / Call MCP tool ──
  async callTool(serverId: string, toolName: string, args: Record<string, unknown>): Promise<unknown> {
    const state = this.servers.get(serverId);
    if (!state) throw new Error(`MCP server ${serverId} not found`);
    if (!state.connected) throw new Error(`MCP server ${state.server.name} is not connected`);

    const result = await this.sendRequest(state.server, "tools/call", {
      name: toolName,
      arguments: args,
    });

    return result;
  }

  // ── 读取 MCP 资源 / Read MCP resource ──
  async readResource(serverId: string, uri: string): Promise<unknown> {
    const state = this.servers.get(serverId);
    if (!state) throw new Error(`MCP server ${serverId} not found`);
    if (!state.connected) throw new Error(`MCP server ${state.server.name} is not connected`);

    const result = await this.sendRequest(state.server, "resources/read", { uri });
    return result;
  }

  // ── 获取所有已注册的 MCP 工具 / Get all registered MCP tools ──
  getAllTools(): Array<{ serverId: string; serverName: string; tool: MCPTool }> {
    const allTools: Array<{ serverId: string; serverName: string; tool: MCPTool }> = [];
    for (const [id, state] of this.servers) {
      if (state.connected) {
        for (const tool of state.tools) {
          allTools.push({ serverId: id, serverName: state.server.name, tool });
        }
      }
    }
    return allTools;
  }

  // ── 获取服务器状态 / Get server status ──
  getServerStatus(serverId: string): MCPClientState | undefined {
    return this.servers.get(serverId);
  }

  // ── 列出所有服务器 / List all servers ──
  listServers(): MCPClientState[] {
    return Array.from(this.servers.values());
  }

  // ── 移除服务器 / Remove server ──
  removeServer(serverId: string): void {
    this.servers.delete(serverId);
  }

  // ── 发送 JSON-RPC 请求 / Send JSON-RPC request ──
  private async sendRequest(
    config: MCPServerConfig,
    method: string,
    params: Record<string, unknown>
  ): Promise<unknown> {
    const id = ++this.requestId;
    const request: JSONRPCRequest = { jsonrpc: "2.0", id, method, params };

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (config.apiKey) {
      headers["Authorization"] = `Bearer ${config.apiKey}`;
    }

    const response = await fetch(config.url, {
      method: "POST",
      headers,
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`MCP request failed: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as JSONRPCResponse;

    if (data.error) {
      throw new Error(`MCP error: ${data.error.message} (code: ${data.error.code})`);
    }

    return data.result;
  }

  // ── 发送 JSON-RPC 通知 / Send JSON-RPC notification ──
  private async sendNotification(
    config: MCPServerConfig,
    method: string,
    params: Record<string, unknown>
  ): Promise<void> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (config.apiKey) {
      headers["Authorization"] = `Bearer ${config.apiKey}`;
    }

    await fetch(config.url, {
      method: "POST",
      headers,
      body: JSON.stringify({ jsonrpc: "2.0", method, params }),
    }).catch(() => {
      // 通知失败不抛出 / Notification failure is non-fatal
    });
  }
}

// ── 全局单例 / Global singleton ──
export const mcpClient = new MCPClient();

// ── 生成 MCP 工具的系统提示词片段 / Generate MCP tool system prompt fragment ──
export function generateMCPPrompt(): string {
  const tools = mcpClient.getAllTools();
  if (tools.length === 0) return "";

  const parts: string[] = ["## MCP 外部工具 / MCP External Tools", ""];
  for (const { serverName, tool } of tools) {
    const required = tool.inputSchema.required?.join(", ") || "无";
    const props = Object.entries(tool.inputSchema.properties)
      .map(([k, v]) => `  - ${k} (${v.type}): ${v.description || ""}`)
      .join("\n");
    parts.push(
      `### ${tool.name} (来自 ${serverName})`,
      `描述：${tool.description}`,
      `必填参数：${required}`,
      `参数：\n${props}`,
      ""
    );
  }

  return parts.join("\n");
}

// ── 调用 MCP 工具 / Call MCP tool (convenience function) ──
export async function executeMCPTool(
  toolName: string,
  args: Record<string, unknown>
): Promise<string> {
  const tools = mcpClient.getAllTools();
  const match = tools.find((t) => t.tool.name === toolName);

  if (!match) {
    return JSON.stringify({ error: `MCP tool "${toolName}" not found` });
  }

  try {
    const result = await mcpClient.callTool(match.serverId, toolName, args);
    return JSON.stringify({ success: true, tool: toolName, server: match.serverName, result });
  } catch (e) {
    return JSON.stringify({
      success: false,
      tool: toolName,
      error: e instanceof Error ? e.message : "MCP tool execution failed",
    });
  }
}