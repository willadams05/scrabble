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
var turn_idx = 0;

io.on('connection', function (socket) {
  console.log("Connection on Socket ID: ", socket.id);
  socket.emit('init', connections.length);

  socket.on('success', function (data) {
    console.log(data);
    connections.push(socket.id);
    console.log('Current Connections:', connections);
    // Can change this to >=1 for testing with 1 client
    if(connections.length > 1) {
      // io.emit to broadcast to each of the connected clients
      io.emit('opponent_connected');
      // Message the most recent connection that they get the first turn
      socket.emit('start_turn');
      // Broadcast to other players that it is not their turn
      socket.broadcast.emit('end_turn');
    }
  });

  // Load a specific number of random tiles and send them back to the requesting client.
  socket.on('load_tiles', function (data) {
    console.log('Giving tiles to:', socket.id);
    socket.emit('receive_tiles', load_letters(data));
    console.log('Remaining Tiles:', remaining_tiles);
  });

  // Client tells the server that it has placed a tile on the board
  socket.on('tile_placed', function (message) {
    console.log(socket.id, 'Placed Tile:', message.data.letter);
    // Server broadcasts to all other clients (not including sender) to add the tile
    socket.broadcast.emit('tile_placed', message);
  });

  // Client tells the server that it has removed a tile from the board
  socket.on('tile_removed', function (message) {
    console.log(socket.id, 'Removed Tile:', message.data.letter);
    // Server broadcasts to all other clients (not including sender) to remove the tile
    socket.broadcast.emit('tile_removed', message);
  });

  // Server verifies if a client's words are valid. 
  //   - If submitted words are valid, award points and move turn to next player. 
  //   - If any of the submitted words are invalid, rollback. 
  socket.on('words_submitted', function (message) {
    console.log('Checking Words: ', message.data);
    for(let i = 0; i < message.data.length; i++) {
      let word = message.data[i];
      if(words.check(word) == false) {
        console.log('Word: ', word, ' Is Invalid');
        socket.emit('rollback', message.timestamp);
        return;
      }
      console.log('Word: ', word, ' Is Valid');
    }
    // Let the sending client know that they submitted a valid word
    socket.emit('words_added', message);
    // Let the other clients know that their opponent submitted a valid word
    socket.broadcast.emit('opponent_words_added', message);
    // If all clients have had a turn, allow client1 to take their next turn.
    if(turn_idx == connections.length)
      turn_idx = 0;
    // Let the next client in line know that it is their turn
    io.to(`${connections[turn_idx++]}`).emit('start_turn');
    console.log('Starting Turn for Player ' + turn_idx);
  });

  // Tell other clients to unreceive the message
  socket.on('unsend_messages', function (messages) {
    socket.broadcast.emit('unreceive_messages', messages);
  });

  // Client has reported that he is done restoring state and it is his turn, set turn to current+1
  socket.on('my_turn', function(index) {
    turn_idx = index+1;
  })
  
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