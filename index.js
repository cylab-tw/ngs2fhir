const fs = require('fs');
const csv = require('fast-csv');
const XLSX = require('xlsx');
const moment = require('moment');
const csv2fhir = require('./csv2fhir')();
const config = require('./config')

const setting = {
    type: "dna",
    coordinateSystem: 1,
    genomeBuild: "hg19",
    windowRange: 10,
    strand: "watson",
    patient: {
        "reference": "Patient/test",
        "type": "Patient"
    },
    specimen: {
        "reference": "Specimen/test",
        "type": "Specimen"
    },
    subject: {
        "reference": "Patient/test",
        "type": "Patient"
    },
};

function file2csv(filePath, fileExtension, module) {
    return new Promise((resolve, reject) => {
        try {
            let csvObj = null;
            if (fileExtension == "csv") {
                csvObj = csv.parseFile(filePath, { objectMode: true })
            } else if (fileExtension == "xlsx") {
                // xlsx2csv
                let wb = XLSX.readFile(filePath);
                let ws = wb.Sheets[wb.SheetNames[0]];
                let csvStr = XLSX.utils.sheet_to_csv(ws);
                csvObj = csv.parseString(csvStr, { headers: false })
            }
            let header = null;
            let rawData = [];
            csvObj.on('error', (err) => {
                console.log(`## ERROR child_csv2fhir ${process.pid} => parse csv: ${err}`);
                reject();
            }).on('data', (row) => {
                if (!header) {
                    header = row
                } else {
                    row[0] = row[0].replace(/chr/ig, "");
                    rawData.push(row);
                }
            }).on('end', (rowCount) => {
                rawData.sort(function (X, Y) {
                    return csv2fhir[module].sortFunc(X, Y, header)
                })
                resolve({ header, rawData })
            });
        } catch (e) {
            console.log(`# Error /models/csv2fhir/child file2csv: ${e}`);
            reject();
        }
    })
}

function main(filePath, module, setting) {
    return new Promise(async (reslove, reject) => {
        let fileExtension = filePath.slice((filePath.lastIndexOf(".") - 1 >>> 0) + 2);
        let allowExtension = ['csv', 'xlsx'];
        if (allowExtension.indexOf(fileExtension) == -1) {
            reject(`## ERROR child_csv2fhir ${process.pid} => Unallow fileExtension ${fileExtension}`);
        } else if (!fs.existsSync(filePath)) {
            reject(`## ERROR child_csv2fhir ${process.pid} => Not found file: ${filePath.split("/").pop()}`);
        } else if (Object.keys(csv2fhir).indexOf(module) == -1) {
            reject(`## ERROR child_csv2fhir ${process.pid} => Not found module: ${module}`);
        } else {
            let { header, rawData } = await file2csv(filePath, fileExtension, module)
                .catch(async (e) => {
                    console.log(e);
                });
            let taskBreak = false
            if (rawData) {
                console.log(`## child_csv2fhir ${process.pid} => Create csv2fhir task : ${filePath}`);
                let resultPath = config.outPath;
                let resultName = `${moment(Date.now()).format(filePath.split("/").pop() + "_YYYYMMDD_hh_mm_ss")}.json`;
                fs.mkdirSync(resultPath, { recursive: true })
                fs.writeFileSync(`${resultPath}/${resultName}`, "[\n");
                for (let i = 0; i < rawData.length; i++) {
                    await csv2fhir[module](header, rawData, i, setting)
                        .then(async (data) => {
                            // Save Result
                            fs.appendFileSync(`${resultPath}/${resultName}`, JSON.stringify(data, null, 4))
                        }).catch(async (e) => {
                            console.log(`## ERROR child_csv2fhir ${process.pid} => ${e}`);
                            taskBreak = true
                            i = rawData.length;
                        })
                }
                fs.appendFileSync(`${resultPath}/${resultName}`, "]");
            }
            (taskBreak) ? reject() : reslove()
        }
    })
}

console.time("total: ");
main(config.inputPath, config.module, setting)
    .then(() => {
        console.log("done");
        console.timeEnd("total: ");
    }).catch(e => {
        console.log(e);
    })


