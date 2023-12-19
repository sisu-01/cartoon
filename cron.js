const cron = require('node-cron');
const scraping = require('./utils/scrap.js');
const series = require('./utils/series.js');

let count = 0;
//second(초), minute(분), hour(시), day-of-month(날짜), month(월), day-of-week(요일)
// cron.schedule('* * * * * *', () => {
//     console.log(count++);
// });

//scraping(false);
//series();