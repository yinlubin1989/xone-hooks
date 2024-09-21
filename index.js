const express = require('express');
const axios = require('axios');
const crypto = require('crypto');

const app = express();
const port = 3000;

// 微信配置
const config = {
    appId: 'wxa71e26dcd94cf235',
    appSecret: '7665b550d499380c26977ca9d4f6de4f',
    token: '',
    ticket: '',
    ticketExpires: 0 // ticket过期时间
};

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
app.get('/wechat-signature', async (req, res) => {
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

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
