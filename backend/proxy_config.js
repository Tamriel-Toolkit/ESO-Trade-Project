/**
 * proxy_config.js — Topology-Safe Express Proxy Trust Configuration
 *
 * Configures Express 'trust proxy' setting explicitly to prevent:
 * 1. Collapsing all remote clients into a single proxy IP rate-limit bucket
 *    when running behind a reverse proxy (Nginx, Caddy, Cloudflare, Traefik, AWS ALB).
 * 2. Unconditionally trusting spoofed X-Forwarded-For headers when directly exposed.
 *
 * Supported formats for TRUST_PROXY:
 * - Unset / empty / "false": Disabled (false). Direct connection socket IP is used.
 * - "true": Trust all hops (only recommended if upstream network is fully trusted/isolated).
 * - Integer (e.g. "1", "2"): Number of reverse proxy hops to trust.
 * - IP / CIDR / Preset (e.g. "loopback", "127.0.0.1", "10.0.0.0/8"): Trusted addresses or subnets.
 * - Comma-separated list (e.g. "loopback, 10.0.0.0/8, 172.16.0.0/12"): Multiple trusted addresses/subnets.
 */

const proxyAddr = require("proxy-addr");

/**
 * Parses and strictly validates a raw TRUST_PROXY environment setting.
 *
 * @param {string|number|boolean|undefined|null} rawConfig
 * @returns {boolean|number|string|string[]} Validated Express 'trust proxy' setting
 * @throws {Error} If rawConfig is malformed or invalid
 */
function parseTrustProxyConfig(rawConfig) {
    if (rawConfig === undefined || rawConfig === null) {
        return false;
    }
    if (typeof rawConfig === "boolean") {
        return rawConfig;
    }
    if (typeof rawConfig === "number") {
        if (!Number.isInteger(rawConfig) || rawConfig < 0) {
            throw new Error(`Invalid TRUST_PROXY configuration: Hop count must be a non-negative integer (received ${rawConfig}).`);
        }
        return rawConfig === 0 ? false : rawConfig;
    }
    if (typeof rawConfig !== "string") {
        throw new Error(`Invalid TRUST_PROXY configuration: Unsupported type "${typeof rawConfig}".`);
    }

    const trimmed = rawConfig.trim();
    if (trimmed === "" || trimmed.toLowerCase() === "false" || trimmed === "0") {
        return false;
    }
    if (trimmed.toLowerCase() === "true") {
        return true;
    }
    if (/^-\d+$/.test(trimmed)) {
        throw new Error(`Invalid TRUST_PROXY configuration: Hop count must be non-negative (received "${rawConfig}").`);
    }
    if (/^\d+$/.test(trimmed)) {
        const num = parseInt(trimmed, 10);
        return num === 0 ? false : num;
    }

    const entries = trimmed.split(",").map(s => s.trim());
    for (const entry of entries) {
        if (!entry) {
            throw new Error(`Invalid TRUST_PROXY configuration: Empty entry in list "${rawConfig}".`);
        }
        try {
            proxyAddr.compile([entry]);
        } catch (err) {
            throw new Error(`Invalid TRUST_PROXY configuration: "${entry}" is not a valid IP address, CIDR range, or supported preset (${err.message}).`);
        }
    }

    return entries.length === 1 ? entries[0] : entries;
}

/**
 * Applies the validated proxy trust configuration to an Express application.
 *
 * @param {import("express").Application} app
 * @param {string|number|boolean|undefined|null} [rawConfig=process.env.TRUST_PROXY]
 * @returns {boolean|number|string|string[]} The applied trust proxy value
 */
function configureTrustProxy(app, rawConfig = process.env.TRUST_PROXY) {
    const value = parseTrustProxyConfig(rawConfig);
    app.set("trust proxy", value);
    return value;
}

module.exports = {
    parseTrustProxyConfig,
    configureTrustProxy
};
