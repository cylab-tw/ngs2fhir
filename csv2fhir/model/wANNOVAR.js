'use strict'
const fs = require('fs');
const JSONbig = require('json-bigint');

// Reference Data
const HGNC = JSONbig.parse(fs.readFileSync('./csv2fhir/GenomeReference/HGNC/hgnc_complete_set.json')).response.docs;
const Chromosome_Human = require('../GenomeReference/FHIR/codesystem-chromsome-human.json');
const LOINC = require('../GenomeReference/LOINC/LoincTableCore.json');
const LOINC_AnswerList = require('../GenomeReference/LOINC/AnswerList.json');
const refPath = './csv2fhir/GenomeReference';

function getMolecularSequence(header, rawData, index, exception, config) {
    return new Promise((resolve, reject) => {
        const data = makeJSON(header, rawData[index], config);
        const Result = {
            resourceType: "MolecularSequence"
        };
        // Required Parameter
        if (!("type" in data)) return reject("Miss Field [type]");
        if (!("coordinateSystem" in data)) return reject("Miss Field [coordinateSystem]");
        if (!("Chr" in data)) return reject("Miss Field [Chr]");
        if (!("genomeBuild" in data)) return reject("Miss Field [genomeBuild]");
        if (!("Start" in data)) return reject("Miss Field [Start]");
        if (!("End" in data)) return reject("Miss Field [End]");
        if (!("windowRange" in data)) return reject("Miss Field [windowRange]");
        if (!("patient" in data)) return reject("Miss Field [patient]");
        // 1. identifier
        if ("identifier" in data) {
            Result.identifier = data.identifier;
        }
        // 2. type 
        if ("type" in data) {
            Result.type = data.type;
        }
        // 3. coordinateSystem 
        if ("coordinateSystem" in data) {
            Result.coordinateSystem = data.coordinateSystem;
        }
        // 4. patient 
        if ("patient" in data) {
            Result.patient = data.patient;
        }
        // 5. specimen 
        if ("specimen" in data) {
            Result.specimen = data.specimen;
        }
        // 6. device 
        if ("device" in data) {
            Result.device = data.device;
        }
        // 7. performer 
        if ("performer" in data) {
            Result.performer = data.performer;
        }
        // 8. quantity
        if ("quantity" in data) {
            Result.quantity = data.quantity;
        }
        // 9.1 referenceSeq
        let referenceSeq = {};
        if ("genomeBuild" in data && "Chr" in data) {
            let value = String(data["Chr"]);
            let concept = Chromosome_Human.concept.find(element => element.code === value);
            let chromosome = {};
            if (concept) {
                (Chromosome_Human.url) && (chromosome.system = Chromosome_Human.url);
                (Chromosome_Human.version) && (chromosome.version = Chromosome_Human.version);
                (concept.code) && (chromosome.code = concept.code);
                (concept.display) && (chromosome.display = concept.display);
                referenceSeq["chromosome"] = {
                    "coding": [chromosome]
                }
                referenceSeq["genomeBuild"] = data.genomeBuild;
            } else {
                reject("Unknowed Chromosome_Human：" + value);
            }
        } else if ("referenceSeqId" in data) {
            referenceSeq["referenceSeqId"] = data["referenceSeqId"];
        } else if ("referenceSeqPointer" in data) {
            referenceSeq["referenceSeqPointer"] = data["referenceSeqPointer"];
        } else if ("referenceSeqString" in data) {
            referenceSeq["referenceSeqString"] = data["referenceSeqString"];
        }
        // 9.2 orientation
        if ("orientation" in data) {
            referenceSeq.orientation = data.orientation
        }
        // 9.3 strand
        if ("strand" in data) {
            referenceSeq.strand = data.strand;
        };
        // 9.4 windowStart
        if ("Start" in data && "windowRange" in data) {
            referenceSeq.windowStart = parseInt(data["Start"]) - data.windowRange;
        };
        // 9.5 windowEnd
        if ("End" in data && "windowRange" in data) {
            referenceSeq.windowEnd = parseInt(data["End"]) + data.windowRange;
        }
        if (Object.keys(referenceSeq).length > 0) Result.referenceSeq = referenceSeq;
        // 10. Variant
        let variant = {};
        // 10.1 start
        if ("Start" in data) {
            (variant.start = parseInt(data["Start"]));
        }
        // 10.2 end
        if ("End" in data) {
            (variant.end = parseInt(data["End"]));
        }
        // 10.3 referenceAllele
        if ("Ref" in data) {
            variant.referenceAllele = data["Ref"];
        }
        // 10.4 observedAllele
        if ("Alt" in data) {
            variant.observedAllele = data["Alt"];
        }
        // 10.5 cigar
        if ("cigar" in data) {
            (variant.ciger = data.cigar);
        }
        // 10.6 variantPointer
        if ("variantPointer" in data) {
            (variant.variantPointer = data.variantPointer);
        }
        (Object.keys(variant).length > 0) && (Result.variant = [variant]);
        // 11. observedSeq
        if ("Chr" in data && 'windowStart' in Result.referenceSeq && 'windowEnd' in Result.referenceSeq) {
            const refSeqPath = refPath + '/' + data["genomeBuild"] + '/chr' + data["Chr"] + '.fa.txt';
            if (fs.existsSync(refSeqPath)) {
                let rows = fs.readFileSync(refSeqPath, {
                    encoding: 'utf8',
                    autoClose: true
                });
                // Get refSeq
                let windowStart = Result.referenceSeq.windowStart;
                let windowEnd = Result.referenceSeq.windowEnd;
                let refReq = rows.slice(windowStart - 1, windowEnd).split("");
                let Variants = ('variant' in Result) ? JSON.parse(JSON.stringify(Result.variant)) : [];
                // Get Previous Variant
                for (let i = index - 1; i >= 0; i--) {
                    const prevData = makeJSON(header, rawData[i], config);
                    if ('Chr' in prevData && 'Ref' in prevData && 'Alt' in prevData && 'Start' in prevData && 'End' in prevData) {
                        if (prevData["Chr"] === data["Chr"]) {
                            let variant = {
                                start: parseInt(prevData['Start']),
                                end: parseInt(prevData['End']),
                                referenceAllele: prevData['Ref'],
                                observedAllele: prevData['Alt']
                            }
                            if ((variant.start >= windowStart || variant.end >= windowStart)) {
                                if (!Variants.find(item => item.start == variant.start && item.end == variant.end)) {
                                    Variants.push(variant);
                                }
                            } else {
                                break;
                            };
                        } else {
                            break;
                        }
                    }
                }
                // Get Next Variant
                for (let i = index + 1; i < rawData.length; i++) {
                    const nextData = makeJSON(header, rawData[i], config);
                    if ('Chr' in nextData && 'Ref' in nextData && 'Alt' in nextData && 'Start' in nextData && 'End' in nextData) {
                        if (nextData["Chr"] === data["Chr"]) {
                            let variant = {
                                start: parseInt(nextData['Start']),
                                end: parseInt(nextData['End']),
                                referenceAllele: nextData['Ref'],
                                observedAllele: nextData['Alt']
                            }
                            if (variant.start <= windowEnd || variant.end <= windowEnd) {
                                if (!Variants.find(item => item.start == variant.start && item.end == variant.end)) {
                                    Variants.push(variant);
                                }
                            } else {
                                break;
                            };
                        } else {
                            break;
                        }
                    }
                }
                // Sort by [start] & [end]
                Variants.sort((a, b) => {
                    if (a.start > b.start) return 1
                    else if (a.start < b.start) return -1
                    else return (a.end > b.end) ? 1 : -1
                });
                Result.variant = Variants;
                // Mark Variant in observedSeq
                for (let i = 0; i < Variants.length; i++) {
                    if (Variants[i].start && Variants[i].end) {
                        let startPos = Variants[i].start - windowStart;
                        let endPos = Variants[i].end - windowStart;
                        if (Variants[i].referenceAllele === "-") {
                            // Insertion
                            refReq[endPos] += Variants[i].observedAllele;
                        } else {
                            for (let j = startPos; j <= endPos; j++) {
                                refReq.splice(j, 1, "-");
                            }
                            refReq.splice(startPos, 1, Variants[i].observedAllele);
                        }
                    }
                }
                // Remove space
                Result.observedSeq = refReq.join("").replace(/-/g, "").toUpperCase();
                rows = undefined;
            } else {
                reject(`GenomeReference_genomeBuild not found：/${data["genomeBuild"]}/chr${data["Chr"]}.fa.txt`);
            }
        }
        // 12. quality
        if ("quality" in data) {
            Result.quality = data.quality;
        }
        // 13. readCoverage
        if ("readCoverage" in data) {
            Result.readCoverage = data.readCoverage;
        }
        // 14. repository
        if ("repository" in data) {
            Result.repository = data.repository;
        }
        // 15. pointer
        if ("pointer" in data) {
            Result.pointer = data.pointer;
        }
        // 16. structureVariant
        if ("structureVariant" in data) {
            Result.structureVariant = data.structureVariant;
        }
        resolve(Result);
    })
}

