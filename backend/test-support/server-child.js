// Test-only transport stubs. No runtime code or application data is modified.
const http = require('node:http');
const { PNG } = require('./test-image');
let releaseIcon;
const heldIcon = new Promise(resolve => { releaseIcon = resolve; });
global.fetch = async (url, options = {}) => {
    const parsed = new URL(url);
    if (parsed.origin !== 'https://esoicons.uesp.net' || !parsed.pathname.startsWith('/esoui/art/icons/')) {
        throw new Error(`Unexpected outbound request in isolated test: ${url}`);
    }
    const filename = parsed.pathname.split('/').pop();
    process.send({ type: 'fetch', filename });
    if (!options.signal) throw new Error('Icon download must have a timeout signal');
    if (filename === 'concurrent.png') await heldIcon;
    if (filename === 'timeout.png') throw new DOMException('Fixture timeout', 'TimeoutError');
    if (filename === 'network.png') throw new TypeError('Fixture connection failure');
    if (filename === 'missing.png') return new Response('Not found', { status: 404 });
    if (filename === 'html.png') return new Response('<html>not an icon</html>', { headers: { 'content-type': 'text/html' } });
    const body = filename === 'empty.png' ? Buffer.alloc(0)
        : filename === 'oversized.png' ? Buffer.alloc(2 * 1024 * 1024 + 1) : PNG;
    return new Response(body, { headers: { 'content-type': 'image/png' } });
};

// Report the actual OS-assigned port once the normal application startup completes.
const listen = http.Server.prototype.listen;
http.Server.prototype.listen = function (...args) {
    this.once('listening', () => process.send({ type: 'ready', port: this.address().port }));
    return listen.apply(this, args);
};
const application = require(process.env.ESO_TEST_SERVER);
process.on('message', message => {
    if (message.type === 'release-icon') releaseIcon();
    if (message.type === 'shutdown') application.gracefulShutdown('test teardown');
});
process.on('disconnect', () => application.gracefulShutdown('test runner disconnected'));
