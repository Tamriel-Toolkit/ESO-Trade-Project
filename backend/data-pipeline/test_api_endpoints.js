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
                    resolve({ status: res.statusCode, headers: res.headers, data: JSON.parse(data) });
                } catch (e) {
                    resolve({ status: res.statusCode, headers: res.headers, raw: data });
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
                    resolve({ status: res.statusCode, headers: res.headers, data: JSON.parse(data) });
                } catch (e) {
                    resolve({ status: res.statusCode, headers: res.headers, raw: data });
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

        console.log("\n13. Testing SQLite persistent session with dynamic bypass token...");
        const devTokenRes = await httpGet('/api/auth/me', { 'Authorization': `Bearer ${bypassRes.data.token}` });
        console.log(`   Status: ${devTokenRes.status}, Dev User: @${devTokenRes.data.user?.username}`);
        if (devTokenRes.status !== 200 || devTokenRes.data.user?.id !== 1) {
            throw new Error(`Dev token authentication failed with status ${devTokenRes.status}`);
        }

        console.log("\n14. Testing POST /api/auth/logout (session revocation)...");
        const logoutRes = await httpPost('/api/auth/logout', {}, { 'Authorization': `Bearer ${loginRes.data.token}` });
        console.log(`   Status: ${logoutRes.status}, Success: ${logoutRes.data.success}`);
        if (logoutRes.status !== 200 || !logoutRes.data.success) {
            throw new Error(`Auth logout failed with status ${logoutRes.status}`);
        }

        console.log("\n15. Testing GET /api/auth/me with revoked session token (expect 401)...");
        const revokedRes = await httpGet('/api/auth/me', { 'Authorization': `Bearer ${loginRes.data.token}` });
        console.log(`   Status: ${revokedRes.status}, Error: ${revokedRes.data.error}`);
        if (revokedRes.status !== 401) {
            throw new Error(`Auth /me with revoked token returned status ${revokedRes.status}, expected 401`);
        }

        // Clean up test user
        if (createdUserId) {
            console.log(`\n16. Cleaning up ephemeral test user (ID: ${createdUserId})...`);
            const delRes = await httpDelete(`/api/dev/users/${createdUserId}`);
            console.log(`   Cleaned up test user: ${delRes.data?.success ? 'OK' : 'Error'}`);
        }

        console.log("\n17. Testing Rate Limiting headers on /api/ endpoints...");
        const rateCheck = await httpGet('/api/taxonomy');
        const limitHeader = rateCheck.headers['ratelimit-limit'];
        const remainingHeader = rateCheck.headers['ratelimit-remaining'];
        console.log(`   Status: ${rateCheck.status}, Limit Header: ${limitHeader || 'N/A'}, Remaining: ${remainingHeader || 'N/A'}`);
        if (rateCheck.status !== 200) {
            throw new Error(`Rate limit test failed on /api/taxonomy`);
        }

        console.log("\n18. Testing POST /api/characters/upload-gear and GET /api/characters/:id/profile with jewelry traits...");
        const gearUploadRes = await httpPost('/api/characters/upload-gear', {
            character_name: "TestHero",
            gear: [
                {
                    slot_id: 1, // Necklace
                    game_item_id: 1001,
                    item_name: "Necklace of the Sun",
                    item_link: "|H1:item:1001:364:50:5:22:0:0:0:0:0:0:0:0:0:0:0:0:0:0:0:0|h",
                    quality: 5,
                    trait_id: 22,
                    trait_name: "Arcane",
                    trait_description: "Increases Maximum Magicka by 870.",
                    set_name: "Silks of the Sun",
                    enchantment_description: "Adds 174 Spell Damage.\\nIncreases Magicka Recovery by 100."
                },
                {
                    slot_id: 11, // Ring 1
                    game_item_id: 1002,
                    item_name: "Ring of the Sun",
                    item_link: "|H1:item:1002:364:50:5:31:0:0:0:0:0:0:0:0:0:0:0:0:0:0:0:0|h",
                    quality: 5,
                    trait_id: 31,
                    trait_name: "Bloodthirsty",
                    trait_description: "Increases your Damage done against enemies under 25% Health by up to 350.",
                    set_name: "Silks of the Sun"
                },
                {
                    slot_id: 12, // Ring 2
                    game_item_id: 1003,
                    item_name: "Band of the Sun",
                    item_link: "|H1:item:1003:364:50:5:30:0:0:0:0:0:0:0:0:0:0:0:0:0:0:0:0|h",
                    quality: 5,
                    trait_id: 30,
                    trait_name: "Triune",
                    trait_description: "Increases Maximum Health, Magicka, and Stamina.",
                    set_name: "Silks of the Sun"
                },
                {
                    slot_id: 16, // Hands
                    game_item_id: 1004,
                    item_name: "Gloves of the Sun",
                    quality: 4,
                    trait_id: 18,
                    trait_name: "Divines",
                    trait_description: "Increases Mundus Stone effects by 9.1%.",
                    armor_rating: 1200
                }
            ]
        }, { 'Authorization': `Bearer ${bypassRes.data.token}` });
        console.log(`   Upload Status: ${gearUploadRes.status}, Success: ${gearUploadRes.data.success}`);
        if (gearUploadRes.status !== 200 || !gearUploadRes.data.success) {
            throw new Error(`Upload gear failed with status ${gearUploadRes.status}`);
        }

        const charProfileRes = await httpGet(`/api/characters/${gearUploadRes.data.character_id}/profile`);
        console.log(`   Profile Status: ${charProfileRes.status}, Character: ${charProfileRes.data.character?.name}`);
        const ring1 = charProfileRes.data.gear?.['11'];
        const ring2 = charProfileRes.data.gear?.['12'];
        const neck = charProfileRes.data.gear?.['1'];
        const hands = charProfileRes.data.gear?.['16'];

        if (!ring1 || ring1.trait_id !== 31 || ring1.trait_name !== "Bloodthirsty") {
            throw new Error(`Ring 1 trait not correctly mapped in profile: ${JSON.stringify(ring1)}`);
        }
        if (!ring2 || ring2.trait_id !== 30 || ring2.trait_name !== "Triune") {
            throw new Error(`Ring 2 trait not correctly mapped in profile: ${JSON.stringify(ring2)}`);
        }
        if (!neck || neck.trait_id !== 22 || neck.trait_name !== "Arcane" || !neck.trait_description) {
            throw new Error(`Necklace trait or description not correctly mapped in profile: ${JSON.stringify(neck)}`);
        }
        if (!hands || hands.slot_id !== 16 || hands.armor_rating !== 1200) {
            throw new Error(`Hands slot 16 not correctly mapped in profile: ${JSON.stringify(hands)}`);
        }
        console.log("   Jewelry traits & slot alignment successfully verified in profile!");

        console.log("\n19. Testing unauthenticated POST /api/market/upload-scans (expect 401)...");
        const unauthScanRes = await httpPost('/api/market/upload-scans', {
            server: "NA",
            listings: [{ game_item_id: 1001, price: 100, quantity: 1, guild_name: "Test Guild" }]
        });
        console.log(`   Status: ${unauthScanRes.status}, Error: ${unauthScanRes.data.error}`);
        if (unauthScanRes.status !== 401) {
            throw new Error(`Expected 401 for unauthenticated upload-scans, got ${unauthScanRes.status}`);
        }

        console.log("\n20. Testing unauthenticated POST /api/characters (expect 401)...");
        const unauthCharRes = await httpPost('/api/characters', { name: "HackerChar", class: "Nightblade" });
        console.log(`   Status: ${unauthCharRes.status}, Error: ${unauthCharRes.data.error}`);
        if (unauthCharRes.status !== 401) {
            throw new Error(`Expected 401 for unauthenticated character create, got ${unauthCharRes.status}`);
        }

        console.log("\n21. Testing authenticated POST /api/characters with User 1...");
        const authCharRes = await httpPost('/api/characters', {
            name: "BlakeHeroTest",
            class: "Sorcerer",
            level: 50,
            alliance: 2,
            master_crafter_unlocked: 1
        }, { 'Authorization': `Bearer ${bypassRes.data.token}` });
        console.log(`   Status: ${authCharRes.status}, Char ID: ${authCharRes.data.character?.id}`);
        if (authCharRes.status !== 200 || !authCharRes.data.character?.id) {
            throw new Error(`Failed to create character for User 1: ${JSON.stringify(authCharRes.data)}`);
        }
        const createdCharId = authCharRes.data.character.id;

        console.log("\n22. Testing IDOR protection: User 2 attempting to DELETE User 1's character (expect 403)...");
        const user2BypassRes = await httpPost('/api/dev/bypass-login', { user_id: 2 });
        const idorDeleteRes = await httpDelete(`/api/characters/${createdCharId}`, {
            'Authorization': `Bearer ${user2BypassRes.data.token}`
        });
        console.log(`   Status: ${idorDeleteRes.status}, Error: ${idorDeleteRes.data.error}`);
        if (idorDeleteRes.status !== 403) {
            throw new Error(`Expected 403 Forbidden for IDOR delete attempt, got ${idorDeleteRes.status}`);
        }

        console.log("\n23. Testing unauthenticated DELETE /api/characters/:id (expect 401)...");
        const unauthDelRes = await httpDelete(`/api/characters/${createdCharId}`);
        console.log(`   Status: ${unauthDelRes.status}, Error: ${unauthDelRes.data.error}`);
        if (unauthDelRes.status !== 401) {
            throw new Error(`Expected 401 for unauthenticated character delete, got ${unauthDelRes.status}`);
        }

        console.log("\n24. Testing authorized character deletion by owner (User 1)...");
        const authDelRes = await httpDelete(`/api/characters/${createdCharId}`, {
            'Authorization': `Bearer ${bypassRes.data.token}`
        });
        console.log(`   Status: ${authDelRes.status}, Success: ${authDelRes.data.success}`);
        if (authDelRes.status !== 200 || !authDelRes.data.success) {
            throw new Error(`Failed to delete character by owner: ${JSON.stringify(authDelRes.data)}`);
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
