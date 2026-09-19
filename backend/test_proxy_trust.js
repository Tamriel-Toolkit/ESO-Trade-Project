/**
 * test_proxy_trust.js — Automated Tests for Topology-Safe Express Proxy Trust
 *
 * Tests acceptance criteria for Issue #76:
 * - Proxy trust is explicit, validated, and disabled by default
 * - The documented production topology resolves the intended client IP
 * - Direct deployments do not trust arbitrary X-Forwarded-For values
 * - Invalid TRUST_PROXY values fail fast with a useful error
 * - Rate-limit tests cover direct, single-proxy, and spoofed-header cases
 */

const assert = require("assert");
const http = require("http");
const { spawn } = require("child_process");
const path = require("path");
const express = require("express");
const { rateLimit } = require("express-rate-limit");
const { parseTrustProxyConfig, configureTrustProxy } = require("./proxy_config");

async function runProxyTrustTests() {
    console.log("\n============================================================");
    console.log("Running Express Proxy Trust & Rate Limiting Test Suite (#76)");
    console.log("============================================================");

    // -------------------------------------------------------------------------
    // 1. Unit Tests: parseTrustProxyConfig
    // -------------------------------------------------------------------------
    console.log("\n1. Testing parseTrustProxyConfig unit validation...");

    // Default / disabled states
    assert.strictEqual(parseTrustProxyConfig(undefined), false, "undefined must default to false");
    assert.strictEqual(parseTrustProxyConfig(null), false, "null must default to false");
    assert.strictEqual(parseTrustProxyConfig(""), false, "empty string must default to false");
    assert.strictEqual(parseTrustProxyConfig("   "), false, "whitespace must default to false");
    assert.strictEqual(parseTrustProxyConfig("false"), false, "'false' string must return false");
    assert.strictEqual(parseTrustProxyConfig("FALSE"), false, "case-insensitive 'FALSE' must return false");
    assert.strictEqual(parseTrustProxyConfig(false), false, "boolean false must return false");
    assert.strictEqual(parseTrustProxyConfig("0"), false, "'0' must return false");
    assert.strictEqual(parseTrustProxyConfig(0), false, "numeric 0 must return false");

    // Enabled booleans & hop counts
    assert.strictEqual(parseTrustProxyConfig("true"), true, "'true' string must return true");
    assert.strictEqual(parseTrustProxyConfig("TRUE"), true, "case-insensitive 'TRUE' must return true");
    assert.strictEqual(parseTrustProxyConfig(true), true, "boolean true must return true");
    assert.strictEqual(parseTrustProxyConfig("1"), 1, "'1' string must return integer 1");
    assert.strictEqual(parseTrustProxyConfig("2"), 2, "'2' string must return integer 2");
    assert.strictEqual(parseTrustProxyConfig(1), 1, "numeric 1 must return 1");

    // Presets and IPs
    assert.strictEqual(parseTrustProxyConfig("loopback"), "loopback", "'loopback' preset must be accepted");
    assert.strictEqual(parseTrustProxyConfig("127.0.0.1"), "127.0.0.1", "IPv4 address must be accepted");
    assert.strictEqual(parseTrustProxyConfig("::1"), "::1", "IPv6 loopback must be accepted");
    assert.strictEqual(parseTrustProxyConfig("10.0.0.0/8"), "10.0.0.0/8", "CIDR subnet must be accepted");

    // Comma-separated list
    const subnets = parseTrustProxyConfig("loopback, 10.0.0.0/8, 172.16.0.0/12");
    assert.deepStrictEqual(subnets, ["loopback", "10.0.0.0/8", "172.16.0.0/12"], "Comma-separated list must be parsed into array");

    // Fail-fast error cases
    assert.throws(() => parseTrustProxyConfig("-1"), /Hop count must be non-negative/, "Negative hop count must throw");
    assert.throws(() => parseTrustProxyConfig(-1), /Hop count must be a non-negative integer/, "Negative numeric hop count must throw");
    assert.throws(() => parseTrustProxyConfig("1.5"), /is not a valid IP address/, "Float string must throw");
    assert.throws(() => parseTrustProxyConfig("invalid_garbage"), /is not a valid IP address/, "Invalid string must throw");
    assert.throws(() => parseTrustProxyConfig("loopback, , 10.0.0.0/8"), /Empty entry in list/, "List with empty element must throw");
    assert.throws(() => parseTrustProxyConfig({}), /Unsupported type/, "Object type must throw");

    console.log("   parseTrustProxyConfig unit validation passed!");

    // -------------------------------------------------------------------------
    // 2. Integration: Direct deployment ignores spoofed X-Forwarded-For
    // -------------------------------------------------------------------------
    console.log("\n2. Testing direct deployment (TRUST_PROXY=false)...");
    {
        const app = express();
        configureTrustProxy(app, false);
        app.get("/ip", (req, res) => res.json({ ip: req.ip }));

        const testServer = await startEphemeralServer(app);
        const res = await fetch(`http://127.0.0.1:${testServer.port}/ip`, {
            headers: { "x-forwarded-for": "203.0.113.195" }
        });
        const data = await res.json();
        testServer.close();

        assert(
            data.ip === "127.0.0.1" || data.ip === "::ffff:127.0.0.1" || data.ip === "::1",
            `Expected direct socket IP, got ${data.ip}`
        );
        assert.notStrictEqual(data.ip, "203.0.113.195", "Direct server must NOT trust spoofed X-Forwarded-For");
        console.log(`   Direct deployment correctly ignored X-Forwarded-For (resolved ${data.ip})!`);
    }

    // -------------------------------------------------------------------------
    // 3. Integration: Single reverse proxy hop (TRUST_PROXY=1)
    // -------------------------------------------------------------------------
    console.log("\n3. Testing single reverse proxy hop (TRUST_PROXY=1)...");
    {
        const app = express();
        configureTrustProxy(app, "1");
        app.get("/ip", (req, res) => res.json({ ip: req.ip }));

        const testServer = await startEphemeralServer(app);

        // Legitimate single-proxy header
        const resLegit = await fetch(`http://127.0.0.1:${testServer.port}/ip`, {
            headers: { "x-forwarded-for": "203.0.113.195" }
        });
        const dataLegit = await resLegit.json();
        assert.strictEqual(dataLegit.ip, "203.0.113.195", "Expected proxy to resolve client IP 203.0.113.195");

        // Multi-hop spoofing attempt: Attacker sends "198.51.100.1, 203.0.113.195"
        // With TRUST_PROXY=1, only the rightmost hop (203.0.113.195) is trusted as client IP
        const resSpoof = await fetch(`http://127.0.0.1:${testServer.port}/ip`, {
            headers: { "x-forwarded-for": "198.51.100.1, 203.0.113.195" }
        });
        const dataSpoof = await resSpoof.json();
        assert.strictEqual(dataSpoof.ip, "203.0.113.195", "Expected single-hop proxy to ignore forged upstream IP 198.51.100.1");

        testServer.close();
        console.log("   Single proxy hop resolved client IP and prevented multi-hop spoofing!");
    }

    // -------------------------------------------------------------------------
    // 4. Integration: Rate Limiter Client Isolation behind Reverse Proxy
    // -------------------------------------------------------------------------
    console.log("\n4. Testing rate-limiting client IP isolation with TRUST_PROXY=1...");
    {
        const app = express();
        configureTrustProxy(app, 1);

        const limiter = rateLimit({
            windowMs: 60 * 1000,
            limit: 2, // 2 requests allowed per window
            standardHeaders: true,
            legacyHeaders: false,
            message: { error: "Rate limit reached" }
        });

        app.use("/api/test-rate-limit", limiter, (req, res) => {
            res.json({ success: true, ip: req.ip });
        });

        const testServer = await startEphemeralServer(app);
        const url = `http://127.0.0.1:${testServer.port}/api/test-rate-limit`;

        // Client A: 203.0.113.10 sends 2 requests (allowed) + 1 request (throttled)
        const reqA1 = await fetch(url, { headers: { "x-forwarded-for": "203.0.113.10" } });
        assert.strictEqual(reqA1.status, 200, "Client A request 1 must succeed");

        const reqA2 = await fetch(url, { headers: { "x-forwarded-for": "203.0.113.10" } });
        assert.strictEqual(reqA2.status, 200, "Client A request 2 must succeed");

        const reqA3 = await fetch(url, { headers: { "x-forwarded-for": "203.0.113.10" } });
        assert.strictEqual(reqA3.status, 429, "Client A request 3 must be throttled with 429");

        // Client B: 203.0.113.20 sends a request — MUST NOT be blocked by Client A's throttling!
        const reqB1 = await fetch(url, { headers: { "x-forwarded-for": "203.0.113.20" } });
        assert.strictEqual(reqB1.status, 200, "Client B must NOT be throttled by Client A's traffic");

        testServer.close();
        console.log("   Rate limiter correctly isolated distinct client IPs behind proxy!");
    }

    // -------------------------------------------------------------------------
    // 5. Integration: Server startup fail-fast on malformed TRUST_PROXY
    // -------------------------------------------------------------------------
    console.log("\n5. Testing server fail-fast on invalid TRUST_PROXY...");
    {
        const serverPath = path.join(__dirname, "server.js");
        const exitCode = await new Promise((resolve) => {
            const child = spawn("node", [serverPath], {
                env: {
                    ...process.env,
                    PORT: "5003",
                    NODE_ENV: "development",
                    TRUST_PROXY: "malformed_proxy_ip_syntax"
                },
                stdio: "pipe"
            });

            let stderrData = "";
            child.stderr.on("data", (d) => { stderrData += d.toString(); });
            child.on("close", (code) => {
                assert(
                    stderrData.includes("Invalid TRUST_PROXY configuration"),
                    `Expected fail-fast error in stderr, got: ${stderrData}`
                );
                resolve(code);
            });
        });

        assert.notStrictEqual(exitCode, 0, "Server must exit with non-zero code on invalid TRUST_PROXY");
        console.log("   Server correctly failed fast on invalid TRUST_PROXY configuration!");
    }

    console.log("\nAll Express Proxy Trust & Rate Limiting tests passed successfully!");
}

function startEphemeralServer(app) {
    return new Promise((resolve, reject) => {
        const server = app.listen(0, () => {
            const port = server.address().port;
            resolve({
                port,
                close: () => new Promise((res) => server.close(res))
            });
        });
        server.on("error", reject);
    });
}

if (require.main === module) {
    runProxyTrustTests()
        .then(() => process.exit(0))
        .catch((err) => {
            console.error("Proxy trust test failure:", err);
            process.exit(1);
        });
}

module.exports = { runProxyTrustTests };
