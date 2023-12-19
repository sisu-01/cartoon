const cheerio = require('cheerio');
const runSql = require('./pool.js');

const loop = 1470;
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

module.exports = main;