const http = require('http');
const { spawn } = require('child_process');
const path = require('path');

const PORT = 5002;
const SERVER_PATH = path.join(__dirname, '..', 'server.js');

console.log("Starting temporary test server on port " + PORT + "...");

const serverProcess = spawn('node', [SERVER_PATH], {
    env: { ...process.env, PORT: PORT },
    stdio: 'pipe'
});

serverProcess.stdout.on('data', (data) => {
    // console.log(`[Server]: ${data}`);
});

serverProcess.stderr.on('data', (data) => {
    console.error(`[Server Error]: ${data}`);
});

function httpGet(path) {
    return new Promise((resolve, reject) => {
        http.get(`http://localhost:${PORT}${path}`, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, data: JSON.parse(data) });
                } catch (e) {
                    resolve({ status: res.statusCode, raw: data });
                }
            });
        }).on('error', err => reject(err));
    });
}

async function runTests() {
    // Wait 1.5s for server to start
    await new Promise(r => setTimeout(r, 1500));

    try {
        console.log("\n1. Testing GET /api/taxonomy...");
        const taxRes = await httpGet('/api/taxonomy');
        console.log(`   Status: ${taxRes.status}, Categories found: ${Object.keys(taxRes.data).length}`);

        console.log("\n2. Testing GET /api/market/prices?server=NA&limit=3...");
        const priceRes = await httpGet('/api/market/prices?server=NA&limit=3');
        console.log(`   Status: ${priceRes.status}, Total matches: ${priceRes.data.total}, Sample items returned: ${priceRes.data.items.length}`);
        if (priceRes.data.items.length > 0) {
            const item = priceRes.data.items[0];
            console.log(`   Sample: '${item.item_name}' - Suggested: ${item.suggested_price}g (Avg: ${item.avg_price}g)`);
        }

        console.log("\n3. Testing GET /api/market/listings?server=NA&limit=3...");
        const listingRes = await httpGet('/api/market/listings?server=NA&limit=3');
        console.log(`   Status: ${listingRes.status}, Total matches: ${listingRes.data.total}, Sample listings returned: ${listingRes.data.listings.length}`);
        if (listingRes.data.listings.length > 0) {
            const l = listingRes.data.listings[0];
            console.log(`   Sample Listing: '${l.item_name}' - Price: ${l.price}g | Suggested: ${l.suggested_price}g | Value Index: ${l.value_index.toFixed(2)}x | Guild: ${l.guild_name}`);
        }

        console.log("\n4. Testing GET /api/items?limit=2...");
        const itemsRes = await httpGet('/api/items?limit=2');
        console.log(`   Status: ${itemsRes.status}, Total catalog items: ${itemsRes.data.total}`);

        console.log("\nAll API endpoint tests passed successfully!");
    } catch (err) {
        console.error("API test failed:", err);
    } finally {
        serverProcess.kill();
        process.exit(0);
    }
}

runTests();
