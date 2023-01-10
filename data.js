const fs = require('fs');
const jsdom = require("jsdom");
const Jimp = require('jimp');
const stringSimilarity = require("string-similarity");
const nodemailer = require("nodemailer");
const moment = require('moment');
moment.locale('tr');
const mongoose = require('mongoose');
const AyetHadis = require("./dbModel");
const DataSubject = require("./dbModelSubject");
class Data {
    constructor(){
        this.subject="";
        this.lastSubject="";
        this.caption="";
        this.lists=[];
        this.imageSrc="";
        this.imageOut="";
        this.sendText={
            content: "",
            source: "",
            id: null,
            createdAt: null,
            isPublished: null
        };
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
        };
        this.connect=false;
    }

    dbConnect(){
        mongoose.connect('mongodb+srv://cluster0.wbbwb.mongodb.net/depo?retryWrites=true&w=majority',{ user: 'Portakal123', pass: 'afUouzzvhvbf3SA2', useNewUrlParser: true, useUnifiedTopology: true })
        const conn = mongoose.connection;
        conn.on('connected', ()=> {
            console.log('database is connected successfully');
            this.connect=true;
        });
        conn.on('disconnected',()=>{
            console.log('database is disconnected successfully');
            this.connect=false;
        })
        conn.on('error', console.error.bind(console, 'connection error:'));
    }

    addDbItem({content, source}){
        return new Promise(async (resolve,reject) => {
            try {
                if(this.connect){
                    //await DataSubject({subject:'ayet', lastSubject:'hadis'}).save();
                    const newItem = new AyetHadis({content, source, isPublished: false, subject:this.subject});
                    await newItem.save();
                    resolve({
                        className:"success",
                        message:"Başarılı!"
                    });
                }else{
                    console.error("Connect false");
                    this.dbConnect();
                    reject({
                        className:"error",
                        message:"Db connect hatası!"
                    });
                }
            } catch (error) {
                console.log("Error");
                console.log(error);
                reject({
                    className:"error",
                    message:"Hatalı!"
                });
            }
        });
    }

    setCaption(){
        let captionArray = ["#namaz","#Amin","#Hzmuhammed","#Hadis","#AllahuEkber","#Hzmuhammedsav","#Müslüman","#Mevlana","#Allah", "#muhammet", "#muhammed", "#Kuran", "#dua", "#duavakti", "#pray", "#salavat", "#ahlak", "#din", "#islam", "#kul", "#müslüman", "#muslim", "#musluman", "#cami", "#ehlisunnet", "#ibadet", "#ehlisünnet", "#cuma", "#post", "#sure", "#dinisözler", "#ezan", "#türkiye"];
        this.caption = "";
        let postCaption = [];
        let i = 0;
        while (i < 15) {
            const randomNumber = Math.floor(Math.random() * captionArray.length);
            if(postCaption.includes(captionArray[randomNumber]) == false){
                i++;
                postCaption.push(captionArray[randomNumber])
                if(i==15){
                    this.caption+=captionArray[randomNumber];
                }else{
                    this.caption+=captionArray[randomNumber]+" ";
                }
            }
        }
    }
    
    clearSendText(){
        this.sendText.content = "";
        this.sendText.source = "";
        this.sendText.id = null;
        this.sendText.createdAt =null;
        this.sendText.isPublished = null;
    }

    async findSubject(){
        let data = await DataSubject.findById("622c7708d078c52b09e53798").exec();
        this.setSubject(data.subject);
        this.setLastSubject(data.lastSubject);
        this.setImageFileName();
    }

    setSubject(subject) {
        if(subject == 'ayet' || subject == 'hadis' || subject == 'dua'){
            this.subject = subject;
        }
    }

    setLastSubject(lastSubject){
        this.lastSubject=lastSubject;
    }

    setImageFileName(){
        if(this.lastSubject == 'ayet' || this.lastSubject == 'hadis' || this.lastSubject == 'dua'){
            this.imageSrc=`./assets/images/source/blank_${this.lastSubject}.jpg`;
            this.imageOut=`./public/images/${this.lastSubject}.jpg`;
        }
    }

    async generatePicture(){
        await this.findSubject();
        if(this.subject == "") return
        await this.getText();
        await this.addTextToPicture();
    }

    async generateText(){
        await this.findSubject();
        if(this.subject == "") return
        await this.getText();
    }

    sendMail(data, text){
        let mailTransporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: "yasinozen35",
                pass: "ngrwpfkqktmzjmqi"
            }
        });
        
        let mailDetails = {};

        if(data == "login"){
            mailDetails = {
                from: "yasinozen35@gmail.com",
                to: "yasinozen35@gmail.com",
                subject:"Login olmaya çalışılıyor.",
                text: "İnstagram hesabına giriş yapılacak."
            };
        }else if(data == "login-success"){
            mailDetails = {
                from: "yasinozen35@gmail.com",
                to: "yasinozen35@gmail.com",
                subject:"Login olundu!",
                text: "İnstagram hesabına giriş yapıldı."
            };
        }else if(data == "login-failed"){
            mailDetails = {
                from: "yasinozen35@gmail.com",
                to: "yasinozen35@gmail.com",
                subject:"Login olunamadı!",
                text: "İnstagram hesabına giriş yapılamadı." + text
            };
        }else if(data == "upload-photo-failed"){
            mailDetails = {
                from: "yasinozen35@gmail.com",
                to: "yasinozen35@gmail.com",
                subject:"upload photo err!",
                text: "upload photo err" + text
            };
        }else{
            mailDetails = {
                from: "yasinozen35@gmail.com",
                to: "yasinozen35@gmail.com",
                subject: `${this.lastSubject} ile ilgili gönderi paylaşıldı!`,
                text: this.sendText.content + "\n"+ `https://ayethadis.herokuapp.com/public/images/${this.lastSubject}.jpg`
            };
        }
          
        // Sending Email
        mailTransporter.sendMail(mailDetails, (err, data) => {
            if (err) {
                console.log("Error Occurs", err);
            } else {
                console.log("Email sent successfully");
            }
        });
    }

    async getText(){
        this.setCaption();
        this.lists = await AyetHadis.find({subject:this.subject});

        let fileArray = await AyetHadis.find({subject:this.lastSubject});
        fileArray.sort((a, b)=>{return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()});
        
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
   
            if(findObj && findObj.content.length>0){
                let {id, createdAt, isPublished, content, source} = findObj;

                this.sendText.id = id;
                this.sendText.content = content;
                this.sendText.source = source;
                
                this.sendText.createdAt = moment(createdAt).format("LLL");
                this.sendText.isPublished = isPublished;
            }

            console.log(this.subject);
            console.log(this.sendText);
        }
    }

    async addContentFromJson(jsonData, subject){
        
        if( jsonData.content == undefined || jsonData.source == undefined || subject == undefined) return {
            className:"error",
            message:"Lütfen boş geçmeyiniz!"
        }
        
        this.setSubject(subject);
        
        this.lists = await AyetHadis.find({subject:this.subject});

        if(this.textCompare(this.lists, "content", jsonData.content) == 0 && jsonData.content.length < 1000){
            return this.addDbItem(jsonData);
        }else{
            return {
                className:"error",
                message:"Daha önce benzer metin eklenmiş!"
            };
        }
    }

    textCompare(array, key, text){
        let compareNumber = 0;
        array.forEach((element)=>{
            const comparePoint = stringSimilarity.compareTwoStrings(element[key], text);
            if(comparePoint > 0.5) compareNumber++
        })
        return compareNumber
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
                await this.setPublish();
                resolve();
            }else{
                console.log("Konu:", this.subject);
                reject("Content ve Source Belirlenmedi!");
            }
        });
    }

    async photoOptions(){
        let contentFontSize = 0, sourceFontSize = 32;
        let contentSize = this.sendText.content.length;

        this.imageCalc.content.alignmentX = Jimp.HORIZONTAL_ALIGN_CENTER;
        this.imageCalc.content.alignmentY = Jimp.VERTICAL_ALIGN_CENTER;
        this.imageCalc.source.alignmentX = Jimp.HORIZONTAL_ALIGN_CENTER;
        this.imageCalc.source.alignmentY = Jimp.VERTICAL_ALIGN_CENTER;

        if(this.lastSubject == 'ayet'){
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
            
        }else if(this.lastSubject == 'hadis'){
            
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

        let contentFontOptns = `assets/fonts/${this.lastSubject}/content/${contentFontSize}/font.fnt`;
        let sourceFontOptns = `assets/fonts/${this.lastSubject}/source/${sourceFontSize}/font.fnt`;

        const contentFont = await Jimp.loadFont(contentFontOptns);
        const sourceFont = await Jimp.loadFont(sourceFontOptns);

        return {
            contentFont,
            sourceFont
        }
    }

    async setPublish(){
        
        let subjectData = {};

        if(this.lastSubject == 'ayet'){
            subjectData['subject'] = this.lastSubject
            subjectData['lastSubject'] = 'hadis'
        }else if(this.lastSubject == 'hadis'){
            subjectData['subject'] = this.lastSubject
            subjectData['lastSubject'] = 'dua'
        }else {
            subjectData['subject'] = this.lastSubject
            subjectData['lastSubject'] = 'ayet'
        }

        await DataSubject.findByIdAndUpdate("622c7708d078c52b09e53798", subjectData );
        await AyetHadis.findByIdAndUpdate(this.sendText.id, { isPublished:true } )
        this.clearSendText();
    }
};

module.exports = Data 