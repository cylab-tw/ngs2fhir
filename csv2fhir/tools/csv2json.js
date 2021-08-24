const fs = require('fs');
const csv = require('csvtojson');

function csv2json(filePath) {
    return new Promise((resolve, rejects) => {
        csv()
            .fromFile(filePath)
            .then(jsonObj => {
                resolve(jsonObj);
            }).catch(e => {
                console.log(e);
                rejects(e);
            })
    })
}
let fileName = "MapTo";
csv2json("./YOUR/FILE/PATH" + fileName + ".csv")
    .then(arr => {
        fs.writeFile("./" + fileName + ".json", JSON.stringify(arr, null, 4), () => {
            console.log("done");
        })
    }).catch(e => {
        console.log(e);
    })