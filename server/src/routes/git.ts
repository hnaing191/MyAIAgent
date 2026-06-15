import express, { Router, Request, Response } from 'express'
import simpleGit, { SimpleGit } from 'simple-git'
import path from 'path'

export const gitRouter: Router = express.Router()

const BASE_DIR = process.env.PROJECT_DIR || process.cwd()

const getGit = (dir: string = BASE_DIR): SimpleGit => {
  return simpleGit(dir)
}

// Get git status
gitRouter.get('/status', async (req: Request, res: Response) => {
  try {
    const git = getGit()
    const status = await git.status()

    res.json({
      branch: status.current,
      modified: status.modified,
      created: status.created,
      deleted: status.deleted,
      renamed: status.renamed,
      conflicted: status.conflicted,
      ahead: status.ahead,
      behind: status.behind,
      tracking: status.tracking,
    })
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

// Get commit log
gitRouter.get('/log/:limit?', async (req: Request, res: Response) => {
  try {
    const git = getGit()
    const limit = parseInt(req.params.limit || '10')
    const log = await git.log({ maxCount: limit })

    res.json({
      commits: log.all.map((commit) => ({
        hash: commit.hash,
        author: commit.author_name,
        message: commit.message,
        date: commit.date,
      })),
    })
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

// Get current branch
gitRouter.get('/branch', async (req: Request, res: Response) => {
  try {
    const git = getGit()
    const branches = await git.branch()

    res.json({
      current: branches.current,
      all: branches.all,
    })
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

// Show file diff
gitRouter.get('/diff/:filepath(*)', async (req: Request, res: Response) => {
  try {
    const filepath = decodeURIComponent(req.params.filepath)
    const git = getGit()
    const diff = await git.diff([filepath])

    res.json({
      filepath,
      diff,
    })
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

// Add files
gitRouter.post('/add', async (req: Request, res: Response) => {
  try {
    const { files } = req.body
    const git = getGit()

    if (Array.isArray(files)) {
      await git.add(files)
    } else {
      await git.add('.')
    }

    res.json({ message: 'Files added successfully' })
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

// Commit
gitRouter.post('/commit', async (req: Request, res: Response) => {
  try {
    const { message } = req.body
    if (!message) {
      return res.status(400).json({ error: 'Commit message required' })
    }

    const git = getGit()
    const result = await git.commit(message)

    res.json({ result })
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

// Push to remote
gitRouter.post('/push', async (req: Request, res: Response) => {
  try {
    const { remote = 'origin', branch } = req.body
    const git = getGit()

    const args = [remote]
    if (branch) args.push(branch)

    await git.push(args)

    res.json({ message: 'Pushed successfully' })
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})
