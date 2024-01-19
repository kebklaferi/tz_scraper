const puppeteer = require('puppeteer');
const fs = require('fs');
const url = "https://app.thestorygraph.com/book_reviews/";
const books = ["2d7248cb-2d7a-4d3e-a45a-d1b995aeaaf8", "8145fb3d-8156-43f9-be7d-f8c656f81a6d"];
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
    for (const book of books) {
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

            const maxScrolls = 10;
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
            fs.writeFile(book + 'reviews.json', JSON.stringify(reviews), error => {
                if (error) console.error(error);
            })
        }
    }
    return ({browser});
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
            const text = await textSelector.$eval("div", el => el.innerText);

            const paragraphSelectors = await review.$$("p.mb-2");
            const ratingSelector = paragraphSelectors[paragraphSelectors.length - 1];
            const rating = await ratingSelector.evaluate(el => el.innerText);
            let reviewText = refactorText(text);
            if (rating !== "Go to review page" && reviewText.length > 5) {
                reviews.push({
                    ratingNumber: rating,
                    reviewText: reviewText,
                    rating: ratingEval(rating)
                })
            }
        } catch (error) {
           // console.error(error)
        }
    }
}

const ratingEval = (rating) => {
    const tmp = parseInt(rating);
    if(rating < 2.5){
        countObj.negativno++;
        return "NEGATIVNO";
    } else if (rating < 4){
        countObj.nevtralno++;
        return "NEVTRALNO";
    } else {
        countObj.pozitivno++;
        return "POZITIVNO";
    }
    //nevtralno 2,5 - 3,5
    // pozitivno 3,5 -> 5
    // negativno 0-2
}

getData().then(
    ({browser}) => {
        browser.close().then(() => {});
    }
);

const refactorText = (text) => {
    text = text.replace(/&nbsp;/g, '');
    text = text.replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '');;
    return text.replace(/\n/g, '');
}
