import express, { Router, Request, Response } from 'express'
import fs from 'fs/promises'
import path from 'path'
import { existsSync } from 'fs'

export const fileSystemRouter: Router = express.Router()

const BASE_DIR = process.env.PROJECT_DIR || process.cwd()

const normalizePath = (p: string): string => {
  const normalized = path.normalize(path.join(BASE_DIR, p))
  if (!normalized.startsWith(BASE_DIR)) {
    throw new Error('Path traversal not allowed')
  }
  return normalized
}

// List directory contents
fileSystemRouter.get('/list/:dir?', async (req: Request, res: Response) => {
  try {
    const dir = req.params.dir ? decodeURIComponent(req.params.dir) : ''
    const fullPath = normalizePath(dir)

    const stats = await fs.stat(fullPath)
    if (!stats.isDirectory()) {
      return res.status(400).json({ error: 'Path is not a directory' })
    }

    const files = await fs.readdir(fullPath, { withFileTypes: true })
    const contents = await Promise.all(
      files.map(async (file) => {
        const filePath = path.join(fullPath, file.name)
        const fileStats = await fs.stat(filePath)
        return {
          name: file.name,
          path: path.relative(BASE_DIR, filePath),
          type: file.isDirectory() ? 'directory' : 'file',
          size: fileStats.size,
          modified: fileStats.mtime.toISOString(),
        }
      })
    )

    res.json({
      path: path.relative(BASE_DIR, fullPath),
      contents: contents.sort((a, b) => {
        if (a.type !== b.type) return a.type === 'directory' ? -1 : 1
        return a.name.localeCompare(b.name)
      }),
    })
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

// Read file
fileSystemRouter.get('/read/:filepath(*)', async (req: Request, res: Response) => {
  try {
    const filepath = decodeURIComponent(req.params.filepath)
    const fullPath = normalizePath(filepath)

    const stats = await fs.stat(fullPath)
    if (!stats.isFile()) {
      return res.status(400).json({ error: 'Path is not a file' })
    }

    const content = await fs.readFile(fullPath, 'utf-8')
    const lines = content.split('\n')

    res.json({
      path: filepath,
      size: stats.size,
      lines: lines.length,
      content,
      encoding: 'utf-8',
    })
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

// Write file
fileSystemRouter.post('/write/:filepath(*)', async (req: Request, res: Response) => {
  try {
    const filepath = decodeURIComponent(req.params.filepath)
    const fullPath = normalizePath(filepath)
    const { content, createDirs } = req.body

    if (createDirs) {
      await fs.mkdir(path.dirname(fullPath), { recursive: true })
    }

    await fs.writeFile(fullPath, content, 'utf-8')

    res.json({
      path: filepath,
      size: content.length,
      message: 'File written successfully',
    })
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

// Create directory
fileSystemRouter.post('/mkdir/:dirpath(*)', async (req: Request, res: Response) => {
  try {
    const dirpath = decodeURIComponent(req.params.dirpath)
    const fullPath = normalizePath(dirpath)

    await fs.mkdir(fullPath, { recursive: true })

    res.json({
      path: dirpath,
      message: 'Directory created successfully',
    })
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

// Delete file or directory
fileSystemRouter.delete('/:filepath(*)', async (req: Request, res: Response) => {
  try {
    const filepath = decodeURIComponent(req.params.filepath)
    const fullPath = normalizePath(filepath)

    const stats = await fs.stat(fullPath)
    if (stats.isDirectory()) {
      await fs.rm(fullPath, { recursive: true })
    } else {
      await fs.unlink(fullPath)
    }

    res.json({
      path: filepath,
      message: 'Deleted successfully',
    })
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

// Search files
fileSystemRouter.post('/search', async (req: Request, res: Response) => {
  try {
    const { pattern, dir } = req.body
    const searchDir = dir ? normalizePath(dir) : BASE_DIR
    const regex = new RegExp(pattern, 'i')

    const results: string[] = []

    const search = async (currentPath: string) => {
      if (results.length > 100) return
      const files = await fs.readdir(currentPath, { withFileTypes: true })

      for (const file of files) {
        if (file.isDirectory() && !file.name.startsWith('.')) {
          await search(path.join(currentPath, file.name))
        } else if (regex.test(file.name)) {
          results.push(path.relative(BASE_DIR, path.join(currentPath, file.name)))
        }
      }
    }

    await search(searchDir)

    res.json({ pattern, results: results.slice(0, 50) })
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})
