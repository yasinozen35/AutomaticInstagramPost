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
        this.caption="";
        this.lists=[];
        this.$=null;
        this.imageSrc="";
        this.imageOut="";
        this.sendText={
            content: "",
            source: "",
            id: null,
            created_date: null,
            isPublished: null,
            publish_date: null
        };
        this.lastPublicSubject="";
        this.imageCalc={
            content:{
                left:0,
                top:0,
                width:0,
                height:0,
                alignmentX: null,
                alignmentY: null
            },
            source:{
                left:0,
                top:0,
                width:0,
                height:0,
                alignmentX: null,
                alignmentY: null
            }
        }
    }

    setSubject(subject) {
        if(subject == 'ayet' || subject == 'hadis' || subject == 'dua'){
            this.subject = subject;
            this.setLink();
            this.setTextFileName();
            this.setImageFileName();
        }
    }

    setCaption(){
        let captionArray = ["#Allah", "#muhammet", "#muhammed", "#Kuran", "#dua", "#duavakti", "#pray", "#salavat", "#ahlak", "#din", "#islam", "#kul", "#müslüman", "#muslim", "#musluman", "#cami", "#ehlisunnet", "#ibadet", "#ehlisünnet", "#cuma", "#post", "#sure", "#dinisözler", "#ezan", "#türkiye"];
        let postCaption = [];
        let i = 0;
        while (i < 6) {
            const randomNumber = Math.floor(Math.random() * captionArray.length);
            if(postCaption.includes(captionArray[randomNumber]) == false){
                i++;
                postCaption.push(captionArray[randomNumber])
                if(i==6){
                    this.caption+=captionArray[randomNumber];
                }else{
                    this.caption+=captionArray[randomNumber]+" ";
                }
            }
        }
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
        this.subject == 'ayet' ?  this.textFileName = './public/ayetler.json' :
        this.subject == 'hadis' ?  this.textFileName = './public/hadisler.json' :
        this.subject == 'dua' ?  this.textFileName = './public/dualar.json' : '';
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
    
    clearSendText(){
        this.sendText.content = "";
        this.sendText.source = "";
        this.sendText.id = null;
        this.sendText.created_date =null;
        this.sendText.isPublished = null;
        this.sendText.publish_date = null;
    }

    findSubject(){
        if(this.lastPublicSubject == "" || this.lastPublicSubject == "ayet"){
            this.setSubject('hadis');
        }else if (this.lastPublicSubject == "hadis"){
            this.setSubject('dua');
        }else{
            this.setSubject('ayet');
        }
    }

    async generatePicture(){
        this.findSubject();
        if(this.subject == "") return
        await this.getText();
        //await this.addTextToPicture();
    }

    async getText(){
        this.setCaption();

        let fileArray = await this.readFile();

        fileArray.sort((a, b)=>{return a.created_date - b.created_date});

        let day = moment().format("dddd").toLowerCase().toString();
        let findObj = {};
        let number = -1;

        if(fileArray.length>0){
            fileArray.forEach((item)=>{
                let cumaTextNumber = stringSimilarity.compareTwoStrings(item.content, day);
                if(cumaTextNumber > number && day == "cuma" && item.content.includes(day) == true && item.isPublished == false){
                    number = cumaTextNumber
                    findObj = item;
                }
            })

            if( Object.keys(findObj).length == 0){
                findObj = fileArray.find((element) => element["isPublished"] == false);
            } 
             
            if(findObj.content.length>0){
                let {id, created_date, isPublished, publish_date, content, source} = findObj;

                this.sendText.id = id;
                this.sendText.content = content;
                this.sendText.source = source;
                
                this.sendText.created_date = created_date;
                this.sendText.isPublished = isPublished;
                this.sendText.publish_date = publish_date;
            }
            console.log(this.sendText);
        }
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

        if(this.textCompare(fileArray, "content", jsonData.content) == 0 && jsonData.content.length < 1000){
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

    async setPublish(){
        const fileArray = await this.readFile();
        let mockData = fileArray;
        const id = this.sendText.id;
        mockData.forEach((element)=>{
            if(element.id == id){
                element.isPublished = true;
                element.publish_date =  moment().unix();
            }
        });

        await this.saveFile(mockData, []).then(()=>{
            this.clearSendText();
            this.setLastSubjext();
        }).catch((err)=>{
            console.log(err)
        });
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
        let contentSize = this.sendText.content.length;

        this.imageCalc.content.alignmentX = Jimp.HORIZONTAL_ALIGN_CENTER;
        this.imageCalc.content.alignmentY = Jimp.VERTICAL_ALIGN_CENTER;
        this.imageCalc.source.alignmentX = Jimp.HORIZONTAL_ALIGN_CENTER;
        this.imageCalc.source.alignmentY = Jimp.VERTICAL_ALIGN_CENTER;

        if(this.subject == 'ayet'){
            if(contentSize >= 0 && contentSize <= 99){
                contentFontSize = 50;
                this.imageCalc.content.left = 30;
                this.imageCalc.content.top = 490;
                this.imageCalc.content.width = 820;
                this.imageCalc.content.height = 700;
            }else if(contentSize >= 100 && contentSize <= 199){
                contentFontSize = 45;
                this.imageCalc.content.left = 30;
                this.imageCalc.content.top = 450;
                this.imageCalc.content.width = 820;
                this.imageCalc.content.height = 700;
            }else if(contentSize >= 200 && contentSize <= 276){
                contentFontSize = 40;
                this.imageCalc.content.left = 30;
                this.imageCalc.content.top = 450;
                this.imageCalc.content.width = 800;
                this.imageCalc.content.height = 700;
            }else if(contentSize >= 277 && contentSize <= 400){
                contentFontSize = 40;
                this.imageCalc.content.left = 30;
                this.imageCalc.content.top = 420;
                this.imageCalc.content.width = 780;
                this.imageCalc.content.height = 700;
            }else if(contentSize >= 401 && contentSize <= 580){
                contentFontSize = 40;
                this.imageCalc.content.left = 30;
                this.imageCalc.content.top = 350;
                this.imageCalc.content.width = 780;
                this.imageCalc.content.height = 700;
            }else{
                contentFontSize = 35;
                this.imageCalc.content.left = 30;
                this.imageCalc.content.top = 320;
                this.imageCalc.content.width = 790;
                this.imageCalc.content.height = 700;
            }
            this.imageCalc.source.left = 380;
            this.imageCalc.source.top = 910;
            this.imageCalc.source.width = 300;
            this.imageCalc.source.height = 700;
            this.imageCalc.source.alignmentX = Jimp.HORIZONTAL_ALIGN_CENTER;
            sourceFontSize = 45;
            
        }else if(this.subject == 'hadis'){
            
            if(contentSize >= 0 && contentSize <= 99){
                contentFontSize = 45;
                this.imageCalc.content.left = 105;
                this.imageCalc.content.top = 400;
                this.imageCalc.content.width = 800;
                this.imageCalc.content.height = 700;
            }else if(contentSize >= 100 && contentSize <= 200){
                contentFontSize = 45;
                this.imageCalc.content.left = 105;
                this.imageCalc.content.top = 350;
                this.imageCalc.content.width = 850;
                this.imageCalc.content.height = 700;
            }else if(contentSize >= 201 && contentSize <= 300){
                contentFontSize = 40;
                this.imageCalc.content.left = 105;
                this.imageCalc.content.top = 330;
                this.imageCalc.content.width = 850;
                this.imageCalc.content.height = 700;
            }else if(contentSize >= 301 && contentSize <= 500){
                contentFontSize = 35;
                this.imageCalc.content.left = 105;
                this.imageCalc.content.top = 310;
                this.imageCalc.content.width = 850;
                this.imageCalc.content.height = 700;
            }else{
                contentFontSize = 30;
                this.imageCalc.content.left = 105;
                this.imageCalc.content.top = 310;
                this.imageCalc.content.width = 680;
                this.imageCalc.content.height = 700;
            }

            this.imageCalc.source.left = 365;
            this.imageCalc.source.top = 770;
            this.imageCalc.source.width = 850;
            this.imageCalc.source.height = 700;
            this.imageCalc.source.alignmentX = Jimp.HORIZONTAL_ALIGN_LEFT;
            sourceFontSize = 35;
            
        }else{
            if(contentSize >= 0 && contentSize <= 150){
                contentFontSize = 40;

                this.imageCalc.content.left = 105;
                this.imageCalc.content.top = 310;
                this.imageCalc.content.width = 510;
                this.imageCalc.content.height = 700;

                this.imageCalc.source.left = 110;
                this.imageCalc.source.top = 650;
                this.imageCalc.source.width = 850;
                this.imageCalc.source.height = 700;

            }else if(contentSize >= 151 && contentSize <= 300){
                contentFontSize = 40;
                this.imageCalc.content.left = 105;
                this.imageCalc.content.top = 310;
                this.imageCalc.content.width = 510;
                this.imageCalc.content.height = 700;

                this.imageCalc.source.left = 110;
                this.imageCalc.source.top = 900;
                this.imageCalc.source.width = 850;
                this.imageCalc.source.height = 700;
                this.imageCalc.source.alignmentX = Jimp.HORIZONTAL_ALIGN_RIGHT;

            }else if(contentSize >= 301 && contentSize <= 449){
                contentFontSize = 35;
                this.imageCalc.content.left = 105;
                this.imageCalc.content.top = 280;
                this.imageCalc.content.width = 510;
                this.imageCalc.content.height = 700;

                this.imageCalc.source.left = 110;
                this.imageCalc.source.top = 900;
                this.imageCalc.source.width = 850;
                this.imageCalc.source.height = 700;
                this.imageCalc.source.alignmentX = Jimp.HORIZONTAL_ALIGN_RIGHT;

            }else if(contentSize >= 450 && contentSize <= 800){
                contentFontSize = 30;

                this.imageCalc.content.left = 105;
                this.imageCalc.content.top = 310;
                this.imageCalc.content.width = 510;
                this.imageCalc.content.height = 700;

                this.imageCalc.source.left = 110;
                this.imageCalc.source.top = 900;
                this.imageCalc.source.width = 850;
                this.imageCalc.source.height = 700;
                this.imageCalc.source.alignmentX = Jimp.HORIZONTAL_ALIGN_RIGHT;

            }else{
                contentFontSize = 25;
                this.imageCalc.content.left = 90;
                this.imageCalc.content.top = 290;
                this.imageCalc.content.width = 530;
                this.imageCalc.content.height = 800;

                this.imageCalc.source.left = 110;
                this.imageCalc.source.top = 900;
                this.imageCalc.source.width = 850;
                this.imageCalc.source.height = 700;
                this.imageCalc.source.alignmentX = Jimp.HORIZONTAL_ALIGN_RIGHT;
            }
            this.imageCalc.content.alignmentX = Jimp.HORIZONTAL_ALIGN_LEFT;
            sourceFontSize = 35;
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

    setLastSubjext(){
        this.lastPublicSubject = this.subject;
    }

    addTextToPicture(){
        return new Promise(async (resolve,reject) => {
            const image = await Jimp.read(this.imageSrc);
            const {contentFont, sourceFont} = await this.photoOptions();

            if(this.sendText.content.length>0 && this.sendText.source.length>0){
                image.print(contentFont, this.imageCalc.content.left, this.imageCalc.content.top, {
                    text: this.sendText.content,
                    alignmentX: this.imageCalc.content.alignmentX,
                    alignmentY: this.imageCalc.content.alignmentY
                }, this.imageCalc.content.width, this.imageCalc.content.height);
        
                image.print(sourceFont, this.imageCalc.source.left, this.imageCalc.source.top, {
                    text: this.sendText.source,
                    alignmentX: this.imageCalc.source.alignmentX,
                    alignmentY: this.imageCalc.source.alignmentY
                }, this.imageCalc.source.width, this.imageCalc.source.height);

                image.write(this.imageOut);
                this.setPublish();
                resolve();
            }else{
                console.log("Konu:", this.subject);
                reject("Content ve Source Belirlenmedi!");
            }
        });
    }
};

module.exports = Data 