import * as cheerio from 'cheerio';
import * as fs from 'fs/promises';



/* example output of app in sitemap.xml

  <url>
    <loc>https://apps.shopify.com/upload-lift</loc>
    <lastmod>2024-09-26</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>


  example output of developer in sitemap.xml    

    <url>
    <loc>https://apps.shopify.com/partners/matrix40</loc>
    <lastmod>2024-11-04</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>


*/


const appExample = {
    id: "",
    name: "",
    url: "",
    rating: {
        total: 3.8,
        stars: {
            5: 80,
            4: 10,
            3: 5,
            2: 2,
            1: 1
        }
    },
    reviews: [{
        date: "",
        name: "",
        location: "",
        timeUsingApp: "",
        stars: 0,
        reviewText: "",
        response: "",
    }],
    pricing: {},
    highlights: [],
    developer: {
        id: "",
        name: "",
        url: "",
    },
    categories: [],
    features: [],
    languages: [],

}


const parseAppData = async ($) => {
    console.log('Parsing app data...');
    
    const data = {
        basicInfo: {},        // Basic app info first
        ratings: {},          // Ratings and reviews second
        pricing: {},          // Pricing third
        developer: {},        // Developer info fourth
        launchDate: null,     // Launch info fifth
        media: {}             // Media assets last
    };
    
    const getText = (element, selector) => {
        const el = $(element).find(selector);
        return el.length ? el.text().trim() : null;
    };

    const cleanText = (text) => {
        if (!text) return null;
        return text
            .replace(/\s+/g, ' ') // Replace multiple spaces with single space
            .trim();
    };

    // Basic App Info
    const heroSection = $('#adp-hero');
    if (heroSection.length) {
        // Get description paragraphs
        const descriptionParagraphs = $('#app-details')
            .text()
            .split('\n')
            .map(cleanText)
            .filter(text => 
                text && 
                text !== 'more' && 
                text.length > 0
            );
        
        // Update highlights parsing to specifically target the highlights section
        const highlights = [];
        $('dl').each((_, dl) => {
            const $dl = $(dl);
            const title = $dl.find('dt').text().trim();
            
            if (title === 'Highlights') {
                $dl.find('dd span:not([role="img"])')
                    .each((_, el) => {
                        const text = $(el).text().trim();
                        if (text && text.length > 0) {
                            highlights.push(text);
                        }
                    });
            }
        });

        data.basicInfo = {
            name: getText(heroSection, 'h1'),
            icon: heroSection.find('figure img').first().attr('src'),
            description: descriptionParagraphs,
            highlights: highlights.length > 0 ? highlights : undefined
        };
    }

    // Rating Info
    const ratingSection = $('.app-reviews-metrics');
    if (ratingSection.length) {
        // Get overall rating score
        const ratingScore = ratingSection.find('[aria-label^="4"]').first().text().trim();
        const totalReviews = $('h2 .tw-text-body-md').text().replace(/[()]/g, '').trim();

        // Get star breakdown
        const starBreakdown = {};
        ratingSection.find('ul li').each((_, li) => {
            const $li = $(li);
            const stars = $li.find('.tw-mr-2xs').text().trim();
            const count = $li.find('a span').text().trim();
            starBreakdown[stars] = parseInt(count, 10);
        });

        data.ratings = {
            score: ratingScore,
            total: totalReviews,
            breakdown: starBreakdown
        };
    }

    // Developer Info
    const developerSection = $('section#adp-developer');
    if (developerSection.length) {
        data.developer = {
            name: getText(developerSection, 'a:first'),
            website: developerSection.find('a:contains("Website")').attr('href'),
            address: getText(developerSection, '.tw-text-fg-tertiary'),
            privacyPolicy: developerSection.find('a:contains("Privacy policy")').attr('href'),
            faq: developerSection.find('a:contains("FAQ")').attr('href'),
            supportEmail: $('[data-developer-support-email]').attr('data-developer-support-email')
        };
    }

    // Launch Info
    const launchSection = $('#adp-developer .tw-grid:last-child');
    if (launchSection.length) {
        data.launchDate = getText(launchSection, '.tw-text-fg-secondary');
    }

    // Media Assets
    const gallerySection = $('.gallery-component');
    if (gallerySection.length) {
        data.media = {
            video: gallerySection.find('iframe').attr('src'),
            screenshots: gallerySection.find('img[alt]:not([aria-hidden="true"])').map((_, img) => ({
                url: $(img).attr('src'),
                alt: $(img).attr('alt')
            })).get()
        };
    }

    // Similar Apps
    const similarAppsSection = $('#adp-similar-apps');
    if (similarAppsSection.length) {
        data.similarApps = similarAppsSection.find('[data-controller="app-card"]').map((_, card) => ({
            name: $(card).attr('data-app-card-name-value'),
            handle: $(card).attr('data-app-card-handle-value'),
            icon: $(card).attr('data-app-card-icon-url-value'),
            link: $(card).attr('data-app-card-app-link-value')
        })).get();
    }

    // Pricing Plans
    const pricingSection = $('[data-controller="pricing-component"]');
    if (pricingSection.length) {
        const pricingPlans = [];
        
        pricingSection.find('.app-details-pricing-plan-card').each((_, card) => {
            const $card = $(card);
            
            // Get plan name
            const name = $card.find('[data-test-id="name"]').text().trim();
            
            // Get price information
            const priceEl = $card.find('.app-details-pricing-format-group');
            const priceText = priceEl.find('.tw-text-heading-2xl').text().trim();
            const interval = priceEl.find('.tw-text-fg-tertiary').text().trim();
            
            // Get features
            const features = $card.find('[data-test-id="features"] li')
                .map((_, li) => $(li).text().trim())
                .get()
                .filter(text => text.length > 0);
            
            // Check if there's a trial period
            const trialText = $card.closest('div').find('.tw-bg-canvas-tertiary').text().trim();
            
            pricingPlans.push({
                name,
                price: priceText === 'Free' ? '0' : priceText.replace('$', ''),
                interval: interval.replace('/ ', '').trim(),
                features,
                trial: trialText || null
            });
        });
        
        data.pricing = {
            plans: pricingPlans,
            currency: 'USD' // This appears to be hardcoded in the pricing section
        };
    }

    console.log('Finished parsing app data');
    return data;
};
const saveToJsonlFile = async (objects, filePath) => {
    try {
        // Create directory if it doesn't exist
        await fs.mkdir('./data', { recursive: true });
        
        // Convert each object to JSONL format and join with newlines
        const jsonlContent = objects
            .map(obj => JSON.stringify(obj))
            .join('\n');
        
        // Write to file
        await fs.writeFile(filePath, jsonlContent);
        console.log(`Successfully saved ${objects.length} items to ${filePath}`);
    } catch (error) {
        console.error(`Error saving to ${filePath}:`, error);
    }
};
const appendToJsonlFile = async (object, filePath) => {
    try {
        // Create directory if it doesn't exist
        await fs.mkdir('./data', { recursive: true });
        
        // Convert object to JSONL format with newline
        const jsonlLine = JSON.stringify(object) + '\n';
        
        // Append to file
        await fs.appendFile(filePath, jsonlLine);
        console.log(`Successfully appended item to ${filePath}`);
    } catch (error) {
        console.error(`Error appending to ${filePath}:`, error);
    }
};
const getAppData = async (apps) => {
    console.log(`Starting to process ${apps.length} apps...`);

    const batchSize = 5;
    const results = [];
    
    for (let i = 0; i < apps.length; i += batchSize) {
        const batch = apps.slice(i, i + batchSize);
        console.log(`\nProcessing batch ${i/batchSize + 1} of ${Math.ceil(apps.length/batchSize)}`);
        
        let retryApps = batch;
        let retryTimeout = 10000; // Start with 10 second timeout
        let maxRetries = 5;
        let retryCount = 0;

        while (retryApps.length > 0 && retryCount < maxRetries) {
            if (retryCount > 0) {
                console.log(`Retry attempt ${retryCount} for ${retryApps.length} apps with ${retryTimeout/1000}s timeout...`);
                await new Promise(resolve => setTimeout(resolve, retryTimeout));
            }

            try {
                const batchResults = await Promise.all(
                    retryApps.map(async (app) => {
                        try {
                            console.log(`Processing app: ${app.url}`);
                            const response = await fetch(app.url);
                            
                            if (response.status === 429) {
                                console.log(`Rate limit (429) hit for ${app.url}`);
                                return { status: 429, app };
                            }
                            
                            if (!response.ok) {
                                throw new Error(`HTTP error! status: ${response.status}`);
                            }
                            
                            const html = await response.text();
                            const $ = cheerio.load(html);
                            const appData = await parseAppData($);
                            
                            if (!appData.basicInfo || !appData.basicInfo.name) {
                                console.error(`Failed to parse essential data for ${app.url}`);
                                return { status: 'error', app };
                            }

                            // Create new object with URL first, then spread the rest
                            const finalAppData = {
                                url: app.url,
                                ...appData
                            };

                            await appendToJsonlFile(finalAppData, './data/apps_detailed.jsonl');
                            console.log(`Successfully processed: ${appData.basicInfo.name}`);
                            return { status: 'success', data: finalAppData };
                        } catch (error) {
                            console.error(`Error processing ${app.url}:`, error);
                            return { status: 'error', app };
                        }
                    })
                );
                
                // Separate results
                const successfulResults = batchResults
                    .filter(result => result.status === 'success')
                    .map(result => result.data);
                
                results.push(...successfulResults);

                // Collect apps that need to be retried (429s only)
                retryApps = batchResults
                    .filter(result => result.status === 429)
                    .map(result => result.app);

                console.log(`Batch progress: ${successfulResults.length} successful, ${retryApps.length} need retry`);

                if (retryApps.length > 0) {
                    retryTimeout += 5000; // Increase timeout by 5 seconds each retry
                    retryCount++;
                }

                // If we've hit max retries and still have failed items, save them to 429.jsonl
                if (retryCount === maxRetries && retryApps.length > 0) {
                    console.log(`Saving ${retryApps.length} failed items to 429.jsonl`);
                    for (const failedApp of retryApps) {
                        await appendToJsonlFile({
                            url: failedApp.url,
                            failedAt: new Date().toISOString(),
                            attempts: maxRetries
                        }, './data/429.jsonl');
                    }
                }
            } catch (error) {
                console.error(`Error processing batch:`, error);
                retryCount++;
            }
        }

        // Add delay before next batch if there are more batches
        if (i + batchSize < apps.length) {
            const batchDelay = 5000; // 5 second delay between batches
            console.log(`Waiting ${batchDelay/1000}s before next batch...`);
            await new Promise(resolve => setTimeout(resolve, batchDelay));
        }
    }
    
    console.log(`\nFinished processing ${results.length}/${apps.length} apps successfully`);
    return results;
};
const getSitemapLinks = async (sitemap) => {
    const data = {
        apps: [],
        developers: []
    }
    
    try {
        console.log('Fetching sitemap from:', sitemap);
        const response = await fetch(sitemap);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const xml = await response.text();
        console.log('Successfully fetched XML, parsing...');
        
        const $ = cheerio.load(xml, {
            xmlMode: true
        });
        
        $('url').each((_, element) => {
            try {
                const locElement = $(element).find('loc');
                const url = locElement.text();
                
                if (!url || typeof url !== 'string') {
                    console.warn('Skipping invalid URL element');
                    return;
                }
                
                if (!url.includes('apps.shopify.com/')) {
                    return;
                }
                
                if (url.includes('/partners/')) {
                    data.developers.push({
                        url
                    });
                } else {
                    data.apps.push({
                        url,
                    });
                }
            } catch (parseError) {
                console.error('Error parsing URL:', parseError);
            }
        });
        
        console.log(`Processed:
        - Apps: ${data.apps.length}
        - Developers: ${data.developers.length}`);
        
    } catch (error) {
        console.error('Error fetching or parsing sitemap:', error);
    }

    return data;
};

const main = async () => {
    const sitemap = "https://apps.shopify.com/sitemap.xml"
    
    // Get sitemap data
    const data = await getSitemapLinks(sitemap);
    
    // Save raw URLs to JSONL files
    await saveToJsonlFile(data.apps, './data/apps.jsonl');
    await saveToJsonlFile(data.developers, './data/developers.jsonl');
    
    // Continue with app data fetching
    await getAppData(data.apps);
    // Removed the final saveToJsonlFile call since we're saving as we go
};


main();

