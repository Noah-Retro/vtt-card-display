const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

(async () => {
  const root = process.cwd();
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
  const outDir = path.join(root, 'dist');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);
  const outName = `${manifest.id}-${manifest.version}.zip`;
  const outPath = path.join(outDir, outName);
  const output = fs.createWriteStream(outPath);
  const archive = archiver('zip', { zlib: { level: 9 } });
  output.on('close', () => { console.log('Package created:', outPath, archive.pointer(), 'bytes'); });
  archive.on('warning', (err) => { if (err.code === 'ENOENT') console.warn(err); else throw err; });
  archive.on('error', (err) => { throw err; });
  archive.pipe(output);
  // include build artifacts and manifest
  const include = ['manifest.json', 'main.js', 'styles.css', 'README.md', 'types.d.ts'];
  include.forEach(f => { if (fs.existsSync(path.join(root, f))) archive.file(path.join(root, f), { name: f }); });
  // include Cards folder
  if (fs.existsSync(path.join(root, '../Cards'))) {
    archive.directory(path.join(root, '../Cards'), 'Cards');
  }
  await archive.finalize();
})();
