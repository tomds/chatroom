# Chatroom

This is a really simple proof-of-concept chat app using websockets, written in [node.js](http://nodejs.org/) with [socket.io](http://socket.io/) and [express](http://expressjs.com/). No database involved!

You can see a live demo at http://tomds-chatroom.jit.su/, hosted on [nodejitsu](http://nodejitsu.com/), which as far as I can tell from my limited experience, is excellent :)

# What it does

As I say, it is a very basic implementation and not a fully-featured chat app. Features include:

* Send messages to everyone (no private messaging)
* See who else is connected
* Change your username (checks for username invalid, in use etc.)
* Username remembered in a cookie for next time (you get a guest username the first time you log in)

There is no logging or history of any kind; if you reload the page then you lose your chat history. And there's no private messaging or multiple channels.

# Installation

Assuming you already have node.js installed, go to your checkout and type:

    npm install

Then run the server with:

    node server.js
    
You should now have a server running on localhost:8000.

# Hosting

I have successfully deployed this code to [nodejitsu](http://nodejitsu.com/) and [heroku](http://www.heroku.com/), although I would recommend nodejitsu as heroku didn't seem to work very well, possibly due to dodgy websockets support.