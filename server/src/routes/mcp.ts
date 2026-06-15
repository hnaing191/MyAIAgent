import express, { Router, Request, Response } from 'express'
import axios from 'axios'

export const mcpRouter: Router = express.Router()

interface MCPTool {
  name: string
  description: string
  inputSchema: Record<string, any>
}

const tools: Map<string, MCPTool> = new Map()

// Initialize available tools
const initializeTools = () => {
  const availableTools: MCPTool[] = [
    {
      name: 'read_file',
      description: 'Read contents of a file',
      inputSchema: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'File path to read' },
        },
        required: ['path'],
      },
    },
    {
      name: 'write_file',
      description: 'Write content to a file',
      inputSchema: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'File path to write' },
          content: { type: 'string', description: 'Content to write' },
        },
        required: ['path', 'content'],
      },
    },
    {
      name: 'execute_code',
      description: 'Execute code in a specific language',
      inputSchema: {
        type: 'object',
        properties: {
          language: {
            type: 'string',
            enum: ['python', 'javascript', 'bash', 'go'],
            description: 'Programming language',
          },
          code: { type: 'string', description: 'Code to execute' },
        },
        required: ['language', 'code'],
      },
    },
    {
      name: 'list_files',
      description: 'List files in a directory',
      inputSchema: {
        type: 'object',
        properties: {
          directory: { type: 'string', description: 'Directory path' },
        },
      },
    },
    {
      name: 'execute_command',
      description: 'Execute a shell command',
      inputSchema: {
        type: 'object',
        properties: {
          command: { type: 'string', description: 'Shell command to execute' },
        },
        required: ['command'],
      },
    },
    {
      name: 'git_status',
      description: 'Get git repository status',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'debug_file',
      description: 'Set debugging breakpoint in a file',
      inputSchema: {
        type: 'object',
        properties: {
          file: { type: 'string', description: 'File path' },
          line: { type: 'number', description: 'Line number' },
          condition: { type: 'string', description: 'Optional breakpoint condition' },
        },
        required: ['file', 'line'],
      },
    },
  ]

  availableTools.forEach((tool) => tools.set(tool.name, tool))
}

initializeTools()

// Get available tools
mcpRouter.get('/tools', (req: Request, res: Response) => {
  const toolsList = Array.from(tools.values())
  res.json({
    tools: toolsList,
    count: toolsList.length,
  })
})

// Call a tool
mcpRouter.post('/tool/:name', async (req: Request, res: Response) => {
  try {
    const { name } = req.params
    const { arguments: args } = req.body

    const tool = tools.get(name)
    if (!tool) {
      return res.status(404).json({ error: `Tool '${name}' not found` })
    }

    let result: any

    switch (name) {
      case 'read_file':
        result = await axios.get(`http://localhost:3001/api/fs/read/${args.path}`)
        break
      case 'write_file':
        result = await axios.post(`http://localhost:3001/api/fs/write/${args.path}`, {
          content: args.content,
        })
        break
      case 'execute_code':
        result = await axios.post(
          `http://localhost:3001/api/execute/${args.language}`,
          { code: args.code }
        )
        break
      case 'list_files':
        result = await axios.get(`http://localhost:3001/api/fs/list/${args.directory || ''}`)
        break
      case 'execute_command':
        result = await axios.post('http://localhost:3001/api/bash/exec', {
          command: args.command,
        })
        break
      case 'git_status':
        result = await axios.get('http://localhost:3001/api/git/status')
        break
      case 'debug_file':
        result = await axios.post('http://localhost:3001/api/debug/breakpoint/set', {
          file: args.file,
          line: args.line,
          condition: args.condition,
        })
        break
      default:
        return res.status(400).json({ error: 'Unknown tool' })
    }

    res.json({
      tool: name,
      result: result.data,
    })
  } catch (error: any) {
    res.status(400).json({
      tool: req.params.name,
      error: error.message,
    })
  }
})
