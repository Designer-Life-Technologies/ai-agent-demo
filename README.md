# ai-agent-demo

A TypeScript-based AI Agent demo project using LangChain, LangGraph, and multiple LLM providers. This project demonstrates modular agent architectures, memory, and prompt engineering with a focus on composability and modern AI best practices.

---

## Features

- **LangChain + LangGraph**: Build and run composable, stateful AI graphs
- **Multiple LLM Providers**: OpenAI, XAI (Grok), Anthropic (Claude), and more
- **Memory & Persistence**: Built-in support for conversation memory
- **Prompt Engineering**: Easily customize system and user prompts
- **MCP Support**: Model Context Protocol for LLM app interoperability
- **TypeScript-first**: Full static typing and schema validation with Zod

## Project Structure

```
├── src/
│   ├── ai/
│   │   ├── simple-chat/   # Simple chat agent (graph, prompt, etc.)
│   │   └── reason-act/    # Reason+Act agent (expandable)
│   ├── api/               # Express API endpoints
│   ├── environment.ts     # Environment config
│   └── index.ts           # API server entrypoint
├── langgraph.json         # LangGraph config
├── .env.dev               # Environment variables (dev)
├── package.json           # NPM dependencies and scripts
└── README.md              # Project documentation
```

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/Designer-Life-Technologies/ai-agent.git
cd ai-agent
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment

Copy `.env.example` and update your API keys as needed:

```bash
cp .env.example .env.dev
# Edit .env.dev to add your keys for OpenAI, Anthropic, XAI, etc.
```

### 4. Build the Project

```bash
npm run build
```

### 5. Run the API Server

```bash
npm start
```

### 6. (Optional) Run LangGraph Dev Server

For interactive graph development:

```bash
npm run langgraph
```

## Usage

- Use the `/api/ai/simple-chat` endpoint for simple LLM chat.
- Extend with new agents/graphs in `src/ai/`.
- See `src/ai/simple-chat/graph.ts` for graph construction and prompt examples.

## Scripts

| Command             | Description                      |
| ------------------- | -------------------------------- |
| `npm run build`     | Compile TypeScript               |
| `npm start`         | Start API server                 |
| `npm run build:dev` | Compile TypeScript (development) |
| `npm run start:dev` | Start API server (development)   |
| `npm run test`      | Run tests with Jest              |
| `npm run langgraph` | Launch LangGraph dev environment |
| `npm run clean`     | Clean build and coverage folders |

## Dependencies

- [LangChain](https://js.langchain.com/)
- [LangGraph](https://js.langchain.com/docs/langgraph/)
- [OpenAI, Anthropic, XAI SDKs](https://js.langchain.com/docs/integrations/llms/)
- [Express](https://expressjs.com/)
- [Zod](https://zod.dev/)
- [dotenv](https://www.npmjs.com/package/dotenv)

## License

MIT

---

For questions or contributions, please open an issue or pull request on [GitHub](https://github.com/Designer-Life-Technologies/ai-agent).
