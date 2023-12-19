const levenshtein = require('fast-levenshtein');
const runSql = require('./pool.js');

function test() {
    runSql(`SELECT id, title FROM cartoon WHERE writer_nickname = '급양만와' ORDER BY id ASC;`)
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

module.exports = test;