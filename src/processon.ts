import { z } from "zod";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";

interface TreeNode {
    id: string;
    title: string;
    depth: number;
    children: TreeNode[];
}

function generateRandomId() {
    return uuidv4().slice(0, 20);
}

function parseMarkdownToTree(markdown: string): { title: string; children: TreeNode[] } {
    const lines = markdown.split("\n").map((l) => l.trim()).filter(Boolean);

    let rootTitle = "未命名思维导图";
    const contentLines: string[] = [];
    for (const line of lines) {
        if (line.startsWith("# ")) {
            rootTitle = line.slice(2).trim();
        } else {
            contentLines.push(line);
        }
    }

    const stack: TreeNode[] = [];
    // 虚拟根节点，注意加title属性以兼容下面代码
    const virtualRoot: TreeNode = { id: "virtual-root", title: "", children: [], depth: 0 };
    let currentParent: TreeNode = virtualRoot;
    let lastLevel = 1;

    for (const line of contentLines) {
        const heading = line.match(/^(#{2,6})\s+(.*)/);
        const listItem = line.match(/^\-\s+(.*)/);

        if (heading) {
            const level = heading[1].length;
            const title = heading[2];
            const node: TreeNode = {
                id: generateRandomId(),
                title,
                depth: level,
                children: []
            };
            while (stack.length && stack[stack.length - 1].depth >= level) {
                stack.pop();
            }
            const parent = stack[stack.length - 1] || virtualRoot;
            parent.children.push(node);
            stack.push(node);
            currentParent = node;
            lastLevel = level;
        } else if (listItem) {
            const node: TreeNode = {
                id: generateRandomId(),
                title: listItem[1],
                depth: lastLevel + 1,
                children: []
            };
            currentParent.children.push(node);
        } else if (currentParent) {
            // 这里 currentParent 一定有 title，直接加
            currentParent.title += "\n" + line;
        }
    }

    return { title: rootTitle, children: virtualRoot.children };
}

export class ProcessOnClient {
    private readonly apiKey: string;
    private readonly baseUrl: string;

    constructor({ apiKey, baseUrl }: { apiKey: string; baseUrl?: string }) {
        if (!apiKey) throw new Error("PROCESSON_API_KEY is required");
        this.apiKey = apiKey;
        this.baseUrl = baseUrl || "https://www.processon.com";
    }

    async createMind({ title, content }: { title: string; content: string }) {
        if (!title?.trim()) throw new Error("文件名称不能为空");
        if (!content?.trim()) throw new Error("Markdown内容不能为空");

        const { title: rootTitle, children } = parseMarkdownToTree(content);

        const def = JSON.stringify({
            root: "true",
            showWatermark: false,
            structure: "mind_free",
            title: rootTitle,
            depth: 1,
            id: "root",
            children,
            theme: JSON.stringify({ background: "#ffffff" }) // 简化版主题
        });

        const url = `${this.baseUrl}/api/activity/mcp/chart/create/mind`;
        const data = {
            file_type: "mind",
            folder: "root",
            category: "mind",
            file_name: title,
            def
        };

        const res = await axios.post(url, data, {
            headers: { "X-Mcp-ApiKey": this.apiKey },
            timeout: 30000
        });

        const result = res.data;
        if (result?.code === "200") {
            const chartId = result.data?.chartId;
            return {
                code: "200",
                msg: "思维导图创建成功",
                chartId,
                fileUrl: `${this.baseUrl}/mindmap/${chartId}`
            };
        } else {
            const msg = result?.msg || "未知错误";
            throw new Error(
                `思维导图创建失败：${msg}${result.code === "815" ? "，请升级会员" : ""}${result.code === "401" ? "，请检查API密钥配置" : ""}`
            );
        }
    }
}

export const CreateMindSchema = z.object({
    title: z.string().min(1, "文件名称不能为空"),
    content: z.string().min(1, "内容不能为空")
});
