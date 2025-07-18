# @processon/mcp-server-processon-node

> 🧠 基于 Node.js + TypeScript 实现的 [ProcessOn](https://www.processon.com) MCP Server，支持从 Markdown 内容自动生成思维导图。

## 📦 项目地址

- GitHub: [https://github.com/liqi888/mcp-server-processon-node](https://github.com/liqi888/mcp-server-processon-node)

- npm: [https://www.npmjs.com/package/@processon/mcp-server-processon-node](https://www.npmjs.com/package/@processon/mcp-server-processon-node)

## ⚙️ 环境变量配置

- 服务通过环境变量读取 ProcessOn 配置信息：

| 变量名               | 是否必须 | 说明                                                                                     |
|----------------------|----------|--------|
| `PROCESSON_API_KEY`  | ✅ 是     | 你的 ProcessOn API 密钥（可在 [www.processon.com](https://www.processon.com/setting) 账户中心 获取） |
| `BASE_URL`           | ❌ 否     | 自定义 API 地址（默认使用官方地址）                                                                   |


- 在项目根目录下创建 `.env` 文件，或通过环境变量方式传入以下配置：

```env
# 必填，用于调用 ProcessOn 接口
PROCESSON_API_KEY=你的 API Key

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

## 🧰 本地开发与调试（项目开发或维护者使用）

### 1. 将GitHub项目下载到本地
```
mcp-server-processon-node/
├── src/                        # 源代码目录（TypeScript 源文件）
│   └── index.ts                # 服务主入口，定义 MCP 方法、注册 Handler 等
├── chatmcp.yaml                # MCP 配置文件，用于描述服务元信息、能力、参数
├── package.json                # NPM 项目配置文件，定义依赖、脚本、元数据
├── package-lock.json           # 锁定依赖版本，确保构建一致性
├── tsconfig.json               # TypeScript 编译配置文件
└── README.md                   # 项目说明文档（功能简介、安装、用法等）
       
```

### 2. 终端进入到项目根目录执行以下命令

```bash
# 安装依赖
npm install

# 本地开发时持续监听构建
npm run watch

# 构建项目
npm run build

# 使用 npm link 注册本地命令
npm link

```
### 3. Cherry Studio 本地配置示例：

- **说明**：启动成功后即可在右侧工具栏中看到 `check` 和 `createProcessOnMind` 两个工具接口。

```json
"processon_mind_local": {
    "name": "ProcessOn_CreateMind",
    "type": "stdio",
    "description": "ProcessOn创建思维导图",
    "isActive": true,
    "registryUrl": "",
    "command": "npx",
    "args": [
      "mcp-server-processon-node"
    ],
    "env": {
      "PROCESSON_API_KEY": "{YOU PROCESSON_API_KEY}"
    }
}
```

### 4. 打包发布到 npm

```bash

# 登录
npm login

# 发布
npm publish --access public

```

---

## 🧩 Cherry Studio 正式包配置示例：

| 字段 | 值                              |
| -- | ------------------------------ |
| 类型 | 标准输入/输出（stdio）                 |
| 命令 | npx                            |
| 参数 | @processon/mcp-server-processon-node@latest |
|环境变量|PROCESSON_API_KEY={YOU PROCESSON_API_KEY}|


**说明**：
1. @latest 可以替换成具体的版本号（例如 @1.0.9）
2. 你的 ProcessOn API 密钥可在 [www.processon.com](https://www.processon.com/setting) 账户中心获取

```bash
# 底层实际执行命令

npx @processon/mcp-server-processon-node@latest
```


3. 启动成功后即可在右侧工具栏中看到 `check` 和 `createProcessOnMind` 两个工具接口。

4. JSON配置示例
```json

"processon_mind_online": {
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


## 🚀 安装使用

### 方式一：通过 npx 启动（推荐）

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


## 📄 License

MIT © 2025 [琪天大圣](https://github.com/liqi888/mcp-server-processon-node)