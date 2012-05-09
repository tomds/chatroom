var app = require('express').createServer()
  , io = require('socket.io').listen(app);
  
var port = process.env.PORT || 8000;

app.listen(port);

app.get('/', function (req, res) {
  res.sendfile(__dirname + '/templates/index.html');
});

var maxUsers = 199;
var users = {};
var currentUsernames = [];

var generateGuestUsername = function () {
  var randomNumber = Math.floor(Math.random()*maxUsers);
  var username = 'guest' + randomNumber;
  if (currentUsernames.indexOf(username) == -1) {
    console.log('found username ' + username);
    return username;
  } else {
    console.log('user ' + username + ' already exists, trying again');
    return generateGuestUsername();
  }
};

var createUser = function (id) {
  // Create username guestxxxx to start with
  var username = generateGuestUsername();
  users[id] = username;
  currentUsernames.push(username);
  return username;
};

var disconnectUser = function (id) {
  var username = users[id];
  var userIndex = currentUsernames.indexOf(username);
  if (userIndex != -1) {
    currentUsernames.splice(userIndex, 1);
  }
  delete users[id];
  return username;
};

io.sockets.on('connection', function (socket) {
  if (currentUsernames.length < maxUsers) {
    var username = createUser(socket.id);
    if (username) {
      socket.broadcast.emit('joined', {username: username});
      socket.emit('joined', {username: username, self: true});
      socket.emit('userlist', {list: currentUsernames});
      
      socket.on('message', function (data) {
        socket.broadcast.emit('message', {text: data.text});
        socket.emit('message', {text: data.text});
      });
      
      socket.on('disconnect', function (data) {
        var username = disconnectUser(socket.id);
        socket.broadcast.emit('left', {username: username});
      });
    }
  }
});