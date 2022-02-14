const express = require('express');
const app = express();
const Instagram = require('instagram-web-api');
const FileCookieStore = require("tough-cookie-filestore2");
const cron = require("node-cron");
require('dotenv').config();

//00 00 * * *
//40 14 14 2 *
cron.schedule("50 14 14 2 *", ()=>{

    const { INSTAGRAM_USERNAME, INSTAGRAM_PASSWORD } = process.env
    const port = process.env.PORT || 4000;
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
        });
    };
});

  

app.listen(port, ()=>{
   console.log(`Listening on port ${port}...`);
});