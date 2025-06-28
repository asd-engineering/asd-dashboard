// serve_no_cache.js
const http = require('http');
const fs = require('fs');
const path = require('path');

const LOGFILE = 'webserver.log';
const PORT = 8000;
const BASEDIR = 'src';

// Write log entries to file
function logRequest(req, res, statusCode) {
    const logEntry = `[${new Date().toISOString()}] ${req.method} ${req.url} ${statusCode}\n`;
    fs.appendFile(LOGFILE, logEntry, err => { if (err) console.error('Log error:', err); });
}

// Serve static files with no-cache headers
http.createServer((req, res) => {
    let filePath = path.join(BASEDIR, decodeURIComponent(req.url.split('?')[0]));
    if (filePath.endsWith('/')) filePath += 'index.html';
    fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
            res.writeHead(404, {'Content-Type': 'text/plain'});
            res.end('404 Not Found');
            logRequest(req, res, 404);
            return;
        }
        const ext = path.extname(filePath).toLowerCase();
        const mimeTypes = {
            '.html': 'text/html',
            '.js': 'application/javascript',
            '.css': 'text/css',
            '.json': 'application/json',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.gif': 'image/gif',
            '.svg': 'image/svg+xml',
            '.ico': 'image/x-icon'
        };
        res.writeHead(200, {
            'Content-Type': mimeTypes[ext] || 'application/octet-stream',
            'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
            'Pragma': 'no-cache',
            'Expires': '0'
        });
        const readStream = fs.createReadStream(filePath);
        readStream.pipe(res);
        readStream.on('end', () => logRequest(req, res, 200));
        readStream.on('error', () => {
            res.writeHead(500, {'Content-Type': 'text/plain'});
            res.end('500 Server Error');
            logRequest(req, res, 500);
        });
    });
}).listen(PORT, () => {
    console.log(`Serving ${BASEDIR} on http://localhost:${PORT}`);
});
