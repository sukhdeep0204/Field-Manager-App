import 'react-native-gesture-handler/jestSetup';
import '@react-native-async-storage/async-storage/jest/async-storage-mock';

global.window = global.window || {};
global.window.dispatchEvent = global.window.dispatchEvent || (() => {});
