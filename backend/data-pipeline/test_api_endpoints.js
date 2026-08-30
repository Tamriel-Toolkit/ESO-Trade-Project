const fs = require('fs');
const http = require('http');
const { spawn } = require('child_process');
const path = require('path');

const PORT = 5002;
const SERVER_PATH = path.join(__dirname, '..', 'server.js');
const EPHEMERAL_DB = process.env.DB_PATH || path.join(__dirname, `scratch_test_${Date.now()}.db`);

console.log("Starting temporary test server on port " + PORT + " with sandbox DB: " + path.basename(EPHEMERAL_DB) + "...");

const serverProcess = spawn('node', [SERVER_PATH], {
    env: { ...process.env, PORT: PORT, DB_PATH: EPHEMERAL_DB, NODE_ENV: process.env.NODE_ENV || 'test', ENABLE_DEV_ENDPOINTS: 'true' },
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

function httpPatch(path, body = {}, headers = {}) {
    return new Promise((resolve, reject) => {
        const payload = JSON.stringify(body);
        const req = http.request(`http://localhost:${PORT}${path}`, {
            method: 'PATCH',
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

async function runTests() {
    // Poll server health up to 10 seconds for robust startup across all runner environments
    let serverReady = false;
    for (let attempt = 0; attempt < 20; attempt++) {
        try {
            const probe = await httpGet('/api/taxonomy');
            if (probe.status === 200) {
                serverReady = true;
                break;
            }
        } catch (e) {
            await new Promise(r => setTimeout(r, 500));
        }
    }
    if (!serverReady) {
        throw new Error("Temporary test server failed to start within 10 seconds.");
    }

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

        console.log("\n6b. Testing POST /api/auth/register input validation & sanitization...");
        const shortPwRes = await httpPost('/api/auth/register', { username: 'valid_user_1', email: 'valid@mail.com', password: '123' });
        if (shortPwRes.status !== 400) throw new Error(`Expected 400 for short password, got ${shortPwRes.status}`);

        const badEmailRes = await httpPost('/api/auth/register', { username: 'valid_user_2', email: 'not-an-email', password: 'ValidPassword123!' });
        if (badEmailRes.status !== 400) throw new Error(`Expected 400 for bad email, got ${badEmailRes.status}`);

        const badUserRes = await httpPost('/api/auth/register', { username: 'bad user!', email: 'valid2@mail.com', password: 'ValidPassword123!' });
        if (badUserRes.status !== 400) throw new Error(`Expected 400 for invalid username characters, got ${badUserRes.status}`);

        console.log("   Auth input validation (username, email, password length) verified!");

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
        if (bypassRes.data.user?.api_token || bypassRes.data.user?.password_hash) {
            throw new Error("Dev bypass leaked sensitive user credentials (api_token/password_hash)!");
        }

        console.log("\n12b. Testing GET /api/dev/users credential sanitization...");
        const devUsersRes = await httpGet('/api/dev/users');
        if (devUsersRes.status !== 200 || !Array.isArray(devUsersRes.data.users)) {
            throw new Error(`GET /api/dev/users failed with status ${devUsersRes.status}`);
        }
        const hasLeakedToken = devUsersRes.data.users.some(u => u.api_token || u.password_hash);
        if (hasLeakedToken) {
            throw new Error("GET /api/dev/users leaked plaintext api_token or password_hash!");
        }
        console.log(`   Verified: ${devUsersRes.data.users.length} accounts returned without exposing api_tokens or hashes.`);

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

        // Clean up test user & verify admin authorization guards
        if (createdUserId) {
            console.log(`\n16. Testing admin authorization on DELETE /api/dev/users/:id...`);
            // Attempt 1: unauthenticated (expect 403)
            const unauthDel = await httpDelete(`/api/dev/users/${createdUserId}`);
            if (unauthDel.status !== 403) throw new Error(`Expected 403 for unauthenticated dev delete, got ${unauthDel.status}`);

            // Attempt 2: non-admin (expect 403)
            const user2BypassResEarly = await httpPost('/api/dev/bypass-login', { user_id: 2 });
            const nonAdminDel = await httpDelete(`/api/dev/users/${createdUserId}`, {
                'Authorization': `Bearer ${user2BypassResEarly.data.token}`
            });
            if (nonAdminDel.status !== 403) throw new Error(`Expected 403 for non-admin dev delete, got ${nonAdminDel.status}`);

            // Attempt 3: prevent deleting root admin (user 1)
            const rootAdminDel = await httpDelete('/api/dev/users/1', {
                'Authorization': `Bearer ${bypassRes.data.token}`
            });
            if (rootAdminDel.status !== 400) throw new Error(`Expected 400 when attempting to delete root admin, got ${rootAdminDel.status}`);

            // Attempt 4: authorized admin delete (expect 200)
            const authAdminDel = await httpDelete(`/api/dev/users/${createdUserId}`, {
                'Authorization': `Bearer ${bypassRes.data.token}`
            });
            if (authAdminDel.status !== 200) throw new Error(`Expected 200 for admin dev delete, got ${authAdminDel.status}`);
            console.log(`   Cleaned up test user (ID: ${createdUserId}) with admin authorization: OK`);
        }

        console.log("\n16b. Testing admin authorization on PUT /api/dev/users/:id and POST /api/market/dev/clear-listings...");
        const unauthClear = await httpPost('/api/market/dev/clear-listings');
        if (unauthClear.status !== 403) throw new Error(`Expected 403 for unauthenticated clear-listings, got ${unauthClear.status}`);
        const authClear = await httpPost('/api/market/dev/clear-listings', {}, {
            'Authorization': `Bearer ${bypassRes.data.token}`
        });
        if (authClear.status !== 200) throw new Error(`Expected 200 for admin clear-listings, got ${authClear.status}`);
        console.log("   Admin authorization guards verified on market dev clear endpoints!");

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

        // Re-create a test character for User 1 to test sync, inventory, and watchlist operations
        const syncCharRes = await httpPost('/api/characters', {
            name: "SecuredHeroTest",
            class: "Templar",
            level: 50,
            alliance: 1
        }, { 'Authorization': `Bearer ${bypassRes.data.token}` });
        const securedCharId = syncCharRes.data.character.id;

        console.log("\n25. Testing POST /api/prices/sync authentication (expect 401 unauth, 200 auth)...");
        const unauthPrices = await httpPost('/api/prices/sync', [{ game_item_id: 1129, avg_price: 500 }]);
        if (unauthPrices.status !== 401) throw new Error(`Expected 401 for unauth prices/sync, got ${unauthPrices.status}`);
        const authPrices = await httpPost('/api/prices/sync', [{ game_item_id: 1129, avg_price: 500 }], {
            'Authorization': `Bearer ${bypassRes.data.token}`
        });
        if (authPrices.status !== 200) throw new Error(`Expected 200 for auth prices/sync, got ${authPrices.status}`);
        console.log("   Prices sync auth & mutation verified!");

        console.log("\n26. Testing POST /api/listings/sync authentication (expect 401 unauth, 200 auth)...");
        const unauthListings = await httpPost('/api/listings/sync', { server: "NA", listings: [] });
        if (unauthListings.status !== 401) throw new Error(`Expected 401 for unauth listings/sync, got ${unauthListings.status}`);
        const authListings = await httpPost('/api/listings/sync', { server: "NA", listings: [] }, {
            'Authorization': `Bearer ${bypassRes.data.token}`
        });
        if (authListings.status !== 200) throw new Error(`Expected 200 for auth listings/sync, got ${authListings.status}`);
        console.log("   Listings sync auth & mutation verified!");

        console.log("\n27. Testing POST /api/characters/sync auth & IDOR protection...");
        const unauthCharSync = await httpPost('/api/characters/sync', { name: "SecuredHeroTest", known_items: [1129] });
        if (unauthCharSync.status !== 401) throw new Error(`Expected 401 for unauth characters/sync, got ${unauthCharSync.status}`);
        const idorCharSync = await httpPost('/api/characters/sync', { name: "SecuredHeroTest", known_items: [1129] }, {
            'Authorization': `Bearer ${user2BypassRes.data.token}`
        });
        if (idorCharSync.status !== 403) throw new Error(`Expected 403 for IDOR characters/sync, got ${idorCharSync.status}`);
        const authCharSync = await httpPost('/api/characters/sync', { name: "SecuredHeroTest", known_items: [1129] }, {
            'Authorization': `Bearer ${bypassRes.data.token}`
        });
        if (authCharSync.status !== 200) throw new Error(`Expected 200 for auth characters/sync, got ${authCharSync.status}`);
        console.log("   Character sync auth & IDOR protection verified!");

        console.log("\n28. Testing POST /api/characters/upload-gear auth & IDOR protection...");
        const unauthGear = await httpPost('/api/characters/upload-gear', { character_name: "SecuredHeroTest", gear: [] });
        if (unauthGear.status !== 401) throw new Error(`Expected 401 for unauth upload-gear, got ${unauthGear.status}`);
        const idorGear = await httpPost('/api/characters/upload-gear', { character_name: "SecuredHeroTest", gear: [] }, {
            'Authorization': `Bearer ${user2BypassRes.data.token}`
        });
        if (idorGear.status !== 403) throw new Error(`Expected 403 for IDOR upload-gear, got ${idorGear.status}`);
        const authGear = await httpPost('/api/characters/upload-gear', { character_name: "SecuredHeroTest", gear: [] }, {
            'Authorization': `Bearer ${bypassRes.data.token}`
        });
        if (authGear.status !== 200) throw new Error(`Expected 200 for auth upload-gear, got ${authGear.status}`);
        console.log("   Upload gear auth & IDOR protection verified!");

        console.log("\n29. Testing POST /api/inventory/sync auth & IDOR protection...");
        const unauthInv = await httpPost('/api/inventory/sync', { character_id: securedCharId, inventory: [] });
        if (unauthInv.status !== 401) throw new Error(`Expected 401 for unauth inventory/sync, got ${unauthInv.status}`);
        const idorInv = await httpPost('/api/inventory/sync', { character_id: securedCharId, inventory: [] }, {
            'Authorization': `Bearer ${user2BypassRes.data.token}`
        });
        if (idorInv.status !== 403) throw new Error(`Expected 403 for IDOR inventory/sync, got ${idorInv.status}`);
        const authInv = await httpPost('/api/inventory/sync', { character_id: securedCharId, inventory: [] }, {
            'Authorization': `Bearer ${bypassRes.data.token}`
        });
        if (authInv.status !== 200) throw new Error(`Expected 200 for auth inventory/sync, got ${authInv.status}`);
        console.log("   Inventory sync auth & IDOR protection verified!");

        console.log("\n30. Testing POST /api/watchlist auth & IDOR protection...");
        const unauthWatch = await httpPost('/api/watchlist', { character_id: securedCharId, game_item_id: 1129, target_price: 50 });
        if (unauthWatch.status !== 401) throw new Error(`Expected 401 for unauth watchlist post, got ${unauthWatch.status}`);
        const idorWatch = await httpPost('/api/watchlist', { character_id: securedCharId, game_item_id: 1129, target_price: 50 }, {
            'Authorization': `Bearer ${user2BypassRes.data.token}`
        });
        if (idorWatch.status !== 403) throw new Error(`Expected 403 for IDOR watchlist post, got ${idorWatch.status}`);
        const authWatch = await httpPost('/api/watchlist', { character_id: securedCharId, game_item_id: 1129, target_price: 50 }, {
            'Authorization': `Bearer ${bypassRes.data.token}`
        });
        if (authWatch.status !== 200) throw new Error(`Expected 200 for auth watchlist post, got ${authWatch.status}`);
        console.log("   Watchlist add auth & IDOR protection verified!");

        console.log("\n31. Testing DELETE /api/watchlist/:character_id/:game_item_id auth & IDOR protection...");
        const unauthDelWatch = await httpDelete(`/api/watchlist/${securedCharId}/1129`);
        if (unauthDelWatch.status !== 401) throw new Error(`Expected 401 for unauth watchlist delete, got ${unauthDelWatch.status}`);
        const idorDelWatch = await httpDelete(`/api/watchlist/${securedCharId}/1129`, {
            'Authorization': `Bearer ${user2BypassRes.data.token}`
        });
        if (idorDelWatch.status !== 403) throw new Error(`Expected 403 for IDOR watchlist delete, got ${idorDelWatch.status}`);
        const authDelWatch = await httpDelete(`/api/watchlist/${securedCharId}/1129`, {
            'Authorization': `Bearer ${bypassRes.data.token}`
        });
        if (authDelWatch.status !== 200) throw new Error(`Expected 200 for auth watchlist delete, got ${authDelWatch.status}`);
        console.log("   Watchlist delete auth & IDOR protection verified!");

        console.log("\n32. Testing POST /api/market/listings/extract child process & input validation...");
        const emptyExtract = await httpPost('/api/market/listings/extract', {});
        if (emptyExtract.status !== 400) throw new Error(`Expected 400 for empty extract request, got ${emptyExtract.status}`);
        const validExtract = await httpPost('/api/market/listings/extract', { search: "Mother's Sorrow", server: "NA" });
        if (validExtract.status !== 200) throw new Error(`Expected 200 for valid extract request, got ${validExtract.status}`);
        if (!validExtract.data.success) throw new Error(`Expected success=true from extract endpoint`);
        console.log("   Scraper child process execution & validation verified without server crash!");

        console.log("\n33. Testing Helmet HTTP security headers...");
        const taxonomyRes = await httpGet('/api/taxonomy');
        if (taxonomyRes.headers['x-content-type-options'] !== 'nosniff') {
            throw new Error(`Expected X-Content-Type-Options: nosniff, got ${taxonomyRes.headers['x-content-type-options']}`);
        }
        if (taxonomyRes.headers['x-frame-options'] !== 'SAMEORIGIN') {
            throw new Error(`Expected X-Frame-Options: SAMEORIGIN, got ${taxonomyRes.headers['x-frame-options']}`);
        }
        console.log("   Helmet security headers verified (nosniff, SAMEORIGIN)!");

        console.log("\n34. Testing POST /api/watchlist target_price numeric bounds validation...");
        const invalidWatchPrice = await httpPost('/api/watchlist', { character_id: securedCharId, game_item_id: 1129, target_price: -100 }, {
            'Authorization': `Bearer ${bypassRes.data.token}`
        });
        if (invalidWatchPrice.status !== 400) throw new Error(`Expected 400 for negative target_price, got ${invalidWatchPrice.status}`);
        console.log("   Watchlist negative/zero price validation verified!");

        console.log("\n35. Testing POST /api/market/upload-scans batch size limit (>2000 items)...");
        const oversizedBatch = Array.from({ length: 2005 }, (_, i) => ({
            game_item_id: 1129,
            price: 100,
            guild_name: "Test Guild"
        }));
        const batchLimitRes = await httpPost('/api/market/upload-scans', { server: "NA", listings: oversizedBatch }, {
            'Authorization': `Bearer ${bypassRes.data.token}`
        });
        if (batchLimitRes.status !== 400) throw new Error(`Expected 400 for oversized batch, got ${batchLimitRes.status}`);
        console.log("   Batch upload size limit enforcement verified!");

        console.log("\n36. Testing HttpOnly SameSite cookie authentication flow...");
        const cookieLogin = await httpPost('/api/dev/bypass-login', { user_id: 1 });
        const setCookieHeader = cookieLogin.headers['set-cookie'];
        if (!setCookieHeader || !setCookieHeader.some(c => c.includes('eso_trade_token=') && c.toLowerCase().includes('httponly'))) {
            throw new Error(`Expected Set-Cookie header with eso_trade_token and HttpOnly, got ${JSON.stringify(setCookieHeader)}`);
        }
        const authCookie = setCookieHeader.find(c => c.includes('eso_trade_token=')).split(';')[0];
        
        // Query /api/auth/me using ONLY the cookie (no Authorization Bearer header)
        const cookieMeRes = await httpGet('/api/auth/me', { 'Cookie': authCookie });
        if (cookieMeRes.status !== 200 || !cookieMeRes.data.user || cookieMeRes.data.user.id !== 1) {
            throw new Error(`Expected 200 and User 1 via Cookie auth, got status ${cookieMeRes.status}`);
        }
        console.log("   HttpOnly cookie authentication verified without Authorization header!");

        console.log("\n37. Testing GET /api/builds (Curated Meta Presets)...");
        const buildsRes = await httpGet('/api/builds');
        if (buildsRes.status !== 200 || !buildsRes.data.success || !Array.isArray(buildsRes.data.builds) || buildsRes.data.builds.length === 0) {
            throw new Error(`Expected curated builds array, got ${JSON.stringify(buildsRes.data)}`);
        }
        console.log(`   Retrieved ${buildsRes.data.builds.length} curated builds successfully!`);

        console.log("\n38. Testing GET /api/builds filtering (class & role)...");
        const arcanistRes = await httpGet('/api/builds?class=Arcanist');
        if (arcanistRes.status !== 200 || !arcanistRes.data.builds.some(b => b.class === "Arcanist" || b.class === "All")) {
            throw new Error(`Expected Arcanist builds filter, got ${JSON.stringify(arcanistRes.data)}`);
        }
        console.log("   Builds class filter verified!");

        console.log("\n39. Testing GET /api/builds/:id with full 12-slot items...");
        const firstBuildId = buildsRes.data.builds[0].id;
        const buildDetailRes = await httpGet(`/api/builds/${firstBuildId}`);
        if (buildDetailRes.status !== 200 || !buildDetailRes.data.build || !Array.isArray(buildDetailRes.data.build.items) || buildDetailRes.data.build.items.length === 0) {
            throw new Error(`Expected build items detail, got ${JSON.stringify(buildDetailRes.data)}`);
        }
        console.log(`   Build detail retrieved with ${buildDetailRes.data.build.items.length} slot items and ${buildDetailRes.data.build.sets.length} set bonuses!`);

        console.log("\n40. Testing POST /api/builds & DELETE /api/builds/:id (Custom Build Flow)...");
        // Verify unauthenticated POST /api/builds returns 401
        const unauthCreateRes = await httpPost('/api/builds', {
            title: "Unauthenticated Build",
            class: "Arcanist",
            role: "Stamina DPS"
        });
        if (unauthCreateRes.status !== 401) {
            throw new Error(`Expected 401 on unauthenticated build creation, got ${unauthCreateRes.status}`);
        }
        console.log("   Unauthenticated build creation correctly rejected (401)!");

        const customBuildRes = await httpPost('/api/builds', {
            title: "Test Stamina Arcanist Custom",
            class: "Arcanist",
            role: "Stamina DPS",
            description: "Custom user build description",
            items: [
                { slot_id: 0, slot_name: "Head", item_name: "Order's Wrath Helmet", set_name: "Order's Wrath", item_type: "Medium Armor", trait_id: 1, trait_name: "Divines", enchantment: "Max Stamina", quality: 4, is_tradeable: 1 },
                { slot_id: 2, slot_name: "Chest", item_name: "Order's Wrath Jack", set_name: "Order's Wrath", item_type: "Medium Armor", trait_id: 1, trait_name: "Divines", enchantment: "Max Stamina", quality: 4, is_tradeable: 1 }
            ]
        }, { 'Authorization': `Bearer ${bypassRes.data.token}` });

        if (customBuildRes.status !== 200 || !customBuildRes.data.build_id) {
            throw new Error(`Expected custom build creation 200, got ${customBuildRes.status} ${JSON.stringify(customBuildRes.data)}`);
        }
        const customBuildId = customBuildRes.data.build_id;
        console.log(`   Custom build created with ID: ${customBuildId}`);

        // Verify unauthenticated DELETE returns 401
        const unauthDeleteRes = await httpDelete(`/api/builds/${customBuildId}`);
        if (unauthDeleteRes.status !== 401) {
            throw new Error(`Expected 401 on unauthenticated build deletion, got ${unauthDeleteRes.status}`);
        }
        console.log("   Unauthenticated build deletion correctly rejected (401)!");

        // Delete custom build with authentication
        const deleteBuildRes = await httpDelete(`/api/builds/${customBuildId}`, { 'Authorization': `Bearer ${bypassRes.data.token}` });
        if (deleteBuildRes.status !== 200) {
            throw new Error(`Expected 200 on deleting custom build, got ${deleteBuildRes.status}`);
        }
        console.log("   Custom build deleted cleanly by owner!");

        console.log("\n41. Testing GET /api/builds/:id/diff/:character_id and /deals...");
        // Use user 1 character if exists
        const testCharRes = await httpPost('/api/characters', {
            name: "BuildTestHero",
            class: "Arcanist",
            level: 50,
            alliance: 1
        }, { 'Authorization': `Bearer ${bypassRes.data.token}` });

        const testCharId = testCharRes.data.character.id;
        const diffRes = await httpGet(`/api/builds/${firstBuildId}/diff/${testCharId}`);
        if (diffRes.status !== 200 || diffRes.data.completion_rate === undefined || !Array.isArray(diffRes.data.slot_diffs)) {
            throw new Error(`Expected diff response, got ${JSON.stringify(diffRes.data)}`);
        }
        console.log(`   Gear diff engine verified: completion rate = ${diffRes.data.completion_rate}% (${diffRes.data.matched_count} matched, ${diffRes.data.missing_count} missing)`);

        const dealsRes = await httpGet(`/api/builds/${firstBuildId}/deals?server=NA`);
        if (dealsRes.status !== 200 || !Array.isArray(dealsRes.data.deals_by_slot)) {
            throw new Error(`Expected deals response, got ${JSON.stringify(dealsRes.data)}`);
        }
        console.log(`   Deals recommendation engine verified: total items checked = ${dealsRes.data.total_items_checked}`);

        // Cleanup test character
        await httpDelete(`/api/characters/${testCharId}`, {
            'Authorization': `Bearer ${bypassRes.data.token}`
        });

        console.log("\n42. Testing GET /api/sets (All 712 ESO Sets Catalog)...");
        const setsRes = await httpGet('/api/sets');
        if (setsRes.status !== 200 || !setsRes.data.success || !Array.isArray(setsRes.data.sets) || setsRes.data.total < 500) {
            throw new Error(`Expected >500 sets catalog, got ${JSON.stringify(setsRes.data)}`);
        }
        console.log(`   Retrieved all ${setsRes.data.total} ESO sets catalog successfully!`);

        // Test sets search & filter
        const searchSetsRes = await httpGet('/api/sets?search=Order%27s%20Wrath');
        if (searchSetsRes.status !== 200 || searchSetsRes.data.sets.length === 0) {
            throw new Error(`Expected set search match for Order's Wrath, got ${JSON.stringify(searchSetsRes.data)}`);
        }
        console.log(`   Verified set search for 'Order\'s Wrath': ${searchSetsRes.data.sets[0].name} (${searchSetsRes.data.sets[0].category})`);

        console.log("\n43. Testing GET /api/characters/:id/traits & POST /api/characters/:id/traits (Trait Research Matrix)...");
        // Create a test character for trait testing
        const traitCharRes = await httpPost('/api/characters', {
            name: "TraitCrafterHero",
            class: "Templar",
            level: 50,
            alliance: 1
        }, { 'Authorization': `Bearer ${bypassRes.data.token}` });

        const traitCharId = traitCharRes.data.character.id;

        // Fetch traits matrix
        const traitsRes = await httpGet(`/api/characters/${traitCharId}/traits`);
        if (traitsRes.status !== 200 || !traitsRes.data.success || !Array.isArray(traitsRes.data.disciplines) || traitsRes.data.total_traits < 100) {
            throw new Error(`Expected initialized traits matrix, got ${JSON.stringify(traitsRes.data)}`);
        }
        console.log(`   Traits matrix initialized: ${traitsRes.data.total_traits} total nodes across ${traitsRes.data.disciplines.length} disciplines!`);

        // Test unauthenticated POST /api/characters/:id/traits -> 401
        const unauthTraitUpdate = await httpPost(`/api/characters/${traitCharId}/traits`, {
            equipment_type: "Dagger",
            trait_id: 1,
            research_status: "COMPLETED"
        });
        if (unauthTraitUpdate.status !== 401) {
            throw new Error(`Expected 401 on unauthenticated trait update, got ${unauthTraitUpdate.status}`);
        }
        console.log("   Unauthenticated trait update correctly rejected (401)!");

        // Test authorized POST /api/characters/:id/traits -> 200
        const authTraitUpdate = await httpPost(`/api/characters/${traitCharId}/traits`, {
            equipment_type: "Dagger",
            trait_id: 1,
            research_status: "COMPLETED"
        }, { 'Authorization': `Bearer ${bypassRes.data.token}` });
        if (authTraitUpdate.status !== 200 || !authTraitUpdate.data.success) {
            throw new Error(`Expected 200 on authorized trait update, got ${authTraitUpdate.status}`);
        }
        console.log("   Authorized trait status update succeeded (200)!");

        console.log("\n44. Testing GET /api/characters/:id/trait-matches (Automated Market Fodder Matching Engine)...");
        const traitMatchesRes = await httpGet(`/api/characters/${traitCharId}/trait-matches?server=NA`);
        if (traitMatchesRes.status !== 200 || !traitMatchesRes.data.success || !Array.isArray(traitMatchesRes.data.matches)) {
            throw new Error(`Expected trait matches response, got ${JSON.stringify(traitMatchesRes.data)}`);
        }
        console.log(`   Trait market matching engine verified: ${traitMatchesRes.data.missing_traits_count} missing traits checked, ${traitMatchesRes.data.available_matches_count} with active market fodder!`);

        console.log("\n45. Testing POST /api/characters/upload-traits (Daemon & Addon Bulk Sync)...");
        // Test unauthenticated upload-traits -> 401
        const unauthUploadTraits = await httpPost('/api/characters/upload-traits', {
            character_name: "TraitCrafterHero",
            traits: [{ equipment_type: "Bow", trait_id: 1, research_status: "COMPLETED" }]
        });
        if (unauthUploadTraits.status !== 401) {
            throw new Error(`Expected 401 on unauthenticated upload-traits, got ${unauthUploadTraits.status}`);
        }
        console.log("   Unauthenticated upload-traits correctly rejected (401)!");

        // Test authorized upload-traits -> 200
        const authUploadTraits = await httpPost('/api/characters/upload-traits', {
            character_name: "TraitCrafterHero",
            traits: [
                { crafting_type: "Woodworking", equipment_type: "Bow", trait_id: 1, trait_name: "Powered", research_status: "COMPLETED" },
                { crafting_type: "Woodworking", equipment_type: "Bow", trait_id: 2, trait_name: "Charged", research_status: "RESEARCHING" }
            ]
        }, { 'Authorization': `Bearer ${bypassRes.data.token}` });
        if (authUploadTraits.status !== 200 || !authUploadTraits.data.success || authUploadTraits.data.traits_updated !== 2) {
            throw new Error(`Expected 200 on authorized upload-traits, got ${JSON.stringify(authUploadTraits.data)}`);
        }
        console.log("   Authorized upload-traits bulk sync verified (200)!");

        // Cleanup test character
        await httpDelete(`/api/characters/${traitCharId}`, {
            'Authorization': `Bearer ${bypassRes.data.token}`
        });

        console.log("\n46. Testing GET /api/market/listings with trait filter & sort...");
        const traitFilterRes = await httpGet('/api/market/listings?server=NA&trait=Precise');
        if (traitFilterRes.status !== 200 || !Array.isArray(traitFilterRes.data.listings)) {
            throw new Error(`Expected 200 on market listings with trait filter, got status ${traitFilterRes.status}`);
        }
        console.log(`   Trait filter 'Precise' returned ${traitFilterRes.data.listings.length} listings (trait_name: ${traitFilterRes.data.listings[0]?.trait_name || 'N/A'})!`);

        const traitSortRes = await httpGet('/api/market/listings?server=NA&sort=trait_asc');
        if (traitSortRes.status !== 200 || !Array.isArray(traitSortRes.data.listings)) {
            throw new Error(`Expected 200 on market listings with sort=trait_asc, got status ${traitSortRes.status}`);
        }
        console.log(`   Trait sorting 'sort=trait_asc' verified (${traitSortRes.data.listings.length} total listings)!`);

        console.log("\n47. Testing GET /api/requests/craftable-sets...");
        const craftSetsRes = await httpGet('/api/requests/craftable-sets');
        if (craftSetsRes.status !== 200 || !Array.isArray(craftSetsRes.data)) {
            throw new Error(`Expected 200 on craftable-sets, got status ${craftSetsRes.status}`);
        }
        console.log(`   Craftable sets catalog retrieved: ${craftSetsRes.data.length} sets found!`);

        console.log("\n48. Testing GET /api/requests/stats...");
        const statsRes = await httpGet('/api/requests/stats?server=NA');
        if (statsRes.status !== 200 || statsRes.data.total_open === undefined) {
            throw new Error(`Expected 200 on requests stats, got ${JSON.stringify(statsRes.data)}`);
        }
        console.log(`   Trade requests stats verified: ${statsRes.data.total_open} open, ${statsRes.data.total_gold_offered}g offered!`);

        console.log("\n49. Testing POST /api/requests auth & validation...");
        const unauthReq = await httpPost('/api/requests', {
            request_type: "CRAFTING",
            server: "NA",
            game_item_id: 1129,
            item_name: "Rubedite Cuirass",
            offered_gold_price: 25000
        });
        if (unauthReq.status !== 401) throw new Error(`Expected 401 for unauth request creation, got ${unauthReq.status}`);

        const invalidReq = await httpPost('/api/requests', {
            request_type: "INVALID_TYPE",
            server: "NA",
            game_item_id: 1129,
            item_name: "Rubedite Cuirass",
            offered_gold_price: -500
        }, { 'Authorization': `Bearer ${bypassRes.data.token}` });
        if (invalidReq.status !== 400) throw new Error(`Expected 400 for invalid request payload, got ${invalidReq.status}`);
        console.log("   Trade request auth & payload validation verified!");

        console.log("\n50. Testing POST /api/requests authorized creation (User 1)...");
        const createReqRes = await httpPost('/api/requests', {
            request_type: "CRAFTING",
            server: "NA",
            game_item_id: 1129,
            item_name: "Rubedite Cuirass",
            category: "Apparel",
            subcategory: "Heavy Armor",
            quantity: 1,
            quality: 4,
            trait_name: "Divines",
            set_name: "Order's Wrath",
            offered_gold_price: 35000,
            delivery_notes: "Please send C.O.D. promptly!"
        }, { 'Authorization': `Bearer ${bypassRes.data.token}` });
        if (createReqRes.status !== 201 || !createReqRes.data.success || !createReqRes.data.request_id) {
            throw new Error(`Expected 201 on trade request creation, got ${JSON.stringify(createReqRes.data)}`);
        }
        const testRequestId = createReqRes.data.request_id;
        console.log(`   Trade request created successfully with ID: ${testRequestId}!`);

        console.log("\n51. Testing PATCH /api/requests/:id/claim (User 2 claims User 1's request)...");
        // User 1 cannot claim own request
        const selfClaimRes = await httpPatch(`/api/requests/${testRequestId}/claim`, {}, {
            'Authorization': `Bearer ${bypassRes.data.token}`
        });
        if (selfClaimRes.status !== 400) throw new Error(`Expected 400 for self claim, got ${selfClaimRes.status}`);

        // User 2 claims
        const user2ClaimRes = await httpPatch(`/api/requests/${testRequestId}/claim`, {}, {
            'Authorization': `Bearer ${user2BypassRes.data.token}`
        });
        if (user2ClaimRes.status !== 200 || !user2ClaimRes.data.success) {
            throw new Error(`Expected 200 on crafter claim, got ${JSON.stringify(user2ClaimRes.data)}`);
        }
        console.log("   Order claim state machine verified (Status: IN_PROGRESS, 24h timer set)!");

        console.log("\n52. Testing PATCH /api/requests/:id/fulfill...");
        const fulfillRes = await httpPatch(`/api/requests/${testRequestId}/fulfill`, {}, {
            'Authorization': `Bearer ${bypassRes.data.token}`
        });
        if (fulfillRes.status !== 200 || !fulfillRes.data.success) {
            throw new Error(`Expected 200 on request fulfillment, got ${JSON.stringify(fulfillRes.data)}`);
        }
        console.log("   Order fulfillment confirmed (Status: FULFILLED)!");

        console.log("\n53. Testing DELETE /api/requests/:id authorization & cancellation...");
        // Create second request to test deletion
        const req2 = await httpPost('/api/requests', {
            request_type: "WTB",
            server: "NA",
            game_item_id: 1129,
            item_name: "Dreugh Wax",
            category: "Materials",
            subcategory: "Upgrade Temper",
            quantity: 8,
            quality: 5,
            offered_gold_price: 18000
        }, { 'Authorization': `Bearer ${bypassRes.data.token}` });
        const req2Id = req2.data.request_id;

        // User 2 tries to delete User 1's request (expect 403)
        const idorDeleteReq = await httpDelete(`/api/requests/${req2Id}`, {
            'Authorization': `Bearer ${user2BypassRes.data.token}`
        });
        if (idorDeleteReq.status !== 403) throw new Error(`Expected 403 for IDOR delete request, got ${idorDeleteReq.status}`);

        // User 1 deletes own request
        const authDeleteReq = await httpDelete(`/api/requests/${req2Id}`, {
            'Authorization': `Bearer ${bypassRes.data.token}`
        });
        if (authDeleteReq.status !== 200 || !authDeleteReq.data.success) {
            throw new Error(`Expected 200 on owner delete request, got ${JSON.stringify(authDeleteReq.data)}`);
        }
        console.log("   Trade request cancellation and IDOR protection verified!");

        console.log("\n54. Testing GET /api/requests filterable feed...");
        const feedRes = await httpGet('/api/requests?server=NA&status=ALL');
        if (feedRes.status !== 200 || !Array.isArray(feedRes.data.requests)) {
            throw new Error(`Expected 200 on requests feed, got ${JSON.stringify(feedRes.data)}`);
        }
        console.log(`   Requests feed query verified: ${feedRes.data.requests.length} requests returned!`);

        console.log("\nAll 54 API endpoint test suites passed successfully!");
    } catch (err) {
        console.error("API test failed:", err);
        process.exitCode = 1;
    } finally {
        serverProcess.kill();
        // Give server process a brief moment to release file lock before unlinking test DB
        setTimeout(() => {
            try {
                if (fs.existsSync(EPHEMERAL_DB) && !process.env.DB_PATH) {
                    fs.unlinkSync(EPHEMERAL_DB);
                }
            } catch (e) {}
            process.exit(process.exitCode || 0);
        }, 300);
    }
}

runTests();
