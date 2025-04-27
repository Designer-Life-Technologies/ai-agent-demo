/**
 * Defines API: /ai
 */
import { Router } from 'express'
import simpleChat from './simple-chat'
import reAct from './react'

const router = Router()

router.use('/simple-chat', simpleChat)
router.use('/re-act', reAct)

export default router
