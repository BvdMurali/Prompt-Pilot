/**
 * withFloatingBubble.js — Expo Config Plugin
 *
 * This plugin sets up the Android Floating Bubble feature entirely from source,
 * making the project compatible with EAS Cloud Builds triggered from GitHub.
 *
 * It performs the following steps at prebuild time:
 *   1. Copies Kotlin source files from src/native/android/ → the generated android/ directory.
 *   2. Injects required permissions + service into AndroidManifest.xml.
 *   3. Adds the androidx.core:core-ktx dependency to app/build.gradle.
 *   4. Registers FloatingBubblePackage in MainApplication.kt.
 */

const {
  withAndroidManifest,
  withAppBuildGradle,
  withMainApplication,
  withDangerousMod,
} = require('@expo/config-plugins');
const path = require('path');
const fs = require('fs');

// ─── Step 1: Copy Kotlin source files ────────────────────────────────────────

function withCopyKotlinFiles(config) {
  return withDangerousMod(config, [
    'android',
    (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const sourceDir = path.join(projectRoot, 'src', 'native', 'android');
      const destDir = path.join(
        config.modRequest.platformProjectRoot,
        'app',
        'src',
        'main',
        'java',
        'com',
        'promptpilot',
        'app'
      );

      // Ensure destination exists
      fs.mkdirSync(destDir, { recursive: true });

      const filesToCopy = [
        'FloatingBubbleModule.kt',
        'FloatingBubblePackage.kt',
        'FloatingBubbleService.kt',
        'FloatingBubbleActivity.kt',
      ];

      for (const fileName of filesToCopy) {
        const src = path.join(sourceDir, fileName);
        const dest = path.join(destDir, fileName);
        if (fs.existsSync(src)) {
          fs.copyFileSync(src, dest);
          console.log(`[FloatingBubble] Copied ${fileName} → ${dest}`);
        } else {
          throw new Error(
            `[FloatingBubble] Source file not found: ${src}\n` +
            `Ensure src/native/android/ contains the Kotlin files.`
          );
        }
      }

      return config;
    },
  ]);
}

// ─── Step 2: Inject AndroidManifest permissions + service ────────────────────

function withFloatingBubbleManifest(config) {
  return withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults;
    const mainApplication = androidManifest.manifest.application[0];

    // Ensure permissions array exists
    if (!androidManifest.manifest['uses-permission']) {
      androidManifest.manifest['uses-permission'] = [];
    }

    const permissions = [
      'android.permission.SYSTEM_ALERT_WINDOW',
      'android.permission.FOREGROUND_SERVICE',
      'android.permission.FOREGROUND_SERVICE_DATA_SYNC',
    ];

    permissions.forEach((perm) => {
      const exists = androidManifest.manifest['uses-permission'].some(
        (p) => p.$['android:name'] === perm
      );
      if (!exists) {
        androidManifest.manifest['uses-permission'].push({
          $: { 'android:name': perm },
        });
      }
    });

    // Ensure services array exists
    if (!mainApplication.service) {
      mainApplication.service = [];
    }

    // Register FloatingBubbleService
    const serviceName = '.FloatingBubbleService';
    const serviceExists = mainApplication.service.some(
      (s) =>
        s.$['android:name'] === serviceName ||
        s.$['android:name'] === 'com.promptpilot.app.FloatingBubbleService'
    );

    if (!serviceExists) {
      mainApplication.service.push({
        $: {
          'android:name': serviceName,
          'android:enabled': 'true',
          'android:exported': 'false',
          'android:foregroundServiceType': 'dataSync',
        },
      });
    }

    // Register FloatingBubbleActivity with a translucent theme so it appears
    // as a floating dialog over whatever app the user currently has open.
    if (!mainApplication.activity) {
      mainApplication.activity = [];
    }
    const activityName = '.FloatingBubbleActivity';
    const activityExists = mainApplication.activity.some(
      (a) =>
        a.$['android:name'] === activityName ||
        a.$['android:name'] === 'com.promptpilot.app.FloatingBubbleActivity'
    );
    if (!activityExists) {
      mainApplication.activity.push({
        $: {
          'android:name': activityName,
          'android:exported': 'false',
          'android:excludeFromRecents': 'true',
          // Theme.AppCompat.Dialog: floating dialog window, AppCompat-compatible.
          // We make the background transparent programmatically in onCreate()
          // so only the React card is visible (no dialog chrome/frame).
          'android:theme': '@style/Theme.AppCompat.Dialog',
        },
      });
      console.log('[FloatingBubble] Registered FloatingBubbleActivity in AndroidManifest');
    }

    return config;
  });
}

