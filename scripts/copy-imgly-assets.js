const fs = require('fs');
const path = require('path');
const https = require('https');

const pkgPath = path.join(__dirname, '../node_modules/@imgly/background-removal/package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const version = pkg.version;

const src = path.join(__dirname, '../node_modules/@imgly/background-removal/dist');
const dest = path.join(__dirname, '../public/static/imgly');
const dataBaseUrl = `https://staticimgly.com/@imgly/background-removal-data/${version}/dist`;

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return fetchUrl(res.headers.location).then(resolve, reject);
      }
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

async function main() {
  fs.mkdirSync(dest, { recursive: true });
  fs.cpSync(src, dest, { recursive: true });

  const resourcesUrl = `${dataBaseUrl}/resources.json`;
  console.log('Fetching resources.json from', resourcesUrl);
  const resourcesBuf = await fetchUrl(resourcesUrl);
  const resourcesPath = path.join(dest, 'resources.json');
  fs.writeFileSync(resourcesPath, resourcesBuf);
  console.log('Wrote resources.json');

  const resources = JSON.parse(resourcesBuf.toString());
  const chunkNames = new Set();
  for (const entry of Object.values(resources)) {
    if (entry.chunks) {
      for (const ch of entry.chunks) {
        if (ch.name) chunkNames.add(ch.name);
      }
    }
  }

  for (const name of chunkNames) {
    const url = `${dataBaseUrl}/${name}`;
    const filePath = path.join(dest, name);
    if (fs.existsSync(filePath)) {
      console.log('Skip (exists):', name);
      continue;
    }
    process.stdout.write('Fetching ' + name + '...');
    try {
      const buf = await fetchUrl(url);
      fs.writeFileSync(filePath, buf);
      console.log(' OK');
    } catch (err) {
      console.log(' FAIL:', err.message);
    }
  }

  console.log('✅ Copied imgly assets to public directory');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
