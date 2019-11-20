var express = require('express');
var app = express()
var server = require('http').Server(app);
var io = require('socket.io')(server);

server.listen(3000, 'localhost');
console.log("Server Started on port 3000")

app.get('/', function (req, res) {
  res.sendFile(__dirname + '/index.html');
});

app.use(express.static(__dirname));

io.on('connection', function (socket) {
  console.log(socket.id)
  socket.emit('news', { hello: 'world' });
  socket.on('my other event', function (data) {
    console.log(data);
  });
});