const cron = require('node-cron');
const cheerio = require('cheerio');

let count = 0;
//second(초), minute(분), hour(시), day-of-month(날짜), month(월), day-of-week(요일)
//cron.schedule('* * * * * *', () => {
    //console.log(count++);
//});

fetch('https://gall.dcinside.com/board/lists/?id=cartoon&page=1462&exception_mode=recommend')
.then(response => response.text())
.then(data => test(data))
.catch(error => console.error('Error:', error));

let temp = {
    'id': 0,
}

function test(data) {
    const $ = cheerio.load(data, null, false);
    //us-post
    $('tbody > tr.us-post').map((i, el)=> {
        console.log('id', $(el).find('.gall_num').text());
        console.log('titile', $(el).find('.gall_tit a').attr('href'));
        console.log('url', $(el).find('.gall_tit > a').first().text());
        console.log('writer', $(el).find('.gall_writer > span > em').text());
        console.log('date', $(el).find('.gall_date').attr('title'));
        console.log('recommend', $(el).find('.gall_recommend').text());
    });
}