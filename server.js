var app = require('express').createServer()
  , io = require('socket.io').listen(app);
  
var port = process.env.PORT || 8000;

app.listen(port);

app.get('/', function (req, res) {
  res.sendfile(__dirname + '/templates/index.html');
});

io.sockets.on('connection', function (socket) {
  socket.on('message', function (data) {
    socket.broadcast.emit('message', {text: data.text});
    socket.emit('message', {text: data.text});
  });
});