// third libraries
require('dotenv').config();
const pool = require('./helpers/postgres');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const checkJwtToken = require('./helpers/jwt');

// controllers
const authenticationCtrl = require('./controllers/authentication');
const waitingRoomCtrl = require('./controllers/waitingRoom');

// express
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () =>
    console.log(`Example app listening on port ${PORT}!`)
);
const io = require('socket.io')(server);

io.on('connection', function(socket) {
    console.log('a user connected');
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

// private routes
//app.use(checkJwtToken);

app.get('/private', ({ res }) =>
    res.send({ status: 200, message: 'You are in' })
);
