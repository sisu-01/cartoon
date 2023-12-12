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
const loop = 11;
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
        title: $(el).find('.gall_tit > a').first().text(),//.substr(0, 5),
        writer_id: writer_id,
        writer_nickname: $(el).find('.gall_writer > span > em').text(),
        date: date,
        recommend: $(el).find('.gall_recommend').text(),
    }
    return [writer_values, cartoon_values];
}

function main(first=false) {
    runSql('SELECT id FROM cartoon WHERE 1=1 ORDER BY id DESC LIMIT 1;')
    .then(data => {
        if (!first && data[0] === undefined) {
            return false;
        } else {
            const newest = first? 1 : data[0]['id'];
            scraping(newest);
        }
    })
    .catch(e => {
        console.log(e);
    });
}
//main(false);