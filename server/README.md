# MyAIAgent Backend Server

A comprehensive backend server for MyAIAgent with MCP (Model Context Protocol) integration, providing file system, bash, git, code execution, and debugging tools.

## Features

- **Filesystem Operations**: Read, write, list files and directories
- **Bash Execution**: Execute shell commands with streaming support
- **Git Integration**: Status, log, diff, commit, push operations
- **Code Execution**: Python, JavaScript, Bash, Go code execution
- **Debugging**: Breakpoints, watches, code context inspection
- **MCP Tools**: Standardized tool interface for AI integration
- **LLM Bridge**: Direct integration with llama.cpp server

## Installation

```bash
cd server
npm install
```

## Configuration

Create `.env` file:

```bash
cp .env.example .env
```

Edit `.env` with your settings:

```
LLAMA_URL=http://localhost:11434
MODEL=qwen2.5-coder:0.5b-Instruct-gguf:q8_0
PORT=3001
PROJECT_DIR=./projects
```

## Running

### Development

```bash
npm run dev
```

### Production

```bash
npm run build
npm run start
```

## API Endpoints

### Health & Info

- `GET /health` - Server health check
- `GET /api/config` - Configuration info
- `GET /api/llm/models` - Available LLM models
- `GET /api/llm/health` - LLM server health

### Filesystem (`/api/fs`)

- `GET /list/:dir?` - List directory contents
- `GET /read/:filepath` - Read file
- `POST /write/:filepath` - Write file
- `POST /mkdir/:dirpath` - Create directory
- `DELETE /:filepath` - Delete file/directory
- `POST /search` - Search for files

### Bash (`/api/bash`)

- `POST /exec` - Execute command
- `POST /stream` - Stream command output
- `GET /env` - Get environment variables

### Git (`/api/git`)

- `GET /status` - Repository status
- `GET /log/:limit?` - Commit history
- `GET /branch` - Branch information
- `GET /diff/:filepath` - File diff
- `POST /add` - Stage files
- `POST /commit` - Create commit
- `POST /push` - Push to remote

### Code Execution (`/api/execute`)

- `POST /python` - Execute Python code
- `POST /javascript` - Execute JavaScript code
- `POST /bash` - Execute Bash code
- `POST /go` - Execute Go code

### Debugging (`/api/debug`)

- `POST /breakpoint/set` - Set breakpoint
- `GET /breakpoint/list/:file?` - List breakpoints
- `DELETE /breakpoint/:file/:line` - Remove breakpoint
- `DELETE /breakpoint` - Clear all breakpoints
- `POST /watch` - Add watch expression
- `GET /watch` - List watches
- `DELETE /watch/:index` - Remove watch
- `GET /context/:file/:line` - Get code context

### MCP Tools (`/api/mcp`)

- `GET /tools` - List available tools
- `POST /tool/:name` - Call a tool

### LLM Integration (`/api/llm`)

- `POST /generate` - Generate LLM response with tool awareness
- `GET /models` - List available models

## Usage Examples

### Read a File

```bash
curl http://localhost:3001/api/fs/read/src/main.ts
```

### Execute Python Code

```bash
curl -X POST http://localhost:3001/api/execute/python \
  -H "Content-Type: application/json" \
  -d '{"code": "print(2 + 2)"}'
```

### Execute a Command

```bash
curl -X POST http://localhost:3001/api/bash/exec \
  -H "Content-Type: application/json" \
  -d '{"command": "ls -la"}'
```

### Generate LLM Response

```bash
curl -X POST http://localhost:3001/api/llm/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Write a Python function to reverse a string"}'
```

### Call an MCP Tool

```bash
curl -X POST http://localhost:3001/api/mcp/tool/read_file \
  -H "Content-Type: application/json" \
  -d '{"arguments": {"path": "README.md"}}'
```

## Security Considerations

1. **Path Traversal**: All file paths are normalized and confined to BASE_DIR
2. **Command Execution**: Dangerous commands are blocked
3. **Sandboxing**: Code execution runs in temp directory
4. **Timeouts**: All executions have timeout limits
5. **Environment**: Only safe environment variables are exposed

## Performance Tips

- Set reasonable timeouts for code execution
- Limit file sizes for read operations
- Use streaming for long-running commands
- Cache frequently accessed files
- Monitor memory usage in temp directory

## Troubleshooting

### Can't connect to llama.cpp

```bash
curl http://localhost:11434/api/tags
```

### Command timeout

Increase timeout in request:

```bash
curl -X POST http://localhost:3001/api/bash/exec \
  -d '{"command": "sleep 60", "timeout": 120000}'
```

### Out of memory

Clean temp directory:

```bash
rm -rf /tmp/myaiagent-exec/*
```

## Contributing

Feel free to add new tools or improve existing ones!

## License

MIT
