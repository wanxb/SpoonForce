# SpoonForce 🥄⚖️

利用 iPhone 3D Touch 屏幕 + 金属勺子实现的 Web 厨房秤。

灵感来源：[翁天信 - 3D Touch 屏幕电子秤的实现](https://blog.dandyweng.com/2015/12/weight-things-with-3d-touch-on-iphone-6s/)

## 在线体验

用兼容设备的 Safari 打开部署后的页面即可使用。

## 使用方法

1. 将手机放在平坦的桌面上
2. 把金属勺子**背面朝下**，圆心对准屏幕上的圆圈区域，轻轻放上
3. 点击「去皮归零」，此时重量显示为 0
4. 拿起勺子，将待称物品放入勺子凹面，再一起轻放回屏幕
5. 稳定 1.5 秒后数值自动锁定

> ⚠️ 首次使用建议先进行「校准」，用两个已知重量的物体完成 2 点校准，可显著提高精度。

### 为什么要用金属勺子？

iPhone 的电容式触摸屏需要导电介质才能感应。金属勺子既能导电，又天然适合盛放物品。也可以用其他导电金属容器替代（如锡箔纸）。

## 功能特性

- **实时称重**：通过 `Touch.force` API 读取压力，10 点滑动平均滤波
- **去皮归零**：扣除勺子及容器重量
- **2 点线性校准**：用已知重量物体校准，提高精度
- **自动锁定**：稳定 1.5 秒自动锁定数值，防止拿走后丢失
- **单位切换**：克 (g) / 盎司 (oz)
- **超重预警**：压力接近上限时振动 + 红色警告
- **称重历史**：自动记录每次锁定的结果（本地存储，最多 100 条）
- **中英双语**：跟随系统语言，可手动切换
- **深色模式**：跟随系统自动适配
- **PWA**：可添加到主屏幕，离线可用
- **兼容降级**：无 3D Touch 设备自动切换触摸面积模拟模式

## 兼容设备

| 设备 | 支持情况 | 说明 |
|---|---|---|
| iPhone 6s / 6s Plus | ✅ 完全支持 | 3D Touch 硬件 |
| iPhone 7 / 7 Plus | ✅ 完全支持 | 3D Touch 硬件 |
| iPhone 8 / 8 Plus | ✅ 完全支持 | 3D Touch 硬件 |
| iPhone X | ✅ 完全支持 | 3D Touch 硬件 |
| iPhone Xs / Xs Max | ✅ 完全支持 | 3D Touch 硬件 |
| iPhone XR | ❌ 不支持 | 无 3D Touch |
| iPhone 11 ~ 17 系列 | ⚠️ 模拟模式 | 无 3D Touch，使用触摸面积估算，精度较低 |
| Android | ⚠️ 模拟模式 | 无压感硬件支持 |
| iPad | ⚠️ 模拟模式 | 无压感硬件支持 |

## 技术栈

- 原生 HTML5 + CSS3 + JavaScript（无框架、无构建步骤）
- `Touch.force` API / `radiusX/radiusY` 降级
- `Vibration API`（超重预警）
- `LocalStorage`（校准数据、历史记录、偏好设置）
- Service Worker（离线缓存）
- Web App Manifest（PWA 安装）

## 项目结构

```
SpoonForce/
├── index.html          主页面
├── manifest.json       PWA 清单
├── sw.js               Service Worker
├── css/
│   └── style.css       样式（含深色模式）
├── js/
│   ├── app.js          主逻辑
│   ├── force-sensor.js 压力传感 + 滤波
│   ├── calibration.js  2 点校准
│   ├── storage.js      本地存储
│   └── i18n.js         国际化
└── icons/
    └── icon.svg        应用图标
```

## 部署

纯静态文件，直接部署到任意静态托管服务：

```bash
# GitHub Pages / Vercel / Netlify 等
# 直接上传所有文件即可，无需构建
```

本地预览：

```bash
python -m http.server 8080
# 然后访问 http://localhost:8080
```

## 局限性

1. **最大载荷约 385g**：超过此重量 `force` 值触顶，无法区分
2. **低量程误差**：10g 以下精度有限
3. **设备依赖**：仅 3D Touch iPhone（6s ~ Xs）可精确测量
4. **摆放影响**：勺子的放置位置和角度会影响结果（±2g），需多次调整
5. **非精密仪器**：仅供参考，不可替代专业厨房秤

## License

MIT
