const cron = require('node-cron');
const cheerio = require('cheerio');
const levenshtein = require('fast-levenshtein');
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
const loop = 1469;
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
                const DATE = new Date($(el).find('.gall_date').attr('title'));
                const isTwoWeek = 14 <= Math.ceil((new Date().setHours(0, 0, 0, 0)-DATE) / (1000 * 3600 * 24));
                if(!isTwoWeek){
                    return;
                }
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

function test() {
    //runSql('SELECT id FROM cartoon WHERE 시리즈가 아닌 놈들만~ AND ( writer_id = '' AND writer_id = '') ORDER BY id DESC LIMIT 1;')
    const t1 = '경제툰2) 탐욕의 끝 부동산 대침체4.manhwa';  // 기준
    const t2 = '경제툰2) 새로운 기술? 인터넷 버블3.manhwa'; // 유사율 52퍼센트
    const t3 = '경제툰2) 탐욕의 끝 부동산 대침체2.manhwa';  // 유사울 97퍼센트
    const t4 = '대학원생이 된 천재 돌연변이 고블린 소녀 듀에르코 만화'; //유사율 0퍼센트

    const len = t1.length;
    const a = 100 / len;
    let res = levenshtein.get(t1, t2);
    console.log(len, res, res*a+'%');

    const p1 = '내 약혼녀는zzzz 용 11';
    const p2 = '내 약혼녀는 용 10';
    const ll = p2.length; // 더 긴 놈으로?
    const df = 100 / ll;
    let z = levenshtein.get(p1, p2);
    console.log(ll, z, z*df+'%');
    
    /*
    
    a = 400개의 게시글
    a.forEach(i => {
        a.forEach(j => {
            const distance = levenshtein.get(i, j);
        });
    });

 
    */


}

test();