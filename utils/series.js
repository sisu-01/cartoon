const levenshtein = require('fast-levenshtein');
const runSql = require('./pool.js');

function test() {
    runSql(`SELECT id, title FROM cartoon WHERE writer_nickname = '김말복' ORDER BY id ASC;`)
    .then(list => {

        const seriesList = [];
        const seriesCartoon = {};

        const debugList = {};

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
            console.log(base1, base2);
            for (let i = 0; i < forLoop;) {
                const e = list[i];

                const [ title1, title2 ] = splitString(e['title']);
                //수정 백분율 어케 하지
                const len1 = base1.length > title1.length? base1.length : title1.length;
                const len2 = base2.length > title2.length? base2.length : title2.length;
                const percent1 = 100 / len1;
                const percent2 = 100 / len2;
                const distance1 = levenshtein.get(base1, title1);
                const distance2 = levenshtein.get(base2, title2);
                const similarity1 = 100 - Math.round(distance1 * percent1);
                const similarity2 = 100 - Math.round(distance2 * percent2);
                const sum = similarity1 + similarity2;
                //수정 글이 길 수록 요구 퍼센트가 낮고
                //글이 짧을 수록 요구 서펜트가 높아야 한다
                //x = 길이
                //-5/7 * x + ( 155 / 7 + 35 ) = 요구 퍼센트
                if (similarity1 >= 50 || similarity2 >= 50) {
                    console.log(`\t####${title1}: ${similarity1}\t${title2}: ${similarity2}, ${len1}-${len2}`);
                    if (!haveSeries) {
                        haveSeries = true;
                        seriesList.push({id: baseId, title: baseTitle});
                        seriesCartoon[baseId] = [baseId];
                        
                        debugList[baseId] = {
                            원제: baseTitle,
                            앞: base1,
                            뒤: base2,
                            목록: [{
                                원제: baseTitle,
                                제목1: title1,
                                유사1: similarity1,
                                제목2: title2,
                                유사2: similarity2,
                                len1: len1,
                                len2: len2,
                            }]
                        };
                    }
                    seriesCartoon[baseId].push(e['id']);

                    debugList[baseId]['목록'].push({
                        원제: e['title'],
                        제목1: title1,
                        유사1: similarity1,
                        제목2: title2,
                        유사2: similarity2,
                        len1: len1,
                        len2: len2,
                    });
                    
                    list.splice(i, 1);
                    forLoop = list.length;
                } else {
                    console.log(`\t____${title1}: ${similarity1}\t${title2}: ${similarity2}, ${len1}-${len2}`);
                    i++;
                }
            }
        }
        //printDebug(debugList);
        
        // const values = seriesList.map(item => [item.id, item.title]);
        // runSql(`INSERT INTO series(id, title) VALUES ?`, [values])
        // .then(row => {
        //     for (let i in seriesCartoon) {
        //         runSql(`UPDATE cartoon SET series_id = ${i} WHERE id IN (?)`, [seriesCartoon[i]])
        //         .catch(e => {
        //             console.log(e);
        //         })
        //     }
        // })
        // .catch(e => {
        //     console.log(e);
        // })
    })
}
function printDebug(debugList) {
    for (let key in debugList) {
        const e = debugList[key];
        console.log(`원제: ${e['원제']}\t[${e['앞']}] [${e['뒤']}]`);
        e['목록'].forEach(i => {
            console.log(`\t${i['제목1']}: ${i['유사1']}\t${i['제목2']}: ${i['유사2']}, ${i['len1']}-${i['len2']}`);
        })
    }
}

function filter(str) {
    let temp = str;
    temp = temp.replaceAll('MANHWA', '').replaceAll('manhwa', '').replaceAll('MANWHA', '').replaceAll('manwha', '').replaceAll('만화', '').replaceAll('만와', '');
    temp = temp.replaceAll('프롤로그', '').replaceAll('에필로그', '').replaceAll('마지막화', '');
    temp = temp.replace(/\d/g, '');//숫자 제거
    temp = temp.replaceAll('후방)', '').replaceAll('혐)', '');
    temp = temp.replace(/[`~!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\\/]/g, '');
    temp = temp.replaceAll('完', '').replaceAll('후기', '');
    temp = temp.replaceAll('上', '').replaceAll('中', '').replaceAll('下', '');
    temp = temp.replaceAll('공지', '').replaceAll('휴재', '');
    temp = temp.replaceAll('bgm', '').replaceAll('BGM', '');
    temp = temp.replaceAll('ㅇㅎ', '').replaceAll('스압', '');
    //temp = temp.replaceAll(' ', '').trimStart().trimEnd();
    return temp;
}

function splitString(str) {
    const temp = filter(str);

    let length = Math.ceil(temp.length / 2);
    if (temp[length] !== ' ') {
        let i = 1;
        while(true) {
            const f = temp[length-i];
            const b = temp[length+i];
            if (b === ' ') {
                length = length+i;
                break;
            }
            if (f === ' ') {
                length = length-i;
                break;
            };
            i++;
        }
    };
    const firstHalf = temp.slice(0, length).replaceAll(' ', '').trimStart().trimEnd();
    const secondHalf = temp.slice(length).replaceAll(' ', '').trimStart().trimEnd();
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

module.exports = test;