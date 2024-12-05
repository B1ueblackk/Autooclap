import { WechatyBuilder} from 'wechaty';
import { FileBox } from 'file-box';
import QRCodeReader from 'qrcode-reader';
import {Jimp} from 'jimp';

const wechaty = WechatyBuilder.build({
    name: 'my-bot-session', // session
})
let lesson_code = "QQGXPE"

const room_topic = "test111"

wechaty
  .on('scan', (qrcode, status) =>
      console.log(`Scan QR Code to login: ${status}\nhttps://wechaty.js.org/qrcode/${encodeURIComponent(qrcode)}`))
  .on('login',            async user => {
      console.log(`User ${user} logged in`)
    setInterval(pollMessages, 20000);
  })
    .on('message', async (message) => {
        const room = message.room();
        if (room) {
            const topic = await room.topic();
            if (topic === room_topic) {
                const isMentioned = await message.mentionSelf();
                if (isMentioned) {
                    const msg = message.text();
                    console.log(`message: ${msg}`);
                    if (msg.endsWith('\u2005')) {
                        await room.say("消息不能为空");
                    } else {
                        lesson_code = msg
                        const data = await handleRequest(msg);
                        if (data) {
                            if (data.msg) {
                                await room.say(data.msg);
                            } else {
                                await room.say("后端返回的数据格式错误");
                            }
                        } else {
                            await room.say("后端处理失败，请稍后再试");
                        }
                        console.log(msg)
                    }
                }
                else {
                    if (message.type() === wechaty.Message.Type.Image) {
                        try {
                            // 将图片消息转换为 FileBox 对象
                            const fileBox = await message.toFileBox();

                            // 将图片转为 Buffer
                            const buffer = await fileBox.toBuffer();

                            // 使用 Jimp 加载图片
                            const image = await Jimp.read(buffer);

                            // 使用 qrcode-reader 解析二维码
                            const qr = new QRCodeReader();

                            qr.callback = async (error, result) => {
                                if (error) {
                                    console.error('QR code decode failed:', error);
                                } else if (result && result.result) {
                                    console.log('QR code content:', result.result);
                                    if (result.result.startsWith("app.wooclap.com")) {
                                        const str = result.result;
                                        let tmp_lesson_code = str.split('/')[1].split("?")[0];
                                        lesson_code = tmp_lesson_code
                                        const data = await handleRequest(tmp_lesson_code);
                                        if (data) {
                                            if (data.msg) {
                                                await room.say("Wooclap QR code: " + lesson_code + '\n' + data.msg);
                                            } else {
                                                await room.say("后端返回的数据格式错误");
                                            }
                                        } else {
                                            await room.say("后端处理失败，请稍后再试");
                                        }
                                    }
                                } else {
                                    console.log('not QR code');
                                }
                            };

                            qr.decode(image.bitmap);
                        } catch (err) {
                            console.error('处理图片时出错:', err);
                            await message.say('处理图片时出错，请稍后重试。');
                        }
                    }
                }
            }
        }
    })
    .on('error', (error) => {
    console.error('WeChaty 出现错误:', error);
}).start()

async function handleRequest(msg) {
    try {
        const response = await fetch('http://127.0.0.1:5000/receive_message', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ msg }),
        });
        if (!response.ok) {
            throw new Error(`HTTP 错误状态码: ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('请求失败:', error);
        return null;
    }
}

async function pollMessages() {
    console.log("Try poll message --- " + "lesson code: " + lesson_code);
    if (lesson_code === "") {
        return
    }
    try{
        const response = await fetch(`http://127.0.0.1:5000/monitor_lesson?lesson_code=${lesson_code}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ lesson_code }),
        });
        if (!response.ok) {
            throw new Error(`HTTP 错误状态码: ${response.status}`);
        }

        const data = await response.json();
        console.log(data)
        // 查找目标群组
        const room = await wechaty.Room.find({ topic: room_topic });
        if (room) {
            if(data["status"] === true) {
                console.log("Sending message to room:", room_topic);
                await room.say(data["msg"]); // 在群中发送结果
            }
        } else {
            console.warn("Room not found:", room_topic);
        }
    }
    catch (error) {
        console.error("Error in pollMessages:", error.message);
    }
}