function getObservation(header, rawData, index, exception, config) {
    return new Promise((resolve, reject) => {
        const data = makeJSON(header, rawData[index], config);
        const Result = {
            resourceType: "Observation"
        };
        // Required Parameter
        if (!("subject" in data)) return reject("[subject] is undefined.");
        if (!("specimen" in data)) return reject("[specimen] is undefined.");
        // 1. identifier
        if ("identifier" in data) {
            Result["identifier"] = data["identifier"];
        }
        // 2. basedOn
        if ("basedOn" in data) {
            Result["basedOn"] = data["basedOn"];
        }
        // 3. partOf
        if ("partOf" in data) {
            Result["partOf"] = data["partOf"];
        }
        // 4. status
        if ("status" in data) {
            Result["status"] = data["status"];
        }
        // 5. category
        if ("category" in data) {
            Result["category"] = data["category"];
        }
        // 6. code
        if ("code" in data) {
            Result["code"] = data["code"];
        }
        // 7. subject
        if ("subject" in data) {
            Result["subject"] = data["subject"];
        }
        // 8. focus
        if ("focus" in data) {
            Result["focus"] = data["focus"];
        }
        // 9. encounter
        if ("encounter" in data) {
            Result["encounter"] = data["encounter"];
        }
        // 10. issued
        if ("issued" in data) {
            Result["issued"] = data["issued"];
        }
        // 11. performer
        if ("performer" in data) {
            Result["performer"] = data["performer"];
        }
        // 12. dataAbsentReason
        if ("dataAbsentReason" in data) {
            Result["dataAbsentReason"] = data["dataAbsentReason"];
        }
        // 13. interpretation
        if ("interpretation" in data) {
            Result["interpretation"] = data["interpretation"];
        }
        // 14. note
        if ("note" in data) {
            Result["note"] = data["note"];
        }
        // 15. bodySite
        if ("bodySite" in data) {
            Result["bodySite"] = data["bodySite"];
        }
        // 16. method
        if ("method" in data) {
            Result["method"] = data["method"];
        }
        // 17. specimen
        if ("specimen" in data) {
            Result["specimen"] = data["specimen"];
        }
        // 18. device
        if ("device" in data) {
            Result["device"] = data["device"];
        }
        // 19. referenceRange
        if ("referenceRange" in data) {
            Result["referenceRange"] = data["referenceRange"];
        }
        // 20. hasMember
        if ("hasMember" in data) {
            Result["hasMember"] = data["hasMember"];
        }
        // 21. derivedFrom
        if ("derivedFrom" in data) {
            Result["derivedFrom"] = data["derivedFrom"];
        }
        // 22. component
        let Components = [];
        let hgvsSet = ("AAChange.refGene" in data) ? splitHGVS(data["AAChange.refGene"]) : undefined;
        // 22.1 GeneId
        if ("Gene.refGene" in data && data["Gene.refGene"] != "") {
            let geneSymbol = data['Gene.refGene'].split(";");
            let codingList = [];
            geneSymbol.forEach(item => {
                let SymbolData = HGNC.find(element => element.symbol === item || ("prev_symbol" in element && element.prev_symbol.indexOf(item) != -1));
                if (SymbolData && "hgnc_id" in SymbolData) {
                    let coding = {
                        system: "http://www.genenames.org",
                        code: SymbolData["hgnc_id"],
                        display: item
                    };
                    ("_version_" in SymbolData) && (coding.version = JSONbig.stringify(SymbolData["_version_"]));
                    codingList.push(coding);
                } else {
                    process.stdout.write("\r\x1b[K");
                    exception.push("# Exception：Gene Symbol Undefind => " + item)
                }
            })
            if (codingList.length > 0) {
                let component = makeComponent("48018-6", codingList);
                (component) && Components.push(component);
            }
        }
        // 22.2 DNASequenceVariation (c.HGVS)
        if (hgvsSet.length > 0) {
            let codingList = [];
            for (let i = 0; i < hgvsSet.length; i++) {
                if ("Transcript" in hgvsSet[i] && "c" in hgvsSet[i]) {
                    let coding = {
                        system: "https://varnomen.hgvs.org/",
                        code: hgvsSet[i]["Transcript"] + ":" + hgvsSet[i]["c"]
                    };
                    if (codingList.indexOf(coding) == -1) codingList.push(coding);
                } else {
                    process.stdout.write("\r\x1b[K");
                    exception.push("# Exception：AAChange.refGene => " + data["AAChange.refGene"]);
                }
            }
            let component = makeComponent("48004-6", codingList);
            (component) && Components.push(component);
        }
        // 22.3 DNASequenceVariationType
        if ("Ref" in data && "Alt" in data) {
            let codingList = [];
            let coding = {
                system: "https://loinc.org/",
            };
            if (data["Ref"].length > 0 && data["Alt"] == '-') {
                coding.code = "LA6692-3"; // Deletion
            } else if (data["Ref"] == '-' && data["Alt"].length > 0) {
                coding.code = "LA6687-3"; // Insertion       
            } else if (data["Ref"].length != 1 && data["Alt"].length != 1) {
                coding.code = "LA6688-1"; // Insertion/Deletion        
            } else if (data["Ref"].length == 1 && data["Alt"].length == 1) {
                coding.code = "LA6690-7"; // Substitution        
            }
            let answerInfo = LOINC_AnswerList.filter(item => item.AnswerListId == "LL379-9" && item.AnswerStringId == coding.code);
            if (answerInfo.length == 1) {
                coding.display = answerInfo[0].DisplayText;
                (answerInfo.length > 0) && (coding.display = answerInfo[0].DisplayText);
                codingList.push(coding);
                let component = makeComponent("48019-4", codingList);
                (component) && Components.push(component);
            } else if (answerInfo.length > 1) {
                process.stdout.write("\r\x1b[K");
                exception.push("# Exception：Match multiple answer => " + coding.code);
            }
        }
        // 22.4 VariantTranscriptReferenceSequenceId  
        if (hgvsSet.length > 0) {
            let codingList = [];
            for (let i = 0; i < hgvsSet.length; i++) {
                if (hgvsSet[i]["Transcript"]) {
                    let Transcript = hgvsSet[i]["Transcript"].split(".");
                    if (Transcript[0].slice(0, 2) == "NM") {
                        let coding = {
                            system: "https://www.ncbi.nlm.nih.gov/nuccore",
                            code: Transcript[0]
                        };
                        (Transcript[1]) && (coding.version = Transcript[1]);
                        if (codingList.indexOf(coding) == -1) codingList.push(coding);
                    }
                }
            }
            if (codingList.length > 0) {
                let component = makeComponent("51958-7", codingList);
                (component) && Components.push(component);
            }
        }
        // 22.5 DNARegionName
        if (hgvsSet.length > 0) {
            let codingList = [];
            for (let i = 0; i < hgvsSet.length; i++) {
                let code = hgvsSet[i]["DNARegionName"];
                if (code && codingList.filter(item => item.code === code).length === 0) {
                    codingList.push({
                        system: "https://www.hl7.org/fhir/extension-observation-geneticsdnaregionname.html",
                        code: code
                    });
                }
            }
            if (codingList.length > 0) {
                let component = makeComponent("47999-8", codingList);
                (component) && Components.push(component);
            }
        }
        // 22.6 ProteinReferenceSequenceId
        if (false) {
            let codingList = [];
            let component = makeComponent("", codingList);
            (component) && Components.push(component);
        }
        // 22.7 AminoAcidChange (p.HGVS)
        if (hgvsSet.length > 0) {
            let codingList = [];
            for (let i = 0; i < hgvsSet.length; i++) {
                if ("Transcript" in hgvsSet[i] && "p" in hgvsSet[i]) {
                    let coding = {
                        system: "https://varnomen.hgvs.org/",
                        code: hgvsSet[i]["Transcript"] + ":" + hgvsSet[i]["p"]
                    };
                    if (codingList.indexOf(coding) == -1) codingList.push(coding);
                } else {
                    process.stdout.write("\r\x1b[K");
                    exception.push("# Exception：AAChange.refGene => " + data["AAChange.refGene"]);
                }
            }
            let component = makeComponent("48005-3", codingList);
            (component) && Components.push(component);
        }
        // 22.8  AminoAcidChangeType 未提供
        if (false) {
            let codingList = [];
            let coding = {
                system: "https://loinc.org/",
            };
            coding.code = "LA6692-3"; // Deletion
            coding.code = "LA6687-3"; // Insertion       
            coding.code = "LA9659-9"; // Insertion/Deletion        
            coding.code = "LA6690-7"; // Substitution       
            let answerInfo = LOINC_AnswerList.filter(item => item.AnswerListId == "LL380-7" && item.AnswerStringId == coding.code);
            (answerInfo.length > 0) && (coding.display = answerInfo[0].DisplayText);
            codingList.push(coding);
            let component = makeComponent("48006-1", codingList);
            (component) && Components.push(component);
        }
        // 22.9 VariationId
        if ("ClinVar_ID" in data && data["ClinVar_ID"] != ".") {
            let codingList = [];
            let clinVarSet = data["ClinVar_ID"].split("|");
            for (let i = 0; i < clinVarSet.length; i++) {
                let code = clinVarSet[i];
                if (code && codingList.filter(item => item.code === code).length === 0) {
                    codingList.push({
                        system: "https://www.ncbi.nlm.nih.gov/clinvar/",
                        code: code
                    });
                }
            }
            if (codingList.length > 0) {
                let component = makeComponent("81252-9", codingList);
                (component) && Components.push(component);
            }
        }
        // 22.10 AlleleName
        if (false) {
            let codingList = [];
            let coding = {
                system: "",
            };
            codingList.push(coding);
            let component = makeComponent("48008-7", codingList);
            (component) && Components.push(component);
        }
        // 22.11 GenomicSourceClass 目前固定為Germline
        if (true) {
            let codingList = [];
            let coding = {
                system: "https://loinc.org/",
                code: "LA6683-2" // Default Germline
            };
            let answerInfo = LOINC_AnswerList.filter(item => item.AnswerListId == "LL378-1" && item.AnswerStringId == coding.code);
            (answerInfo.length > 0) && (coding.display = answerInfo[0].DisplayText);
            codingList.push(coding);
            let component = makeComponent("48002-0", codingList);
            (component) && Components.push(component);
        }
        // 22.12 AllelicState
        if ("Otherinfo" in data) {
            let codingList = [];
            let coding = {
                system: "https://loinc.org/",
            };
            let Otherinfo = [];
            Object.keys(data).forEach(key => {
                (key.indexOf('Otherinfo') != -1) && Otherinfo.push(data[key])
            })
            Otherinfo.forEach((item = item.toLowerCase()) => {
                //(item == "") && (coding.code = "LA6703-8"); //Heteroplasmic
                //(item == "") && (coding.code = "LA6704-6"); //Homoplasmic
                (item === "hom") && (coding.code = "LA6705-3"); //Homozygous
                (item === "het") && (coding.code = "LA6706-1"); //Heterozygous
                (item === "hem") && (coding.code = "LA6707-9"); //Hemizygous     
            })
            if (coding.code) {
                let answerInfo = LOINC_AnswerList.filter(item => item.AnswerListId == "LL381-5" && item.AnswerStringId == coding.code);
                (answerInfo.length > 0) && (coding.display = answerInfo[0].DisplayText);
                codingList.push(coding);
                let component = makeComponent("53034-5", codingList);
                (component) && Components.push(component);
            }
        }
        (Components.length > 0) && (Result.component = Components);
        resolve(Result);
    })

    function splitHGVS(data) {
        if (data != "") {
            let group = data.split(",");
            let result = [];
            for (let i = 0; i < group.length; i++) {
                let part = group[i].split(":");
                let obj = {};
                (part[1]) && (obj["Transcript"] = part[1]);
                (part[2]) && (obj["DNARegionName"] = part[2]);
                (part[3]) && (obj["c"] = part[3]);
                (part[4]) && (obj["p"] = part[4].replace("p.", "p.(") + ")");
                result.push(obj);
            }
            return result
        } else {
            return false
        }
    }

    function makeComponent(Code, value) {
        let LoincData = LOINC.find(element => element.LOINC_NUM === Code);
        if (LoincData == undefined) {
            process.stdout.write("\r\x1b[K");
            exception.push("# " + Code + " is undefined in LOINC.");
            return false
        } else {
            let element = {
                "code": {
                    "coding": [{
                        system: 'http://loinc.org/',
                        version: LoincData["VersionLastChanged"],
                        code: Code,
                        display: LoincData["COMPONENT"]
                    }]
                }
            }
            if (value.length > 0) {
                element.valueCodeableConcept = {
                    coding: value
                }
            };
            return element
        }
    }
}

