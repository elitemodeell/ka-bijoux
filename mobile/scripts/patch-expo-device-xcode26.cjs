const fs = require('node:fs');
const path = require('node:path');

const target = path.join(
  __dirname,
  '..',
  'node_modules',
  'expo-device',
  'ios',
  'UIDevice.swift',
);

const legacy = `  var isSimulator: Bool {
    return TARGET_OS_SIMULATOR != 0
  }`;

const compatible = `  var isSimulator: Bool {
    #if targetEnvironment(simulator)
    return true
    #else
    return false
    #endif
  }`;

const source = fs.readFileSync(target, 'utf8');

if (source.includes(compatible)) {
  console.log('expo-device is already compatible with Xcode 26.');
  process.exit(0);
}

if (!source.includes(legacy)) {
  throw new Error(
    'Refusing to patch expo-device: expected 6.0.2 simulator implementation was not found.',
  );
}

fs.writeFileSync(target, source.replace(legacy, compatible));
console.log('Applied expo-device 6.0.2 compatibility patch for Xcode 26.');
