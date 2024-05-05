const fs = require('fs').promises;
const path = require('path');
const assert = require('assert');

// 支払金額から給与所得控除後の金額を計算
// 参考: https://tax.mykomon.com/tool-nen2020.html
function calcShotokukouhogonogaku( num ) {
    if (num <= 550999) {
        return 0;
    }
    else if (num <= 1618999) {
        return num - 550000;
    }
    else if (num <= 1619999) {
        return 1069000;
    }
    else if (num <= 1621999) {
        return 1070000;
    }
    else if (num <= 1623999) {
        return 1072000;
    }
    else if (num <= 1627999) {
        return 1074000;
    }
    else if (num <= 1799999) {
        return Math.floor(num / 4 / 1000) * 1000 / 10 * 24 + 100000;
    }
    else if (num <= 3599999) {
        return Math.floor(num / 4 / 1000) * 1000 / 10 * 28 - 80000;
    }
    else if (num <= 6599999) {
        return Math.floor(num / 4 / 1000) * 1000 / 10 * 32 - 440000;
    }
    else if (num <= 8499999) {
        return Math.floor(num * 9 / 10) - 1100000;
    }
    else {
        return num - 1950000;
    }
}

// 所得控除後の額の合計額から源泉徴収税額の金額を計算
// 参考: https://www.nta.go.jp/taxes/shiraberu/taxanswer/shotoku/2260.htm
function calcShotokuzei( num ) {
    if (num <= 1949000) {
        return Math.floor (num / 1000) * 1000 * 5 / 100;
    }
    else if (num <= 3299000) {
        return Math.floor (num / 1000) * 1000 * 10 / 100 - 97500;
    }
    else if (num <= 6949000) {
        return Math.floor (num / 1000) * 1000 * 20 / 100 - 427500;
    }
    else if (num <= 8999000) {
        return Math.floor (num / 1000) * 1000 * 23 / 100 - 636000;
    }
    else if (num <= 17999000) {
        return Math.floor (num / 1000) * 1000 * 33 / 100 - 1536000;
    }
    else if (num <= 39999000) {
        return Math.floor (num / 1000) * 1000 * 40 / 100 - 2796000;
    }
    else {
        return Math.floor (num / 1000) * 1000 * 45 / 100 - 4796000;
    }
}

// 所得控除後の額の合計額から源泉徴収税額の金額を計算 (乙欄が○の場合)
// 参考: https://www.nta.go.jp/publication/pamph/gensen/zeigakuhyo2022/data/denshi_11.pdf
function calcShotokuzeiOtsu( num ) {
    if (num < 88000) {
        return Math.floor(num * 3.063 / 100);
    }
    else if (num <= 740000) {
        throw new Error('この額の計算は未実装です。');
    }
    else if (num < 1700000) {
        return 259800 + Math.floor((num - 740000) * 40.84 / 100);
    }
    else {
        return 651900 + Math.floor((num - 1700000) * 45.945 / 100);
    }
}

// 新生命保険料の金額から生命保険料の控除額を計算
// 参考: https://www.nta.go.jp/taxes/shiraberu/taxanswer/shotoku/1140.htm
function calcSeimeihokennryoukoujo( num ) {
    if (num <= 20000) {
        return num;
    }
    else if (num <= 40000) {
        return Math.floor(num / 2) + 10000;
    }
    else if (num <= 80000) {
        return Math.floor(num / 4) + 20000;
    }
    else {
        return 40000;
    }
}

describe('源泉徴収票のデータをチェック', function() {
    let dataObject;

    before(async function() {
        const dataPath = path.join(__dirname, 'data.json');
        const dataJSON = await fs.readFile(dataPath, 'utf8');
        dataObject = JSON.parse(dataJSON);
    });

    it('給与所得控除後の金額が正しく計算されている', function() {
        dataObject.forEach((data, index) => {
            if (!data['支払金額'] || !data['給与所得控除後の金額']) {
                return;
            }
            const actual = data['給与所得控除後の金額'];
            const expected = calcShotokukouhogonogaku(data['支払金額'])
            assert.strictEqual(actual, expected, `${index + 1} 番目の給与所得控除後の金額が合いません。`)
        });
    });

    it('所得控除後の額の合計額が正しく計算されている', function() {
        dataObject.forEach((data, index) => {
            if (!data['所得控除後の額の合計額']) {
                return;
            }
            const actual = data['所得控除後の額の合計額'];
            // 基礎控除は年収が2400万以下であるとしている。
            if (data['支払金額'] > 24000000) {
                throw new Error('年収が24000000より大きい場合は未実装です。')
            }
            
            const expected = 480000 + data['社会保険料等の金額'] + (data['生命保険料の控除額'] ? data['生命保険料の控除額'] : 0);
            assert.strictEqual(actual, expected, `${index + 1} 番目の所得控除後の額の合計額が合いません。`)
        });
    });

    it('源泉徴収税額が正しく計算されている', function() {
        dataObject.forEach((data, index) => {
            // 年末調整されてているもののみ
            if (!data['源泉徴収税額'] || data['退職']) {
                return;
            }
            
            const actual = data['源泉徴収税額'];
            // 100円未満は切り捨て
            // https://biz.moneyforward.com/payroll/basic/3181/#:~:text=④年調年税額,ことになっています%E3%80%82
            const expected = data['乙欄'] ? calcShotokuzeiOtsu (data['支払金額']) : Math.floor(calcShotokuzei (data['給与所得控除後の金額'] - data['所得控除後の額の合計額']) * 1.021 / 100) * 100;
            assert.strictEqual(actual, expected, `${index + 1} 番目の源泉徴収税額が合いません。`)
        });
    });

    it('生命保険料の控除額が正しく計算されている', function() {
        dataObject.forEach((data, index) => {
            if (!data['生命保険料の控除額']) {
                return;
            }
            
            const actual = data['生命保険料の控除額']
            const expected = calcSeimeihokennryoukoujo(data['新生命保険料の金額']);
            assert.strictEqual(actual, expected, `${index + 1} 番目の生命保険料の控除額が合いません。`)
        });
    });
})