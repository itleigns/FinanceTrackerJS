const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

const dataPath = path.join(__dirname, 'data.csv');

const data = fs.readFileSync(dataPath);

const records = parse(data, {
    columns: true,
    //空のフィールドはundefinedにする
    //退職と乙欄はYesの場合のみ受け付ける
    //額の類は数値の場合のみ受け付ける
    cast: (value, context) => {
        if (value === '') {
            return undefined;
        }
        if (['退職','乙欄'].includes(context.column)) {
            if (value !== 'Yes') {
                throw new Error(`Invalid ${context.column} value at row ${context.lines}`);
            }
            return true;
        }
        if (['支払金額','給与所得控除後の金額','所得控除後の額の合計額','源泉徴収税額','社会保険料等の金額','生命保険料の控除額','新生命保険料の金額'].includes(context.column)) {
            if (isNaN(value)) {
                throw new Error(`Invalid ${context.column} value at row ${context.lines}`);
            }
            return parseInt(value, 10);
        }
        return value;
    }
});

const jsonOutput = JSON.stringify(records, null, 2);

const outputPath = path.join(__dirname, 'data.json');

fs.writeFile(outputPath, jsonOutput, (err) => {
    if (err) throw err;
});