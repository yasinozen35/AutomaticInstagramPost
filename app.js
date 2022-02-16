const express = require('express');
const app = express();
const Instagram = require('instagram-web-api');
const FileCookieStore = require("tough-cookie-filestore2");
const cron = require("node-cron");
require('dotenv').config();
const port = process.env.PORT || 4000;
//00 00 * * *
//40 14 14 2 *

const Data = require('./data.js');
/*
let proje = new Data();

proje.setSubject('ayet');
//parametre olarak text size gönder
const text = "Bakmakla hükümlü olduğu kişileri ihmal etmesi, kişiye günah olarak yeter! test";
const info = "EbüDavut,Zekat,4-5";
proje.setPhotoText(text, info);
*/
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