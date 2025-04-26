import lodash from 'lodash'
import { Environment } from '../../environment'
import { v4 as uuid } from 'uuid'

export function log(req: any, res: any, next: any) {
  req.id = uuid()
  const startTime = Date.now()

  if (Environment.server.node_env !== 'test' && req.path !== '/health-check') {
    const data = lodash.pick(req, [
      'ip',
      'method',
      'path',
      'body',
      'query',
      'params',
    ])

    console.dir(
      {
        id: req.id,
        timestamp: new Date(startTime).toISOString(),
        ...data,
      },
      { depth: null },
    )

    res.on('finish', () => {
      const endTime = Date.now()
      const duration = (endTime - startTime) / 1000
      if (duration > 3.0) {
        console.warn({
          id: req.id,
          timestamp: new Date(endTime).toISOString(),
          statusCode: res.statusCode,
          statusMessage: res.statusMessage,
          warning: 'Slow API reponse',
          duration,
        })
      } else {
        console.info({
          id: req.id,
          timestamp: new Date(endTime).toISOString(),
          statusCode: res.statusCode,
          statusMessage: res.statusMessage,
          duration,
        })
      }
    })
  }

  next()
}
