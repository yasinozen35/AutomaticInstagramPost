const express = require('express');
const app = express();
let bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use('/public', express.static('public'))
const Instagram = require('instagram-web-api');
const FileCookieStore = require("tough-cookie-filestore2");
const Cron = require("croner");
require('dotenv').config();
const port = process.env.PORT || 4000;
app.set('view engine', 'pug')
const moment = require('moment');
moment.locale('tr');
const Data = require('./data.js');
const GetNewsData = require('./GetNewsData.js');

/*
let news = new GetNewsData();
news.visitMainPage().then(()=>{
    console.log("news data");
    console.log(news.data[0]);
    login();
});
*/


let proje = new Data();

proje.dbConnect();

app.get('/send', async (req, res) => {
    if (req.query.post) {
        await login("_ayetHadis");
    }

    await proje.generateText().then(() => {
        res.render('send', { element: proje.sendText, subject: proje.lastSubject });
    })
});

app.get("/add", async (req, res) => {
    const { subject, image } = req.query;

    if (subject) {
        proje.setSubject(subject);
        await proje.getText();

        res.render('index', { title: 'Hey', message: 'Lütfen inputları doldurunuz!', image: proje.imageOut, moment, fileArray: proje.lists.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) })
    } else {
        res.render('index', { title: 'Hey', message: 'Lütfen inputları doldurunuz!', fileArray: [] })
    }

});

app.post("/add", async (req, res) => {
    const { content, source, subject } = req.body;
    let data = {};
    data['content'] = content.trim();
    data['source'] = source.trim();
    proje.addContentFromJson(data, subject).then(async (result) => {
        if (result.className == 'success') {
            await proje.getText();
            console.log(proje.lists.at(-1));
        }
        res.render('index', { ...result, moment, fileArray: proje.lists.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) });
    });
});

const { INSTAGRAM_USERNAME, INSTAGRAM_PASSWORD } = process.env

Cron("30 06 * * *", () => {
    let day = moment().format("dddd").toLowerCase().toString();
    if (day == 'cuma') login('_ayetHadis');
});

Cron("30 17 * * *", () => {
    login('_ayetHadis');
});


const cookieStore = new FileCookieStore("./cookies.json");
const client = new Instagram({
    username: INSTAGRAM_USERNAME,
    password: INSTAGRAM_PASSWORD,
    cookieStore
}, {
    language: 'tr-TR'
});

const login = async (user) => {
    await client.login({},{_sharedData:false}).then(async () => {
        await instagramPostFunction(user);
    }).catch((err) => {
        console.log("Login failed....");
        console.log(err);
        proje.sendMail("login-failed", err);
    });
}

const instagramPostFunction = async (user) => {
    if (user == '_ayetHadis') {
        proje.generatePicture().then(async () => {
            setTimeout(async () => {
                let firstComment = "";

                if (proje.lastSubject == 'dua') {
                    firstComment = "Müsaitseniz yoruma Amin yazar mısınız?"
                } else {
                    firstComment = "Müsaitseniz yoruma Elhamdülillah yazar mısınız?"
                }

                let caption = `${firstComment}🌹
    
                #Bismillahirrahmanirrahim
    
                Allah'u Ekber 👆
    
                Allahümme Salli Ala Seyyidina Muhammedin ve Ala Ali Seyyidina Muhammed (s.a.v) 🌹
                .
                👉 Dua eder dua bekleriz 👈
                __________________________
    
                "Hayra vesile olan, hayrı yapan gibidir." (Hadis,Tirmizî)
                .
                ${proje.caption}
                Yayınlarımızı paylaşarak daha fazla kişiye ulaştıralım inşaAllah!`

                await client.uploadPhoto({
                    photo: proje.imageOut,
                    caption,
                    post: "feed"
                }).then(async (res) => {
                    const media = res.media;
                    console.log(`https://instagram.com/p/${media.code}`);

                    proje.sendMail();

                    /*await client.addComment({
                        mediaId:media.id,
                        text:
                    });*/

                }).catch((err) => {
                    console.log("upload photo err")
                    console.log(err);
                    proje.sendMail("upload-photo-failed", err);
                });
            }, 1000)
        }).catch((err) => {
            console.log(err)
        });
    } else {
        let newImage = "./torbali/" + news.data[0].image.replace(".png", ".jpg");

        console.log(news.data[0].lead)
        let urlList = newImage.split("/");
        console.log("./torbali/" + urlList.at(-1))

        await client.uploadPhoto({
            photo: "./torbali/" + urlList.at(-1),
            caption: news.data[0].lead,
            post: "feed"
        }).then(async (res) => {
            const media = res.media;
            console.log(`https://instagram.com/p/${media.code}`);
            proje.sendMail();

            /*await client.addComment({
                mediaId:media.id,
                text:
            });*/

        }).catch((err) => {
            console.log("upload photo err")
            console.log(err);
        });
    }

};


app.listen(port, () => {
    console.log(`Listening on port ${port}...`);
});