/*!
 * App
 * xiewulong <xiewulong@vip.qq.com>
 * create: 2017/12/13
 * since: 0.0.1
 *
 * Required process.env
 * APP_MAILER_FROM
 * APP_MAILER_SMTP_ADDRESS
 * APP_MAILER_SMTP_PORT
 * APP_MAILER_SMTP_USERNAME
 * APP_MAILER_SMTP_PASSWORD
 */
'use strict';

const yaml = require('js-yaml');
const Koa = require('koa');
const bodyparser = require('koa-bodyparser');
const CSRF = require('koa-csrf');
const flash = require('koa-flash');
const i18n = require('koa-i18n');
const locale = require('koa-locale');
const mailer = require('koa-mailer-v2');
const mongo = require('koa-mongo');
const Pug = require('koa-pug');
const redis = require('koa-redis');
const session = require('koa-session');
const controllers = require('./controllers');

const app = module.exports = new Koa();
const development = app.env === 'development';

app.keys = [process.env.APP_SECRET_KEY_BASE];
app.context.pug = new Pug({
  app,
  // basedir: '',
  compileDebug: development,
  debug: development,
  // helperPath: [],
  locals: {},
  noCache: development,
  pretty: development,
  viewPath: 'views',
});
app.context.redis = redis({
  url: process.env.APP_REDIS_MASTER,
});

locale(app);

app
  .use(mongo({
    uri: process.env.APP_MONGO,
    // max: 100,
    // min: 1
  }))
  .use(session({
    domain: process.env.APP_SESSION_DOMAIN,
    // httpOnly: true,
    key: process.env.APP_SESSION_KEY,
    // maxAge: 86400000,
    // overwrite: true,
    // rolling: false,
    // signed: true,
    store: redis({
      url: process.env.APP_REDIS_MASTER,
      prefix: 'session:',
    }),
  }, app))
  // .use(new CSRF({
  //   // invalidSessionSecretMessage: 'Invalid session secret',
  //   // invalidSessionSecretStatusCode: 403,
  //   // invalidTokenMessage: 'Invalid CSRF token',
  //   // invalidTokenStatusCode: 403,
  //   // excludedMethods: ['GET', 'HEAD', 'OPTIONS'],
  //   // disableQuery: false,
  // }))
  .use(flash())
  .use(bodyparser({
    // detectJSON: (ctx) => {},
    // disableBodyParser: false,
    // enableTypes: ['json', 'form'],
    // encode: 'utf-8',
    // extendTypes: [],
    // formLimit: '56kb',
    // jsonLimit: '1mb',
    // onerror: (err, ctx) => {},
    // strict: true,
    // textLimit: '1mb',
  }))
  .use(i18n(app, {
    directory: 'locales',
    locales: ['zh-CN', 'en'],   // `zh-CN` defualtLocale, must match the locales to the filenames
    extension: '.yml',
    parse: data => yaml.safeLoad(data),
    dump: data => yaml.safeDump(data),
    modes: [
      'query',            // optional detect querystring - `/?locale=en-US`
      // 'subdomain',     // optional detect subdomain   - `zh-CN.koajs.com`
      // 'cookie',        // optional detect cookie      - `Cookie: locale=zh-TW`
      // 'header',        // optional detect header      - `Accept-Language: zh-CN,zh;q=0.5`
      // 'url',           // optional detect url         - `/en`
      // 'tld',           // optional detect tld(the last domain) - `koajs.cn`
      // function() {},   // optional custom function (will be bound to the koa context)
    ],
  }))
  .use(mailer({
    from: process.env.APP_MAILER_FROM,
    host: process.env.APP_MAILER_SMTP_ADDRESS,
    port: process.env.APP_MAILER_SMTP_PORT,
    secure: false,
    auth: {
      user: process.env.APP_MAILER_SMTP_USERNAME,
      pass: process.env.APP_MAILER_SMTP_PASSWORD,
    },
    logger: development,
    debug: development,
    test: development,
  }))
  .use(async (ctx, next) => {
    ctx.pug.locals.csrf = ctx.csrf;
    ctx.pug.locals.flash = ctx.flash;

    await next();
  })
  .use(controllers.routes(), controllers.allowedMethods())
  .use(async (ctx) => {
    ctx.status = 404;

    let text = 'Page Not Found';
    switch(ctx.accepts('html', 'json')) {
      case 'html':
        ctx.type = 'html';
        ctx.body = `<p>${text}</p>`;
        break;
      case 'json':
        ctx.body = {message: text};
        break;
      default:
        ctx.type = 'text';
        ctx.body = text;
    }
  })
  ;

// !module.parent && app.listen(process.env.APP_PORT);
app.listen(process.env.APP_PORT);
