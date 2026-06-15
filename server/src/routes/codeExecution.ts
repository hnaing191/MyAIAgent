import express, { Router, Request, Response } from 'express'
import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'

export const codeExecutionRouter: Router = express.Router()

const execAsync = promisify(exec)

const TEMP_DIR = path.join(os.tmpdir(), 'myaiagent-exec')

// Ensure temp directory exists
fs.mkdir(TEMP_DIR, { recursive: true }).catch(console.error)

// Execute Python code
codeExecutionRouter.post('/python', async (req: Request, res: Response) => {
  try {
    const { code, timeout = 10000 } = req.body

    if (!code) {
      return res.status(400).json({ error: 'Code is required' })
    }

    const tempFile = path.join(TEMP_DIR, `script_${Date.now()}.py`)
    await fs.writeFile(tempFile, code)

    try {
      const { stdout, stderr } = await execAsync(`python3 ${tempFile}`, {
        timeout,
        maxBuffer: 10 * 1024 * 1024,
      })

      res.json({
        language: 'python',
        success: true,
        output: stdout,
        error: stderr || '',
      })
    } finally {
      await fs.unlink(tempFile).catch(() => {})
    }
  } catch (error: any) {
    res.json({
      language: 'python',
      success: false,
      output: '',
      error: error.message,
    })
  }
})

// Execute Node.js/JavaScript code
codeExecutionRouter.post('/javascript', async (req: Request, res: Response) => {
  try {
    const { code, timeout = 10000 } = req.body

    if (!code) {
      return res.status(400).json({ error: 'Code is required' })
    }

    const tempFile = path.join(TEMP_DIR, `script_${Date.now()}.js`)
    await fs.writeFile(tempFile, code)

    try {
      const { stdout, stderr } = await execAsync(`node ${tempFile}`, {
        timeout,
        maxBuffer: 10 * 1024 * 1024,
      })

      res.json({
        language: 'javascript',
        success: true,
        output: stdout,
        error: stderr || '',
      })
    } finally {
      await fs.unlink(tempFile).catch(() => {})
    }
  } catch (error: any) {
    res.json({
      language: 'javascript',
      success: false,
      output: '',
      error: error.message,
    })
  }
})

// Execute Bash code
codeExecutionRouter.post('/bash', async (req: Request, res: Response) => {
  try {
    const { code, timeout = 10000 } = req.body

    if (!code) {
      return res.status(400).json({ error: 'Code is required' })
    }

    try {
      const { stdout, stderr } = await execAsync(code, {
        timeout,
        maxBuffer: 10 * 1024 * 1024,
      })

      res.json({
        language: 'bash',
        success: true,
        output: stdout,
        error: stderr || '',
      })
    } catch (execError: any) {
      res.json({
        language: 'bash',
        success: false,
        output: execError.stdout || '',
        error: execError.stderr || execError.message,
      })
    }
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

// Execute Go code
codeExecutionRouter.post('/go', async (req: Request, res: Response) => {
  try {
    const { code, timeout = 10000 } = req.body

    if (!code) {
      return res.status(400).json({ error: 'Code is required' })
    }

    const tempFile = path.join(TEMP_DIR, `script_${Date.now()}.go`)
    await fs.writeFile(tempFile, code)

    try {
      const { stdout, stderr } = await execAsync(`go run ${tempFile}`, {
        timeout,
        maxBuffer: 10 * 1024 * 1024,
      })

      res.json({
        language: 'go',
        success: true,
        output: stdout,
        error: stderr || '',
      })
    } finally {
      await fs.unlink(tempFile).catch(() => {})
    }
  } catch (error: any) {
    res.json({
      language: 'go',
      success: false,
      output: '',
      error: error.message,
    })
  }
})
