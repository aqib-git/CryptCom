var express = require('express');
var path = require('path');
var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var url = require('url');
var fs = require('fs');

var rooms = {};

/* Routes */
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', function(req, res){
	res.sendFile(__dirname + '/index.html');
});

app.get('/chatroom/:name', function(req, res){
	if(!req.params.name || req.params.name.trim() === '')
		res.redirect('/');
	res.sendFile(__dirname + '/chatroom.html');
});

app.get('*', function(req, res){
  res.sendFile(__dirname + '/404.html');
});

/* Server Events*/
io.on('connection', function(socket){
  /* create new room event */
  socket.on('join room', function(room, userName) {
    
    if(!room || room.trim() === '') {
      socket.disconnect(true);
      return;
    }

    if(!userName || userName.trim().length === 0) {
      socket.disconnect(true);
      return false;
    }

    if(userNameExists(room, userName)) {
      socket.emit('username exists');
      return;
    }

    socket.join(room, () => {
      insertUser(room, userName);
      io.sockets.to(room).emit('room users', roomUsers(room));
      io.sockets.to(room).emit('user joined', userName);
    });


    socket.to(room).on('chat message', function(data){
      io.sockets.in(room).emit('chat message', data);
    });

    socket.to(room).on('disconnect', function(){
      //console.log("you are disconnected in room", room);
      removeUser(room, userName);
      socket.leave(room);
      io.sockets.to(room).emit('user left', userName);
      io.sockets.to(room).emit('room users', roomUsers(room));
    });

  });

});


/* Helpers */

function insertUser(room, userName) {
 //console.log('insert before', rooms);
  if(!userNameExists(room, userName)) {
    if(room in rooms) {
      rooms[room].users.push(userName); 
    } else {
      rooms[room] = {users: [userName]};
    }
  }

  //console.log('insert', rooms);
}

function removeUser(room, userName) {
  if(userNameExists(room, userName)) {
    if(room in rooms) {
      let pos = rooms[room].users.indexOf(userName); 
      rooms[room].users.splice(pos, 1);
    }
  }
  //console.log("remove", rooms);
}


function userNameExists(room, userName) {
  if(room in rooms) {
    if(rooms[room].users.indexOf(userName) !== -1) {
      //console.log(userName, 'exists');
      return true;
    }
  }
  return false;
}

function roomExists(room) {
  if(room in rooms) {
    return true;
  }
  return false;
}

function roomUsers(room) {
  if(!room || room.trim().length === 0) {
    return null;
  }
  if(room in rooms) {
    return rooms[room]['users'];
  }
}

/* Start Listening for connections */
http.listen(3000, function(){
  	//console.log('listening on *:3000');
});