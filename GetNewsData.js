const request = require("request-promise");
const puppeteer = require("puppeteer");
const Jimp = require('jimp');
class GetNewsData{
    constructor(){
        this.webSiteUrl = "https://torbaliguncel.com/tum-mansetler.html";
        this.data = [];
        this.pageItem = [
            {
                'name':'image',
                'property': 'src',
                'XPath':'//*[@id="news-detail"]/div[2]/img'
            },
            {
                'name':'title',
                'property': 'textContent',
                'XPath':'//*[@id="news-detail"]/div[1]/h1'
            },
            {
                'name':'lead',
                'property': 'textContent',
                'XPath':'//*[@id="news-detail"]/div[1]/h2'
            },
            {
                'name':'content',
                'property': 'textContent',
                'XPath':'//*[@id="article-text"]/p[1]/span/span'
            }
        ];
    }

    async visitMainPage(){
        await this.getNews()
    }

    async scrapePage(url){
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        await page.goto(url);
        return {page, browser}
    }

    async getNews(){
        //Haberleri burdan geziyoruz.

        this.data = [];

        const {page, browser} = await this.scrapePage(this.webSiteUrl);

        const content = await page.$$("div.col-4 > div.card > a");

        const urlPromis = content.map(async (item)=>{
            const hrefElement = await item.getProperty('href')
            let url = await hrefElement.jsonValue();
            url = await url.trim();
            return url;
        });

        const urls = await Promise.all(urlPromis);

        let i = 0;
        while(i < urls.length){
            const promisData = await this.getPage(urls[i]);
            const news = await Promise.all(promisData);
            if(news){
                this.pngToJpg(news[0].image);
                console.log( i+1 +'. '+ news[0].title);
                this.data.push(...news);
                return
                i++;
            }
            return
        }

        await browser.close();
    }

    async getPage(url){
        const {page, browser} = await this.scrapePage(url);
        let newsObj = {};
        const result = this.pageItem.map(async (element)=>{
            const news = await this.getProperty(page, element.XPath, element.property)
            newsObj[element.name] = news;
            return newsObj
        })
        const data = await Promise.all(result) 
        await browser.close();
        return data
    }

    async getProperty(page, XPath, property){
        const [el] = await page.$x(XPath);
        const element = el ? await el.getProperty(property) : null;
        let elementItem = element ? await element.jsonValue() : null;
        elementItem = elementItem ? await elementItem.trim() : null;
        return elementItem
    }

    async pngToJpg(imageUrl){
        // Read the PNG file and convert it to editable format
        await Jimp.read(imageUrl, (err, image) => {
            if (err) {
            
                // Return if any error
                console.log(err);
                return;
            }
            let url = imageUrl.replace(".png", ".jpg");
            let urlList = url.split("/");
            image.write("./torbali/"+urlList.at(-1));
            return true
        });
    }
}

module.exports = GetNewsData