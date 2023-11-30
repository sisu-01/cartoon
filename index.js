const POOL = require('./pool.js');
const express = require('express');
const cors = require('cors');
require('./cron.js');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true}));
app.use(cors({
    'origin': [
        'http://localhost:3000',
        'http://localhost:3001'
    ]
}));

const PAGE_LIMIT = 5;

app.get('/', (req, res) => {
    res.send('Hello World');
});

app.get('/cartoon', (req, res) => {
    let temp = req.query.page;
    const PAGE = (1<=temp)? temp-1: 0;
    const PAGE_START = PAGE * PAGE_LIMIT;
    
    POOL.getConnection((err, conn) => {
        if (err) {
            if (conn) {
                conn.release()
            }
            res.json({ok:false, err});
            return;
        }
        conn.query(`select * from cartoon where 1=1 order by id desc limit ${PAGE_START}, ${PAGE_LIMIT};`, (err, result) => {
            conn.release();
            if(err) {
                res.json({ok:false, err});
                return;
            }else{
                res.json({ok:true, result});
            }
        })
    });
})

app.get('/writer', (req, res) => {
    const { page, id, nickname } = req.query;
    const PAGE_LIMIT = 2;
    const PAGE_START = page * PAGE_LIMIT;

    let sql = '';
    sql += `select * from writer where 1=1`;
    if(page === undefined){
        sql += ` limit 0, ${PAGE_LIMIT}`;
    }else{
        sql += ` limit ${PAGE_START}, ${PAGE_LIMIT}`;
    }
    sql += ``;
    sql += ``;
    console.log(sql);
    POOL.getConnection((err, conn) => {
        if (err) {
            if (conn) {
                conn.release()
            }
            res.json({ok:false, err});
            return;
        }
        conn.query(sql, (err, result) => {
            conn.release();
            if(err) {
                res.json({ok:false, err});
                return;
            }else{
                res.json({ok:true, result});
            }
        })
    });
})

app.get('/info', (req, res) => {
    let temp = req.query.page;
    const PAGE = (1<=temp)? temp-1: 0;
    const PAGE_START = PAGE * PAGE_LIMIT;
    const ID = req.query.id;
    const NICKNAME = req.query.nickname;

    let sql = '';
    sql += `SELECT id, title, date, recommend FROM cartoon WHERE writer_id = '${ID}' AND writer_nickname = '${NICKNAME}'`;
    sql += ` ORDER BY id DESC LIMIT ${PAGE_START}, ${PAGE_LIMIT};`

    POOL.getConnection((err, conn) => {
        if (err) {
            if (conn) {
                conn.release()
            }
            res.json({ok:false, err});
            return;
        }
        conn.query(sql, (err, result) => {
            conn.release();
            if(err) {
                res.json({ok:false, err});
                return;
            }else{
                res.json({ok:true, result});
            }
        })
    });
})

app.listen(4000, () => console.log('run express server'));