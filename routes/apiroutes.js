//module.exports = app => {
const express = require('express');
const router = express.Router();

const index = require("../controllers/indexController.js");

//router.get('/uuid', index.getUUID);
//router.get('/wechatstate', index.listenWechatState);
router.get('/checklogin', index.checkLogin)
router.get('/login', index.isLogin)
router.get('/headimg/:userName',index.getContactHeadImg);
router.get('/avatar/:uId',index.getContactAvatar);
router.get('/meHeadimg',index.getLoginUserHeadImg);

router.get('/accesstoken',index.getAccessToken);
router.get('/bdchat',index.chat4ernieSpeed128K);

module.exports = router;