function makeJSON(header, row, config) {
    let obj = {};
    for (let i = 0; i < header.length; i++) {
        let key = header[i];
        let value = row[i];
        // Multiple field
        if (obj[key]) {
            if (typeof obj[key] == "object") {
                obj[key].push(value);
            } else {
                let existValue = obj[key];
                obj[key] = [existValue, value]
            }
        } else {
            obj[key] = value
        }
    }
    return Object.assign({}, obj, config)
}

module.exports = (header, rawData, index, config) => {
    return new Promise((resolve, reject) => {
        try {
            let exception = [];
            Promise.all([
                getMolecularSequence(header, rawData, index, exception, config),
                getObservation(header, rawData, index, exception, config)
            ]).then(res => {
                resolve({
                    MolecularSequence: res[0],
                    Observation: res[1],
                    exception
                })
            }).catch(e => {
                reject(e);
            })
        } catch (e) {
            reject(e)
        }
    })
}

module.exports.sortFunc = (X, Y,header) => {
    const Rank = ['Chr', 'Start', 'End'];
    const Direction = 1;// -1=down, 1=up
    for (let field of Rank) {
        let fieldPos = header.indexOf(field);
        let intX = parseInt(X[fieldPos]);
        let intY = parseInt(Y[fieldPos]);
        if (!isNaN(intX) && !isNaN(intY)) {
            if (intX > intY) {
                return Direction
            } else if (intX < intY) {
                return Direction * -1
            }
        } else if (isNaN(intX) && isNaN(intY)) {
            let strX = String(X[fieldPos]);
            let strY = String(Y[fieldPos]);
            if (strX > strY) {
                return Direction
            } else if (strX < strY) {
                return Direction * -1
            }
        } else {
            if (!isNaN(intX)) {
                return Direction * -1
            } else if (!isNaN(intY)) {
                return Direction
            }
        }
    }
}