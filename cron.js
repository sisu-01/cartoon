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
const loop = 1468;
async function scraping(newest) {
    console.log(`id ${newest}까지 간다`);
    for (let i=1; i <= loop; i++) {
        console.log(`${i}페이지`);
        const url = `https://gall.dcinside.com/board/lists/?id=cartoon&page=${i}&exception_mode=recommend`;
        const html = await fetch(url).then(res => res.text());
        const $ = cheerio.load(html, null, false);

        try {
            $('tbody > tr.ub-content').map((i, el)=> {
                const id = $(el).attr('data-no');
                if (id === undefined) return ;
                if (newest >= id) throw 'break';
                const DATE = new Date($(el).find('.gall_date').attr('title'));
                const isTwoWeek = 14 <= Math.ceil((new Date().setHours(0, 0, 0, 0)-DATE) / (1000 * 3600 * 24));
                if(!isTwoWeek){
                    return;
                }
                const values = makeValues($, el);

                let insertSql = '';
                insertSql += `INSERT INTO writer SET ?`;
                insertSql += ` ON DUPLICATE KEY`;
                insertSql += ` UPDATE count = count+1,`;
                insertSql += ` date = CASE`;
                insertSql += ` WHEN '${values[1]['date']}' < date THEN '${values[1]['date']}' ELSE date END,`;
                insertSql += ` recommend = recommend+${values[1]['recommend']},`;
                insertSql += ` average = recommend / count`;
                runSql(insertSql, values[0])
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
    const date = $(el).find('.gall_date').attr('title');
    const writer_id = $(el).find('.gall_writer').attr('data-uid') === ''? 'a': $(el).find('.gall_writer').attr('data-uid');
    const writer_nickname = $(el).find('.gall_writer > span > em').text().replaceAll(`'`, `\'`).replaceAll(`"`, `\"`);
    const recommend = $(el).find('.gall_recommend').text();

    const writer_values = {
        id: writer_id,
        nickname: writer_nickname,
        date: date,
        count: 1,
        recommend: recommend,
        average: recommend,
    }
    const cartoon_values = {
        id: $(el).find('.gall_num').text(),
        title: $(el).find('.gall_tit > a').first().text(),
        writer_id: writer_id,
        writer_nickname: writer_nickname,
        date: date,
        recommend: recommend,
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
    runSql(`SELECT id, title FROM cartoon WHERE ( writer_id = 'toeic945' AND writer_nickname = '급양만와') ORDER BY id ASC;`)
    .then(list => {

        const seriesList = [];
        const seriesCartoon = {};

        while (true) {
            if (list.length === 0) {
                break;
            }
            
            let haveSeries = false;

            const shift = list.shift();
            const baseId = shift['id'];
            const baseTitle = shift['title'];

            const [ base1, base2 ] = splitString(baseTitle);

            let forLoop = list.length;
            for (let i = 0; i < forLoop;) {
                const e = list[i];

                const [ title1, title2 ] = splitString(e['title']);
                const len1 = base1.length > title1.length? base1.length : title1.length;
                const len2 = base2.length > title2.length? base2.length : title2.length;
                const percent1 = 100 / len1;
                const percent2 = 100 / len2;
                const distance1 = levenshtein.get(base1, title1);
                const distance2 = levenshtein.get(base2, title2);
                const similarity1 = 100 - Math.round(distance1 * percent1);
                const similarity2 = 100 - Math.round(distance2 * percent2);
                const sum = similarity1 + similarity2;
                //수정 글이 길 수록 요구 퍼센트가 낮고 ex)경제툰)쌸라쌸라쌸라쌸라쌸라쌸라쌸라쌸라쌸라쌸라쌸라쌸라쌸라
                //글이 짧을 수록 요구 서펜트가 높아야 한다ex)살인 -1 살인 -2
                //x = 길이
                //-5/7 * x + ( 155 / 7 + 35 ) = 요구 퍼센트
                if (similarity1 >= 35 || similarity2 >= 35) {
                    //console.log(`##합: ${similarity1+similarity2}% - 유사도: ${similarity1}% |`, title1, `\t\t유사도: ${similarity2}% |`, title2);
                    if (!haveSeries) {
                        haveSeries = true;
                        seriesList.push({id: baseId, title: baseTitle});
                        seriesCartoon[baseId] = [baseId];
                    }
                    seriesCartoon[baseId].push(e['id']);
                    
                    list.splice(i, 1);
                    forLoop = list.length;
                } else {
                    //console.log(`합: ${similarity1+similarity2}% - 유사도: ${similarity1}% |`, title1, `\t\t유사도: ${similarity2}% |`, title2);
                    i++;
                }
            }
        }
        const values = seriesList.map(item => [item.id, item.title]);
        runSql(`INSERT INTO series(id, title) VALUES ?`, [values])
        .then(row => {
            for (let i in seriesCartoon) {
                runSql(`UPDATE cartoon SET series_id = ${i} WHERE id IN (?)`, [seriesCartoon[i]])
                .catch(e => {
                    console.log(e);
                })
            }
        })
        .catch(e => {
            console.log(e);
        })
    })
}
test();

function splitString(str) {
    let temp = str;
    temp = temp.replaceAll('MANHWA', '').replaceAll('manhwa', '').replaceAll('MANWHA', '').replaceAll('manwha', '').replaceAll('만화', '').replaceAll('만와', '');
    temp = temp.replaceAll('프롤로그', '').replaceAll('에필로그', '').replaceAll('마지막화', '');
    temp = temp.replaceAll('完', '').replaceAll('후기', '').replaceAll('(완)', '');
    temp = temp.replaceAll('bgm', '').replaceAll('BGM', '');
    temp = temp.replaceAll('공지', '').replaceAll('휴재', '');
    temp = temp.replaceAll('ㅇㅎ', '').replaceAll('스압', '');
    temp = temp.replace(/\d/g, '');//숫자 제거
    temp = temp.replace(/[`~!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\\/ ]/g, '');
    temp = temp.trimStart().trimEnd();

    const length = Math.ceil(temp.length / 2);
    const firstHalf = temp.slice(0, length)
    const secondHalf = temp.slice(length)
    return [firstHalf, secondHalf];
}

function findCommonCharacters(...strings) {
    // 최소 한 번 등장한 문자를 저장하는 Set
    const commonCharacters = new Set();
  
    if (strings.length < 2) {
        console.log('최소 두 개 이상의 문자열이 필요합니다.');
        return '';
    }
  
    // 첫 번째 문자열의 문자를 기준으로 설정
    const baseString = strings[0];
  
    // 각 문자열에 대해 공통 문자 찾기
    for (let i = 0; i < baseString.length; i++) {
        const currentChar = baseString[i];
    
        if (strings.every(str => str.includes(currentChar))) {
            commonCharacters.add(currentChar);
        }
    }
  
    // Set을 배열로 변환하여 출력
    return Array.from(commonCharacters).join('');
}