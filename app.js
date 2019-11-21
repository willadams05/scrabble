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
  ['A', 9], ['B', 2], ['C', 2], ['D', 4], ['E', 12], ['F', 2], ['G', 3], 
  ['H', 2], ['I', 9], ['J', 1], ['K', 1], ['L', 4], ['M', 2], ['N', 6], 
  ['O', 8], ['P', 2], ['Q', 1], ['R', 6], ['S', 4], ['T', 6], ['U', 4], 
  ['V', 2], ['W', 2], ['X', 1], ['Y', 2], ['Z', 1]
];
var connections = [];

io.on('connection', function (socket) {
  console.log("Connection on Socket ID: ", socket.id);
  socket.emit('init', 'Connection Initialized');

  socket.on('success', function (data) {
    console.log(data);
    connections.push(socket.id);
    console.log('Current Connections:', connections);
    if(connections.length > 1)
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

  socket.on('rollback', function (data) {
    console.log('Rollback: ', data);
  });
});

function load_letters(num) {
  let letters = [];
  for(let i = 0; i < num; i++) {
    letters[i] = generate_letter();
  }
  return letters;
}

function generate_letter() {
  let letter = null;
  // Try to select a random tile until one that has remaining tiles is chosen.
  while(letter == null) {
      let rand = Math.floor(Math.random() * 26);
      if(remaining_tiles[rand][1] > 0) {
          letter = remaining_tiles[rand][0];
          // Subtract one from the remaining number of this tile
          remaining_tiles[rand][1]--;
      }
  }
  return letter;
}
