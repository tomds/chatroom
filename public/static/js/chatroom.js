// Scroll message box to bottom
var scrollBox = function ($elem) {
    var height = $elem[0].scrollHeight;
    $elem.scrollTop(height);
};

// Add user to userlist in right-hand pane
var addUser = function (id, username) {
    $userLi = $('<li></li>');
    $userLi.text(username);
    $userLi.attr('data-user-id', id);
    $('#users ul').append($userLi);
}

$(document).ready(function () {
    var lastLoad = new Date().getTime();
    var socket = io.connect();
    
    // Message from server to tell client to reload page
    socket.on('reload', function (data) {
        window.location.reload(true);
    });
    
    socket.on('server-full', function (data) {
        $('#username-submit-result').text('');
        $('#username-submit-result').removeClass('success').addClass('fail');
        $('#username-submit-result').text('Server full; please try again later');
    });
    
    // Received on a successful connection being initialised. Request username if
    // one stored in cookies, and inform server of the time this page was last
    // loaded. If it is earlier than when the server was last restarted, the
    // server will send a 'reload' signal and force a page reload.
    socket.on('welcome', function (data) {
        $('#username-submit-result').text('');
        socket.emit('join', {username: $.cookie('chatroom-username'), lastLoad: lastLoad});
    });
    
    // If we receive a userlist from the server, trash any current userlist and
    // replace it with the new one
    socket.on('userlist', function (data) {
        $('#users ul').html('');
        for (i in data.users) {
            addUser(i, data.users[i]);
        }
    });
    
    // If message sent by a user (including ourselves), display it in the message
    // box and scroll to the bottom of the box
    socket.on('message', function (data) {
        var $userSpan = $('<span class="username"></span>');
        $userSpan.text('<' + data.username + '>');
        var $msgSpan = $('<span class="message"></span>');
        $msgSpan.text(data.text);
        
        var $div = $('<div></div>');
        $div.append($userSpan, ' ', $msgSpan);
        $('#messages').append($div);
        
        scrollBox($('#messages'));
    });
    
    // If server informs us that someone has joined (including self), display
    // notice in message box and update userlist
    socket.on('joined', function (data) {
        var $messageDiv = $('<div class="notice notice-joined"></div>');
        $messageDiv.text('* ' + data.username + ' joined');
        $('#messages').append($messageDiv);
        scrollBox($('#messages'));
        
        if (data.self) {
            // If we are the user who has joined, update the client with the
            // username the server has assigned us. It might be the one we asked
            // for, but if it was invalid or already taken then it will be a guest
            // username. Whatever it is, store it in a cookie so we can request
            // it again next time we connect.
            $('#field-username').val(data.username);
            $.cookie('chatroom-username', data.username, {expires: 365, path: '/'});
        } else {
            addUser(data.id, data.username);
        }
    });
    
    // When a user disconnects, display notice in message box and remove them from
    // the userlist
    socket.on('left', function (data) {
        var $messageDiv = $('<div class="notice notice-left"></div>');
        $messageDiv.text('* ' + data.username + ' left');
        $('#messages').append($messageDiv);
        scrollBox($('#messages'));

        $('#users li[data-user-id=' + data.id + ']').remove();
    });
    
    // When a user changes their username, display notice in message box and
    // update userlist
    socket.on('changed-username', function (data) {
        var $messageDiv = $('<div class="notice notice-changed-username"></div>');
        $messageDiv.text('* ' + data.oldName + ' is now known as ' + data.newName);
        $('#messages').append($messageDiv);
        scrollBox($('#messages'));
        
        var $userLi = $('#users li[data-user-id=' + data.id + ']');
        $userLi.text(data.newName);
    });
    
    // Server response to request to change username, with success/fail message
    socket.on('change-username-submit', function (data) {
        $('#username-submit-result').text(''); // Contains message text from server
        if (data.success) {
            $('#username-submit-result').removeClass('fail').addClass('success');
            // Store username for next time we connect
            $.cookie('chatroom-username', data.username, {expires: 365, path: '/'});
        } else {
            $('#username-submit-result').removeClass('success').addClass('fail');
        }
        $('#username-submit-result').text(data.message);
    });

    // Send message to server on form submit
    $('#enter-message').submit(function (e) {
        e.preventDefault();
        var $input = $('input[name=message]');
        socket.emit('message', {text: $input.val()});
        $input.val('');
    });
    
    // Handler for change username form submit
    $('#change-username').submit(function (e) {
        e.preventDefault();
        var $input = $('input[name=username]');
        socket.emit('change-username', {username: $input.val()});
    });
    
});