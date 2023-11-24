const cron = require('node-cron');
const cheerio = require('cheerio');
const POOL = require('./pool.js');

let count = 0;
//second(초), minute(분), hour(시), day-of-month(날짜), month(월), day-of-week(요일)
// cron.schedule('* * * * * *', () => {
//     console.log(count++);
// });

/**
 * 가장 최신의 만화 id를 가져온다.
 * @param {*} callback
 */
function getNewestCartoonId(callback) {
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
/**
 * for문으로 카연갤 페이지 싹 다 크롤링
 * @param {number} NEWEST 가장 최근 만화 id
 */
async function crawling(NEWEST) {
    let crawlStop = false;
    for(let i=1; i < 5; i++) {//1463
        // setCartoonList callback으로 받은 beStop이 true면 크롤링 멈춤.
        if(crawlStop){
            break;
        }
        await fetch(`https://gall.dcinside.com/board/lists/?id=cartoon&page=${i}&search_pos=&s_type=search_name&s_keyword=.E3.85.87.E3.85.87&exception_mode=recommend`)
        //await fetch(`https://gall.dcinside.com/board/lists/?id=cartoon&page=${i}&exception_mode=recommend`)
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
/**
 * 스크래핑으로 가져온 만화 목록을 db에 하나씩 넣는다.
 * @param {number} NEWEST db에 등록된 가장 최근의 만화 id. 받아온 data의 id가 NEWEST보다 작거나 같으면 db 등록 멈춤.
 * @param {string} HTML 크롤링 해온 page 마크업
 * @param {*} callback 여기로 스크래핑 for문 멈추라고 boolean 보냄
 */
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
                if(!isTwoWeek){
                    console.log(DATE, '는 너무 일러서 컷');
                    return;
                }
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
/**
 * 스케쥴링해서 매일 밤 돌릴 메인 함수
 * @param {boolean} first 기본은 false인데 true를 인자로 넣으면 만화 처음부터 끝까지 다 가져옴.
 */
function main(first=false) {
    getNewestCartoonId((err, data) => {
        if(err){
            return false;
        }
        if(data[0] || first) {
            const NEWEST = first? 1 : data[0]['id'];
            crawling(NEWEST);
        }
    });
}
main(true);