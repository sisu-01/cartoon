const cron = require('node-cron');
const cheerio = require('cheerio');
const POOL = require('./pool.js');

let count = 0;
//second(초), minute(분), hour(시), day-of-month(날짜), month(월), day-of-week(요일)
// cron.schedule('* * * * * *', () => {
//     console.log(count++);
// });

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
const loop = 6;
async function scraping(newest) {
    console.log(`id ${newest}까지 간다`);
    for (let i=1; i < loop; i++) {
        console.log(`${i}페이지`);
        const url = `https://gall.dcinside.com/board/lists/?id=cartoon&page=${i}&exception_mode=recommend`;
        const html = await fetch(url).then(res => res.text());
        const $ = cheerio.load(html, null, false);

        try {
            $('tbody > tr.us-post').map((i, el)=> {
                const id = $(el).find('.gall_num').text();
                if (newest >= id) throw 'break';
                const values = makeValues($, el);
                runSql('INSERT IGNORE INTO writer SET ?', values[0])
                .then(() => {
                    runSql('INSERT IGNORE INTO cartoon SET ?', values[1])
                    .then(() => {
                        console.log(`${i} 사이클`);
                    }).catch(e => {console.log(e)});
                }).catch(e => {console.log(e)})
            });
        } catch(e) {
            console.log(e);
            if (e === 'break') break;
        }
    }
}

function makeValues($, el) {
    const date = new Date($(el).find('.gall_date').attr('title'));
    const writer_id = $(el).find('.gall_writer').attr('data-uid') === ''? 'a': $(el).find('.gall_writer').attr('data-uid');
    const writer_values = {
        id: writer_id,
        nickname: $(el).find('.gall_writer').attr('data-nick'),
    }
    const cartoon_values = {
        id: $(el).find('.gall_num').text(),
        title: $(el).find('.gall_tit > a').first().text().substr(0, 5),
        writer_id: writer_id,
        writer_nickname: $(el).find('.gall_writer > span > em').text(),
        date: date,
        recommend: $(el).find('.gall_recommend').text(),
    }
    return [writer_values, cartoon_values];
}

async function main(first=false) {
    const result = await runSql('SELECT id FROM cartoon WHERE 1=1 ORDER BY id DESC LIMIT 1;').then(data => {return data}).catch(()=>{return []});

    if (!first && result[0] === undefined) {
        return false;
    } else {
        const newest = first? 1 : result[0]['id'];
        scraping(newest);
    }
}

main(false);
//const isTwoWeek = 14 <= Math.ceil((new Date().setHours(0, 0, 0, 0)-date) / (1000 * 3600 * 24));
//if (!isTwoWeek) return;


/*
const LOOP = 5;//1463

async function crawling(NEWEST) {
    let crawlStop = false;
    for(let i=1; i < LOOP; i++) {
        console.log(i);
        // setCartoonList callback으로 받은 beStop이 true면 크롤링 멈춤.
        if(crawlStop){
            break;
        }
        await fetch(`https://gall.dcinside.com/board/lists/?id=cartoon&page=${i}&exception_mode=recommend`)
        .then(response => response.text())
        .then((data) => {
            setCartoonList(NEWEST, data, (beStop) => {
                // callback으로 받은 beStop이 true면 크롤링 멈춤.
                crawlStop = beStop;
            });
        })
        .catch(error => console.error('Error:', error));
    }
}
function setCartoonList(NEWEST, HTML, callback) {
    const $ = cheerio.load(HTML, null, false);
    POOL.getConnection((err, conn) => {
        if (err) {
            if (conn) {
                conn.release()
            }
        }
        try {
            $('tbody > tr.us-post').map((i, el)=> {
                const DATE = new Date($(el).find('.gall_date').attr('title'));
                const isTwoWeek = 14 <= Math.ceil((new Date().setHours(0, 0, 0, 0)-DATE) / (1000 * 3600 * 24));
                // if(!isTwoWeek){
                //     console.log(DATE, '는 너무 일러서 컷');
                //     return;
                // }
                const WRITER_ID = $(el).find('.gall_writer').attr('data-uid') === ''? 'a': $(el).find('.gall_writer').attr('data-uid');
                const WRITER_VALUES = {
                    id: WRITER_ID,
                    nickname: $(el).find('.gall_writer').attr('data-nick'),
                }
                const CARTOON_VALUES = {
                    id: $(el).find('.gall_num').text(),
                    title: $(el).find('.gall_tit > a').first().text().substr(0, 5),
                    writer_id: WRITER_ID,
                    writer_nickname: $(el).find('.gall_writer > span > em').text(),
                    date: DATE,
                    recommend: $(el).find('.gall_recommend').text(),
                }
                // 받아온 리스트를 차례차례 등록하다가,
                // 기존에 db에 등록돼있던 만화보다 오래되거나 같으면 등록 멈춤
                if(CARTOON_VALUES['id'] <= NEWEST) {
                    throw '작거나 같음';
                }else{
                    conn.query('INSERT INTO writer SET ?', WRITER_VALUES);
                    conn.query('INSERT INTO cartoon SET ?', CARTOON_VALUES);
                }
            });
        } catch (e) {
            conn.release();
            callback(true);
            return false;
        }
        conn.release();
        callback(false);
        return false;
    });
}
*/