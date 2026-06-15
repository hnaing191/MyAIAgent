import express, { Request, Response } from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { fileSystemRouter } from './routes/filesystem.js'
import { bashRouter } from './routes/bash.js'
import { gitRouter } from './routes/git.js'
import { codeExecutionRouter } from './routes/codeExecution.js'
import { debuggingRouter } from './routes/debugging.js'
import { mcpRouter } from './routes/mcp.js'
import { llmRouter } from './routes/llm.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001
const LLAMA_URL = process.env.LLAMA_URL || 'http://localhost:11434'
const MODEL = process.env.MODEL || 'qwen2.5-coder:0.5b-Instruct-gguf:q8_0'

// Middleware
app.use(cors())
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ limit: '50mb', extended: true }))

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// API Routes
app.use('/api/fs', fileSystemRouter)
app.use('/api/bash', bashRouter)
app.use('/api/git', gitRouter)
app.use('/api/execute', codeExecutionRouter)
app.use('/api/debug', debuggingRouter)
app.use('/api/mcp', mcpRouter)
app.use('/api/llm', llmRouter)

// Configuration endpoint
app.get('/api/config', (req: Request, res: Response) => {
  res.json({
    llama_url: LLAMA_URL,
    model: MODEL,
    version: '1.0.0',
  })
})

// Error handling
app.use((err: any, req: Request, res: Response) => {
  console.error('Error:', err)
  res.status(500).json({
    error: err.message || 'Internal server error',
    code: err.code,
  })
})

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 MyAIAgent Backend Server`)
  console.log(`📡 Listening on http://0.0.0.0:${PORT}`)
  console.log(`🤖 LLM Server: ${LLAMA_URL}`)
  console.log(`📦 Model: ${MODEL}`)
  console.log(`\n✅ Ready to accept connections\n`)
})
