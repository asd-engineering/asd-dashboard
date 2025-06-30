x-frame-check *ARGS:
    #!/usr/bin/env node
    const https = require('https');
    const fs = require('fs');
    const { URL } = require('url');

    // Get arguments from just
    const args = "{{ARGS}}".split(' ').filter(Boolean);

    // Input handling
    let urls = [];
    let outputFile = null;

    if (args.length >= 1) {
      const first = args[0];
      const second = args[1];

      if (fs.existsSync(first)) {
        const content = fs.readFileSync(first, 'utf-8');
        urls = content.split('\n').map(l => l.trim()).filter(Boolean);
      } else {
        urls = args;
      }

      if (second && second.endsWith('.txt')) {
        outputFile = second;
      }
    } else if (fs.existsSync('urls.json')) {
      urls = JSON.parse(fs.readFileSync('urls.json'));
    } else {
      console.error('Usage: just x-frame-check [url1 url2 ...] | urls.txt [output.txt] | urls.json');
      process.exit(1);
    }

    function checkUrl(url, timeoutMs = 5000) {
      return new Promise((resolve) => {
        try {
          const parsed = new URL(url);
          const options = {
            method: 'HEAD',
            hostname: parsed.hostname,
            path: parsed.pathname + parsed.search + parsed.hash || '/',
            agent: false,
            timeout: timeoutMs, // may not work reliably
          };

          const req = https.request(options, (res) => {
            const xfo = res.headers['x-frame-options'] || '';
            const csp = res.headers['content-security-policy'] || '';
            const blocked = /deny|sameorigin/i.test(xfo) || /frame-ancestors/i.test(csp);
            resolve({ url, ok: !blocked, xfo, csp });
          });

          req.on('timeout', () => {
            req.destroy();
            resolve({ url, ok: false, xfo: 'TIMEOUT', csp: '' });
          });

          req.on('error', (err) => {
            resolve({ url, ok: false, xfo: 'ERROR', csp: err.message });
          });

          req.end();
        } catch (e) {
          resolve({ url, ok: false, xfo: 'INVALID_URL', csp: e.message });
        }
      });
    }

    (async () => {
      const MAX_CONCURRENT = 10;
      const verified = [];
      const batches = [];

      for (let i = 0; i < urls.length; i += MAX_CONCURRENT) {
        const chunk = urls.slice(i, i + MAX_CONCURRENT);
        batches.push(chunk);
      }

      for (const batch of batches) {
        const results = await Promise.all(batch.map(url => checkUrl(url)));
        for (const { url: u, ok, xfo, csp } of results) {
          const status = ok ? '✅ OK' : '❌ BLOCKED';
          console.log(`${status} ${u}`);
          if (!ok) {
            console.log(`    X-Frame-Options: ${xfo}`);
            console.log(`    CSP: ${csp}`);
          } else if (outputFile) {
            verified.push(u);
          }
        }
      }

      if (outputFile && verified.length > 0) {
        fs.appendFileSync(outputFile, verified.map(u => u + '\n').join(''), 'utf-8');
        console.log(`\n✅ Written ${verified.length} verified URLs to ${outputFile}`);
      }
    })();
