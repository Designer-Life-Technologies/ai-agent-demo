/**
 * Defines API: /ai
 */
import { Router } from 'express'
import simpleChat from './simple-chat'
import reAct from './react'
import summaryChat from './summary-chat'
import streamingChat from './streaming-chat'
import researchAssistant from './research-assistant'
import todoMaistro from './todo-maistro'

const router = Router()

router.use('/simple-chat', simpleChat)
router.use('/re-act', reAct)
router.use('/summary-chat', summaryChat)
router.use('/streaming-chat', streamingChat)
router.use('/research-assistant', researchAssistant)
router.use('/todo-maistro', todoMaistro)

export default router
