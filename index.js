// third libraries
require('dotenv').config();
const pool = require('./helpers/postgres');
const morgan = require('morgan');
const bodyParser = require('body-parser');

// heplers, controllers & models
const client = require('./helpers/redis');
const checkJwtToken = require('./helpers/jwt');
const authenticationCtrl = require('./controllers/authentication');
const waitingRoomCtrl = require('./controllers/waitingRoom');
const waitingRoomModel = require('./models/waitingRoom');

const stores = [
    { storeId: 1, name: 'Sport 78' },
    { storeId: 2, name: 'Blast' },
    { storeId: 3, name: 'Mc Donals' },
];

// get a redis client
client()
    .then(redisCli => {
        // express & socket.io
        const express = require('express');
        const app = express();
        var http = require('http').Server(app);

        const io = require('socket.io')(http, {
            path: '/waiting-room-socket',
        });

        // socket.io middleware to check the connection params
        io.use(function(socket, next) {
            try {
                var storeId = socket.request._query.storeId;
                var clientId = socket.request._query.clientId;

                console.log(
                    `Middleware: Trying to connect clientId ${clientId} to storeId ${storeId}`
                );

                let storeFound = false;

                stores.forEach(store => {
                    if (store.storeId == storeId) {
                        storeFound = true;
                    }
                });

                if (!storeFound) {
                    console.log('The storeId number is not valid');
                    return next(
                        new Error('Middleware: The storeId number is not valid')
                    );
                }

                if (clientId.length < 3) {
                    console.log('The clientId number is not valid');
                    return next(
                        new Error(
                            'Middleware: The clientId number is not valid'
                        )
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

        //socket.io

        // subscribe nodejs to redis channels
        stores.forEach(store => {
            redisCli.subscribe(`waitingRoom${store.storeId}`);
        });

        io.on('connection', function(socket) {
            const clientId = socket.handshake.query.clientId;
            const storeId = socket.handshake.query.storeId;
            const myWaitingRoomId = `waitingRoom${storeId}`;

            console.log(`User ${clientId} connected to ${storeId}`);

            redisCli.on('message', async (channel, waitingRoom) => {
                console.log(channel);
                if (channel === myWaitingRoomId) {
                    socket.emit('waitingRoomChanged', waitingRoom);
                }
            });

            // join to the socket.io room
            socket.join(myWaitingRoomId, () => {
                let rooms = Object.keys(socket.rooms);
                console.log(rooms); // [ <socket.id>, 'room 237' ]
            });

            try {
                console.log('clientId', clientId);
                console.log('storeId', storeId);
                waitingRoomModel.pushClient(clientId, storeId).catch(err => {
                    console.log('--------------------------------------------');
                    console.log(err);
                });
            } catch (err) {
                console.log(err.message);
            }

            socket.on('disconnect', function() {
                console.log(`User ${clientId} discconnected to ${storeId}`);
            });
        });

        // private routes
        app.use(checkJwtToken);

        app.get('/private', ({ res }) =>
            res.send({ status: 200, message: 'You are in' })
        );

        // listen nodejs
        const PORT = process.env.PORT || 3000;
        http.listen(PORT, () =>
            console.log(`videocallshop-api listen on port ${PORT}!`)
        );
    })
    .catch(err => {
        console.log(err.message);
    });
