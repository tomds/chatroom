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

io.sockets.on('connection', function (socket) {
    if (currentUsernames.length < maxUsers) {
        socket.emit('welcome'); // Client should respond to this by emitting a 'join' signal with desired username as argument
    
        socket.on('join', function (data) {
            if (data.lastLoad < lastRestart) { // Force users to reload page if server restarted
                socket.emit('reload');
            } else {
                // If a specific username requested by client, try to assign it,
                // but username might return as something different if we weren't
                // able to fulfil the request e.g. because it is already in use
                // or of an invalid format.
                var username = createUser(socket.id, data.username);
                if (username) {
                    socket.broadcast.emit('joined', {username: username, id: socket.id});
                    socket.emit('joined', {username: username, self: true, id: socket.id});
                    socket.emit('userlist', {users: users});
                    
                    bindChat(socket);
                }
            }
        });
    } else {
        socket.emit('server-full');
    }
});

var bindChat = function (socket) {
    // Received when client writes a message in chat
    socket.on('message', function (data) {
        var username = users[socket.id];
        socket.broadcast.emit('message', {text: data.text, username: username});
        socket.emit('message', {text: data.text, username: username});
    });
    
    // Received when user requests a change of username
    socket.on('change-username', function (data) {
        var username = stripUsername(data.username);
        if (username.length > usernameMaxLength) {
            socket.emit('change-username-submit', {success: false, message: 'Username must be less than ' + usernameMaxLength + ' characters.'});
        } else if (!username) {
            socket.emit('change-username-submit', {success: false, message: 'Username cannot be blank.'});
        } else {
            if (currentUsernames.indexOf(username) == -1) { // Username valid and not taken
                // Delete old username from list of names currently in use
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
    
    // When a user disconnects, remove username from list of names in use and
    // announce to the rest of the room that they have left
    socket.on('disconnect', function (data) {
        var username = disconnectUser(socket.id);
        socket.broadcast.emit('left', {username: username, id: socket.id});
    });
};

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

// Try and allocate the requested username to the client's socket ID.
// If no username requested by client or requested name is already taken, provide
// a guest username instead.
var createUser = function (id, username) {
    // If username requested, stip it of whitespace and check it isn't already in use
    if (typeof username == 'string') {
        username = stripUsername(username);
        if (currentUsernames.indexOf(username) != -1) {
            username = null;
        }
    }
    
    if (!username) {
        username = generateGuestUsername();
    }
    
    users[id] = username; // Associate username with socket ID
    currentUsernames.push(username); // Add username to list of names in use
    return username;
};

// Remove username from list of names currently in use
var disconnectUser = function (id) {
    var username = users[id];
    var userIndex = currentUsernames.indexOf(username);
    if (userIndex != -1) {
        currentUsernames.splice(userIndex, 1);
    }
    delete users[id];
    return username;
};