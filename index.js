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
    let reviews = []
    const page = await browser.newPage();
    try {
        const hm = await page.goto(url, {
            timeout: 60000,
            waitUntil: 'domcontentloaded'
        });

        const reviewList = await page.$$("main > div > span.review-panes > div");
        console.log(reviewList.length)
        for (const review of reviewList) {
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
        }
    } catch (error) {
        console.error(error);
    } finally {
        //await page.close();
    }
    return reviews;
}


getData().then(reviews => console.log(reviews.length));
