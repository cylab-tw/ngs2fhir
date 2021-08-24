/*
功能：本工具將完整的fa檔案依照染色體拆分檔案並移除無用字元(空白、換行符號、標題等)。
用途：供csv2fhir使用，避免讀取大檔案
使用方法：
    1. 設定路徑
    2. 執行$ node fa_tools.js
*/
// =================================
// 原始檔案路徑
let filePath = './csv2fhir/GenomeReference/hg38/hg38.fa'
// 生成檔案路徑
let saveFloder = './csv2fhir/GenomeReference/hg38';
// 染色體列表(原始檔案標題列>chr後的)
let chromesomeList = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', 'X', 'Y']
// =================================

const fs = require('fs');
const readline = require('readline');
var inputStream = fs.createReadStream(filePath);
var lineReader = readline.createInterface({ input: inputStream });
let title = "";
let text = "";
lineReader.on('line', function (line) {
    if (line.match(/[^a|c|g|t|n]/gi)) {
        let chromStr = line.replace(">chr", "");
        if (title != "") {
            console.log(`# Save ${saveFloder}/chr${title}.fa.txt`);
            fs.writeFileSync(`${saveFloder}/chr${title}.fa.txt`, text);
        }       
        title = (chromesomeList.indexOf(chromStr)!=-1) ? chromStr : "";
        text = "";
    } else {
        text += line;
    }
});