const fs = require("fs");
const path = require('path');
const WechatBot = require('wechat4u');
const { WechatyBuilder, ScanStatus, Message, Contact, } = require('wechaty');
const { FileBox } = require('file-box');
const ai = require('../middlewares/aiapi');

let roomList = [];
let contactList = [];
let loginUser = undefined;
let messages = [];
let bot = undefined;

async function watchWechatState(req, res) {
    try {
        const token = req.cookies['token'];
        bot = req.app.locals.bots[token];
        sendEvent(res, '进入监听', 'bot event start', 'start');

        bot.on('scan', async (qrcodeUrl, status) => {
            if (status === ScanStatus.Waiting || status === ScanStatus.Timeout) {
                var data = { qrUrl: qrcodeUrl, status: status }
                sendEvent(res, '等待扫码', data, 'scan');
            }
            else if (status === ScanStatus.Scanned) {
                var data = { msg: '已扫码', status: status };
                sendEvent(res, '已扫码', data, `scanned`);
            }
            else if (status === ScanStatus.Confirmed) {
                var data = { msg: '已确认', status: status };
                sendEvent(res, '已确认', data, `confirmed`);
            }
            else {
                var data = { msg: '未知状态', status: status };
                sendEvent(res, '未知状态', data, `status(${status})`);
            }
        })
        bot.on('message', async (msg) => {
            const talker = contactList.find((item) => { return item.id === msg.payload.talkerId });
            if (talker) talker.headImg = msg.payload.talkerId === loginUser.UserName ? loginUser.headImg : await getContactAvatar(talker);
            msg.payload.talker = talker;

            if (msg.payload.hasOwnProperty('listenerId')) {
                const listener = contactList.find((item) => { return item.id === msg.payload.listenerId });
                if (listener) listener.headImg = msg.payload.listenerId === loginUser.UserName ? loginUser.headImg : await getContactAvatar(listener);
            }
            sendEvent(res, '新消息', msg, 'message');
            let existsMsg = messages.find((item) => { return item.id === msg.id });
            if (!existsMsg) messages.push(msg);
            //console.log('messages = ', messages);
            switch (msg.payload.type) {
                case bot.Message.Type.Text:

                    var msg4Contact = await getMsg4Contact(msg)
                    if (!msg4Contact) return;
                    msg4Contact.sort((a, b) => { return a.payload.timestamp - b.payload.timestamp });
                    var msgs = msg4Contact.slice(0, 10);
                    var sessions = [];
                    msgs.forEach((item) => {
                        var sess = { role: (item.payload.talkerId === loginUser.UserName ? 'assistant' : 'user'), content: item.payload.text }
                        sessions.push(sess);
                    })
                    var postData = { messages: sessions, stream: false };
                    var chat = await ai.ernieSpeed128KChat(postData);

                    const content = JSON.parse(chat.data);
                    var ts = Date.now();
                    //const lodash = require('lodash');
                    var newMsg = {};// JSON.parse(JSON.stringify(msg));
                    newMsg.talkerId = loginUser.UserName;
                    newMsg.payload = {}
                    newMsg.payload.timestamp = ts;
                    newMsg.payload.text = content.result;
                    newMsg.payload.type = msg.payload.type;

                    const aitalker = contactList.find((item) => { return item.id === loginUser.UserName });
                    if (aitalker) aitalker.headImg = loginUser.headImg;
                    newMsg.payload.talker = aitalker;
/*
                    if (msg.payload.hasOwnProperty('roomId')) {
                        bot.puppet.wechat4u.sendMsg(content.result, msg.payload.roomId).then(async (response) => {
                            //const newMsg = await bot.Message.find({ id: res.MsgID }) // 取不到刚自动发的消息
                            newMsg.id = response.MsgID;
                            newMsg._events = response._events;
                            newMsg._eventsCount = 0;
                            newMsg._maxListeners = msg._maxListeners;
                            newMsg.mentionIdList = msg.mentionIdList;
                            newMsg.payload.id = response.MsgID;
                            newMsg.payload.roomId = msg.payload.roomId;

                            console.log('msg = ', msg);
                            console.log('newMsg = ', newMsg);
                            sendEvent(res, 'AI回复', newMsg, 'message');

                            //bot.emit('message', newMsg);
                        })
                    }
                    else {
                        bot.puppet.wechat4u.sendMsg(content.result, room.payload.listenerId).then(async (response) => {
                            //const newMsg = await bot.Message.find({ id: res.MsgID })
                            newMsg.id = response.MsgID;
                            newMsg.payload.id = response.MsgID;
                            newMsg.payload.listenerId = msg.payload.talkerId;
                            newMsg.payload.listener = msg.payload.talker;
                            newMsg._events = response._events;
                            newMsg._eventsCount = 0;
                            newMsg._maxListeners = msg._maxListeners;
                            newMsg.mentionIdList = msg.mentionIdList;
                            
                            //bot.emit('message', newMsg);
                            sendEvent(res, 'AI回复', newMsg, 'message');
                        })
                    }
*/
                    /*room.say(content.result).then((res)=>{
                        console.log('res = ', res);
                    });*/

                    //var newMsg = await msg.say(content.result);
                    //console.log('newMsg = ', newMsg);
                    /*if (msg.payload.hasOwnProperty('roomId')) {
                        var room = await bot.Room.find({ id: msg.payload.roomId });
                        //bot.puppet.wechat4u.sendMsg(content.result, room.payload.id);
                        room.say(content.result).then((newMsg)=>{
                            console.log('newMsg = ', newMsg);
                        });
                    }
                    else {
                        var contact = await bot.Contact.find({ id: msg.payload.talkerId });
                        //bot.puppet.wechat4u.sendMsg(content.result, contact.payload.id);
                        var newMsg = await contact.say(content.result);
                        console.log('newMsg = ', newMsg);
                    }*/

                    /*var token = await ai.getBaiduAccesstoken();
                    if (!token) return { code: -1, msg: '无法获取 access_token ！', data: null };
                    var reqUrl = `https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/ernie-speed-128k?access_token=${token.access_token}`
                    headers = { 'Content-Type': 'application/json' }
                    //const ret = request('POST', reqUrl, { headers: headers, body: JSON.stringify(postData) });
                    const options = {url: reqUrl, method: 'POST', headers: headers, body: JSON.stringify(postData)
                    };
                    const request = require('request');
                    
                    var req = request(options, (err, res, body) => {
                        //console.log('res = ', res);
                        //console.log('body = ', body);
                    })
                    req.on('data', async (chunk) => {
                        console.log('chunk = ', chunk.toString());
                        var chat = JSON.parse(chunk.toString());
                        console.log('typeOf chat = ',  typeof(chat));
                        if (msg.payload.hasOwnProperty('roomId')) {
                            var room = await bot.Room.find({ id: msg.payload.roomId });
                            room.say(chat.data.result);
                        }
                        else {
                            var contact = await bot.Contact.find({ id: msg.payload.talkerId });
                            contact.say(chat.data.result);
                        }
                        sendEvent(res, '对话消息流', chat, 'chatstream');
                    });
                    req.on('end', () => {
                        sendEvent(res, '对话结束', '对话消息流结束', 'streamend');
                    });*/
                    break;
                case bot.Message.Type.MiniProgram:
                    break;
                case bot.Message.Type.Attachment:
                    break;
                case bot.Message.Type.Audio:
                    break;
                case bot.Message.Type.Contact:
                    break;
                case bot.Message.Type.Emoticon:
                    break;
                case bot.Message.Type.Image:
                    break;
                case bot.Message.Type.Video:
                    break;
                case bot.Message.Type.Url:
                    break;
                case bot.Message.Type.ChatHistory:
                    break;
                case bot.Message.Type.Location:
                    break;
                case bot.Message.Type.GroupNote:
                    break;
                case bot.Message.Type.Transfer:
                    break;
                case bot.Message.Type.RedEnvelope:
                    break;
                case bot.Message.Type.Recalled:
                    break;
                case bot.Message.Type.Post:
                    break;
                case bot.Message.Type.Unknown:
                    break;
            }
        });
        bot.on('ready', async () => {
            contactList = await bot.Contact.findAll();
            roomList = await bot.Room.findAll();
            sendEvent(res, '聊天群', roomList, 'roomlist');
            sendEvent(res, '准备就绪', 'update user data successed', 'ready');
        })
        bot.start()
            .then(() => {
                let wechat4uBot = bot.puppet.wechat4u;
                wechat4uBot.on('user-avatar', (avatar) => {
                    sendEvent(res, '切换账号', avatar, 'avatar');
                })
                wechat4uBot.on('login', () => {
                    sendEvent(res, '加载数据', '开始加载数据', 'loading');
                    getContacts(wechat4uBot, res, undefined, function (contacts) {
                        contacts.forEach(item => {
                            setTimeout(function () {
                                wechat4uBot.getHeadImg(item.HeadImgUrl).then(ret => {
                                    var base64Img = ret.data.toString('base64');
                                    item.headImg = `data:image/jpg;base64,${base64Img}`;
                                    sendEvent(res, '联系人', item, 'contact')
                                }).catch(err => {
                                    console.log('getContactHeadImg error：', err)
                                })
                            }, 2000);
                        });
                    });
                    wechat4uBot.getHeadImg(wechat4uBot.user.HeadImgUrl).then(ret => {
                        var base64Img = ret.data.toString('base64');
                        wechat4uBot.user.headImg = `data:image/jpg;base64,${base64Img}`;
                        loginUser = wechat4uBot.user;
                        sendEvent(res, '登录用户', loginUser, 'loginuser');
                    })
                })
            })
            .catch((e) => console.error(e));
    }
    catch (e) {
        sendEvent(res, 'watchWechatState -> error.01', e);
        console.log('watchWechatState -> error.01:', e);
    }
}
async function getMsg4Contact(msg) {
    //console.log('getMsg4Contact -> msg = ', msg);
    try {
        var msg4Contact = null;
        if (msg.payload.hasOwnProperty('roomId')) {
            msg4Contact = messages.filter((item) => { return item.payload.type === 7 && item.payload.roomId === msg.payload.roomId })
        }
        else {
            msg4Contact = messages.filter((item) => {
                var talker = item.payload.talkerId === msg.payload.talkerId && item.payload.listenerId === loginUser.UserName;
                var listener = item.payload.talkerId === loginUser.UserName && item.payload.listenerId === msg.payload.talkerId;
                return item.type() === bot.Message.Type.Tex && (talker || listener);
            })
        }
        return msg4Contact;
    }
    catch (e) {
        console.log('getMsg4Contact error: ', e);
        return null;
    }
}
async function getContactAvatar(contact) {
    let fileBox = await contact.avatar();
    let base64Img = fileBox.buffer.toString('base64');
    return `data:image/jpg;base64,${base64Img}`;
}
async function listeningWechatState(req, res) {
    try {
        const token = req.cookies['token'];
        let bot = req.app.locals.bots[token];
        //sendEvent(res, '机器人对象', bot, 'start');
        if (bot.state === 'uuid') {
            var data = { qrUrl: `https://login.weixin.qq.com/l/${bot.PROP.uuid}`, msg: '登录二维码', state: 1 }
            sendEvent(res, '登录二维码', data, 'uuid');
        }
        bot.on('uuid', (uuid) => {
            var data = { qrUrl: `https://login.weixin.qq.com/l/${uuid}`, msg: '登录二维码', state: 1 }
            sendEvent(res, '登录二维码', data, 'uuid');
        });
        bot.on('user-avatar', (avatar) => {
            sendEvent(res, '登录用户头像', avatar, 'avatar');
        })
        bot.on('login', () => {
            //sendEvent(res, '机器人', bot, 'reloadbot')
            getContacts(bot, res, undefined, function (contacts) {
                contacts.forEach(item => {
                    setTimeout(function () {
                        bot.getHeadImg(item.HeadImgUrl).then(ret => {
                            var base64Img = ret.data.toString('base64');
                            item.headImg = `data:image/jpg;base64,${base64Img}`;
                            sendEvent(res, '联系人', item, 'contact')
                        }).catch(err => {
                            console.log('getContactHeadImg error：', err)
                        })
                    }, 2000);
                });
            });
            bot.getHeadImg(bot.user.HeadImgUrl).then(ret => {
                var base64Img = ret.data.toString('base64');
                bot.user.headImg = `data:image/jpg;base64,${base64Img}`;
                sendEvent(res, '登录用户', bot.user, 'loginuser');
            })
            setTimeout(function () { sendEvent(res, '登录成功', 'login successed!', 'login'); }, 1000);
        })
        bot.on('logout', () => {
            sendEvent(res, '登出成功', 'logout successed!', 'logout');
            bot = new WechatBot();
            bot.start();
            req.app.locals.bots[token] = bot;
        })
        bot.on('contacts-updated', contacts => {
            sendEvent(res, `联系人更新(${Object.keys(bot.contacts).length})`, contacts, 'contactsUpdated');
        })
        bot.on('error', err => {
            console.log('error.2 = ', err);
            sendEvent(res, 'error.2', err, 'error');
        })
        bot.on('message', msg => {
            if (msg.FromUserName.substr(0, 2) === '@@') { //群内成员发消息
                let contacts = [{ UserName: msg.OriginalContent }];
                bot.batchGetContact(contacts).then(value => {
                    console.log('msgFromUser = ', value);
                });
                //var sessionUser = msg.getPeerUserName();
                //console.log('msgFromUser = ', msgFromUser);
            }
            sendEvent(res, '消息', msg, 'originalmsg');

            /*let time = msg.getDisplayTime();
            let from = bot.contacts[msg.FromUserName].getDisplayName();
            let to = bot.contacts[msg.ToUserName].getDisplayName();
            switch (msg.MsgType) {
                case bot.CONF.MSGTYPE_TEXT://文本消息
                    sendEvent(res,'文本消息',JSON.stringify({ time: time, fromUser: from, from: msg.FromUserName, toUser:to, to: msg.ToUserName, MsgType: msg.MsgType, AppMsgType: msg.AppMsgType, data: msg.Content}));
                    break
                case bot.CONF.MSGTYPE_IMAGE://图片消息
                    bot.getMsgImg(msg.MsgId).then(res => {
                        sendEvent(res,'图片消息',JSON.stringify({ time: time, fromUser: from, from: msg.FromUserName, toUser:to, to: msg.ToUserName, MsgType: msg.MsgType, AppMsgType: msg.AppMsgType, data: res.data}));
                    }).catch(err => {
                        bot.emit('error', err)
                    })
                    break
                case bot.CONF.MSGTYPE_VOICE://语音消息
                    bot.getVoice(msg.MsgId).then(res => {
                        sendEvent(res,'语音消息',JSON.stringify({ time: time, fromUser: from, from: msg.FromUserName, toUser:to, to: msg.ToUserName, MsgType: msg.MsgType, AppMsgType: msg.AppMsgType, data: res.data}));
                        //fs.writeFileSync(`./media/${msg.MsgId}.mp3`, res.data)
                    }).catch(err => {
                        bot.emit('error', err)
                    })
                    break
                case bot.CONF.MSGTYPE_EMOTICON://表情消息
                    bot.getMsgImg(msg.MsgId).then(res => {
                        sendEvent(res,'表情消息',JSON.stringify({ time: time, fromUser: from, from: msg.FromUserName, toUser:to, to: msg.ToUserName, MsgType: msg.MsgType, AppMsgType: msg.AppMsgType, data: res.data}));
                        //fs.writeFileSync(`./media/${msg.MsgId}.gif`, res.data)
                    }).catch(err => {
                        bot.emit('error', err)
                    })
                    break
                case bot.CONF.MSGTYPE_VIDEO:
                case bot.CONF.MSGTYPE_MICROVIDEO://视频消息
                    //console.log('视频消息，保存到本地')
                    bot.getVideo(msg.MsgId).then(res => {
                        sendEvent(res,'表情消息',JSON.stringify({ time: time, fromUser: from, from: msg.FromUserName, toUser:to, to: msg.ToUserName, MsgType: msg.MsgType, AppMsgType: msg.AppMsgType, data: res.data}));
                        //fs.writeFileSync(`./media/${msg.MsgId}.mp4`, res.data)
                    }).catch(err => {
                        bot.emit('error', err)
                    })
                    break
                case bot.CONF.MSGTYPE_APP:
                    if (msg.AppMsgType == 6) {//文件消息
                        bot.getDoc(msg.FromUserName, msg.MediaId, msg.FileName).then(res => {
                            sendEvent(res,'文件消息',JSON.stringify({ time: time, fromUser: from, from: msg.FromUserName, toUser:to, to: msg.ToUserName, MsgType: msg.MsgType, AppMsgType: msg.AppMsgType, data: res.data, resType: res.type}));
                            //fs.writeFileSync(`./media/${msg.FileName}`, res.data)
                            //console.log(res.type);
                        }).catch(err => {
                            bot.emit('error', err)
                        })
                    }
                    else if(msg.AppMsgType == bot.CONF.APPMSGTYPE_TRANSFERS){//转账消息
                        sendEvent(res,'文件消息',JSON.stringify({ time: time, fromUser: from, from: msg.FromUserName, toUser:to, to: msg.ToUserName, MsgType: msg.MsgType, AppMsgType: msg.AppMsgType, data: msg.Content, resType: ''}));
                    }
                    else{
                        sendEvent(res,'未知消息',JSON.stringify({ time: time, fromUser: from, from: msg.FromUserName, toUser:to, to: msg.ToUserName, MsgType: msg.MsgType, AppMsgType: msg.AppMsgType, data: msg.Content}));
                    }
                    break
                case bot.CONF.MSGTYPE_SYS://系统消息
                    sendEvent(res,'系统消息',JSON.stringify({ time: time, fromUser: from, from: msg.FromUserName, toUser:to, to: msg.ToUserName, MsgType: msg.MsgType, AppMsgType: msg.AppMsgType, data: ''}));
                    if(/红包/.test(msg.Content)){//红包消息
                        sendEvent(res,'红包消息',JSON.stringify({ time: time, fromUser: from, from: msg.FromUserName, toUser:to, to: msg.ToUserName, MsgType: msg.MsgType, AppMsgType: msg.AppMsgType, data: msg.Content}));
                    }
                    break;
                default:
                    break;
            }*/
        })
    }
    catch (e) {
        sendEvent(res, 'error.1', e.message);
        console.log('error:', e.message);
    }
}
async function getWechatContact(req, res) {
    try {
        //console.log('进入 getWechatContact')
        const token = req.cookies['token'];
        let bot = req.app.locals.bots[token];
        sendEvent(res, '获取联系人', '已登录状态时，重新获取联系人', 'start');
        getContacts(bot, res, undefined, function (contacts) {
            contacts.forEach((item, index) => {
                bot.getHeadImg(item.HeadImgUrl).then(ret => {
                    var base64Img = ret.data.toString('base64');
                    let data = { code: 1, msg: 'successed', index: index, count: contacts.length, userName: item.UserName, nickName: item.NickName, headImg: `data:image/jpg;base64,${base64Img}` };
                    sendEvent(res, '联系人', data, 'contact')
                }).catch(err => {
                    console.log('getContactHeadImg error：', err)
                })
                if (index === contacts.length - 1) sendEvent(res, '获取联系人完成', '获取联系人完成', 'finished')
            });
        });
        setTimeout(function () { sendEvent(res, '登录成功', 'login successed!', 'login'); }, 1000);
    }
    catch (e) {
        sendEvent(res, 'getWechatContact -> error.1', e.message);
        console.log('getWechatContact -> error:', e.message);
    }
}
async function getContacts(bot, res, seq, callback) {
    if (!seq) {
        let contacts = bot.getContact().then(result => {
            sendEvent(res, '所有联系人', result.MemberList, 'allcontacts');
            const wxContacts = result.MemberList.filter(item => item.VerifyFlag === 0);
            sendEvent(res, '获取联系人', wxContacts, 'contacts');
            callback(wxContacts);
            if (result.Seq !== 0) getContacts(bot, res, result.Seq);
        }).catch(error => {
            bot.emit('error', error)
        })
    }
    else {
        let contacts = bot.getContact(seq).then(result => {
            const wxContacts = result.MemberList.filter(item => item.VerifyFlag === 0);
            sendEvent(res, '获取联系人', wxContacts, 'contacts');
            callback(wxContacts);
            if (result.Seq !== 0) getContacts(bot, res, result.Seq);
        }).catch(error => {
            bot.emit('error', error)
        })
    }
}
async function getContactHeadImg(bot, res, contacts) {
    const imgDir = path.resolve(__dirname, '../public/img');
    //console.log('imgDir:', imgDir);
    contacts.forEach(item => {
        bot.getHeadImg(item.HeadImgUrl).then(res => {
            return item.HeadImg = res.data;
        }).catch(err => {
            console.log('getContactHeadImg error：', err)
        })
    });
    sendEvent(res, '获取头像', contacts, 'contactsheadimg');
    return contacts;
}
async function sendEvent(res, msg, data, eventName = 'message') {
    var time = dateFormat((new Date()), 'HH:mm:ss');
    var json = { time: time, msg: msg, event: eventName, data: data };
    res.write(`data: ${JSON.stringify(json)}\n\n`);
}
function dateFormat(date, format) {
    if (typeof (date) !== 'object') date = new Date(date)
    const o = {
        'M+': date.getMonth() + 1, // 月份
        'd+': date.getDate(), // 日
        'h+': date.getHours() % 12 === 0 ? 12 : date.getHours() % 12, // 小时
        'H+': date.getHours(), // 小时
        'm+': date.getMinutes(), // 分
        's+': date.getSeconds(), // 秒
        'q+': Math.floor((date.getMonth() + 3) / 3), // 季度
        S: date.getMilliseconds(), // 毫秒
        a: date.getHours() < 12 ? '上午' : '下午', // 上午/下午
        A: date.getHours() < 12 ? 'AM' : 'PM', // AM/PM
    };
    if (/(y+)/.test(format)) {
        format = format.replace(RegExp.$1, (date.getFullYear() + '').substr(4 - RegExp.$1.length));
    }
    for (let k in o) {
        if (new RegExp('(' + k + ')').test(format)) {
            format = format.replace(
                RegExp.$1,
                RegExp.$1.length === 1 ? o[k] : ('00' + o[k]).substr(('' + o[k]).length)
            );
        }
    }
    return format;
}
module.exports = {
    listeningWechatState,
    watchWechatState,
    dateFormat,
    getWechatContact
}