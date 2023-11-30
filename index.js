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

// cartoon list
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
// writer list
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
app.post('/api/post', (req, res) => {
    const { id, name } = req.body;
    res.json({ok: true, id: id, name: name})
})
app.put('/api/put/:id', (req, res) => {
    const { id } = req.params
    const { name } = req.body
    res.json({ok: true, id: id, name: name})
})
app.patch('/api/patch/:id', (req, res) => {
    const { id } = req.params
    const { name } = req.body
    res.json({ok: true, id: id, name: name})
})
app.delete('/api/delete/:id', (req, res) => {
    const { id } = req.params;
    res.json({ok: true, id: id})
})

app.listen(4000, () => console.log('run express server'));