const cron = require('node-cron');
const cheerio = require('cheerio');
const POOL = require('./pool.js');

let count = 0;
//second(초), minute(분), hour(시), day-of-month(날짜), month(월), day-of-week(요일)
// cron.schedule('* * * * * *', () => {
//     console.log(count++);
// });

function getResult(callback) {
    POOL.getConnection((err, conn) => {
        if (err) {
            if (conn) {
                conn.release();
                callback(err, false);
            }
        }
        conn.query('SELECT id FROM cartoon WHERE 1=1 ORDER BY id DESC LIMIT 1;', (err, result) => {
            conn.release();
            if(err) {
                callback(err, false);
            }else{
                callback(false, result);
            }
        })
    });
};
function cons(first=false) {
    getResult((err, data) => {
        if(err){
            return false;
        }
        if(data[0] || first) {
            const NEWEST = first? 1 : data[0]['id'];
            //1463
            let z = async () => {
                let stop = false;
                for(let i=1; i < 111; i++) {
                    if(stop){
                        break;
                    }
                    console.log(i);
                    await fetch(`https://gall.dcinside.com/board/lists/?id=cartoon&page=${i}&exception_mode=recommend`)
                    .then(response => response.text())
                    .then((data) => {
                        test(i, NEWEST, data, (beStop) => {
                            stop = beStop;
                        });
                    })
                    .catch(error => console.error('Error:', error));
                }
            }
            z();
        }
    });
}
function test(j, NEWEST, data, callback) {
    const $ = cheerio.load(data, null, false);
    //us-post
    POOL.getConnection((err, conn) => {
        if (err) {
            if (conn) {
                conn.release()
            }
        }
        const SQL = 'INSERT INTO cartoon SET ?';
        try {
            $('tbody > tr.us-post').map((i, el)=> {
                const VALUES = {
                    id: $(el).find('.gall_num').text(),
                    url: 'url',//$(el).find('.gall_tit a').attr('href').split('&exception_mode')[0],
                    title: $(el).find('.gall_tit > a').first().text().substr(0, 5),
                    writer: $(el).find('.gall_writer > span > em').text(),
                    date: $(el).find('.gall_date').attr('title'),
                    recommend: $(el).find('.gall_recommend').text(),
                }
                if(VALUES['id'] <= NEWEST) {
                    throw `${j}: ${VALUES['id']}는 ${NEWEST}와 같거나 작아요`;
                }else{
                    conn.query(SQL, VALUES, (err, result) => {
                        if(err) {
                        }else{
                        }
                    })
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

cons();