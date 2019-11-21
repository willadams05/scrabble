var express = require('express');
var app = express()
var server = require('http').Server(app);
var io = require('socket.io')(server);
var words = require('check-word')();

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

  socket.on('word_submitted', function(data) {
    console.log('Checking Words: ', data);
    for(let i = 0; i < data.length; i++) {
      let word = data[i];
      console.log('Checking Word: ', word);
      console.log(words.check(word));
      if(words.check(word) == true) {
        console.log('Word: ', word, ' Is Valid');
        socket.emit('word_added', word);
      }
      else {
        console.log('Word: ', word, ' Is Invalid');
        socket.emit('rollback');
        break;
      }
    }
  });

  socket.on('rollback', function(data) {
    console.log('Rollback: ', data);
  });
});