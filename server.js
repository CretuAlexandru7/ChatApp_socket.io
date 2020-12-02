const express = require("express");
const path = require("path");
const http = require('http');
const socketio = require('socket.io');
const formatMessage = require('./utils/messages');
const { userJoin, getCurrentUser, userLeave, getRoomUsers} = require('./utils/users');

const app = express();
const server = http.createServer(app);
const io = socketio(server);

// Set static files:
app.use(express.static(path.join(__dirname)));
const botName = 'ChatBot';

// Run when a client connects:
io.on('connection', (socket) => {
    socket.on('joinRoom', ({ username, room }) => {
        const user = userJoin(socket.id, username, room);
        
        // client must subscribe the socket to a given channel: 
        socket.join(user.room); 

        // Welcomes current user:
        socket.emit('message', formatMessage(botName, 'Welcome to Chat!'));     // notify the user who's connecting that he is connecting;

        // Broadcast when a user connects:
        socket.broadcast            // for all the clients except the one connecting
            .to(user.room)
            .emit(
                'message',
                formatMessage(botName, `${username} has joined the chat`)
                );  
                
        // Send users and room info:
        io.to(user.room).emit('roomUsers', {
            room: user.room,
            users: getRoomUsers(user.room)
        });
    });
    
    // Listen for chatMessage:
    socket.on('chatMessage', (msg) => {
        const user = getCurrentUser(socket.id);
      
        io.to(user.room).emit('message', formatMessage(user.username, msg));                 
    });

    // Runs when a client disconnets:
    socket.on('disconnect', () => {     // to everybody 
        const user = userLeave(socket.id);

        if(user){
            io.to(user.room).emit('message', formatMessage(botName, `${user.username} disconnected`));
        
            io.to(user.room).emit('roomUsers', {
                room: user.room,
                users: getRoomUsers(user.room)
            });        
        }        
    });
});

const PORT = process.env.PORT || 4000;

server.listen(PORT, () => {
    console.log(`Server listening to port ${PORT}`);
});

