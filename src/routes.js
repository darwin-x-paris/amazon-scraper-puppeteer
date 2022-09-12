const Apify = require('apify');

const {
    utils: { log },
} = Apify;
const { applyFunction, saveScreenshot } = require('./utils');

exports.SEARCH_PAGE = async (countryCode, page, request, query, requestQueue, maxPostCount, evaledFunc) => {
    // CHECK FOR SELECTOR
    let { savedItems, pageNumber } = request.userData;
    const { hostname } = request.userData;

    console.log("Query :", query)

    // await page.$eval('input[name=field-keywords]', el => el.value = query);
    // await page.click('input#nav-search-submit-button');

    await page.waitForSelector('div.s-main-slot.s-result-list.s-search-results.sg-row');

    const resultsLength = await page.evaluate(() => {
        return document.querySelector('div.s-main-slot.s-result-list.s-search-results.sg-row').children.length;
    });


    // check HTML if page has no results
    if (resultsLength === 0) {
        log.warning('The page has no results. Check dataset for more info.');

        await Apify.pushData({
            '#debug': Apify.utils.createRequestDebugInfo(request),
        });
    }


    log.info(`Found ${resultsLength} products on the page.`);

    const dataLog = await page.evaluate(
        (countryCode, maxPostCount, query, savedItems) => {
            // nodes with items
            return document.querySelector("div.s-main-slot.s-result-list.s-search-results.sg-row div.a-section.a-spacing-base h2")?.textContent;
        })

    log.info(`Found ${dataLog} `);

    // eslint-disable-next-line no-shadow
    const data = await page.evaluate(
        (countryCode, maxPostCount, query, savedItems) => {

            const data = [];

            // Ads :
            let ads = document.querySelectorAll('*[data-avar="deal"]')
            for (let ad of ads) {

                let productName = ''

                const adImage = ad.querySelector('img')
                if (adImage) {
                    productName = adImage.getAttribute('alt')
                }

                const output = {
                    countryCode,
                    query,
                    type: 'ad-front',
                    productName,
                    // productLink,
                    // price,
                    // description,
                    // merchantName,
                    // merchantLink,
                    // shoppingId,
                    reviewsScore: '',
                    reviewsCount: '',
                    dealOfTheDay: '',
                    priceReduced: '',
                    bestSeller: '',
                    reductionCoupon: '',
                    bestDeal: '',
                    isPrime: '',
                    hasVideo: '',
                    positionOnSearchPage: -1,
                    // productDetails: item.querySelectorAll('.translate-content')[1]?.textContent.trim(),
                };

                data.push(output);
            }

            //////>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
            let lstPostAds = document.querySelectorAll("._bXVsd_mbc_PQYo5 ._bXVsd_container_3aZDQ")
            for (let postAd of lstPostAds) {

                let productName = ''

                const nameElement = postAd.querySelector('span.a-truncate-full.a-offscreen')
                if (nameElement) {
                    productName = nameElement.textContent
                }

                const output = {
                    countryCode,
                    query,
                    type: 'adsLinkSearch',
                    productName,
                    // productLink,
                    // price,
                    // description,
                    // merchantName,
                    // merchantLink,
                    // shoppingId,
                    reviewsScore: '',
                    reviewsCount: '',
                    dealOfTheDay: '',
                    priceReduced: '',
                    bestSeller: '',
                    reductionCoupon: '',
                    bestDeal: '',
                    isPrime: '',
                    hasVideo: '',
                    positionOnSearchPage: -1,
                    // productDetails: item.querySelectorAll('.translate-content')[1]?.textContent.trim(),
                };

                data.push(output);
            }

            //////>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

            // nodes with items
            let results = Array.from(document.querySelectorAll(".s-card-container.s-overflow-hidden.aok-relative.s-card-border"));
            // let results = Array.from(document.querySelectorAll("div.s-main-slot.s-result-list.s-search-results.sg-row div.a-section.a-spacing-base"));

            // limit the results to be scraped, if maxPostCount exists
            if (maxPostCount) {
                results = results.slice(0, maxPostCount - savedItems);
            }

            // eslint-disable-next-line no-shadow

            // ITERATING NODES TO GET RESULTS
            for (let i = 0; i < results.length; i++) {
                // Please pay attention that "merchantMetrics" and "reviewsLink" were removed from the  "SEARCH" page.
                const item = results[i];
                // KEYS OF OUTPUT OBJ

                // console.log("Product", i)


                let type = 'result'
                const sponsoredElement = item.querySelector('span.s-sponsored-label-info-icon')
                if (sponsoredElement)
                    type = 'ad'

                const adElement = item.querySelector('.sbv-ad-feedback')
                if (adElement)
                    type = 'bigad'

                let hasVideo = false
                const videoElement = item.querySelector('.sbv-video-overlay')
                if (videoElement)
                    hasVideo = true

                let isPrime = false
                const primeElement = item.querySelector('.a-icon-prime')
                if (primeElement)
                    isPrime = true

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

                console.log("Element product :", item)


                let elemReviews = item.querySelector('div.a-section.a-spacing-small.puis-padding-left-small.puis-padding-right-small > div > div')
                console.log("Element reviews :", elemReviews)

                if (!elemReviews)
                    elemReviews = item.querySelector('div.a-section.a-spacing-small.puis-padding-left-small.puis-padding-right-small > div.a-section.a-spacing-none.a-spacing-top-micro')

                let reviewsScore = 0
                let reviewsCount = 0

                if (elemReviews) {

                    // ' > div:nth-child(21) > div > div > div > div > div.a-section.a-spacing-small.puis-padding-left-small.puis-padding-right-small > div:nth-child(2) > div > span:nth-child(1) > span > a'
                    const spanElements = elemReviews.querySelectorAll(':scope > span')
                    console.log("Span elements :", spanElements)

                    let elemScore = spanElements[0].getAttribute('aria-label').split(' ')[0]
                    let elemCount = spanElements[1].querySelector('a span').textContent

                    console.log("Elem score", elemScore)
                    console.log("Elem count", elemCount)

                    if (elemScore && elemCount) {

                        elemScore = elemScore.replace(',', '.')

                        console.log("Avant :", elemCount)
                        elemCount = elemCount.replace(',', '').replace('.', '').replace(/\s+/g, '')
                        console.log("Après :", elemCount)

                        // There must be reviews ...
                        reviewsScore = parseFloat(elemScore)
                        reviewsCount = parseInt(elemCount)
                    }
                }

                let dealOfTheDay = false
                let priceReduced = false
                let bestSeller = false
                let reductionCoupon = false
                let bestDeal = false
                const badgeElement = item.querySelector('span.a-badge')

                if (badgeElement) {

                    // span.a-badge :> Y'a un badge rouge ou orange
                    // span#DEAL_OF_THE_DAY_B019DWX2Y6 : Offre star
                    let dealOfTheDayElement = item.querySelector('span[id^=DEAL_OF_THE_DAY]')
                    if (dealOfTheDayElement) {
                        console.log("Found a deal of the day !")
                        dealOfTheDay = true
                    }
                    dealOfTheDayElement = item.querySelector('div[data-deal^=DEAL_OF_THE_DAY]')
                    if (dealOfTheDayElement) {
                        console.log("Found a deal of the day !")
                        dealOfTheDay = true
                    }



                    // span#DELIGHT_PRICING_B085Q4PZXT : Réduction due au vendeur
                    const priceReducedElement = item.querySelector('span[id^=DELIGHT_PRICING]')
                    if (priceReducedElement) {
                        console.log("Found a delight price !")
                        priceReduced = true
                    }

                    // span#B08FR1QNR1-best-seller : N°1 des ventes dans une catégorie
                    const bestSellerElement = item.querySelector('span[id$=best-seller]')
                    if (bestSellerElement) {
                        console.log("Found a best seller !")
                        bestSeller = true
                    }
                }


                const couponElement = item.querySelector('span.s-coupon-unclipped')
                // span.s-coupon-unclipped /> Y'a un coupon
                if (couponElement) {

                    // span.s-coupon-unclipped : % de réduction sur la plateforme ? Coupon dispo

                    // span#BEST_DEAL_B07M78FB87 : Offre à durée limitée
                    const bestDealElement = item.querySelector('span[id^=BEST_DEAL]')
                    if (bestDealElement) {
                        console.log("Found a best deal !")
                        bestDeal = true
                    }

                    // Si coupon mais pas best deal ... alors reduc ...
                    if (!bestDealElement) {
                        console.log("Found a reduction coupon !")
                        reductionCoupon = true
                    }
                }


                // FINAL OUTPUT OBJ
                const output = {
                    countryCode,
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
                    dealOfTheDay,
                    priceReduced,
                    bestSeller,
                    reductionCoupon,
                    bestDeal,
                    isPrime,
                    hasVideo,
                    positionOnSearchPage: i + 1,
                    // productDetails: item.querySelectorAll('.translate-content')[1]?.textContent.trim(),
                };

                data.push(output);

                // if (data.length > 5) break
            }

            return data;
        },
        countryCode,
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
