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

const Data = require('./data.js');

let proje = new Data();

app.get('/send', async (req, res) => {
    if(req.query.post){
        await login();
    }

    await proje.generateText().then(()=>{
        res.render('send', {element:proje.sendText,subject:proje.subject});
    })
});

app.get("/add", (req, res)=>{
    const {subject, image} = req.query;
    
    if(subject){
        proje.setSubject(subject);
        proje.readFile().then(async()=>{
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

cron.schedule("46 20 03 03 *", async ()=>{
    await login();
});

cron.schedule("00 20 * * *", async ()=>{
    proje.sendMail();
    await login();
});

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
    await client.login().then(async()=>{
        console.log("Login succesfull...");
        await instagramPostFunction();
    }).catch((err)=>{
        console.log("Login failed...");
        console.log(err);
    });
}

const instagramPostFunction = async () => {
    proje.generatePicture().then(async()=>{
        setTimeout(async()=>{
            await client.uploadPhoto({
                photo: proje.imageOut,
                caption:proje.caption,
                post:"feed"
            }).then(async (res)=>{
                const media = res.media;
                console.log(`https://instagram.com/p/${media.code}`);
                proje.sendMail();
                await client.addComment({
                    mediaId:media.id,
                    text:'Yayınlarımızı paylaşarak daha fazla kişiye ulaştıralım inşaAllah!'
                });
            }).catch((err)=>{
                console.log("upload photo err")
                console.log(err)
            });;

        }, 1000)
    }).catch((err)=>{
        console.log(err)
    });
};


app.listen(port, ()=>{
   console.log(`Listening on port ${port}...`);
});