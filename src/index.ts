#!/usr/bin/env node

/**
 * ProcessOn MCP Server - Node.js + TypeScript 实现
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { RestServerTransport } from "@chatmcp/sdk/server/rest.js";
import { getParamValue } from "@chatmcp/sdk/utils/index.js";
import {
    ListToolsRequestSchema,
    CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import dotenv from "dotenv";
import axios from "axios";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import * as qs from "qs";

dotenv.config();

let API_BASE = "https://www.processon.com";
const mcpName = "@processon/mcp-server-processon-node";
const version = "1.0.9";

/** 获取请求url **/
function getApiBaseUrl(): string {
    const BASE_URL = process.env.BASE_URL;
    if (BASE_URL) {
        API_BASE = BASE_URL;
    }
    return API_BASE;
}

function checkApiKey(): string {
    const apiKey = process.env.PROCESSON_API_KEY;
    if (!apiKey) throw new Error("PROCESSON_API_KEY 环境变量未设置");
    return apiKey;
}

// 创建 MCP Server 实例
const server = new Server(
    { name: `${mcpName}`, version: `${version}` },
    { capabilities: { tools: {} } }
);

// 对外暴露支持的工具接口
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "check",
                description: `查询用户当前配置apiKey，版本${version}`,
                inputSchema: { type: "object", properties: {}, required: [] },
            },
            {
                name: "createProcessOnMind",
                description:
                    "创建思维导图。根据markdown内容创建思维导图并返回ProcessOn文件链接。",
                inputSchema: {
                    type: "object",
                    properties: {
                        title: { type: "string", description: "文件名称" },
                        content: { type: "string", description: "markdown形式的内容" },
                    },
                    required: ["title", "content"],
                },
            },
        ],
    };
});

// 业务处理工具调用请求
server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const apiKey = checkApiKey();
    const apiBaseUrl = getApiBaseUrl();
    const { name, arguments: args } = req.params;

    switch (name) {
        case "check": {
            return {
                content: [{ type: "text", text: `${apiBaseUrl}:${apiKey}` }],
            };
        }

        case "createProcessOnMind": {
            // 校验参数
            const { title, content } = z
                .object({ title: z.string().min(1), content: z.string().min(1) })
                .parse(args);
            // 格式化Content，组装文件定义结构
            const encodedContent = encodeMind(content);
            // 接口及参数
            const url = `${apiBaseUrl}/api/activity/mcp/chart/v2/create/mind`;
            const payload = {
                file_type: "mind",
                folder: "root",
                category: "mind",
                file_name: title,
                def: encodedContent,
            };
            const formData = qs.stringify(payload);

            try {
                const response = await axios.post(url, payload, {
                    headers: {
                        "X-Mcp-ApiKey": apiKey,
                        "Content-Type": "application/json",
                    },
                    timeout: 30_000,
                });
                const result = response.data;

                if (result.code === "200") {
                    const chartId = result.data?.chartId;
                    if (!chartId) throw new Error("接口返回成功但缺少 chartId 字段");

                    return {
                        content: [
                            {
                                type: "text",
                                text: `思维导图创建成功：${API_BASE}/mindmap/${chartId}`,
                            },
                        ],
                    };
                } else {
                    let msg = result.msg || "未知错误";
                    if (result.code === "815") msg += "，请升级会员后再使用！";
                    if (result.code === "401") msg += "，请检查 PROCESSON_API_KEY 配置！";

                    return {
                        content: [{ type: "text", text: `思维导图创建失败：${msg}` }],
                    };
                }
            } catch (err: any) {
                const msg = err?.response?.data || err.message;
                throw new Error(`请求失败: ${JSON.stringify(msg)}`);
            }
        }

        default:
            throw new Error(`Unknown tool: ${name}`);
    }
});

function generateRandomId(): string {
    return uuidv4().replace(/-/g, "").slice(0, 20);
}

type MindNode = {
    id: string;
    title: string;
    depth: number;
    parent?: string;
    children: MindNode[];
};

