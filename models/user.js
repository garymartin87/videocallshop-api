const pool = require('../helpers/postgres');

const getUserByEmail = async email => {
    try {
        return await pool.query(
            `SELECT * FROM users WHERE email='${email}' LIMIT 1;`
        );
    } catch (err) {
        console.log('ERROR query');
        throw err;
    }
};

module.exports = {
    getUserByEmail,
};
