// third libraries
require('dotenv').config();
const pool = require('./helpers/postgres');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const client = require('./helpers/redis');

const checkJwtToken = require('./helpers/jwt');

// controllers
const authenticationCtrl = require('./controllers/authentication');
const waitingRoomCtrl = require('./controllers/waitingRoom');

// express & socket.io
const express = require('express');
const app = express();
var http = require('http').Server(app);
const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log(`Example app listening on port ${PORT}!`));

const io = require('socket.io')(http, {
    path: '/waiting-room-socket',
});

// io middleware to check waiting room number
io.use(function(socket, next) {
    try {
        var storeId = socket.request._query.storeId;
        var userId = socket.request._query.userId;

        console.log(`Middleware: Trying to connect to storeId ${storeId}`);

        if (
            parseInt(storeId) !== 1 &&
            parseInt(storeId) !== 2 &&
            parseInt(storeId) !== 3
        ) {
            console.log('The storeId number is not valid');
            return next(
                new Error('Middleware: The storeId number is not valid')
            );
        }

        if (userId.length < 3) {
            console.log('The userId number is not valid');
            return next(
                new Error('Middleware: The userId number is not valid')
            );
        }

        next();
    } catch (err) {
        return next(new Error(err));
    }
});

// bodyParser
app.use(bodyParser.urlencoded({ extended: false })); // parse application/x-www-form-urlencoded

app.use(morgan('dev'));

// public routes
app.get('/', ({ res }) => res.send('API available'));
app.post('/authentication', authenticationCtrl.authenticateUser);
app.post('/waiting-room', waitingRoomCtrl.addUser);
app.get('/waiting-room-render', function(req, res) {
    res.sendFile(__dirname + '/waiting-room-render.html');
});

client().then(redisCli => {
    //socket.io
    io.on('connection', function(socket) {
        const userId = socket.handshake.query.userId;
        const storeId = socket.handshake.query.storeId;

        console.log(`User ${userId} connected to ${storeId}`);

        // join the room
        socket.join(storeId, () => {
            let rooms = Object.keys(socket.rooms);
            console.log(rooms); // [ <socket.id>, 'room 237' ]
        });

        // subscribe to redis events
        redisCli.subscribe(`waitingRoom${storeId}`);

        socket.on('disconnect', function() {
            console.log(`User ${userId} discconnected to ${storeId}`);
        });

        // old behavior
        redisCli.subscribe('waitingRoom');

        redisCli.on('message', (channel, id) => {
            console.log(channel);
            if (channel === 'waitingRoom') {
                socket.emit('waitingRoom', id);
            }
        });
    });
});

// private routes
app.use(checkJwtToken);

app.get('/private', ({ res }) =>
    res.send({ status: 200, message: 'You are in' })
);
