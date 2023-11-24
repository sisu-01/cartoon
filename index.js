require('./cron.js');

const express = require('express');
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true}));
const POOL = require('./pool.js');

const PAGE_LIMIT = 5;

app.get('/', (req, res) => {
    res.send('Hello World');
});

app.get('/cartoon/:page', (req, res) => {
    const PAGE = req.params.page || 0;
    const PAGE_START = PAGE * PAGE_LIMIT;
    POOL.getConnection((err, conn) => {
        if (err) {
            if (conn) {
                conn.release()
            }
            res.json({ok:false, err});
            return;
        }
        conn.query(`select title from cartoon where 1=1 order by id desc limit ${PAGE_START}, ${PAGE_LIMIT};`, (err, result) => {
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
app.get('/api/get/:id', (req, res) => {
    const id = req.params.id
    res.json({ok: false, id: id})
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

app.listen(3000, () => console.log('run express server'));