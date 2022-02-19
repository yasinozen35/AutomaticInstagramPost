const express = require('express');
const app = express();
var bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use('/public', express.static('public'))
const Instagram = require('instagram-web-api');
const FileCookieStore = require("tough-cookie-filestore2");
const cron = require("node-cron");
require('dotenv').config();
const port = process.env.PORT || 4000;
app.set('view engine', 'pug')
//00 00 * * *
//40 14 14 2 *

const Data = require('./data.js');

let proje = new Data();
proje.generatePicture('hadis').then(()=>{
    //console.log(proje.content);
});

app.get("/add", (req, res)=>{
    const {subject, image} = req.query;
    
    if(subject){
        proje.setSubject(subject);
        proje.readFile().then(()=>{
            if(image){
                proje.generatePicture()
            }
            res.render('index', { title: 'Hey', message: 'Lütfen inputları doldurunuz!', image:proje.imageOut, fileArray:proje.lists.sort((a, b)=> b.created_date - a.created_date) })
        });
    }else{
        res.render('index', { title: 'Hey', message: 'Lütfen inputları doldurunuz!', fileArray:[]})
    }
    
});

app.post("/add", async (req, res)=>{
    const {content, source, subject} = req.body;
    let data = {};
    data['content'] = content.trim();
    data['source']  = source.trim();
    proje.addContentFromJson(data, subject).then(async (result)=>{
        if(result.className=='success'){
            await proje.readFile();
            console.log(proje.lists.at(-1));
        }
        
        res.render('index', {...result, fileArray:proje.lists.sort((a, b)=> b.created_date - a.created_date)});
    });
});

cron.schedule("20 12 14 2 *", ()=>{

    const { INSTAGRAM_USERNAME, INSTAGRAM_PASSWORD } = process.env
    const cookieStore = new FileCookieStore("./cookies.json");
    const client = new Instagram({
        username:INSTAGRAM_USERNAME,
        password:INSTAGRAM_PASSWORD,
        cookieStore
    }, {
        language: 'tr-TR'
    });

    const login = async () => {
        console.log("Logging in...");
    
        await client.login().then(()=>{
            console.log("Login succesfull...");
            instagramPostFunction();
        }).catch((err)=>{
            console.log("Login failed...");
            console.log(err);
        });
    }
    
    login();
    
    const instagramPostFunction = async () => {
        await client.uploadPhoto({
            photo:"./photo.jpg",
            caption:"#Allah #Muhammet #Kur'an",
            post:"feed"
        }).then(async (res)=>{
            const media = res.media;
            console.log(`https://instagram.com/p/${media.code}`);
    
            await client.addComment({
                mediaId:media.id,
                text:'Yayınlarımızı paylaşarak daha fazla kişiye ulaştıralım inşaAllah!'
            });

            await client.logout().then(()=>{
                console.log("Logout success...");
            }).catch((err)=>{
                console.log("Logout failed...");
                console.log(err);
            });
        });
    };
});

app.get('/', function (req, res) {
    console.log(req.query)
    res.send('hello world')
})



app.listen(port, ()=>{
   console.log(`Listening on port ${port}...`);
});