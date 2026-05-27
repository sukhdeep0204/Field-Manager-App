module.exports = {
  preset: 'react-native',
  testPathIgnorePatterns: ['/node_modules/', '/android/', '/ios/'],
  testEnvironment: 'node',
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-native-community|@react-navigation|react-native-gesture-handler|react-native-linear-gradient|react-native-safe-area-context|react-native-screens|react-native-svg|lucide-react-native)/)',
  ],
  setupFiles: ['<rootDir>/jest.setup.js'],
};
