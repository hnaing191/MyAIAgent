import express, { Router, Request, Response } from 'express'
import axios from 'axios'

export const llmRouter: Router = express.Router()

const LLAMA_URL = process.env.LLAMA_URL || 'http://localhost:11434'
const MODEL = process.env.MODEL || 'qwen2.5-coder:0.5b-Instruct-gguf:q8_0'

// Generate response with MCP tool awareness
llmRouter.post('/generate', async (req: Request, res: Response) => {
  try {
    const { prompt, temperature = 0.7, stream = false } = req.body

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' })
    }

    // Get available tools from MCP
    const toolsResponse = await axios.get('http://localhost:3001/api/mcp/tools')
    const tools = toolsResponse.data.tools

    // Format tools for the prompt
    const toolsDescription = tools
      .map(
        (tool: any) =>
          `- ${tool.name}: ${tool.description}`
      )
      .join('\n')

    // Enhance prompt with available tools
    const enhancedPrompt = `Available tools:
${toolsDescription}

User query: ${prompt}

If you need to use a tool, format your response as:
<tool>
name: tool_name
arguments: {"key": "value"}
</tool>`

    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream')
      res.setHeader('Cache-Control', 'no-cache')
      res.setHeader('Connection', 'keep-alive')

      try {
        const response = await axios.post(
          `${LLAMA_URL}/api/generate`,
          {
            model: MODEL,
            prompt: enhancedPrompt,
            stream: true,
          },
          {
            responseType: 'stream',
          }
        )

        response.data.on('data', (chunk: Buffer) => {
          const lines = chunk.toString().split('\n')
          lines.forEach((line) => {
            if (line) {
              try {
                const data = JSON.parse(line)
                res.write(
                  `data: ${JSON.stringify({
                    type: 'token',
                    response: data.response,
                  })}\n\n`
                )
              } catch (e) {
                // Skip invalid JSON lines
              }
            }
          })
        })

        response.data.on('end', () => {
          res.write(`data: ${JSON.stringify({ type: 'end' })}\n\n`)
          res.end()
        })

        response.data.on('error', (error: Error) => {
          res.write(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`)
          res.end()
        })
      } catch (error: any) {
        res.write(
          `data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`
        )
        res.end()
      }
    } else {
      const response = await axios.post(`${LLAMA_URL}/api/generate`, {
        model: MODEL,
        prompt: enhancedPrompt,
        stream: false,
      })

      const fullResponse = response.data.response

      // Check if response contains tool calls
      const toolMatch = fullResponse.match(
        /<tool>\s*name:\s*([^\n]+)\s*arguments:\s*({[^}]+})\s*<\/tool>/
      )

      if (toolMatch) {
        const toolName = toolMatch[1].trim()
        const toolArgs = JSON.parse(toolMatch[2])

        // Execute the tool
        try {
          const toolResult = await axios.post(
            `http://localhost:3001/api/mcp/tool/${toolName}`,
            { arguments: toolArgs }
          )

          res.json({
            response: fullResponse,
            toolCall: {
              name: toolName,
              arguments: toolArgs,
              result: toolResult.data,
            },
          })
        } catch (toolError: any) {
          res.json({
            response: fullResponse,
            toolCall: {
              name: toolName,
              arguments: toolArgs,
              error: toolError.message,
            },
          })
        }
      } else {
        res.json({
          response: fullResponse,
          toolCall: null,
        })
      }
    }
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

// List available models
llmRouter.get('/models', async (req: Request, res: Response) => {
  try {
    const response = await axios.get(`${LLAMA_URL}/api/tags`)
    res.json(response.data)
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

// Check server health
llmRouter.get('/health', async (req: Request, res: Response) => {
  try {
    await axios.get(`${LLAMA_URL}/api/tags`, { timeout: 5000 })
    res.json({ status: 'ok', server: LLAMA_URL, model: MODEL })
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      server: LLAMA_URL,
      error: error.message,
    })
  }
})
