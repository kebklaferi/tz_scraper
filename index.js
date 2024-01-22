const puppeteer = require('puppeteer');
const fs = require('fs');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const url = "https://app.thestorygraph.com/book_reviews/";
//const booksAll = ["2d7248cb-2d7a-4d3e-a45a-d1b995aeaaf8", "8145fb3d-8156-43f9-be7d-f8c656f81a6d"];
const books = ["5be514e8-67a5-4010-8a3a-ddd1506e7e2f", "8e34ba9e-26c2-44a0-a02f-85c9cc8d5c05", "9afedc2e-0f24-45ae-bf73-97c95c358031", "47c54fb4-3b3c-436f-9009-40379c4f0b72", "8985f7cc-02f7-4007-ad50-ba555394aa03", "be62d4d7-d09a-459f-8ed5-5fb87c143fed", "d25d4022-4e0d-4989-a498-87affa22b8f1", "399c273d-44d8-4ba9-a760-890666928484", "1ee3f05f-17bd-4cc1-bc6b-af353b97698a", "a24b2d4b-d777-478f-bb1e-0e75266961e7", "96231423-4caa-4f1f-95e8-20109461ecaa", "620bc022-e9c4-4373-b041-9a7686f05d82", "0c3a9c62-b324-4ac2-805a-6b24395da14d", "cac8dc7c-5cb0-415d-a363-cf4c385cb231", "300d29a5-7422-4ac6-8c50-e9df34de13d2", "93525f90-bc68-4d7b-935d-81ea6d00d8f9", "f2b0775f-bb77-42d9-9362-fe482ff2e397", "d776d826-93a3-4d6f-8e88-a86e7cb7e4af", "c86c4a48-89aa-4805-a513-2fef489d8420"]
const test = ["5be514e8-67a5-4010-8a3a-ddd1506e7e2f", "8e34ba9e-26c2-44a0-a02f-85c9cc8d5c05"]
const countObj = {
    "negativno": 0,
    "nevtralno": 0,
    "pozitivno": 0
}
const getData = async () => {
    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: {
            width: 800,
            height: 600,
            deviceScaleFactor: 1,
        }
    });
    let totalReviews = [];
    for (const book of test) {
        let reviews = [];
        countObj.nevtralno = 0;
        countObj.pozitivno = 0;
        countObj.negativno = 0;
        const page = await browser.newPage();
        try {
            await page.goto(url + book + "?written_explanations_only=true", {
                timeout: 60000,
                waitUntil: 'domcontentloaded'
            });

            const maxScrolls = 5;
            let scrollCount = 0;
            let prevHeight = 0;
            await autoScroll(maxScrolls, scrollCount, prevHeight, page);
            const reviewList = await page.$$("main > div > span.review-panes > div");
            await scrape(reviewList, reviews)
            console.log(book)
            console.log("All reviews: ", reviewList.length);
            console.log("Saved reviews: ", reviews.length);
            console.log(countObj);

        } catch (error) {
            console.error(error);
        } finally {
            await page.close();
            reviews.forEach((review) => {
                totalReviews.push(review)
            })

            /*fs.writeFile(book + 'reviews.json', JSON.stringify(reviews), error => {
                if (error) console.error(error);
            })

            csvWriter.writeRecords(reviews).then( () => {
                console.log("end")
            }).catch(err => {})*/
        }
    }
    return ({browser, totalReviews});
}
const autoScroll = async (maxScrolls, scrollCount, prevHeight, page) => {
    while (scrollCount < maxScrolls) {
        await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
        await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 3000)));
        const newHeight = await page.evaluate('document.body.scrollHeight');
        if (newHeight === prevHeight) {
            break;
        }
        prevHeight = newHeight;
        scrollCount += 1;
    }
}

const scrape = async (reviewList, reviews) => {
    for (const review of reviewList) {
        try {

            const textSelector = await review.$("div.trix-content.review-explanation");
            //const text = await textSelector.$eval("div", el => el.innerText);
            const text = await review.$eval("div.trix-content.review-explanation", el => el.innerText);

            //console.log(textSelector)
            //const text = await textSelector[0].innerText;
            console.log(text)

            const paragraphSelectors = await review.$$("p.mb-2");
            const ratingSelector = paragraphSelectors[paragraphSelectors.length - 1];
            const rating = await ratingSelector.evaluate(el => el.innerText);
            let reviewText = refactorText(text);
            if (rating !== "Go to review page" && reviewText.length > 5) {
                reviews.push({
                    ratingNumber: parseFloat(rating),
                    reviewText: reviewText,
                    rating: ratingEval(rating)
                })
            }
        } catch (error) {
           console.error(error)
        }
    }
}

const ratingEval = (rating) => {
    const tmp = parseFloat(rating);
    if(tmp < 2.5){
        countObj.negativno++;
        return "NEGATIVNO";
    } else if (tmp < 4){
        countObj.nevtralno++;
        return "NEVTRALNO";
    } else {
        countObj.pozitivno++;
        return "POZITIVNO";
    }
}

getData().then(
    ({browser, totalReviews}) => {
        browser.close().then(() => {});
        const csvWriter = createCsvWriter({
            path: 'totalReviews.csv',
            header: [
                {id: 'ratingNumber', title: 'Number'},
                {id: 'reviewText', title: 'Review'},
                {id: 'rating', title: 'Rating'},
            ]
        });
        csvWriter.writeRecords(totalReviews).then( () => {
            console.log("end")
        }).catch(err => {})
    }
);

const refactorText = (text) => {
    text = text.replace(/&nbsp;/g, '');
    text = text.replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '');;
    return text.replace(/\n/g, '');
}
