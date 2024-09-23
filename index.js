const express = require('express');
const axios = require('axios');
const crypto = require('crypto');

const app = express();
const port = 3002;

// 微信配置
const config = {
    appId: 'wx9a33bdb7a412d445',
    appSecret: 'b606895d8a15c065118627a25d5a52e6',
    token: '',
    ticket: '',
    ticketExpires: 0 // ticket过期时间
};

// 设置允许跨域的中间件
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    // 处理OPTIONS预检请求
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    next();
});

// 获取微信 access_token
async function getAccessToken() {
    try {
        const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${config.appId}&secret=${config.appSecret}`;
        const response = await axios.get(url);
        config.token = response.data.access_token;
        console.log('AccessToken:', config.token);
        return config.token;
    } catch (error) {
        console.error('获取 access_token 出错:', error);
    }
}

// 获取微信 jsapi_ticket
async function getJsapiTicket() {
    if (config.ticket && Date.now() < config.ticketExpires) {
        return config.ticket; // 返回缓存的ticket
    }
    const token = await getAccessToken();
    const url = `https://api.weixin.qq.com/cgi-bin/ticket/getticket?access_token=${token}&type=jsapi`;
    try {
        const response = await axios.get(url);
        config.ticket = response.data.ticket;
        config.ticketExpires = Date.now() + (response.data.expires_in - 60) * 1000; // 提前60秒过期
        console.log('JsapiTicket:', config.ticket);
        return config.ticket;
    } catch (error) {
        console.error('获取 jsapi_ticket 出错:', error);
    }
}

// 生成签名
function createSignature(ticket, noncestr, timestamp, url) {
    const str = `jsapi_ticket=${ticket}&noncestr=${noncestr}&timestamp=${timestamp}&url=${url}`;
    const hash = crypto.createHash('sha1');
    hash.update(str);
    return hash.digest('hex');
}

// 微信 JSSDK 签名接口
app.get('/api/wechat-signature', async (req, res) => {
    const { url } = req.query;

    if (!url) {
        return res.status(400).json({ error: '缺少必要参数：url' });
    }

    const ticket = await getJsapiTicket();
    const noncestr = Math.random().toString(36).substr(2, 15);
    const timestamp = Math.floor(Date.now() / 1000);

    const signature = createSignature(ticket, noncestr, timestamp, url);

    res.json({
        appId: config.appId,
        timestamp,
        nonceStr: noncestr,
        signature
    });
});

// 微信配置的 token
const TOKEN = 'yinlubin';  // 这个 Token 是你自己在微信测试号管理后台填写的

// 验证微信签名
function checkSignature(query) {
    const { signature, timestamp, nonce } = query;
    const str = [TOKEN, timestamp, nonce].sort().join('');
    const hash = crypto.createHash('sha1').update(str).digest('hex');
    return hash === signature;
}

// 微信服务器验证接口
app.get('/api/wechat', (req, res) => {
    const { echostr } = req.query;
    // 验证签名是否正确
    if (checkSignature(req.query)) {
        res.send(echostr); // 签名正确则返回echostr
    } else {
        res.send('签名验证失败');
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
