const pool = require('../helpers/postgres');

const getCall = async callId => {
    const result = await pool.query(
        `SELECT * FROM calls c WHERE c.call_id='${callId}' LIMIT 1;`
    );

    if (result.rows.length) {
        return result.rows[0];
    } else {
        throw new Error('Call was not found.');
    }
};

const getCallsByStoreId = async storeId => {
    try {
        const result = await pool.query(
            `SELECT * FROM calls c INNER JOIN call_requests cr ON cr.call_request_id = c.call_request_id WHERE cr.store_id='${storeId}' LIMIT 1;`
        );

        return result.rows;
    } catch (err) {
        console.log(err);
        console.log('ERROR query getCallsByStoreId');
        throw new Error(err.message);
    }
};

const getCallsByStoreUserAndState = async (storeUserId, state) => {
    try {
        const result = await pool.query(
            `SELECT * FROM calls c INNER JOIN call_requests cr ON cr.call_request_id = c.call_request_id WHERE c.store_user_id='${storeUserId}' AND cr.state='${state}' LIMIT 1;`
        );

        return result.rows;
    } catch (err) {
        console.log(err);
        console.log('ERROR query getCallsByStoreUserAndState');
        throw new Error(err.message);
    }
};

const registerCall = async (callRequestId, tokboxSessionId, storeUserId) => {
    try {
        const now = new Date().toISOString();

        const result = await pool.query(
            `INSERT INTO calls(call_request_id, tokbox_session_id, store_user_id, created_on) VALUES ('${callRequestId}', '${tokboxSessionId}', '${storeUserId}', '${now}') RETURNING call_id;`
        );

        return result.rows[0].callId;
    } catch (err) {
        console.log(err);
        console.log('ERROR query registerCall');
        throw new Error(err.message);
    }
};

module.exports = {
    getCall,
    registerCall,
    getCallsByStoreId,
    getCallsByStoreUserAndState,
};
