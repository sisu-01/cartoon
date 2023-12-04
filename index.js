const POOL = require('./pool.js');
const express = require('express');
const cors = require('cors');
require('./cron.js');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true}));
app.use(cors({
    'origin': '*',
}));

const PER_PAGE = 5;

app.get('/cartoon', async (req, res) => {
    let temp = Number(req.query.page);
    const page = (temp < 1)? 1 : temp;
    const sort = req.query.sort === 'true';
    const cut = Number(req.query.cut) || false;
    
    let countSql = '';
    countSql += `SELECT COUNT(*) AS 'count' FROM cartoon WHERE 1=1`;
    if (cut) {
        countSql += ` AND recommend >= ${cut}`;
    }
    const count = await runSql(countSql).then(data => {return data[0]['count']}).catch(() => {return 0});

    if (count > 0) {

        const START_PAGE = (page - 1) * PER_PAGE;
        let listSql = '';
        listSql += `SELECT * FROM cartoon WHERE 1=1`;
        if (cut) {
            countSql += ` AND recommend >= ${cut}`;
        }
        if (sort) {
            listSql += ` ORDER BY recommend DESC`;
        } else {
            listSql += ` ORDER BY id DESC`;
        }
        listSql += ` limit ${START_PAGE}, ${PER_PAGE}`;
        const list = await runSql(listSql).then(data => {return data}).catch(()=>{return null});

        if(list){
            const result = {
                ok: true,
                page: page,
                count: count,
                perPage: PER_PAGE,
                list: list
            }
            res.json(result);
        }else{
            res.json({ok:false, message:'에러발생'});
        }
    }else{
        res.json({ok:false, message:'없음'});
    }
});

app.get('/info', async (req, res) => {
    let temp = Number(req.query.page);
    const page = (temp < 1)? 1 : temp;
    //수정 id랑 nickname sql 인잭션 방지해야돼;
    const id = req.query.id;
    const nickname = req.query.nickname;
    const sort = req.query.sort === 'true';
    const cut = Number(req.query.cut) || false;

    let countSql = '';
    countSql += `SELECT COUNT(*) AS 'count' FROM cartoon WHERE (writer_id = '${id}' AND writer_nickname = '${nickname}')`;
    if (cut) {
        countSql += ` AND recommend >= ${cut}`;
    }
    const count = await runSql(countSql).then(data => {return data[0]['count']}).catch(() => {return 0});

    if (count > 0) {

        const START_PAGE = (page - 1) * PER_PAGE;
        let listSql = '';
        listSql += `SELECT * FROM cartoon`;
        listSql += ` WHERE (writer_id = '${id}' AND writer_nickname = '${nickname}')`;
        if (cut) {
            listSql += ` AND recommend >= ${cut}`;
        }
        if (sort) {
            listSql += ` ORDER BY recommend DESC`;
        } else {
            listSql += ` ORDER BY id DESC`;
        }
        listSql += ` limit ${START_PAGE}, ${PER_PAGE}`;
        console.log(listSql);
        const list = await runSql(listSql).then(data => {return data}).catch(()=>{return null});

        if(list){
            const result = {
                ok: true,
                count: count,
                perPage: PER_PAGE,
                list: list
            }
            res.json(result);
        }else{
            res.json({ok:false, message:'에러발생'});
        }

    } else {
        res.json({ok:false, message:'없음'});
    }
});

function runSql(sql, values) {
    return new Promise((resolve, reject) => {
       POOL.getConnection((err, conn) => {
        if (err) {
            if (conn) {
                conn.release()
            }
            reject(err);
        }
        conn.query(sql, values, (err, rows) => {
            conn.release();
            if (err) {
                reject(err);
            }
            resolve(rows);
        });
      });
    });
}

app.listen(4000, () => console.log('run express server'));