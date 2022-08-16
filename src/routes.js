const Apify = require('apify');

const {
    utils: { log },
} = Apify;
const { applyFunction, saveScreenshot } = require('./utils');

exports.SEARCH_PAGE = async (page, request, query, requestQueue, maxPostCount, evaledFunc) => {
    // CHECK FOR SELECTOR
    let { savedItems, pageNumber } = request.userData;
    const { hostname } = request.userData;

    console.log("Query :", query)

    // await page.$eval('input[name=field-keywords]', el => el.value = query);
    // await page.click('input#nav-search-submit-button');

    await page.waitForSelector('div.sh-pr__product-results');

    const resultsLength = await page.evaluate(() => {
        return document.querySelector('div.sh-pr__product-results').children.length;
    });


    // check HTML if page has no results
    if (resultsLength === 0) {
        log.warning('The page has no results. Check dataset for more info.');

        await Apify.pushData({
            '#debug': Apify.utils.createRequestDebugInfo(request),
        });
    }


    log.info(`Found ${resultsLength} products on the page.`);
    // eslint-disable-next-line no-shadow
    const data = await page.evaluate(
        (maxPostCount, query, savedItems) => {
            // nodes with items
            let results = Array.from(document.querySelectorAll('.s-main-slot.s-result-list.s-search-results.sg-row .s-result-item .a-section.a-spacing-base'));

            // limit the results to be scraped, if maxPostCount exists
            if (maxPostCount) {
                results = results.slice(0, maxPostCount - savedItems);
            }

            // eslint-disable-next-line no-shadow
            const data = [];
            // ITERATING NODES TO GET RESULTS
            for (let i = 0; i < results.length; i++) {
                // Please pay attention that "merchantMetrics" and "reviewsLink" were removed from the  "SEARCH" page.
                const item = results[i];
                // KEYS OF OUTPUT OBJ

                // console.log("Product", i)

                const type = 'result'

                const title = item.querySelector('h2') ? item.querySelector('h2') : null;

                const productName = title?.textContent ?? null;

                // const productLinkAnchor = item.querySelector('a[href*="shopping/product/"]')
                //     ? item.querySelector('a[href*="shopping/product/"]')
                //     : null;
                // const productLink = productLinkAnchor ? productLinkAnchor.href : null;

                // const price = item.querySelector('div[data-sh-or="price"] div > span > span')?.textContent ?? null;

                // const description = item.querySelectorAll('div.hBUZL')[1]?.textContent ?? null;

                // const merchantName = item.querySelector('div[data-sh-or="price"]')?.nextSibling?.textContent ?? null;

                // const merchantLink = item.querySelector('div[data-sh-or="price"]')?.parentElement?.parentElement?.href ?? null;

                // const idArray = productLink ? productLink.split('?')[0].split('/') : null;
                // const shoppingId = idArray ? idArray[idArray.length - 1] : null;

                console.log("Item ;", item)

                const elemReviews = item.querySelector('.a-section.a-spacing-none.a-spacing-top-micro .a-row.a-size-small')
                console.log("Item div ;", elemReviews)

                let reviewsScore = 0
                let reviewsCount = 0

                if (elemReviews) {

                    const elemScore = elemReviews.querySelector('.a-link-normal.s-underline-text.s-underline-link-text.s-link-style .a-declarative a')
                    const elemCount = elemReviews.querySelector('.a-link-normal.s-underline-text.s-underline-link-text.s-link-style span .a-link-normal.s-underline-text.s-underline-link-text.s-link-style')

                    console.log("Elem score", elemScore)
                    console.log("Elem count", elemCount)

                    if (elemScore && elemCount) {

                        // There must be reviews ...
                        // const n1 = parseFloat(numbers[0])
                        // const n2 = parseFloat(numbers[1])

                        const n1 = 0
                        const n2 = 0

                        if (n1 > 5 && n2 <= 5) {

                            reviewsScore = n2
                            reviewsCount = n1

                        } else if (n2 > 5 && n1 <= 5) {

                            reviewsScore = n1
                            reviewsCount = n2

                        } else {
                            // L'un des 2 n'est pas < 5 ... donc doute ...
                            // Seule possibilité : Les 2 sont < 5, puisque la note sur 5 ... ne peut être > 5 ... genious

                            // Le nb reviews est le 
                            const elemText = elemCount.textContent.replace(/\s+/g, '')
                            if (elemText.indexOf(n1) > -1) {
                                reviewsScore = n2
                                reviewsCount = n1
                            } else {
                                reviewsScore = n1
                                reviewsCount = n2
                            }
                        }
                    }

                }

                // FINAL OUTPUT OBJ
                const output = {
                    query,
                    type,
                    productName,
                    // productLink,
                    // price,
                    // description,
                    // merchantName,
                    // merchantLink,
                    // shoppingId,
                    reviewsScore,
                    reviewsCount,
                    positionOnSearchPage: i + 1,
                    // productDetails: item.querySelectorAll('.translate-content')[1]?.textContent.trim(),
                };

                data.push(output);
            }

            return data;
        },
        maxPostCount,
        query,
        savedItems,
    );

    await saveScreenshot(page)

    // ITERATING ITEMS TO EXTEND WITH USERS FUNCTION
    for (let item of data) {
        if (evaledFunc) {
            item = await applyFunction(page, evaledFunc, item);
        }

        await Apify.pushData(item);
        savedItems++;
    }
    log.info(`${Math.min(maxPostCount, resultsLength)} items on the page were successfully scraped.`);
};
