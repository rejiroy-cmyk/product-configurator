#!/bin/bash
echo "Starting scrape..."
node st-scraper/scrape-duschtrennwand-services.js
echo "Scraping complete. Injecting into custom-data.json..."
node st-scraper/inject-duschtrennwand-services.js
echo "Injection complete."