// ─── Step 3: Add core-ktx to app/build.gradle ────────────────────────────────

function withCoreKtxDependency(config) {
  return withAppBuildGradle(config, (config) => {
    const ktxDep = `    implementation("androidx.core:core-ktx:1.12.0")`;

    if (config.modResults.contents.includes('androidx.core:core-ktx')) {
      // Already present — nothing to do
      return config;
    }

    // Expo prebuild can generate either single or double-quoted dependency strings.
    // Try double-quote variant first, then single-quote fallback.
    const doubleQuote = `implementation("com.facebook.react:react-android")`;
    const singleQuote = `implementation 'com.facebook.react:react-android'`;

    if (config.modResults.contents.includes(doubleQuote)) {
      config.modResults.contents = config.modResults.contents.replace(
        doubleQuote,
        `${doubleQuote}\n${ktxDep}`
      );
    } else if (config.modResults.contents.includes(singleQuote)) {
      config.modResults.contents = config.modResults.contents.replace(
        singleQuote,
        `${singleQuote}\n${ktxDep}`
      );
    } else {
      // Last resort: insert at the start of the dependencies block
      config.modResults.contents = config.modResults.contents.replace(
        /dependencies\s*\{/,
        `dependencies {\n${ktxDep}`
      );
    }

    console.log('[FloatingBubble] Added androidx.core:core-ktx to build.gradle');
    return config;
  });
}

// ─── Step 4: Register FloatingBubblePackage in MainApplication.kt ────────────

function withFloatingBubblePackageRegistration(config) {
  return withMainApplication(config, (config) => {
    let contents = config.modResults.contents;

    // Only patch if not already registered
    if (contents.includes('FloatingBubblePackage()')) {
      return config;
    }

    // Expo prebuild generates the packages block in one of two forms.
    // Try both patterns to maximise compatibility across SDK versions.
    const patterns = [
      // SDK 50+ form: PackageList(this).packages.apply {
      {
        search: 'PackageList(this).packages.apply {',
        replacement: `PackageList(this).packages.apply {\n              // Custom native packages:\n              add(FloatingBubblePackage())`,
      },
      // Alternative form with explicit comment already present
      {
        search: 'PackageList(this).packages.also {',
        replacement: `PackageList(this).packages.also {\n              // Custom native packages:\n              add(FloatingBubblePackage())`,
      },
    ];

    let patched = false;
    for (const { search, replacement } of patterns) {
      if (contents.includes(search)) {
        contents = contents.replace(search, replacement);
        patched = true;
        console.log('[FloatingBubble] Registered FloatingBubblePackage in MainApplication.kt');
        break;
      }
    }

    if (!patched) {
      console.warn(
        '[FloatingBubble] WARNING: Could not find PackageList block in MainApplication.kt.\n' +
        'Please register FloatingBubblePackage() manually in getPackages().'
      );
    }

    config.modResults.contents = contents;
    return config;
  });
}


// ─── Compose all mods ─────────────────────────────────────────────────────────

function withFloatingBubble(config) {
  config = withCopyKotlinFiles(config);
  config = withFloatingBubbleManifest(config);
  config = withCoreKtxDependency(config);
  config = withFloatingBubblePackageRegistration(config);
  return config;
}

module.exports = withFloatingBubble;
