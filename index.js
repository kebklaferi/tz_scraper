const puppeteer = require('puppeteer');
const fs = require('fs');
const url = "https://app.thestorygraph.com/book_reviews/2d7248cb-2d7a-4d3e-a45a-d1b995aeaaf8?written_explanations_only=true"
const getData = async () => {
    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: {
            width: 800,
            height: 600,
            deviceScaleFactor: 1,
        }
    });
    let reviews = [];
    let loadReviews = true;
    const page = await browser.newPage();
    try {
        await page.goto(url, {
            timeout: 60000,
            waitUntil: 'domcontentloaded'
        });

        const maxScrolls = 10;
        let scrollCount = 0;
        let prevHeight = 0;
        await autoScroll(maxScrolls, scrollCount, prevHeight, page);
        const reviewList = await page.$$("main > div > span.review-panes > div");
        console.log("Reviews: ", reviewList.length);
        await scrape(reviewList, reviews)

    } catch (error) {
        console.error(error);
    } finally {
        await page.close();
        fs.writeFile('reviews.json', JSON.stringify(reviews), error => {
            if (error) console.error(error);
        })
    }
    return reviews;
}
const autoScroll = async (maxScrolls, scrollCount, prevHeight, page) => {
    while (scrollCount < maxScrolls) {
        await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
        await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 1000)));
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
            if(rating !== "Go to review page"){
                reviews.push({
                    rating: rating,
                    reviewText: text.replace(/\n/g, ''),
                })
            }
        } catch (error) {
            console.error(error)
        }
    }
}

getData().then(reviews => console.log(reviews.length));
