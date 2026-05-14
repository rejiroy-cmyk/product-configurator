const fs = require('fs');

const DATA_PATH = './custom-data.json';
const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));

// Mock productApps for the function to access the pool
const productApps = {
    zubehoer_pool: data.zubehoer_pool
};

// We will inject the actual autoLinkShowerAccessories function here
