/**
 * SpoonForce - 中英双语国际化模块
 */
const I18n = (() => {
  const LANG = {
    zh: {
      appName: 'SpoonForce 勺子秤',
      placeSpoon: '用手指或勺子按压此处',
      tare: '去皮归零',
      unitSwitch: '切换单位',
      calibrate: '校准',
      history: '历史记录',
      locked: '已锁定',
      tapToUnlock: '点击解锁',
      overloadWarning: '⚠ 超重预警！请减轻压力',
      sensorConnected: '传感器已连接',
      sensorNoForce: '已触摸，但未检测到压力数据',
      sensorDisconnected: '等待触摸…',
      gram: '克',
      gramShort: 'g',
      ounce: '盎司',
      ounceShort: 'oz',
      // Calibration
      calibTitle: '校准向导',
      calibStep1Title: '第 1 步：去皮',
      calibStep1Desc: '只放勺子在屏幕上，确保稳定后点击「下一步」',
      calibStep2Title: '第 2 步：轻物体',
      calibStep2Desc: '在勺子上放一个已知重量的轻物体（建议 50g 左右）',
      calibStep3Title: '第 3 步：重物体',
      calibStep3Desc: '换一个更重的已知重量物体（建议 200g 左右）',
      calibInputLabel: '输入实际重量 (g)',
      calibInputPlaceholder: '例如：50',
      calibNext: '下一步',
      calibFinish: '完成校准',
      calibSuccess: '校准成功！',
      calibReset: '重置校准',
      calibCancel: '取消',
      calibNoForce: '未检测到压力，请先将勺子放在屏幕上',
      // History
      histTitle: '称重历史',
      histEmpty: '暂无称重记录',
      histClearAll: '清空全部',
      histClearConfirm: '确定清空所有历史记录？',
      histDelete: '删除',
      // Compatibility
      compatTitle: '设备不兼容',
      compatMsg: '此应用需要支持 3D Touch 的 iPhone 才能准确测量重量。',
      compatDevices: '兼容设备：iPhone 6s / 6s Plus / 7 / 7 Plus / 8 / 8 Plus / X / Xs / Xs Max',
      compatHapticWarn: '您的设备无 3D Touch，已启用触摸面积模拟模式，测量结果仅供参考',
      compatDismiss: '我知道了，继续使用',
    },
    en: {
      appName: 'SpoonForce',
      placeSpoon: 'Press here with\nfinger or spoon',
      tare: 'Tare',
      unitSwitch: 'Unit',
      calibrate: 'Calibrate',
      history: 'History',
      locked: 'Locked',
      tapToUnlock: 'Tap to unlock',
      overloadWarning: '⚠ Overload! Reduce pressure',
      sensorConnected: 'Sensor connected',
      sensorNoForce: 'Touch detected, but no force data',
      sensorDisconnected: 'Waiting for touch…',
      gram: 'Gram',
      gramShort: 'g',
      ounce: 'Ounce',
      ounceShort: 'oz',
      // Calibration
      calibTitle: 'Calibration Wizard',
      calibStep1Title: 'Step 1: Tare',
      calibStep1Desc: 'Place only the spoon on screen, wait until stable, then tap "Next"',
      calibStep2Title: 'Step 2: Light Object',
      calibStep2Desc: 'Place a known light object on the spoon (e.g. ~50g)',
      calibStep3Title: 'Step 3: Heavy Object',
      calibStep3Desc: 'Replace with a heavier known object (e.g. ~200g)',
      calibInputLabel: 'Enter actual weight (g)',
      calibInputPlaceholder: 'e.g. 50',
      calibNext: 'Next',
      calibFinish: 'Finish',
      calibSuccess: 'Calibration complete!',
      calibReset: 'Reset Calibration',
      calibCancel: 'Cancel',
      calibNoForce: 'No pressure detected. Place the spoon on screen first.',
      // History
      histTitle: 'Weighing History',
      histEmpty: 'No records yet',
      histClearAll: 'Clear All',
      histClearConfirm: 'Clear all history records?',
      histDelete: 'Delete',
      // Compatibility
      compatTitle: 'Incompatible Device',
      compatMsg: 'This app requires an iPhone with 3D Touch for accurate weight measurement.',
      compatDevices: 'Compatible: iPhone 6s / 6s Plus / 7 / 7 Plus / 8 / 8 Plus / X / Xs / Xs Max',
      compatHapticWarn: 'No 3D Touch detected. Using touch radius fallback — results are approximate.',
      compatDismiss: 'I understand, continue',
    },
  };

  let currentLang = 'zh';

  function init() {
    const prefs = Storage.getPrefs();
    currentLang = prefs.lang || (navigator.language.startsWith('zh') ? 'zh' : 'en');
    apply();
  }

  function t(key) {
    return LANG[currentLang][key] || LANG.en[key] || key;
  }

  function apply() {
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      const text = t(key);
      if (el.tagName === 'INPUT') {
        el.placeholder = text;
      } else {
        el.textContent = text;
      }
    });
    document.documentElement.lang = currentLang;
  }

  function toggle() {
    currentLang = currentLang === 'zh' ? 'en' : 'zh';
    const prefs = Storage.getPrefs();
    prefs.lang = currentLang;
    Storage.savePrefs(prefs);
    apply();
    return currentLang;
  }

  function getLang() {
    return currentLang;
  }

  return { init, t, apply, toggle, getLang };
})();
