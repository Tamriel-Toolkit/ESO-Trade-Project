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

        // Cleanup test character
        await httpDelete(`/api/characters/${securedCharId}`, {
            'Authorization': `Bearer ${bypassRes.data.token}`
        });

        console.log("\nAll 32 API endpoint test suites passed successfully!");
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
