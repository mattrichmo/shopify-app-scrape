# Shopify App Store Scraper

A Node.js application that scrapes and collects detailed information about applications listed on the Shopify App Store.

## Features

- Fetches and parses the Shopify App Store sitemap
- Collects detailed information for each app, including:
  - Basic app information (name, icon, description, highlights)
  - Ratings and reviews
  - Pricing plans and details
  - Developer information
  - Launch date
  - Media assets (screenshots, videos)
  - Similar apps recommendations

## Data Output

The scraper generates several JSONL files in the `./data` directory:

- `apps.jsonl`: Raw list of app URLs from the sitemap
- `developers.jsonl`: Raw list of developer URLs from the sitemap
- `apps_detailed.jsonl`: Detailed information for each processed app
- `manifest.jsonl`: Record of processed URLs with timestamps
- `429.jsonl`: Failed requests due to rate limiting

## Installation

npm install

## Usage

node main.mjs


## Implementation Details

### Sitemap Processing
- Fetches the Shopify App Store sitemap from `apps.shopify.com/sitemap.xml`
- Parses XML using Cheerio to extract app and developer URLs
- Filters URLs to separate apps from developer pages

### App Data Collection
The scraper collects detailed information for each app through HTML parsing:

#### Basic Information
- App name from the hero section (`h1`)
- App icon URL from the hero image
- Description paragraphs from the app details section
- Key highlights from the dedicated highlights section

#### Ratings and Reviews
- Overall rating score
- Total number of reviews
- Star breakdown (1-5 stars with counts)

#### Pricing Information
- Extracts all pricing plans
- For each plan:
  - Plan name
  - Price amount
  - Billing interval
  - Feature list
  - Trial period information
- Currency information

#### Developer Details
- Developer name
- Website URL
- Physical address
- Privacy policy link
- FAQ link
- Support email

#### Media Assets
- Video embed URLs
- Screenshot URLs with alt text
- Similar apps recommendations

### Rate Limiting Protection
The scraper implements several measures to handle rate limiting:

- Processes apps in small batches (3 at a time seems to be the sweet spot)
- 5-second delay between batches
- Automatic retry mechanism for 429 responses
- Progressive timeout increases
- Failed requests logging

### Data Storage
- All data is stored in JSONL format for easy processing
- Maintains a manifest of processed URLs to support resume functionality
- Separate logging of rate-limited requests for later processing

## Example Data Structure


## Object Shape

```json
{
  "url": "https://apps.shopify.com/example",
  "basicInfo": {
    "name": "Example App",
    "icon": "https://cdn.shopify.com/example-icon.png",
    "description": [
      "Description paragraph 1",
      "Description paragraph 2"
    ],
    "highlights": [
      "Feature 1",
      "Feature 2"
    ]
  },
  "ratings": {
    "score": "4.8",
    "total": "1234",
    "breakdown": {
      "5 stars": 1000,
      "4 stars": 200,
      "3 stars": 34
    }
  },
  "pricing": {
    "plans": [
      {
        "name": "Basic",
        "price": "29.99",
        "interval": "month",
        "features": [
          "Feature 1",
          "Feature 2"
        ],
        "trial": "14-day free trial"
      }
    ],
    "currency": "USD"
  }
}
```



