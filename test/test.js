const assert = require('assert')
const supertest = require('supertest')
const Koa = require('koa')
const Router = require('koa-router')
const router = new Router()
const remoteIp = require('../index')

const app = new Koa()
app.use(router.routes())

router.get('/', remoteIp({isPrivateIpName: 'isPrivateIp'}))
router.get('/header/none', remoteIp({trustedHeaderSequence: []}))
router.get('/header/x-forwarded-for', remoteIp())
router.get('/header/x-real-ip', remoteIp({trustedHeaderSequence: ['X-Real-IP', 'X-Forwarded-For']}))

app.use(async (ctx, next) => {
  ctx.body = {
    remoteIp: ctx.remoteIp,
    isPrivate: ctx.isPrivateIp
  }
})

function request() {
  return supertest(app.listen());
}

const publicIp = '8.8.8.8'
const privateIp = '10.0.0.1'
const xForwardedFor = `${publicIp}, ${privateIp}`
const xRealIp = '4.4.4.4'

describe('Public IP', function () {
  it(publicIp, function (done) {
    request(app)
      .get('/')
      .set('x-forwarded-for', publicIp)
      .expect(200, { remoteIp: publicIp, isPrivate: false }, done)
  })
})

describe('Private IP', function () {
  it(privateIp, function (done) {
    request(app)
      .get('/')
      .set('x-forwarded-for', privateIp)
      .expect(200, { remoteIp: privateIp, isPrivate: true }, done)
  })
})

describe('LoopBack', function () {
  it('LoopBack', function (done) {
    request(app)
      .get('/')
      .expect(200)
      .then(res => {
        assert(res.body.isPrivate === true)
        done()
      })
  })
})

describe('Multi proxy', function () {
  it(xForwardedFor, function (done) {
    request(app)
      .get('/')
      .set('x-forwarded-for', xForwardedFor)
      .expect(200, { remoteIp: publicIp, isPrivate: false }, done)
  })
})

describe('Specify Trusted Header', function () {
  it('not trust header', function (done) {
    request(app)
      .get('/header/none')
      .set('x-real-ip', xRealIp)
      .set('x-forwarded-for', xForwardedFor)
      .expect(200, { remoteIp: '::ffff:127.0.0.1' }, done)
  })

  it('X-Forwarded-For', function (done) {
    request(app)
      .get('/header/x-forwarded-for')
      .set('x-real-ip', xRealIp)
      .set('x-forwarded-for', xForwardedFor)
      .expect(200, { remoteIp: publicIp }, done)
  })

  it('X-Real-IP', function (done) {
    request(app)
      .get('/header/x-real-ip')
      .set('x-real-ip', xRealIp)
      .set('x-forwarded-for', xForwardedFor)
      .expect(200, { remoteIp: xRealIp }, done)
  })
})
