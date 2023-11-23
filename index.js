require('./cron.js');

const express = require('express');
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true}));
const POOL = require('./pool.js');

/*
//select * from test where 1=1;
//

mysql.getConnection((err, conn) => {
        if(err) throw err;
        conn.query('SET autocommit = 0;');
        conn.query('SET unique_checks = 0;');
        conn.query('ALTER TABLE t_info DISABLE KEYS;')

sql2 = 'selec tasdfasdf form asdfa where asdfaf 1=1'
values2 = {
    board_id:values.board_id,
    ipaddr: values.ipaddr,
    ipaddr1: values.ipaddr1,
    ipaddr2: values.ipaddr2,
    ipaddr3: values.ipaddr3,
    ipaddr4: values.ipaddr4,
    error_log: err.sqlMessage
};
conn.query(sql2,values2,
*/

app.get('/', (req, res) => {
    res.send('Hello World');
});

app.get('/api/get', (req, res) => {
    POOL.getConnection((err, conn) => {
        if (err) {
            if (conn) {
                conn.release()
            }
            res.json({ok:false, err});
            return;
        }
        conn.query('select * from test where 1=1', (err, result) => {
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