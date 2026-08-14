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

function httpGet(path, headers = {}) {
    return new Promise((resolve, reject) => {
        http.get(`http://localhost:${PORT}${path}`, { headers }, (res) => {
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

function httpPost(path, body = {}, headers = {}) {
    return new Promise((resolve, reject) => {
        const payload = JSON.stringify(body);
        const req = http.request(`http://localhost:${PORT}${path}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload),
                ...headers
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, data: JSON.parse(data) });
                } catch (e) {
                    resolve({ status: res.statusCode, raw: data });
                }
            });
        });
        req.on('error', err => reject(err));
        req.write(payload);
        req.end();
    });
}

function httpDelete(path, headers = {}) {
    return new Promise((resolve, reject) => {
        const req = http.request(`http://localhost:${PORT}${path}`, {
            method: 'DELETE',
            headers
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, data: JSON.parse(data) });
                } catch (e) {
                    resolve({ status: res.statusCode, raw: data });
                }
            });
        });
        req.on('error', err => reject(err));
        req.end();
    });
}

async function runTests() {
    // Wait 1.5s for server to start
    await new Promise(r => setTimeout(r, 1500));

    let createdUserId = null;

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

        console.log("\n5. Testing POST /api/market/listings/purge-expired...");
        const purgeRes = await httpPost('/api/market/listings/purge-expired');
        console.log(`   Status: ${purgeRes.status}, Purge Result: ${JSON.stringify(purgeRes.data)}`);
        if (purgeRes.status !== 200 || !purgeRes.data.success) {
            throw new Error(`TTL Purge endpoint failed with status ${purgeRes.status}`);
        }

        console.log("\n6. Testing POST /api/auth/register (bcrypt salted hashing)...");
        const testUser = {
            username: `BcryptTester_${Date.now()}`,
            email: `tester_${Date.now()}@tamriel.trade`,
            password: "SecurePassword123!",
            eso_handle: `@BcryptTester`
        };
        const regRes = await httpPost('/api/auth/register', testUser);
        console.log(`   Status: ${regRes.status}, Success: ${regRes.data.success}, Token: ${regRes.data.token?.substring(0, 20)}...`);
        if (regRes.status !== 200 || !regRes.data.token) {
            throw new Error(`Auth register failed with status ${regRes.status}`);
        }
        createdUserId = regRes.data.user?.id;

        console.log("\n7. Testing POST /api/auth/login with valid bcrypt credentials...");
        const loginRes = await httpPost('/api/auth/login', {
            usernameOrEmail: testUser.username,
            password: testUser.password
        });
        console.log(`   Status: ${loginRes.status}, User: @${loginRes.data.user?.username}`);
        if (loginRes.status !== 200 || !loginRes.data.token) {
            throw new Error(`Auth login failed with status ${loginRes.status}`);
        }

        console.log("\n8. Testing POST /api/auth/login with invalid password (expect 401)...");
        const badLoginRes = await httpPost('/api/auth/login', {
            usernameOrEmail: testUser.username,
            password: "WrongPassword456!"
        });
        console.log(`   Status: ${badLoginRes.status}, Error: ${badLoginRes.data.error}`);
        if (badLoginRes.status !== 401) {
            throw new Error(`Auth login with bad password returned status ${badLoginRes.status}, expected 401`);
        }

        console.log("\n9. Testing GET /api/auth/me with session token...");
        const meRes = await httpGet('/api/auth/me', { 'Authorization': `Bearer ${loginRes.data.token}` });
        console.log(`   Status: ${meRes.status}, Authenticated user: @${meRes.data.user?.username}`);
        if (meRes.status !== 200 || meRes.data.user?.username !== testUser.username) {
            throw new Error(`Auth /me failed with status ${meRes.status}`);
        }

        console.log("\n10. Testing Legacy SHA-256 account login & automatic bcrypt migration...");
        const legacyLoginRes = await httpPost('/api/auth/login', {
            usernameOrEmail: "Blake",
            password: "password123"
        });
        console.log(`   Status: ${legacyLoginRes.status}, User: @${legacyLoginRes.data.user?.username}`);
        if (legacyLoginRes.status !== 200 || !legacyLoginRes.data.token) {
            throw new Error(`Legacy user login failed with status ${legacyLoginRes.status}`);
        }

        console.log("\n11. Testing GET /api/auth/me with invalid/unauthorized token (expect 401)...");
        const badTokenRes = await httpGet('/api/auth/me', { 'Authorization': 'Bearer bogus-random-token-xyz' });
        console.log(`   Status: ${badTokenRes.status}, Error: ${badTokenRes.data.error}`);
        if (badTokenRes.status !== 401) {
            throw new Error(`Auth /me with bogus token returned status ${badTokenRes.status}, expected 401`);
        }

        console.log("\n12. Testing POST /api/dev/bypass-login in non-production mode...");
        const bypassRes = await httpPost('/api/dev/bypass-login', { user_id: 1 });
        console.log(`   Status: ${bypassRes.status}, Bypassed user: @${bypassRes.data.user?.username}`);
        if (bypassRes.status !== 200 || !bypassRes.data.token) {
            throw new Error(`Dev bypass login failed with status ${bypassRes.status}`);
        }

        // Clean up test user
        if (createdUserId) {
            console.log(`\n13. Cleaning up ephemeral test user (ID: ${createdUserId})...`);
            const delRes = await httpDelete(`/api/dev/users/${createdUserId}`);
            console.log(`   Cleaned up test user: ${delRes.data?.success ? 'OK' : 'Error'}`);
        }

        console.log("\nAll API endpoint tests passed successfully!");
    } catch (err) {
        console.error("API test failed:", err);
        process.exitCode = 1;
    } finally {
        serverProcess.kill();
        process.exit(process.exitCode || 0);
    }
}

runTests();
