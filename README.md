# @processon/mcp-server-processon-node

> 🧠 基于 Node.js + TypeScript 实现的 [ProcessOn](https://www.processon.com) MCP Server，支持从 Markdown 内容自动生成思维导图。

## 📦 项目地址

- GitHub: [https://github.com/liqi888/mcp-server-processon-node](https://github.com/liqi888/mcp-server-processon-node)
- npm: [https://www.npmjs.com/package/@processon/mcp-server-processon-node](https://www.npmjs.com/package/@processon/mcp-server-processon-node)

## 🚀 安装使用

### 方式一：通过 npx 临时启动（推荐）

```bash
npx @processon/mcp-server-processon-node@latest
```

> ⚠️ 若执行卡在 `dotenv` 提示不动，建议手动指定版本并添加环境变量 `.env` 文件。

---

### 方式二：全局安装后使用

```bash
npm install -g @processon/mcp-server-processon-node

# 启动服务
mcp-server-processon-node
```

---

### 方式三：作为依赖引入到 Node 项目中

```bash
npm install @processon/mcp-server-processon-node
```

---

## ⚙️ 环境变量配置

服务通过环境变量读取 ProcessOn 配置信息：

| 变量名               | 是否必须 | 说明                                                                                     |
|----------------------|----------|----------------------------------------------------------------------------------------|
| `PROCESSON_API_KEY`  | ✅ 是     | 你的 ProcessOn API 密钥（可在 [www.processon.com](https://www.processon.com/setting) 账户中心 获取） |
| `BASE_URL`           | ❌ 否     | 自定义 API 地址（默认使用官方地址）                                                                   |


在项目根目录下创建 `.env` 文件，或通过环境变量方式传入以下配置：

```env
# 必填，用于调用 ProcessOn 接口
PROCESSON_API_KEY=你的apikey

# 可选，自定义 ProcessOn 服务地址
BASE_URL=https://www.processon.com
```

---

## 🧠 支持的工具能力（Tools）

### 1. check

- **作用**：检查当前配置的 `PROCESSON_API_KEY` 是否生效。
- **输入参数**：无
- **返回**：当前 `API_BASE` 和 `API_KEY` 的拼接值

---

### 2. createProcessOnMind

- **作用**：根据 Markdown 内容生成思维导图，并返回可视化链接。
- **输入参数**：
    - `title`: string，思维导图文件名
    - `content`: string，Markdown 内容，支持二级以上标题和列表格式
- **输出结果**：成功返回 `https://www.processon.com/mindmap/xxxxxx` 的可访问地址

---

## 🧩 Cherry Studio 中使用

1. 打开 Cherry Studio 客户端。
2. 创建一个 MCP 服务，选择“通过 npx 启动”。
3. 填入如下命令：

```bash
npx @processon/mcp-server-processon-node@latest
```

4. 在服务配置中添加环境变量：

```env
PROCESSON_API_KEY=你的apikey
```

5. 启动成功后即可在右侧工具栏中看到 `check` 和 `createProcessOnMind` 两个工具接口。

6. 示例：
```json

"processon_mind": {
    "name": "ProcessOn_CreateMind",
    "type": "stdio",
    "description": "ProcessOn创建思维导图",
    "isActive": true,
    "registryUrl": "",
    "command": "npx",
    "args": [
      "@processon/mcp-server-processon-node@latest"
    ],
    "env": {
      "PROCESSON_API_KEY": "{YOU PROCESSON_API_KEY}"
    }
}
```

---

## 🧰 本地开发与调试

```bash
# 安装依赖
npm install

# 本地开发时持续监听构建
npm run watch

# 构建项目
npm run build

# 使用 Inspector 调试 MCP 请求
npm run inspector
```

---

## 📦 打包发布（维护者使用）

```bash
npm version patch|minor|major
npm publish --access public
```

---

## 📄 License

MIT © 2025 [琪天大圣](https://github.com/liqi888/mcp-server-processon-node)