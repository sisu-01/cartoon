const MYSQL = require('mysql');
const CONFIG = require('./config/db.json');
const POOL = MYSQL.createPool(CONFIG);

module.exports = POOL;