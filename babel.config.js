// Reanimated v4 memakai paket worklets terpisah. Plugin WAJIB paling akhir.
// (reanimated/gesture-handler dipertahankan karena navigasi & lib lain memakainya;
//  @expo/ui sendiri tidak membutuhkannya.)
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: ['react-native-worklets/plugin',],
  };
};
