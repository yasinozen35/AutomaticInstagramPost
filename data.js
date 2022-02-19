const request = require("request-promise");
const cheerio = require("cheerio");
const fs = require('fs');
const jsdom = require("jsdom");
const Jimp = require('jimp');
const stringSimilarity = require("string-similarity");
const moment = require('moment');
moment.locale('tr');

class Data {
    constructor(){
        this.linkler=[];
        this.link="";
        this.textFileName="";
        this.subject="";
        this.lists=[];
        this.ayet="";
        this.hadis="";
        this.dua="";
        this.$=null;
        this.imageSrc="";
        this.imageOut="";
        this.content="";
        this.source="";
    }

    setSubject(subject) {
        this.subject = subject;
        if(this.subject == "") return
        this.setLink();
        this.setTextFileName();
        this.setImageFileName();
    }

    setLink(){
        let params = "";
        this.subject.toLowerCase() == 'ayet' ? params = "Tagut-ile-ilgili-Ayetler" :
        this.subject.toLowerCase() == 'hadis' ? params = "Ebu-Cendel-ve-Ebu-Basir" :
        this.subject.toLowerCase() == 'dua' ? params = "Borcun-odenmesi-icin-Yapilan-Dualar" : "";
        this.link = `https://sahihhadisler.com/konu/detay/${params}`;
    }

    async setLinks(){
        await request(this.link,(err, response, html)=>{
            if(err && response.statusCode!=200) return
            this.$ = cheerio.load(html);
            this.$(".sidebar-menu li").each((i, data)=>{
                const link = this.$(data).find("a").attr('href');
                link ? this.linkler.push(link) : null
            });
        });
        console.log(this.linkler)
        this.setLists()
    }

    setTextFileName(){
        this.subject == 'ayet' ?  this.textFileName = 'ayetler.json' :
        this.subject == 'hadis' ?  this.textFileName = 'hadisler.json' :
        this.subject == 'dua' ?  this.textFileName = 'dualar.json' : '';
    }

    setImageFileName(){
        if(this.subject == 'ayet' || this.subject == 'hadis' || this.subject == 'dua'){
            this.imageSrc=`./assets/images/source/blank_${this.subject}.jpg`;
            this.imageOut=`./public/images/${this.subject}.jpg`;
        }
    }

    async setLists(){
        let iframeUrl = "";
        this.$('iframe').each((index, elm) => {
            console.log(index)
            iframeUrl = this.$(elm).attr('src');
        });
        const { JSDOM } = jsdom;
        await request(iframeUrl, {json:true}, (err, response, html)=>{
            if(err && response.statusCode!=200) return
            const iframHtml = cheerio.load(html);
            /*iframHtml("p").each((i,data)=>{
                console.log(data.text())
            })*/
        });
    }

    stringToBytes(text) {
        const length = text.length;
        const result = new Uint8Array(length);
        for (let i = 0; i < length; i++) {
          const code = text.charCodeAt(i);
          const byte = code > 255 ? 32 : code;
          result[i] = byte;
        }
        return result;
    }
    
    async generatePicture(subject){
        this.setSubject(subject);
        if(this.subject == "") return
        await this.getText();
        await this.photoOptions();
        await this.addTextToPicture();
    }

    async getText(){

        console.log(moment(new Date()).format("DD/MM/YYYY"));
        console.log(moment("2022-02-19").format("LLL"))
        console.log(moment("2022-02-19").format("X"))
        console.log(moment("2022-02-19").unix())
        console.log(moment.unix(moment("2022-02-19").unix()).format("LLL"))

        let fileArray = await this.readFile();
        fileArray.sort((a, b)=>{return b.created_date - a.created_date});
        const findObj = fileArray.find((element) => element["isPublished"] == false);
        let {content, source} = findObj;
        this.content = content;
        this.source = source;
    }

    readFile(){
        return new Promise(resolve => {
            fs.readFile(this.textFileName, (err, data) => {
                let arrayList = [];
                if (!err){
                    if(data!=undefined){
                        Object.values(JSON.parse(data)).forEach((value)=>{
                            arrayList.push(value);
                        })
                    }
                }
                this.lists = arrayList;
                resolve(arrayList);
            });
        });
    }

    textCompare(array, key, text){
        let compareNumber = 0;
        array.forEach((element)=>{
            const comparePoint = stringSimilarity.compareTwoStrings(element[key], text);
            if(comparePoint > 0.5) compareNumber++
        })
        return compareNumber
    }

    async addContentFromJson(jsonData, subject){
        
        if( jsonData.content == undefined || jsonData.source == undefined || subject == undefined) return {
            className:"error",
            message:"Lütfen boş geçmeyiniz!"
        }
        
        this.setSubject(subject);
        
        let fileArray = await this.readFile();

        if(this.textCompare(fileArray, "content", jsonData.content) == 0 && jsonData.content.length < 264){
            jsonData['id'] = fileArray.length;
            jsonData['created_date'] = moment().unix();
            jsonData['isPublished'] = false;
            jsonData['publish_date'] = null;

            let jsonArray = [];
            jsonArray.push(jsonData);

            await this.saveFile(fileArray, jsonArray);
            return {
                className:"success",
                message:"Başarılı"
            }
        }else{
            return {
                className:"error",
                message:"Daha önce benzer metin eklenmiş!"
            };
        }
    }

    async saveFile(fileArray, jsonArray) {
        return new Promise((resolve,reject) => {
            try{
                const data = fileArray.concat(jsonArray);
                fs.writeFileSync(this.textFileName, JSON.stringify(data));
                resolve(true);
            }catch (err) {
                reject(false);
            }
        })
    }

    async photoOptions(){
        let contentFontSize = 0, sourceFontSize = 32;
        let contentSize = this.content.length;

        if(this.subject == 'ayet'){
            if(contentSize >= 200 && contentSize <= 264){
                contentFontSize = 37;
            }else{
                contentFontSize = 32;
            }
            sourceFontSize = 32;
        }else if(this.subject == 'hadis'){
            if(contentSize >= 160 && contentSize <= 199){
                contentFontSize = 45;
            }else if(contentSize >= 200 && contentSize <= 264){
                contentFontSize = 37;
            }else{
                contentFontSize = 37;
            }
            sourceFontSize = 32;
        }else{
            if(contentSize >= 200 && contentSize <= 264){
                contentFontSize = 32;
            }else{
                contentFontSize = 32;
            }
        }

        let contentFontOptns = `assets/fonts/${this.subject}/content/${contentFontSize}/font.fnt`;
        let sourceFontOptns = `assets/fonts/${this.subject}/source/${sourceFontSize}/font.fnt`;

        const contentFont = await Jimp.loadFont(contentFontOptns);
        const sourceFont = await Jimp.loadFont(sourceFontOptns);

        return {
            contentFont,
            sourceFont
        }
    }

    async addTextToPicture(){
        const image = await Jimp.read(this.imageSrc);
        const {contentFont, sourceFont} = await this.photoOptions();

        if(this.content.length>0 && this.source.length>0){

            image.print(contentFont, 120, 350, {
                text: this.content,
                alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
                alignmentY: Jimp.VERTICAL_ALIGN_CENTER
            }, 850, 700);
    
            image.print(sourceFont, 365, 770, {
                text: this.source,
                alignmentX: Jimp.HORIZONTAL_ALIGN_LEFT,
                alignmentY: Jimp.VERTICAL_ALIGN_CENTER
            }, 850, 700);
            //maxtext 37 font size 264 length
            image.write(this.imageOut);
        }else{
            console.log("Content ve Source Belirlenmedi!")
        }
    }
};

module.exports = Data 