import express, { Router, Request, Response } from 'express'
import { exec, spawn } from 'child_process'
import { promisify } from 'util'

export const bashRouter: Router = express.Router()

const execAsync = promisify(exec)

interface ExecResult {
  stdout: string
  stderr: string
}

// Execute shell command
bashRouter.post('/exec', async (req: Request, res: Response) => {
  try {
    const { command, timeout = 30000 } = req.body

    if (!command || typeof command !== 'string') {
      return res.status(400).json({ error: 'Command is required' })
    }

    // Basic security: prevent dangerous commands
    const dangerousCommands = ['rm -rf', 'mkfs', 'dd if=/dev/zero', 'shutdown', 'reboot']
    if (dangerousCommands.some((cmd) => command.includes(cmd))) {
      return res.status(403).json({ error: 'Command not allowed' })
    }

    const result = await execAsync(command, {
      timeout,
      maxBuffer: 10 * 1024 * 1024,
      cwd: process.env.PROJECT_DIR || process.cwd(),
    })

    res.json({
      command,
      success: true,
      stdout: result.stdout,
      stderr: result.stderr || '',
      code: 0,
    })
  } catch (error: any) {
    res.json({
      command: req.body.command,
      success: false,
      stdout: error.stdout || '',
      stderr: error.stderr || error.message,
      code: error.code || 1,
    })
  }
})

// Stream command execution (for long-running commands)
bashRouter.post('/stream', (req: Request, res: Response) => {
  try {
    const { command } = req.body

    if (!command) {
      return res.status(400).json({ error: 'Command is required' })
    }

    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')

    const child = spawn('bash', ['-c', command], {
      cwd: process.env.PROJECT_DIR || process.cwd(),
    })

    child.stdout.on('data', (data) => {
      res.write(`data: ${JSON.stringify({ type: 'stdout', data: data.toString() })}\n\n`)
    })

    child.stderr.on('data', (data) => {
      res.write(`data: ${JSON.stringify({ type: 'stderr', data: data.toString() })}\n\n`)
    })

    child.on('close', (code) => {
      res.write(
        `data: ${JSON.stringify({ type: 'exit', code })}\n\n`
      )
      res.end()
    })

    req.on('close', () => {
      child.kill()
    })
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

// Get environment variables
bashRouter.get('/env', (req: Request, res: Response) => {
  const env = process.env
  const safe = {
    PATH: env.PATH,
    HOME: env.HOME,
    USER: env.USER,
    SHELL: env.SHELL,
    PWD: env.PWD,
    LANG: env.LANG,
  }
  res.json(safe)
})
