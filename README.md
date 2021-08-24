# ngs2fhir
ngs2fhir is a tool to convert the Next generation sequencing (NGS) data to the FHIR Resources

# Install
### 1. Install package：
* `npm install`
### 2. Edit `./config.js`
* inputPath：NGS annotation file, support csv or xlsx
* outPath：Save path of converted result
* moudule：NGS annotation file format
### 3. Download Reference files
```bash
# 1. Chromosome
$ mkdir -p ./csv2fhir/GenomeReference/FHIR
$ curl https://www.hl7.org/fhir/codesystem-chromosome-human.json > ./csv2fhir/GenomeReference/FHIR/codesystem-chromosome-

# 2. Human Genome
$ mkdir -p ./models/csv2fhir/GenomeReference/hg19
$ mkdir -p ./models/csv2fhir/GenomeReference/hg38
$ curl https://hgdownload.soe.ucsc.edu/goldenPath/hg19/chromosomes/chr*.fa.gz > ./models/csv2fhir/GenomeReference/hg19/chr*.fa.gz
$ curl https://hgdownload.soe.ucsc.edu/goldenPath/hg19/chromosomes/chr*.fa.gz > ./models/csv2fhir/GenomeReference/hg19/chr*.fa.gz
$ gunzip ./models/csv2fhir/GenomeReference/hg19/chr*.fa.gz 

# 3. HGNC
$ mkdir -p ./models/csv2fhir/GenomeReference/HGNC
$ curl http://ftp.ebi.ac.uk/pub/databases/genenames/hgnc/json/hgnc_complete_set.json > ./models/csv2fhir/GenomeReference/HGNC/hgnc_complete_set.json

# 4. LOINC
$ mkdir -p ./models/csv2fhir/GenomeReference/LOINC
(next step below)
```

### 4. Download LOINC file (Need Register and Login)：
* Path：https://loinc.org/file-access/download-id/8809
* Use csv2json tool convert "/LoincTableCore/LoincTableCore.csv" to "LoincTableCore.json"
* Use csv2json tool convert "/AccessoryFiles/AnswerFile/AnswerList.csv" to "AnswerList.json"

### 5. Use csv2json tool
```bash
$ vi ./models/csv2fhir/tools/csv2json.js # Edit Filename and Path
$ node ./csv2fhir/tools/csv2json.js
$ mv LoincTableCore.json ./csv2fhir/GenomeReference/LOINC/
```
### 6. Format Human Genome files
```bash
$ vi ./models/csv2fhir/tools/fa_tool.js # Edit Filenmae and Path
$ node ./csv2fhir/tools/fa_tool.js # Repeat for all .fa files
```

### 7. Run
* Edit "`setting`" in your need
* `npm start`


    