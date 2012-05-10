var app = require('express').createServer()
  , io = require('socket.io').listen(app);
  
var port = process.env.PORT || 8000;

app.listen(port);

app.get('/', function (req, res) {
  res.sendfile(__dirname + '/templates/index.html');
});

var maxUsers = 3;
var usernameMaxLength = 30;
var users = {};
var currentUsernames = [];

var generateGuestUsername = function () {
  var randomNumber = Math.floor(Math.random()*maxUsers);
  var username = 'guest' + randomNumber;
  if (currentUsernames.indexOf(username) == -1) {
    return username;
  } else {
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
        var username = users[socket.id];
        socket.broadcast.emit('message', {text: data.text, username: username});
        socket.emit('message', {text: data.text, username: username});
      });
      
      socket.on('change-username', function (data) {
        var username =  data.username.replace(/(^\s*)|(\s*$)/g, '');
        if (username.length > usernameMaxLength) {
          socket.emit('change-username-submit', {success: false, message: 'Username must be less than ' + usernameMaxLength + ' characters.'});
        } else if (!username) {
          socket.emit('change-username-submit', {success: false, message: 'Username cannot be blank.'});
        } else {
          if (currentUsernames.indexOf(username) == -1) {
            var oldUsername = users[socket.id];
            var index = currentUsernames.indexOf(oldUsername);
            users[socket.id] = username;
            currentUsernames.splice(index, 1);
            currentUsernames.push(username);
            
            socket.broadcast.emit('changed-username', {oldName: oldUsername, newName: username});
            socket.emit('changed-username', {oldName: oldUsername, newName: username});
            socket.emit('change-username-submit', {success: true, message: 'Username successfully changed.'});
          } else {
            socket.emit('change-username-submit', {success: false, message: 'Username already in use; please try another.'});
          }
        }
      });
      
      socket.on('disconnect', function (data) {
        var username = disconnectUser(socket.id);
        socket.broadcast.emit('left', {username: username});
      });
    }
  }
});