const _ = require('lodash')
const chalk = require('chalk')
const consola = require('consola')
const onFinished = require('on-finished')

const logger = (app) => {
  const originalSend = app.response.send
  app.response.send = function send (body) {
    originalSend.call(this, body)
    this.resBody = body
  }
  app.use(function (req, res, next) {
    req.startAt = process.hrtime()
    onFinished(res, (err, res) => {
      if (!err) {
        const reqObj = _.pick(req, ['headers', 'params', 'query', 'body'])
        const resObj = { statusCode: res.statusCode }
        try {
          resObj.body = JSON.parse(res.resBody)
        } catch (e) {
          resObj.body = res.resBody
        }
        log(req, res, reqObj, resObj)
      }
    })
    next()
  })
}

const log = (req, res, reqObj, resObj) => {
  const diff = process.hrtime(req.startAt)
  const resTime = (diff[0] * 1e3 + diff[1] * 1e-6).toFixed(2)
  consola.log('\n')
  consola.info('req:', reqObj)
  consola.info('res:', resObj)
  if (res.statusCode >= 400 && res.statusCode < 500) {
    consola.warn(resObj.body)
  } else if (res.statusCode >= 500) {
    consola.error(resObj.body)
  }
  consola.log(`${getRequestColor(res.statusCode, req.httpVersion)} ${
    getMethodColor(req.method)} ${req.originalUrl} - ${
    getStatusColor(res.statusCode)} - ${resTime} ms`)
}

const getMethodColor = (method) => {
  switch (method) {
    case 'GET':
      return chalk.green.bold('GET')
    case 'POST':
      return chalk.yellow.bold('POST')
    case 'PUT':
      return chalk.blue.bold('PUT')
    case 'PATCH':
      return chalk.blue.bold('PATCH')
    case 'DELETE':
      return chalk.red.bold('DELETE')
    default:
      return chalk.cyan.bold(method)
  }
}

const getRequestColor = (status, httpVersion) => status < 300
  ? chalk.black.bgGreen(` HTTP-${httpVersion} `)
  : status >= 300 && status < 400
    ? chalk.black.bgBlue(` HTTP-${httpVersion} `)
    : status >= 400 && status < 500
      ? chalk.black.bgYellow(` HTTP-${httpVersion} `)
      : chalk.black.bgRed(` HTTP-${httpVersion} `)

const getStatusColor = (status) => status < 300
  ? chalk.green(status)
  : status >= 300 && status < 400
    ? chalk.blue(status)
    : status >= 400 && status < 500
      ? chalk.blue(status)
      : chalk.red(status)

module.exports = logger
