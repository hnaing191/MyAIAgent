import express, { Router, Request, Response } from 'express'
import fs from 'fs/promises'
import path from 'path'

export const debuggingRouter: Router = express.Router()

interface Breakpoint {
  file: string
  line: number
  condition?: string
}

const breakpoints: Map<string, Breakpoint[]> = new Map()
const watches: Map<string, string[]> = new Map()

// Set breakpoint
debuggingRouter.post('/breakpoint/set', async (req: Request, res: Response) => {
  try {
    const { file, line, condition } = req.body

    if (!file || !line) {
      return res.status(400).json({ error: 'File and line are required' })
    }

    const fileBreakpoints = breakpoints.get(file) || []
    fileBreakpoints.push({ file, line, condition })
    breakpoints.set(file, fileBreakpoints)

    res.json({
      file,
      line,
      condition,
      message: 'Breakpoint set',
    })
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

// Get breakpoints
debuggingRouter.get('/breakpoint/list/:file?', (req: Request, res: Response) => {
  try {
    const file = req.params.file ? decodeURIComponent(req.params.file) : null

    if (file) {
      res.json({ file, breakpoints: breakpoints.get(file) || [] })
    } else {
      const allBreakpoints = Array.from(breakpoints.entries()).map(([f, bp]) => ({
        file: f,
        breakpoints: bp,
      }))
      res.json({ breakpoints: allBreakpoints })
    }
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

// Remove breakpoint
debuggingRouter.delete('/breakpoint/:file/:line', (req: Request, res: Response) => {
  try {
    const file = decodeURIComponent(req.params.file)
    const line = parseInt(req.params.line)

    const fileBreakpoints = breakpoints.get(file) || []
    const filtered = fileBreakpoints.filter((bp) => bp.line !== line)
    breakpoints.set(file, filtered)

    res.json({ message: 'Breakpoint removed' })
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

// Clear all breakpoints
debuggingRouter.delete('/breakpoint', (req: Request, res: Response) => {
  breakpoints.clear()
  res.json({ message: 'All breakpoints cleared' })
})

// Add watch expression
debuggingRouter.post('/watch', (req: Request, res: Response) => {
  try {
    const { expression } = req.body

    if (!expression) {
      return res.status(400).json({ error: 'Expression is required' })
    }

    const allWatches = watches.get('global') || []
    allWatches.push(expression)
    watches.set('global', allWatches)

    res.json({
      expression,
      message: 'Watch added',
    })
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

// Get watch expressions
debuggingRouter.get('/watch', (req: Request, res: Response) => {
  try {
    const allWatches = watches.get('global') || []
    res.json({ watches: allWatches })
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

// Remove watch
debuggingRouter.delete('/watch/:index', (req: Request, res: Response) => {
  try {
    const index = parseInt(req.params.index)
    const allWatches = watches.get('global') || []
    allWatches.splice(index, 1)
    watches.set('global', allWatches)

    res.json({ message: 'Watch removed' })
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

// Get code context around line
debuggingRouter.get('/context/:file/:line', async (req: Request, res: Response) => {
  try {
    const file = decodeURIComponent(req.params.file)
    const line = parseInt(req.params.line)
    const range = parseInt(req.query.range as string) || 5

    const content = await fs.readFile(file, 'utf-8')
    const lines = content.split('\n')

    const start = Math.max(0, line - range - 1)
    const end = Math.min(lines.length, line + range)

    const context = lines.slice(start, end).map((l, i) => ({
      line: start + i + 1,
      content: l,
      current: start + i + 1 === line,
    }))

    res.json({
      file,
      currentLine: line,
      context,
    })
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})
