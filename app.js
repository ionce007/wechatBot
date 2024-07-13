const express = require("express");
const session = require('express-session');
const cors = require("cors");
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const logger = require('morgan');
const serveStatic = require('serve-static');
const cookie = require('cookie-parser');
const crypto = require('crypto');
const path = require('path');
const http = require('http');
const WechatBot = require('wechat4u');
const wxbot = require('./middlewares/wxbot');

//const { WechatyBuilder, ScanStatus, Message, Contact,} = require('wechaty');
const { WechatyBuilder } = require('wechaty');

const app = express();
//app.locals.bots = {}
const server = http.createServer(app);
app.use(cookie());
const webRouter = require('./routes/webroutes');
const apiRouter = require('./routes/apiroutes');

app.use(rateLimit({ windowMs: 30 * 1000, max: 60 }));
app.use(compression());

//var corsOptions = { origin: "http://localhost:8081" };
//app.use(cors(corsOptions));

// parse requests of content-type - application/json
app.use(express.json());

app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
//app.set('trust proxy', true);


app.use(session({
  secret: crypto.randomBytes(64).toString('hex'),
  resave: false,
  saveUninitialized: true,
  cookie: { secure: true }
}));


app.use((req, res, next) => {
  let { token } = req.cookies;
  if (!token) {
    token = `wxbot${crypto.randomBytes(64).toString('hex')}`
    res.cookie('token', token);
  }
  const options = {
    name: token,
    // puppet: 'wechaty-puppet-whatsapp',   /* 为不同的 IM 指定不同的 puppet  */
    // puppet: 'wechaty-puppet-service',    /* 或 使用 wechaty puppet Services,功能最强*/  
    // puppetOptions: {token: 'xxx',}       /*  */
  }
  if (!app.locals.bots) app.locals.bots = {};
  if (!app.locals.paras) {
    app.locals.paras = {};
    app.locals.paras[token] = { module: 'ernie-Speed-128K', scene: 'SceneDH', assistant: ''}
  }

  let bot = app.locals.bots[token];
  if (!bot) {
    bot = WechatyBuilder.build(options);
    app.locals.bots[token] = bot;
  }
  else {
      bot.stop().then(()=>{
        bot = WechatyBuilder.build(options);
        app.locals.bots[token] = bot;
      })
  }
  next();
});



app.use(logger('dev'));
const cacheMaxAge = 30 * 24 * 3600;  // 30 days
let serveStaticOptions = { maxAge: cacheMaxAge * 1000 };
app.use(serveStatic(path.join(__dirname, 'public', 'index'), serveStaticOptions));

app.use('/', webRouter);
app.use('/api', apiRouter);
app.use('/img', serveStatic('./public/img', serveStaticOptions));
app.use('/assets', serveStatic('./assets', serveStaticOptions));

const db = require("./models");
db.sequelize.sync().then(() => {
    console.log("Synced db.");
  })
  .catch((err) => {
    console.log("Failed to sync db: " + err.message);
});

const PORT = process.env.PORT || 8080;

server.on("request", async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "*");
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS'); // 允许的HTTP方法
  res.header('Access-Control-Allow-Credentials', true);

  if (req.method === "OPTIONS") {
    res.status = 200;
    res.end();
    return;
  }

  if (req.url.toLowerCase() === '/api/uuid') {
    res.on('close', function () {
      console.log('res close!')
      res.end();
    })

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': "*",
      'Access-Control-Allow-Headers': 'Content-Type,Content-Length,Authorization,Accept,X-Requested-With',
      'Access-Control-Allow-Methods': 'PUT,POST,GET,DELETE,OPTIONS'
    });
    wxbot.listeningWechatState(req, res);
  }

  if (req.url === '/api/wechatstate') {
    res.on('close', function () {
      console.log('res close!')
      res.end();
    })
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': "*",
      'Access-Control-Allow-Headers': 'Content-Type,Content-Length,Authorization,Accept,X-Requested-With',
      'Access-Control-Allow-Methods': 'PUT,POST,GET,DELETE,OPTIONS'
    });
    //wxbot.listeningWechatState(req, res);
    wxbot.watchWechatState(req, res);
  }

  if (req.url === '/api/contact') {
    res.on('close', function () {
      console.log('res close!')
      res.end();
    })
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': "*",
      'Access-Control-Allow-Headers': 'Content-Type,Content-Length,Authorization,Accept,X-Requested-With',
      'Access-Control-Allow-Methods': 'PUT,POST,GET,DELETE,OPTIONS'
    });
    wxbot.getWechatContact(req, res);
  }

})
server.listen(PORT);

server.on('close', e => {
  console.log(`connection on port ${PORT} is closed.`);
  console.error(e.toString());
});

server.on('error', err => {
  console.error(
    `An error occurred on the server, please check if port ${PORT} is occupied.`
  );
  console.error(err.toString());
});

server.on('listening', () => {
  console.log(`Server listen on port: ${PORT}. Please visit website： http://localhost:${PORT}`);
});
module.exports = app;