var express = require('express')
    , app = express.createServer()
    , io = require('socket.io').listen(app);
    
var port = process.env.PORT || 8000;

app.listen(port);

app.get('/', function (req, res) {
    res.sendfile(__dirname + '/templates/index.html');
});

app.use(express.static(__dirname + '/public'));

var lastRestart = new Date().getTime();

var maxUsers = 199;
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

var stripUsername = function (username) {
    return username.replace(/(^\s*)|(\s*$)/g, '');
};

var createUser = function (id, username) {
    if (typeof username == 'string') {
        username = stripUsername(username);
        if (currentUsernames.indexOf(username) != -1) {
            username = null;
        }
    }
    
    if (!username) {
        // Create username guestxxxx to start with
        username = generateGuestUsername();
    }
    
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
        socket.emit('welcome');
    
        socket.on('join', function (data) {
            if (data.lastLoad < lastRestart) {
                socket.emit('reload'); // Force users to reload page if server restarted
            } else {
                var username = createUser(socket.id, data.username);
                if (username) {
                    socket.broadcast.emit('joined', {username: username, id: socket.id});
                    socket.emit('joined', {username: username, self: true, id: socket.id});
                    socket.emit('userlist', {users: users});
                    
                    socket.on('message', function (data) {
                        var username = users[socket.id];
                        socket.broadcast.emit('message', {text: data.text, username: username});
                        socket.emit('message', {text: data.text, username: username});
                    });
                    
                    socket.on('change-username', function (data) {
                        var username = stripUsername(data.username);
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
                                
                                socket.broadcast.emit('changed-username', {id: socket.id, oldName: oldUsername, newName: username});
                                socket.emit('changed-username', {id: socket.id, oldName: oldUsername, newName: username});
                                socket.emit('change-username-submit', {success: true, message: 'Username successfully changed.', username: username});
                            } else {
                                socket.emit('change-username-submit', {success: false, message: 'Username already in use; please try another.'});
                            }
                        }
                    });
                    
                    socket.on('disconnect', function (data) {
                        var username = disconnectUser(socket.id);
                        socket.broadcast.emit('left', {username: username, id: socket.id});
                    });
                }
            }
        });
    } else {
        socket.emit('server-full');
    }
});