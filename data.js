const request = require("request-promise");
const cheerio = require("cheerio");
const fs = require('fs');
const jsdom = require("jsdom");
const Jimp = require('jimp');
class Data {
    constructor(){
        this.linkler=[];
        this.link="";
        this.fileName="";
        this.subject="";
        this.lists=[];
        this.ayet="";
        this.hadis="";
        this.dua="";
        this.$=null;
    }

    setSubject(subject) {
        this.setLink(subject);
        this.setFileName(subject);
    }

    setLink(subject){
        let params = "";
        subject.toLowerCase() == 'ayet' ? params = "Tagut-ile-ilgili-Ayetler" :
        subject.toLowerCase() == 'hadis' ? params = "Ebu-Cendel-ve-Ebu-Basir" :
        subject.toLowerCase() == 'dua' ? params = "Borcun-odenmesi-icin-Yapilan-Dualar" : "";
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

    setFileName(name){
        name == 'ayet' ?  this.fileName = 'ayetler.json' :
        name == 'hadis' ?  this.fileName = 'hadisler.json' :
        name == 'dua' ?  this.fileName = 'dualar.json' : '';
    }

    readJsonFromFile(){
        let json = {};
        fs.readFile(this.fileName, (err, data) => {
            if (!err){
                json = JSON.parse(data);
            }
        });
        return json;
    }

    exportToJsonFile(jsonData) {
        const data = Object.assign(this.readJsonFromFile(), jsonData);
        fs.writeFileSync(this.fileName, JSON.stringify(data));
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
    
    async setPhotoText(text, info){
        const image = await Jimp.read("./assets/images/source/blank_hadis.jpg");
        
        const hadisText = await Jimp.loadFont('assets/fonts/hadis/text/50/font.fnt')
        const hadisInfo = await Jimp.loadFont('assets/fonts/hadis/info/32/font.fnt')
        
        image.print(hadisText, 120, 350, {
            text,
            alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
            alignmentY: Jimp.VERTICAL_ALIGN_CENTER
        }, 850, 700);

        image.print(hadisInfo, 365, 770, {
            text: info,
            alignmentX: Jimp.HORIZONTAL_ALIGN_LEFT,
            alignmentY: Jimp.VERTICAL_ALIGN_CENTER
        }, 850, 700);
        //maxtext 37 font size 264 length
        image.write("photoNew.jpg");
    }

    setAyet(){

    }
};

module.exports = Data 