function parseContentToTree(lines: string[], parentId = "root"): MindNode[] {
    const rootNode: MindNode = {
        id: parentId,
        title: "",
        depth: 0,
        children: []
    };

    const headingStack: MindNode[] = [rootNode];
    const listStack: { node: MindNode; indent: number }[] = [];

    for (const rawLine of lines) {
        const line = rawLine.replace(/\t/g, "  ").trimEnd();
        if (!line.trim()) continue;

        // 处理标题
        const headingMatch = line.match(/^(#{1,6})\s+(.*)/);
        if (headingMatch) {
            const level = headingMatch[1].length;
            const title = headingMatch[2].trim();

            const newNode: MindNode = {
                id: generateRandomId(),
                title,
                depth: level,
                children: []
            };

            while (headingStack.length > 0 && headingStack[headingStack.length - 1].depth >= level) {
                headingStack.pop();
            }

            const parent = headingStack[headingStack.length - 1];
            newNode.parent = parent.id;
            parent.children.push(newNode);
            headingStack.push(newNode);

            // 重置列表栈（新标题起新段落）
            listStack.length = 0;
            listStack.push({ node: newNode, indent: -1 });

            continue;
        }

        // 处理列表项
        const listMatch = line.match(/^(\s*)-\s+(.*)/);
        if (listMatch) {
            const indent = listMatch[1].length;
            const title = listMatch[2].trim();

            const newNode: MindNode = {
                id: generateRandomId(),
                title,
                depth: listStack[listStack.length - 1]?.node.depth + 1 || 1,
                children: []
            };

            // 回退列表栈中比当前缩进更深的节点
            while (listStack.length > 0 && listStack[listStack.length - 1].indent >= indent) {
                listStack.pop();
            }

            // 挂到最近的标题或列表节点下
            const parent = listStack.length > 0
                ? listStack[listStack.length - 1].node
                : headingStack[headingStack.length - 1]; // fallback 到标题栈顶

            newNode.parent = parent.id;
            parent.children.push(newNode);
            listStack.push({ node: newNode, indent });

            continue;
        }

        // 普通段落合并进当前节点
        const current = listStack[listStack.length - 1]?.node ?? headingStack[headingStack.length - 1];
        current.title += "\n" + line.trim();
    }

    return rootNode.children;
}

function encodeMind(markdown: string): string {
    const lines = markdown.split("\n").filter((l) => l.trim());
    if (!lines.length) throw new Error("Markdown内容不能为空");

    let rootTitle = "未命名思维导图";
    const contentLines: string[] = [];

    for (const line of lines) {
        if (line.startsWith("# ")) {
            rootTitle = line.slice(2).trim();
        } else {
            contentLines.push(line);
        }
    }

    const children = parseContentToTree(contentLines);

    const themeObj = {
        background: "#ffffff",
        version: "v6.1.1",
        common: { bold: false, italic: false, textAlign: "left" },
        connectionStyle: {
            lineWidth: 2,
            lineColor: "#C7654E",
            color: "#ffffff",
            lineType: "dashed",
        },
        summaryTopic: {
            "font-size": "14px",
            summaryLineColor: "#C7654E",
            summaryLineWidth: 2,
            summaryLineType: "curve_complex",
        },
        boundaryStyle: {
            lineColor: "#C7654E",
            lineWidth: 2,
            lineType: 2,
            dasharray: "6,3",
            fill: "#C7654E",
            opacity: "0.1",
        },
        centerTopic: {
            "font-size": 30,
            lineStyle: { lineType: "curve", lineWidth: 3 },
            shape: "radiansRectangle",
            background: "#C7654E",
            "border-color": "#C7654E",
            "font-weight": "bold",
        },
        secTopic: {
            "font-size": 18,
            lineStyle: { lineType: "roundBroken", lineWidth: 2 },
            shape: "radiansRectangle",
            background: "autoColor",
            "border-color": "autoColor",
        },
        childTopic: {
            "font-size": 14,
            lineStyle: { lineType: "roundBroken", lineWidth: 2 },
            shape: "underline",
            "border-width": 2,
            "border-color": "autoColor",
            childBgOpacity: "0.16",
            anticipateBackground: "autoColor",
        },
        w1: 1,
        w2: 12,
        autoColor: true,
        colorList: ["#729B8D", "#EED484", "#E19873", "#DFE8D7"],
        skeletonId: "mindmap_curve_green-default",
        colorCardId: "system",
        colorMinorId: "mind-style1",
    };

    const finalJson = {
        root: "true",
        showWatermark: false,
        structure: "mind_free",
        theme: JSON.stringify(themeObj),
        title: rootTitle,
        depth: 1,
        id: "root",
        children: children,
    };

    return encodeURIComponent(JSON.stringify(finalJson));
}


async function main() {
    const mode = getParamValue("mode") || "stdio";
    const port = getParamValue("port") || 9593;
    const endpoint = getParamValue("endpoint") || "/rest";

    if (mode === "rest") {
        const transport = new RestServerTransport({ port, endpoint });
        await server.connect(transport);
        await transport.startServer();
    } else {
        const transport = new StdioServerTransport();
        await server.connect(transport);
    }
}

main().catch((err) => {
    console.error("Server error:", err);
    process.exit(1);
});
