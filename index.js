var express = require('express');
var app = require('express')();
var http = require('http').Server(app);
const bodyParser = require("body-parser");
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false}))
app.use('/', express.static(__dirname + '/www'))

var io = require('socket.io')(http);
var port = process.env.PORT || 4000;

var WebSocketServer = require('ws').Server;
const nbs = new WebSocketServer({
  port: 4001,
})

nbs.on("connection", (ws, req) => {
  ws.on("message", message => {
    // 这里解析数据
    const result = JSON.parse(message);
    // 是否是登陆，登陆后绑定id
    if (result.login) {
      ws.socketIdxos = result.id;
      nbs.clients.forEach(s => {
        if (s.socketIdxos !== result.id && s.readyState == 1) {
          s.send(JSON.stringify({ type: 'login', data: result.id }));
        }
      });
    } else if (result.to) {
      // 这里只做一个小的场景，不是登陆就是发送信息
      // 根据存储的id 是否是要 发送的对象 来单独响应
      nbs.clients.forEach(s => {
        if (s.socketIdxos == result.to && s.readyState == 1) {
          s.send(JSON.stringify(result));
        }
      });
    } else {
      nbs.clients.forEach(s => {
        s.send(JSON.stringify(result))
      });
    }
  });
  ws.on("close", message => {
    console.log(ws.socketIdxos,"退出连接");
  });
});


app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

var clientCount = [];
io.on('connection', function(socket){

  socket.on('addUser',function(data){

    socket.username = data
    socket.broadcast.emit('online',data)
    if(!clientCount.includes(data)) {
      clientCount.push(data)
    }
    io.emit('clientNum',clientCount.length);
    console.log('user:'+socket.username+'connected!')
  })

  socket.on('msg',function(data){
    io.emit('broadcastMsg',data);
    console.log(JSON.stringify(data)+"发消息了")
  })

  socket.on('disconnect',function(){
    if(clientCount.includes(socket.username)) {
      clientCount.pop(socket.username);
    }
    io.emit('clientNum',clientCount.length);
    socket.broadcast.emit('offline',socket.username);
    console.log(socket.username+'下线了~')
  })
});

http.listen(port, function(){
  console.log('listening on *:' + port);
});
