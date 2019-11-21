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

// An array of all tiles remaining in the game (not in-hand or played)
var remaining_tiles = [
  'A','A','A','A','A','A','A','A','A','B','B','C','C','D','D','D',
  'D','E','E','E','E','E','E','E','E','E','E','E','E','F','F','G',
  'G','G','H','H','I','I','I','I','I','I','I','I','I','J','K','L',
  'L','L','L','M','M','N','N','N','N','N','N','O','O','O','O','O',
  'O','O','O','P','P','Q','R','R','R','R','R','R','S','S','S','S',
  'T','T','T','T','T','T','U','U','U','U','V','V','X','Y','Y','Z'
];

var connections = [];

io.on('connection', function (socket) {
  console.log("Connection on Socket ID: ", socket.id);
  socket.emit('init', 'Connection Initialized');

  socket.on('success', function (data) {
    console.log(data);
    connections.push(socket.id);
    console.log('Current Connections:', connections);
    // @TODO: Change back to >1
    if(connections.length >= 1)
      // io.emit to broadcast to each of the connected clients
      io.emit('opponent_connected');
  });

  // Load a specific number of random tiles and send them back to the requesting client.
  socket.on('load_tiles', function (data) {
    console.log('Giving tiles to:', socket.id);
    socket.emit('receive_tiles', load_letters(data));
    console.log('Remaining Tiles:', remaining_tiles);
  });

  socket.on('tile_placed', function (data) {
    console.log('Tile Placed: ', data);
  });

  socket.on('tile_removed', function (data) {
    console.log('Tile Removed: ', data);
  });

  socket.on('word_submitted', function (data) {
    console.log('Checking Words: ', data);
    for(let i = 0; i < data.length; i++) {
      let word = data[i];
      if(words.check(word) == false) {
        console.log('Word: ', word, ' Is Invalid');
        socket.emit('rollback');
        return;
      }
      console.log('Word: ', word, ' Is Valid');
    }
    socket.emit('words_added', data);
  });

  socket.on('rollback', function (data) {
    console.log('Rollback: ', data);
  });
});

function load_letters(num) {
  let letters = [];
  for(let i = 0; i < num; i++) {
    let idx = Math.floor(Math.random() * remaining_tiles.length);
    letters[i] = remaining_tiles[idx];
    remaining_tiles.splice(idx, 1);
  }
  return letters;
}