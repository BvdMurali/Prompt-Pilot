const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// 1. Load Supabase credentials from web/.env.local
const envPath = path.join(__dirname, '../../web/.env.local');
const envConfig = {};
try {
  const content = fs.readFileSync(envPath, 'utf8');
  content.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim();
      envConfig[key] = val;
    }
  });
} catch (e) {
  console.error('Error: Could not read web/.env.local file. Make sure it exists.', e.message);
  process.exit(1);
}

const supabaseUrl = envConfig.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = envConfig.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing in web/.env.local');
  process.exit(1);
}

// 2. Initialize Supabase
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

// 3. Find the local APK file path or download if it's a URL
const args = process.argv.slice(2);
let apkPath = args[0];
let isDownloadedTemp = false;

async function downloadFile(url, dest) {
  const protocol = url.startsWith('https') ? require('https') : require('http');
  return new Promise((resolve, reject) => {
    protocol.get(url, response => {
      // Check for redirect (3xx status code)
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        console.log(`Following redirect to: ${response.headers.location}`);
        downloadFile(response.headers.location, dest).then(resolve).catch(reject);
        return;
      }

      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: Status Code ${response.statusCode}`));
        return;
      }

      const file = fs.createWriteStream(dest);
      response.pipe(file);
      file.on('finish', () => {
        file.close(resolve);
      });
    }).on('error', err => {
      fs.unlink(dest, () => reject(err));
    });
  });
}

async function prepareApkPath() {
  if (apkPath && (apkPath.startsWith('http://') || apkPath.startsWith('https://'))) {
    const url = apkPath;
    console.log(`Downloading build from URL: ${url}`);
    const tempPath = path.join(__dirname, '../temp-build.apk');
    
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }
    
    await downloadFile(url, tempPath);
    console.log(`Downloaded to temporary path: ${tempPath}`);
    apkPath = tempPath;
    isDownloadedTemp = true;
  }

  if (!apkPath) {
    // Search common build locations
    const searchPaths = [
      path.join(__dirname, '../'), // Root of mobile folder
      path.join(__dirname, '../android/app/build/outputs/apk/release'),
      path.join(__dirname, '../dist')
    ];

    for (const sPath of searchPaths) {
      if (fs.existsSync(sPath)) {
        const files = fs.readdirSync(sPath);
        const apkFile = files.find(f => f.endsWith('.apk'));
        if (apkFile) {
          apkPath = path.join(sPath, apkFile);
          break;
        }
      }
    }
  }

  if (!apkPath || !fs.existsSync(apkPath)) {
    console.error('\nError: Could not find any .apk file.');
    console.log('Usage: node scripts/upload-build.js <path-to-apk-or-url>');
    console.log('Example: node scripts/upload-build.js https://expo.dev/artifacts/...apk');
    process.exit(1);
  }
}

async function uploadLocalBuild() {
  try {
    // 1. Resolve and prepare the APK path (download if it's a URL)
    await prepareApkPath();
    console.log(`Found APK to upload: ${apkPath}`);

    // 4. Read metadata from app.json
    const appJsonPath = path.join(__dirname, '../app.json');
    let version = '1.0.0';
    let buildNumber = 12; // Default to 12 since we have the passcode 12 build
    try {
      const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
      version = appJson.expo.version || '1.0.0';
      buildNumber = appJson.expo.runtimeVersion || 12;
    } catch (e) {
      console.warn('Warning: Could not read version from app.json, using defaults.');
    }

    const fileBuffer = fs.readFileSync(apkPath);
    const fileSize = fileBuffer.length;
    const fileName = path.basename(apkPath);
    const storagePath = `android/${fileName}`;

    console.log(`\nUploading ${fileName} (${(fileSize / (1024 * 1024)).toFixed(2)} MB) to Supabase...`);


    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('builds')
      .upload(storagePath, fileBuffer, {
        contentType: 'application/vnd.android.package-archive',
        upsert: true
      });

    if (uploadError) throw uploadError;
    console.log('✓ Successfully uploaded to Supabase Storage.');

    // Option A: Delete older APK files from storage
    const { data: existingBuilds } = await supabase
      .from('mobile_builds')
      .select('file_path')
      .eq('platform', 'android');

    if (existingBuilds && existingBuilds.length > 0) {
      const filesToDelete = existingBuilds
        .map(b => b.file_path)
        .filter(path => path !== storagePath);

      if (filesToDelete.length > 0) {
        console.log('Cleaning up old build files from storage:', filesToDelete);
        await supabase.storage.from('builds').remove(filesToDelete);
      }
    }

    // Delete old database records
    await supabase.from('mobile_builds').delete().eq('platform', 'android');

    // Insert new record
    const { data: newRecord, error: insertError } = await supabase
      .from('mobile_builds')
      .insert({
        version,
        build_number: typeof buildNumber === 'number' ? buildNumber : parseInt(buildNumber, 10) || 1,
        platform: 'android',
        file_path: storagePath,
        file_size: fileSize,
        release_notes: `Local build uploaded manually on ${new Date().toLocaleDateString()}`
      })
      .select()
      .single();

    if (insertError) throw insertError;

    console.log('\n✓ Web settings updated successfully!');
    console.log('Latest Build details:');
    console.log(`- Version: v${newRecord.version} (${newRecord.build_number})`);
    console.log(`- File Size: ${(newRecord.file_size / (1024 * 1024)).toFixed(2)} MB`);
    
    // Clean up temporary downloaded file
    if (isDownloadedTemp && fs.existsSync(apkPath)) {
      fs.unlinkSync(apkPath);
      console.log('✓ Cleaned up temporary downloaded build file.');
    }
    
  } catch (err) {
    console.error('Upload failed:', err.message || err);
  }
}

uploadLocalBuild();
