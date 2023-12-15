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

const PER_PAGE = 10;

app.get('/cartoon', async (req, res) => {
    let temp = parseInt(req.query.page, 10) || 1;
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
            listSql += ` AND recommend >= ${cut}`;
        }
        if (sort) {
            listSql += ` ORDER BY recommend DESC`;
        } else {
            listSql += ` ORDER BY id DESC`;
        }
        listSql += ` LIMIT ${START_PAGE}, ${PER_PAGE}`;
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

app.get('/writer', async (req, res) => {
    let temp = parseInt(req.query.page, 10) || 1;
    const page = (temp < 1)? 1 : temp;
    const sort = parseInt(req.query.sort, 10) || 1;

    const countSql = `SELECT COUNT(*) AS 'count' FROM writer WHERE 1=1;`
    const count = await runSql(countSql).then(data => {return data[0]['count']}).catch(() => {return 0});

    if (count > 0) {

        const START_PAGE = (page - 1) * PER_PAGE;
        let listSql = '';
        /*
        listSql += `SELECT writer_id, writer_nickname, date, COUNT(*) AS 'count', ROUND(AVG(recommend)) AS 'average' FROM cartoon`;
        listSql += ` WHERE 1=1`;
        listSql += ` GROUP BY writer_id, writer_nickname`;
        if (sort === 1) {//가나다
            listSql += ` ORDER BY writer_nickname ASC`;
        } else if (sort === 2) {//개추 평균
            listSql += ` ORDER BY average DESC`;
        } else if (sort === 3) {//첫 념글
            listSql += ` ORDER BY id ASC`;
        } else if (sort === 4) {//만화수
            listSql += ` ORDER BY count DESC`;
        }*/
        listSql += `SELECT id, nickname, date, count, recommend, average FROM writer`;
        if (sort === 1) {//가나다
            listSql += ` ORDER BY nickname ASC`;
        } else if (sort === 2) {//첫 념글
            listSql += ` ORDER BY date ASC`;
        } else if (sort === 3) {//작품 개수
            listSql += ` ORDER BY count DESC`;
        } else if (sort === 4) {//누적 개추
            listSql += ` ORDER BY recommend DESC`;
        } else if (sort === 5) {//개추 평균
            listSql += ` ORDER BY average DESC`;
        }
        listSql += ` LIMIT ${START_PAGE}, ${PER_PAGE}`;
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
    let temp = parseInt(req.query.page, 10) || 1;
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
        listSql += ` LIMIT ${START_PAGE}, ${PER_PAGE}`;
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