const WechatBot = require('wechat4u');
const crypto = require('crypto');
const { FileBox } = require('file-box');
const { WechatyBuilder, ScanStatus, Message, Contact, } = require('wechaty');
const { AIToken } = require('../models')
const api = require('../middlewares/aiapi')

async function getAccessToken(req, res, net) {
  try {
    var token = await api.getBaiduAccesstoken();
    res.json({ code: -1, msg: '获取token成功!', token: token })
  }
  catch (e) {
    console.log('getAccessToken error: ', e);
    res.json({ code: -1, msg: e.message, token: null });
  }
}
async function chat4ernieSpeed128K(req, res, next) {
  const messages = {messages:[{ "role": "user", "content": "为什么中午气温比早上气温高呢？"}]}
  var chat = await api.ernieSpeed128KChat(messages);
  res.json(chat);
}

async function getIndex(req, res, next) {
  try {
    const token = req.cookies['token'];
    let bot = req.app.locals.bots[token];
    bot.getUUID().then(uuid => {
      res.render('index', { qrcode: `https://login.weixin.qq.com/l/${uuid}`, msg: `successed`, code: 1 });
    })
  }
  catch (e) {
    res.render('index', { qrcode: `/img/qrcode.png`, msg: `failed`, code: 1 });
  }
}
async function getUUID(req, res) {
  const token = req.cookies['token'];
  let bot = req.app.locals.bots[token];

  let state = bot.state;
  bot.getUUID().then(uuid => {
    res.send({ qrcode: `https://login.weixin.qq.com/l/${uuid}`, msg: `uuid`, code: 1, state: state });
  })
}
async function getContactAvatar(req, res) {
  try {
    const token = req.cookies['token'];
    let bot = req.app.locals.bots[token];
    //console.log('getContactAvatar -> bot: ', bot);
    let uId = req.params.uId;
    const contact = await bot.Contact.find({ id: uId });
    if (!contact) res.send({ code: 1, msg: 'failed', img: `/img/weixin.jpg` });
    else {
      let fileBox = await contact.avatar();
      let base64Img = fileBox.buffer.toString('base64');
      var avatar = `data:image/jpg;base64,${base64Img}`;
      contact.headImg = avatar;
      res.send({ code: 1, msg: 'successed', contact: contact });
    }
  }
  catch (e) {
    console.log('getContactAvatar error：', e)
    res.send({ code: 1, msg: 'failed', img: `/img/weixin.jpg` });
  }
}
async function getContactHeadImg(req, res) {
  try {
    const token = req.cookies['token'];
    let bot = req.app.locals.bots[token];

    let userName = req.params.userName;
    let url = bot.contacts[userName].HeadImgUrl
    bot.getHeadImg(url).then(ret => {
      var base64Img = ret.data.toString('base64');
      res.send({ code: 1, msg: 'successed', img: `data:image/jpg;base64,${base64Img}` });
    }).catch(err => {
      console.log('getContactHeadImg error：', err)
      res.send({ code: 1, msg: 'failed', img: `/img/weixin.jpg` });
    })
  }
  catch (e) {
    console.log('getContactHeadImg error：', e)
    res.send({ code: 1, msg: 'failed', img: `/img/weixin.jpg` });
  }
}
async function getLoginUserHeadImg(req, res) {
  try {
    const token = req.cookies['token'];
    let bot = req.app.locals.bots[token];

    let url = bot.user.HeadImgUrl
    bot.getHeadImg(url).then(ret => {
      var base64Img = ret.data.toString('base64');
      res.send({ code: 1, msg: 'successed', img: `data:image/jpg;base64,${base64Img}` });
    }).catch(err => {
      console.log('getContactHeadImg error：', err)
      res.send({ code: 1, msg: 'failed', img: `/img/weixin.jpg` });
    })
  }
  catch (e) {
    console.log('getContactHeadImg error：', e)
    res.send({ code: 1, msg: 'failed', img: `/img/weixin.jpg` });
  }
}
async function checkLogin(req, res) {
  const token = req.cookies['token'];
  let bot = req.app.locals.bots[token];
  bot.checkLogin().then(ret => {
    res.send({ data: ret, msg: 'successed', code: 1 });
  })
}
async function isLogin(req, res) {
  const token = req.cookies['token'];
  let bot = req.app.locals.bots[token];
  bot.login().then(ret => {
    console.log('login successed!');
    res.send({ data: ret, msg: 'successed', code: 1 });
  });
}
module.exports = {
  getIndex,
  getUUID,
  checkLogin,
  isLogin,
  getContactHeadImg,
  getLoginUserHeadImg,
  getContactAvatar,

  getAccessToken,
  chat4ernieSpeed128K
}
