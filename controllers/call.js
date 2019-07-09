const videocallHelper = require('../helpers/videocall');
const callModel = require('../models/call');
const callRequestModel = require('../models/callRequest');
const waitingRoomModel = require('../models/waitingRoom');

const CALLED = 'CALLED';

const getCall = async (req, res, next) => {
    // authorization
    try {
        const hasAccess =
            req.authorization.storeUser.thisStore ||
            (req.authorization.callRequestToken.thisStore &&
                req.authorization.callRequestToken.thisCall);

        if (!hasAccess) {
            throw new Error('Unauthorized.');
        }
    } catch (err) {
        const myErr = new Error('Unauthorized.');
        myErr.status = 401;
        return next(myErr);
    }

    try {
        const { callId } = req.params;
        const call = await callModel.getCall(callId);

        const status = 200;
        res.status(status);
        res.send({ status, data: call });
    } catch (err) {
        err.status = 500;
        return next(err);
    }
};

const getCalls = async (req, res, next) => {
    // authorization
    try {
        const hasAccess = req.authorization.storeUser.thisStore;
        if (!hasAccess) {
            throw new Error('Unauthorized.');
        }
    } catch (err) {
        const myErr = new Error('Unauthorized.');
        myErr.status = 401;
        return next(myErr);
    }

    try {
        const { storeId } = req.params;
        const calls = await callModel.getCallsByStoreId(storeId);

        const status = 200;
        res.status(status);
        res.send({ status, data: calls });
    } catch (err) {
        err.status = 500;
        return next(err);
    }
};

const callClient = async (req, res, next) => {
    // authorization
    try {
        const hasAccess = req.authorization.storeUser.thisStore;

        if (!hasAccess) {
            throw new Error('Unauthorized.');
        }
    } catch (err) {
        let myErr = new Error('Unauthorized');
        myErr.status = 401;
        return next(myErr);
    }

    // is the store user in call
    const currentCall = await callModel.getCallsByStoreUserAndState(
        req.session.storeUser.storeUserId,
        CALLED
    );

    if (currentCall.length) {
        const err = new Error('You are already in call.');
        err.status = 400;
        return next(err);
    }

    try {
        const { storeId } = req.params;
        const { callRequestId } = req.body;

        const inQueue = await waitingRoomModel.findCallRequestInQueue(
            callRequestId
        );

        if (!inQueue) {
            const err = new Error('Call request does not in queue.');
            err.status = 400;
            return next(err);
        }

        const { sessionId } = await videocallHelper.createSession();

        const storeUserId = req.session.storeUser.storeUserId;
        const callId = await callModel.registerCall(
            callRequestId,
            sessionId,
            storeUserId
        );

        const {
            waitingRoomId,
        } = await waitingRoomModel.getWaitingRoomByStoreId(storeId);

        await waitingRoomModel.removeCallRequestInQueue(
            waitingRoomId,
            callRequestId
        );

        await callRequestModel.setState(callRequestId, CALLED);

        const call = await callModel.getCall(callId);

        const status = 200;
        res.status(status);
        res.send({ status, data: call });
    } catch (err) {
        err.status = 500;
        return next(err);
    }
};

module.exports = {
    callClient,
    getCall,
    getCalls,
};
