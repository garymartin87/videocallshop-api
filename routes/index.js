const express = require('express');
const router = express.Router();

const authenticationCtrl = require('../controllers/authentication');
const storeCtrl = require('../controllers/store');
const waitingRoomCtrl = require('../controllers/waitingRoom');

//ToDo Implement param verifications
//ToDo Implement permissions middleware

// hello
router.get('/', ({ res }) => res.send('videocallshop-api available'));

// authentication
router.post('/authentication/store', authenticationCtrl.authenticateUserStore);

// store
router.get('/store', storeCtrl.getStores);
router.get('/store/:storeId', storeCtrl.getStore);

// waiting room
router.post('/store/:storeId/waiting-room', waitingRoomCtrl.pushClient);
router.get(
    '/store/:storeId/waiting-room',
    authenticationCtrl.isClientInQueueOrStoreUserOwner,
    waitingRoomCtrl.getWaitingRoom
);
router.get(
    '/store/:storeId/waiting-room/:waitingRoomRequestId',
    authenticationCtrl.isClientInQueueOrStoreUserOwner,
    waitingRoomCtrl.isValidRequest,
    waitingRoomCtrl.getResquest
);
router.delete(
    '/store/:storeId/waiting-room/:waitingRoomRequestId',
    authenticationCtrl.isClientOwnerOrStoreUserOwner,
    waitingRoomCtrl.isValidRequest,
    waitingRoomCtrl.removeClient
);
router.delete(
    '/store/:storeId/waiting-room',
    authenticationCtrl.isStoreUserOwner,
    waitingRoomCtrl.removeAll
);

module.exports = router;
