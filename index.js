const axios = require('axios');
const crypto = require('crypto');
const express = require('express');

function generateSignedUrl(accessToken, secret) {
    // 获取当前时间戳（毫秒）
    const timestamp = Date.now();

    // 生成签名
    const sign = () => {
        const stringToSign = `${timestamp}\n${secret}`;
        const hash = crypto.createHmac('sha256', secret)
                          .update(stringToSign)
                          .digest('base64');
        return encodeURIComponent(hash);
    };

    const signature = sign();

    // 生成带有签名的完整 URL
    const signedUrl = `https://oapi.dingtalk.com/robot/send?access_token=${accessToken}&timestamp=${timestamp}&sign=${signature}`;
    
    return signedUrl;
}

function sendDingMessage() {
    // 调用方法
    const accessToken = 'b8350a5eeedbcee546b9feea67e858d5afd6862da7387e3766304a8973fc8211'; // 替换为你的access_token
    const secret = 'SEC4b3fa97b85c629df0ee50211367c2514ab176be8927a17a389cb4db82c936e90'; // 替换为你的secret

    const webhookUrl = generateSignedUrl(accessToken, secret);

    const img = 'https://daxueui-cos.koocdn.com/feuploadcdnfiles/e08c44fd-bc9e-4fe7-bc3b-4df0890581a7.png'

    const message = {
        "msgtype": "markdown",
        "markdown": {
            "title":"杭州天气",
            "text": `![screenshot](${img})`
        }
    };

    axios.post(webhookUrl, message)
        .then(response => {
            console.log('图片发送成功:', response.data);
        })
        .catch(error => {
            console.error('发送图片时出错:', error);
        });
}

const app = express();
const port = 2020;

app.use(express.json());

app.post('*', (req, res) => {
    if (!req.body?.text?.content) {
        res.send('null');;
    }
    const data = req.body.text.content;
    const lines = data.split('\n');
    const result = lines.map(line => {
        const match = line.match(/^(\w+)：(.+)$/);
        if (match) {
            return { [match[1]]: match[2] };
        }
        return {};
    }).reduce((acc, obj) => {
        return { ...acc, ...obj };
    }, {});

    console.log(result);

    res.send('Hello World!');
});


// app.post('*', (req, res) => {
//     //
//     console.log('-', req.body);
//     res.send('Hello World!');
// });

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});



