const fs = require('fs');
module.exports = () => {
    const csv2fhir_modules = {};
    fs.readdirSync(__dirname+'/model')
        .filter(file => file.slice(-3) === '.js')
        .forEach(file => {
            const moduleName = file.split('.')[0];
            csv2fhir_modules[moduleName] = require(`${__dirname}/model/${moduleName}`);
        })
    return csv2fhir_modules
}