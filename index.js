const express =  require("express");
const expressWebSocket = require("express-ws");
const ffmpeg = require("fluent-ffmpeg");
let ffmpegPath
const system ={
    "linux": "linux",
    "win": "window",
}
if (system.win === process.env.SYSTEM) {
    ffmpegPath = "./ffmpeg-4.2.1-win64-static/bin/ffmpeg.exe";
}else if(system.linux === process.env.SYSTEM){
    const envs = process.argv
    if (!envs[2]){
        throw new Error("lack ffmpeg path：缺少ffmpeg路径");
    }
    ffmpegPath = envs[2];
}else{
    throw new Error("system error;系统错误");
}

ffmpeg.setFfmpegPath(ffmpegPath);
const webSocketStream = require("websocket-stream/stream");
/*const WebSocket = require("websocket-stream");
const http = require("http");*/
//播放地址自行拼装：ws://localhost:8888/rtsp/[id序号自定义].flv/?url=[rtsp地址]
//示例: ws://localhost:8888/rtsp/1.flv/?url=rtsp://admin:fairytail0@192.168.1.246:554/stream2
function localServer() {
    let app = express();
    app.use(express.static(__dirname));
    expressWebSocket(app, null, {
        perMessageDeflate: true
    });
    app.ws("/rtsp/:id/", rtspRequestHandle)
    app.listen(8888);
    console.log("express listened")
}
function rtspRequestHandle(ws, req) {
    console.log("rtsp request handle");
    const stream = webSocketStream(ws, {
        binary: true,
        browserBufferTimeout: 1000000
    }, {
        browserBufferTimeout: 1000000
    });
    let url = req.query.url;
    console.log("rtsp url:", url);
    console.log("rtsp params:", req.params);
    try {
        ffmpeg(url)
            .addInputOption("-rtsp_transport", "tcp", "-buffer_size", "102400")  // 这里可以添加一些 RTSP 优化的参数
            .on("start", function () {
                console.log(url, "Stream started.");
            })
            .on("codecData", function () {
                console.log(url, "Stream codecData.")
             // 摄像机在线处理
            })
            .on("error", function (err) {
                console.log(url, "An error occured: ", err.message);
            })
            .on("end", function () {
                console.log(url, "Stream end!");
             // 摄像机断线的处理
            })
            .outputFormat("flv").videoCodec("copy").noAudio().pipe(stream);
    } catch (error) {
        console.log(error);
    }
}
localServer();
