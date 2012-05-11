var scrollBox = function ($elem) {
    var height = $elem[0].scrollHeight;
    $elem.scrollTop(height);
};

var addUser = function (id, username) {
    $userLi = $('<li></li>');
    $userLi.text(username);
    $userLi.attr('data-user-id', id);
    $('#users ul').append($userLi);
}

$(document).ready(function () {
    var lastLoad = new Date().getTime();
    var socket = io.connect();
    
    socket.on('reload', function (data) {
        window.location.reload(true);
    });
    
    socket.on('server-full', function (data) {
        $('#username-submit-result').text('');
        $('#username-submit-result').removeClass('success').addClass('fail');
        $('#username-submit-result').text('Server full; please try again later');
    });
    
    socket.on('welcome', function (data) {
        $('#username-submit-result').text('');
        socket.emit('join', {username: $.cookie('chatroom-username'), lastLoad: lastLoad});
    });
    
    socket.on('userlist', function (data) {
        $('#users ul').children().remove();
        for (i in data.users) {
            addUser(i, data.users[i]);
        }
    });
    
    socket.on('message', function (data) {
        var $div = $('<div></div>');
        var $userSpan = $('<span class="username"></span>');
        $userSpan.text('<' + data.username + '>');
        var $msgSpan = $('<span class="message"></span>');
        $msgSpan.text(data.text);
        $div.append($userSpan);
        $div.append(' ');
        $div.append($msgSpan);
        $('#messages').append($div);
        
        scrollBox($('#messages'));
    });
    
    socket.on('joined', function (data) {
        var $messageDiv = $('<div class="notice notice-joined"></div>');
        $messageDiv.text('* ' + data.username + ' joined');
        $('#messages').append($messageDiv);
        scrollBox($('#messages'));
        
        if (data.self) {
            $('#field-username').val(data.username);
            $.cookie('chatroom-username', data.username, {expires: 365, path: '/'});
        } else {
            addUser(data.id, data.username);
        }
    });
    
    socket.on('left', function (data) {
        var $messageDiv = $('<div class="notice notice-left"></div>');
        $messageDiv.text('* ' + data.username + ' left');
        $('#messages').append($messageDiv);
        scrollBox($('#messages'));

        $('#users li[data-user-id=' + data.id + ']').remove();
    });
    
    socket.on('changed-username', function (data) {
        var $messageDiv = $('<div class="notice notice-changed-username"></div>');
        $messageDiv.text('* ' + data.oldName + ' is now known as ' + data.newName);
        $('#messages').append($messageDiv);
        scrollBox($('#messages'));
        
        var $userLi = $('#users li[data-user-id=' + data.id + ']');
        $userLi.text(data.newName);
    });
    
    socket.on('change-username-submit', function (data) {
        $('#username-submit-result').text('');
        if (data.success) {
            $('#username-submit-result').removeClass('fail').addClass('success');
            $.cookie('chatroom-username', data.username, {expires: 365, path: '/'});
        } else {
            $('#username-submit-result').removeClass('success').addClass('fail');
        }
        $('#username-submit-result').text(data.message);
    });

    $('#enter-message').submit(function (e) {
        e.preventDefault();
        var $input = $('input[name=message]');
        socket.emit('message', {text: $input.val()});
        $input.val('');
    });
    
    $('#change-username').submit(function (e) {
        e.preventDefault();
        var $input = $('input[name=username]');
        socket.emit('change-username', {username: $input.val()});
    });
    
});