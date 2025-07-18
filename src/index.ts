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

const API_BASE = process.env.BASE_URL || "https://www.processon.com";
const mcpName = "@processon/mcp-server-processon-node";
const version = "1.0.9";

function checkApiKey(): string {
    const apiKey = process.env.PROCESSON_API_KEY;
    if (!apiKey) throw new Error("PROCESSON_API_KEY 环境变量未设置");
    return apiKey;
}








function generateRandomId() {
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
    const stack: MindNode[] = [];
    const result: MindNode[] = [];
    let currentParentId = parentId;
    let currentParent: MindNode = {
        id: parentId,
        title: "",
        depth: 0,
        children: []
    };
    let lastLevel = 1;

    for (const raw of lines) {
        const line = raw.trim();
        if (!line) continue;

        const headingMatch = line.match(/^(#{2,6})\s+(.*)/);
        if (headingMatch) {
            const level = headingMatch[1].length;
            const title = headingMatch[2];
            const node: MindNode = {
                id: generateRandomId(),
                title,
                depth: level,
                parent: "root",
                children: [],
            };

            while (stack.length && stack[stack.length - 1].depth >= level) {
                stack.pop();
            }

            const parent = stack.length ? stack[stack.length - 1] : currentParent;
            node.parent = parent.id;
            parent.children.push(node);
            stack.push(node);
            lastLevel = level;
            continue;
        }

        const listMatch = line.match(/^\-\s+(.*)/);
        if (listMatch) {
            const content = listMatch[1];
            const node: MindNode = {
                id: generateRandomId(),
                title: content,
                depth: lastLevel + 1,
                parent: currentParent.id,
                children: [],
            };
            currentParent.children.push(node);
            continue;
        }

        // 附加内容
        if (currentParent) {
            currentParent.title += "\n" + line;
        }
    }

    return currentParent.children;
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













// 创建 MCP Server 实例
const server = new Server(
    { name: `${mcpName}`, version: `${version}` },
    { capabilities: { tools: {} } }
);

// 列出支持的工具接口
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

// 处理工具调用请求
server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const apiKey = checkApiKey();
    const { name, arguments: args } = req.params;

    switch (name) {
        case "check": {
            return {
                content: [{ type: "text", text: `${API_BASE}:${apiKey}` }],
            };
        }

        case "createProcessOnMind": {
            // 校验参数
            const { title, content } = z
                .object({ title: z.string().min(1), content: z.string().min(1) })
                .parse(args);

            const encodedContent = encodeMind(content);
            // const encodedContent = "%7B%22root%22%3A%22true%22%2C%22showWatermark%22%3Afalse%2C%22structure%22%3A%22mind_free%22%2C%22theme%22%3A%22%7B%5C%22background%5C%22%3A%5C%22%23ffffff%5C%22%2C%5C%22version%5C%22%3A%5C%22v6.1.1%5C%22%2C%5C%22common%5C%22%3A%7B%5C%22bold%5C%22%3Afalse%2C%5C%22italic%5C%22%3Afalse%2C%5C%22textAlign%5C%22%3A%5C%22left%5C%22%7D%2C%5C%22connectionStyle%5C%22%3A%7B%5C%22lineWidth%5C%22%3A2%2C%5C%22lineColor%5C%22%3A%5C%22%23C7654E%5C%22%2C%5C%22color%5C%22%3A%5C%22%23ffffff%5C%22%2C%5C%22lineType%5C%22%3A%5C%22dashed%5C%22%7D%2C%5C%22summaryTopic%5C%22%3A%7B%5C%22font-size%5C%22%3A%5C%2214px%5C%22%2C%5C%22summaryLineColor%5C%22%3A%5C%22%23C7654E%5C%22%2C%5C%22summaryLineWidth%5C%22%3A2%2C%5C%22summaryLineType%5C%22%3A%5C%22curve_complex%5C%22%7D%2C%5C%22boundaryStyle%5C%22%3A%7B%5C%22lineColor%5C%22%3A%5C%22%23C7654E%5C%22%2C%5C%22lineWidth%5C%22%3A2%2C%5C%22lineType%5C%22%3A2%2C%5C%22dasharray%5C%22%3A%5C%226%2C3%5C%22%2C%5C%22fill%5C%22%3A%5C%22%23C7654E%5C%22%2C%5C%22opacity%5C%22%3A%5C%220.1%5C%22%7D%2C%5C%22centerTopic%5C%22%3A%7B%5C%22font-size%5C%22%3A30%2C%5C%22lineStyle%5C%22%3A%7B%5C%22lineType%5C%22%3A%5C%22curve%5C%22%2C%5C%22lineWidth%5C%22%3A3%7D%2C%5C%22shape%5C%22%3A%5C%22radiansRectangle%5C%22%2C%5C%22background%5C%22%3A%5C%22%23C7654E%5C%22%2C%5C%22border-color%5C%22%3A%5C%22%23C7654E%5C%22%2C%5C%22font-weight%5C%22%3A%5C%22bold%5C%22%7D%2C%5C%22secTopic%5C%22%3A%7B%5C%22font-size%5C%22%3A18%2C%5C%22lineStyle%5C%22%3A%7B%5C%22lineType%5C%22%3A%5C%22roundBroken%5C%22%2C%5C%22lineWidth%5C%22%3A2%7D%2C%5C%22shape%5C%22%3A%5C%22radiansRectangle%5C%22%2C%5C%22background%5C%22%3A%5C%22autoColor%5C%22%2C%5C%22border-color%5C%22%3A%5C%22autoColor%5C%22%7D%2C%5C%22childTopic%5C%22%3A%7B%5C%22font-size%5C%22%3A14%2C%5C%22lineStyle%5C%22%3A%7B%5C%22lineType%5C%22%3A%5C%22roundBroken%5C%22%2C%5C%22lineWidth%5C%22%3A2%7D%2C%5C%22shape%5C%22%3A%5C%22underline%5C%22%2C%5C%22border-width%5C%22%3A2%2C%5C%22border-color%5C%22%3A%5C%22autoColor%5C%22%2C%5C%22childBgOpacity%5C%22%3A%5C%220.16%5C%22%2C%5C%22anticipateBackground%5C%22%3A%5C%22autoColor%5C%22%7D%2C%5C%22w1%5C%22%3A1%2C%5C%22w2%5C%22%3A12%2C%5C%22autoColor%5C%22%3Atrue%2C%5C%22colorList%5C%22%3A%5B%5C%22%23729B8D%5C%22%2C%5C%22%23EED484%5C%22%2C%5C%22%23E19873%5C%22%2C%5C%22%23DFE8D7%5C%22%5D%2C%5C%22skeletonId%5C%22%3A%5C%22mindmap_curve_green-default%5C%22%2C%5C%22colorCardId%5C%22%3A%5C%22system%5C%22%2C%5C%22colorMinorId%5C%22%3A%5C%22mind-style1%5C%22%7D%22%2C%22title%22%3A%22%E7%99%BB%E5%BD%95%E6%B5%81%E7%A8%8B999999%22%2C%22depth%22%3A1%2C%22id%22%3A%22root%22%2C%22children%22%3A%5B%7B%22title%22%3A%221.%20%E7%94%A8%E6%88%B7%E8%BE%93%E5%85%A5%22%2C%22depth%22%3A2%2C%22id%22%3A%227ecb2b4beebb4c4c4d4a%22%2C%22children%22%3A%5B%7B%22title%22%3A%22%E7%94%A8%E6%88%B7%E5%90%8D%2F%E9%82%AE%E7%AE%B1%2F%E6%89%8B%E6%9C%BA%E5%8F%B7%22%2C%22parent%22%3A%227ecb2b4beebb4c4c4d4a%22%2C%22id%22%3A%2257849b6a642250873935%22%2C%22children%22%3A%5B%5D%7D%5D%2C%22parent%22%3A%22root%22%7D%5D%7D";

            const url = `${API_BASE}/api/activity/mcp/chart/create/mind`;
            const payload = {
                file_type: "mind",
                folder: "root",
                category: "mind",
                file_name: title,
                def: encodedContent,
            };
            const formData = qs.stringify(payload);

            try {
                const response = await axios.post(url, formData, {
                    headers: {
                        "X-Mcp-ApiKey": apiKey,
                        "Content-Type": "application/x-www-form-urlencoded",
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
