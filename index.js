const express = require('express');
const cors = require('cors');
const runSql = require('./utils/pool.js');
const CONFIG = require('./config/config.json');
//require('./cron.js');
//이제 스크래핑, 시리즈 분류는 파이썬으로 하겠다.

const app = express();
const whitelist = CONFIG['whiteList'];
const corsOptions = {
    origin: function (origin, callback) {
        if (origin===undefined || whitelist.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            return callback(new Error('Not allowed by CORS'));
        }
    },
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true}));
app.use(function (err, req, res, next) {
    if (err.message === 'Not allowed by CORS') {
        return res.status(403).json({ error: 'Not allowed by CORS' });
    }
    next(err);
});

const PER_PAGE = 10;

app.get('/api/cartoon', async (req, res) => {
    let temp = parseInt(req.query.page, 10) || 1;
    const page = (temp < 1)? 1 : temp;
    const sort = req.query.sort === 'true';
    const cut = Number(req.query.cut) || false;
    const title = req.query.title;
    const titleIsValid = !(title === '' || title === null || title === undefined || !title);
    let queryParams;
    
    let countSql = `SELECT COUNT(*) AS 'count' FROM cartoon WHERE 1=1`;
    if (cut) {
        countSql += ` AND recommend >= ${cut}`;
    }
    if (titleIsValid) {
        countSql += ' AND title LIKE ?';
        queryParams = [`%${title}%`];
    } else {
        queryParams = [];
    }

    const count = await runSql(countSql, queryParams).then(data => {return data[0]['count']}).catch(() => {return 0});

    if (count > 0) {
        const START_PAGE = (page - 1) * PER_PAGE;
        let listSql = '';
        listSql += `SELECT * FROM cartoon WHERE 1=1`;
        if (cut) {
            listSql += ` AND recommend >= ${cut}`;
        }
        if (titleIsValid) {
            listSql += ' AND title LIKE ?'
        }
        if (sort) {
            listSql += ` ORDER BY recommend DESC`;
        } else {
            listSql += ` ORDER BY id DESC`;
        }
        listSql += ` LIMIT ${START_PAGE}, ${PER_PAGE}`;
        const list = await runSql(listSql, queryParams).then(data => {return data}).catch(()=>{return null});

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

app.get('/api/cartoonRand', async (req, res) => {
    const randSql = 'SELECT id FROM cartoon ORDER BY RAND() LIMIT 1';
    const cartoonId = await runSql(randSql).then(data => {return data[0]['id']}).catch(()=>{return null});
    if(cartoonId){
        const result = {
            ok: true,
            cartoonId: cartoonId
        }
        res.json(result);
    }else{
        res.json({ok:false, message:'에러발생'});
    }
});

app.get('/api/writer', async (req, res) => {
    let temp = parseInt(req.query.page, 10) || 1;
    const page = (temp < 1)? 1 : temp;
    const sort = parseInt(req.query.sort, 10) || 1;
    const nickname = req.query.nickname;

    let countSql = `SELECT COUNT(*) AS 'count' FROM writer WHERE`;
    let whereSql = '';
    let queryParams;
    let isNicknameValid;
    if (nickname === '' || nickname === null || nickname === undefined || !nickname) {
        whereSql += ' 1=1'
        queryParams = [];
        isNicknameValid = false;
    } else {
        whereSql += ' nickname LIKE ?';
        queryParams = [`%${nickname}%`];
        isNicknameValid = true;
    }
    //where 더하기
    countSql += whereSql;
    const count = await runSql(countSql, queryParams).then(data => {return data[0]['count']}).catch(() => {return 0});

    if (count > 0) {

        const START_PAGE = (page - 1) * PER_PAGE;
        let listSql = `SELECT id, nickname, date, count, recommend, average FROM writer WHERE`;
        //where 더하기
        listSql += whereSql;
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
        const list = await runSql(listSql, queryParams).then(data => {return data}).catch(()=>{return null});

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

//여기
app.get('/api/infoCount', async (req, res) => {
    const id = req.query.id;
    const nickname = req.query.nickname;

    // 아래 코드는 부적절한 코드이다. nickname을 문자열에 바로 박아버리는데, 이것은 sql injection을 일으킬 수 있다.
    // 파라미터화된 쿼리를 사용하면 저 ? 안에 값이 그대로 쿼리에 삽입되지 않고 별도의 쿼리로 전달된다고 한다.
    //const countSql += `SELECT COUNT(*) AS 'count' FROM writer WHERE id = '${id}' AND nickname = '${nickname}'`;
    
    // 파라미터화된 쿼리 사용
    const countSql = 'SELECT COUNT(*) AS count FROM writer WHERE id = ? AND nickname = ?';
    const count = await runSql(countSql, [id, nickname]).then(data => {return data[0]['count']}).catch(() => {return 0});

    if (count > 0) {

        // let listSql = '';
        // listSql += `SELECT count`;
        // listSql += ` FROM writer WHERE id = '${id}' AND nickname = '${nickname}'`;
        
        // 마찬가지로 파라미터화된 쿼리 사용
        const listSql = 'SELECT count FROM writer WHERE id = ? AND nickname = ?';
        const list = await runSql(listSql, [id, nickname]).then(data => {return data}).catch(()=>{return null});
        
        if(list){
            const result = {
                ok: true,
                count: list[0]['count'],
            }
            res.json(result);
        }else{
            res.json({ok:false, message:'에러발생'});
        }

    } else {
        res.json({ok:false, message:'없음'});
    }
});

app.get('/api/info', async (req, res) => {
    let temp = parseInt(req.query.page, 10) || 1;
    const page = (temp < 1)? 1 : temp;
    const id = req.query.id;
    const nickname = req.query.nickname;
    const sort = req.query.sort === 'true';
    const cut = Number(req.query.cut) || false;

    let countSql = '';
    countSql += `SELECT COUNT(*) AS 'count' FROM cartoon WHERE (writer_id = ? AND writer_nickname = ?)`;
    if (cut) {
        countSql += ` AND recommend >= ${cut}`;
    }
    const count = await runSql(countSql, [id, nickname]).then(data => {return data[0]['count']}).catch(() => {return 0});

    if (count > 0) {

        const START_PAGE = (page - 1) * PER_PAGE;
        let listSql = '';
        listSql += `SELECT * FROM cartoon`;
        listSql += ` WHERE (writer_id = ? AND writer_nickname = ?)`;
        if (cut) {
            listSql += ` AND recommend >= ${cut}`;
        }
        if (sort) {
            listSql += ` ORDER BY recommend DESC`;
        } else {
            listSql += ` ORDER BY id DESC`;
        }
        listSql += ` LIMIT ${START_PAGE}, ${PER_PAGE}`;
        const list = await runSql(listSql, [id, nickname]).then(data => {return data}).catch(()=>{return null});

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

app.get('/api/series', async (req, res) => {
    const PER_PAGE = 36;
    let temp = parseInt(req.query.page, 10) || 1;
    const page = (temp < 1)? 1 : temp;
    const sort = req.query.sort === 'true';
    const cut = Number(req.query.cut) || false;
    
    let countSql = '';
    countSql += `SELECT COUNT(*) AS 'count' FROM series WHERE 1=1`;
    if (cut) {
        countSql += ` AND average >= ${cut}`;
    }
    const count = await runSql(countSql).then(data => {return data[0]['count']}).catch(() => {return 0});

    if (count > 0) {

        const START_PAGE = (page - 1) * PER_PAGE;
        let listSql = '';
        listSql += `SELECT * FROM series WHERE 1=1`;
        if (cut) {
            listSql += ` AND average >= ${cut}`;
        }
        if (sort) {
            listSql += ` ORDER BY average DESC`;
        } else {
            listSql += ` ORDER BY last_update DESC`;
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

app.get('/api/list', async (req, res) => {
    let temp = parseInt(req.query.page, 10) || 1;
    const page = (temp < 1)? 1 : temp;
    const id = parseInt(req.query.id, 10) || false;
    
    if(!id) {
        res.json({ok:false, message:'id 에러'});
        return;
    }

    let countSql = '';
    countSql += `SELECT COUNT(*) AS 'count' FROM cartoon WHERE series_id = ${id}`;
    const count = await runSql(countSql).then(data => {return data[0]['count']}).catch(() => {return 0});

    if (count > 0) {

        const START_PAGE = (page - 1) * PER_PAGE;
        let listSql = '';
        listSql += `SELECT * FROM cartoon`;
        listSql += ` WHERE series_id = ${id}`;
        listSql += ` ORDER BY id DESC`;
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

app.get('/api/listInfo', async (req, res) => {
    const id = parseInt(req.query.id, 10) || false;
    
    if(!id) {
        res.json({ok:false, message:'id 에러'});
        return;
    }

    let countSql = '';
    countSql += `SELECT COUNT(*) AS 'count' FROM series WHERE id = ${id}`;
    const count = await runSql(countSql).then(data => {return data[0]['count']}).catch(() => {return 0});

    if (count > 0) {

        let listSql = '';
        listSql += `SELECT s.writer_id, s.writer_nickname, s.count,`;
        listSql += ` (SELECT c.title FROM cartoon c WHERE c.series_id = s.id ORDER BY c.id ASC LIMIT 1) AS title`;
        listSql += ` FROM series s WHERE s.id = ${id}`;
        const list = await runSql(listSql).then(data => {return data}).catch(()=>{return null});
        
        if(list){
            const result = {
                ok: true,
                title: list[0]['title'],
                writer_id: list[0]['writer_id'],
                writer_nickname: list[0]['writer_nickname'],
                count: list[0]['count'],
            }
            res.json(result);
        }else{
            res.json({ok:false, message:'에러발생'});
        }

    } else {
        res.json({ok:false, message:'없음'});
    }
});

app.listen(4000, () => console.log('run express server'));