/**
 * API Definition
 */
import express, { Router } from 'express'
import cors from 'cors'
import helmet from 'helmet'

import { Environment } from '../environment'

import ai from './ai'
// import { log } from './middleware/log'
import { error } from './middleware/error'
import { zodError } from './middleware/zod-error'

const router = Router()

// Respond to healthcheck
router.get('/health-check', function (_req, res) {
  res.send(Environment.server.status)
})

// Bind the /v1 API Endpoints
router.use('/ai', ai)

// Disallow robots
router.use('/robots.txt', function (_req, res) {
  res.type('text/plain').send('User-Agent: *\nDisallow: /')
})

// Catch all other requests
router.all(/(.*)/, function (_req, res) {
  res.status(400).send('Invalid API Endpoint')
})

const api = express()

api.use(cors())
api.use(helmet())
api.use(express.json())
api.use(express.urlencoded({ extended: true }))

// api.use(log)

api.use(router)

// Error Handler
api.use(zodError)
api.use(error)

export default api
