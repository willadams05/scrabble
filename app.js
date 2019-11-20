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
  console.log("Connection on Socket ID: ", socket.id);
  socket.emit('init', 'Connection Initialized');

  socket.on('success', function (data) {
    console.log(data);
  });

  socket.on('tile_placed', function(data) {
    console.log('Tile Placed: ', data);
  });

  socket.on('tile_removed', function(data) {
    console.log('Tile Removed: ', data);
  });

  socket.on('word_added', function(data) {
    console.log('Word Added: ', data);
  });

  socket.on('rollback', function(data) {
    console.log('Rollback: ', data);
  });
});