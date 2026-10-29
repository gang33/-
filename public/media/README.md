# 媒体资源说明 / Media assets

## 现在的状态

- `projects/` 里是**从你的 PDF 作品集里提取出来的真实项目照片**（已在用）
- `hero-scene.svg` 是首屏背景的矢量场景（视频加载前的底图）
- `portrait.svg` 是个人经历模块用的**排版式占位人像**，等你给真实照片就替换

## 图片清单

| 文件 | 用在哪 | 尺寸 | 来源 |
| --- | --- | --- | --- |
| `projects/miandieye.jpg` | 项目 01 面老爹 | 1800×1013 | PDF P22 门店实拍 |
| `projects/miandieye-space.jpg` | 备用（空间图） | 1800×1013 | PDF P24 |
| `projects/nongwuye.jpg` | 项目 02 农五爷 | 1018×766 | PDF P42 门店现场 |
| `projects/caishen.jpg` | 项目 03 财神糖水铺 | 1400×1050 | PDF P83 两张节庆海报拼合 |
| `projects/shuaicha.jpg` | 项目 04 帅茶 | 1800×1013 | PDF P47 包装系统 |
| `projects/bailaohao.jpg` | 项目 05 百老号 | 1296×917 | PDF P70 物料 |
| `projects/bailaohao-store.jpg` | 备用（门店图） | 1400×1056 | PDF P79 |
| `projects/musheng.jpg` | 项目 06 木生方舟 | 1800×1013 | PDF P60 物料 |

想换某张图：把新图放进 `public/media/projects/`，然后在 `src/data.js` 里改对应项目的 `image` 字段。

## 换成真实视频（首屏）

把 `hero.mp4` 放在本目录即可，`Hero.jsx` 已经引用了 `/media/hero.mp4`，能播放就自动淡入覆盖矢量背景。

建议规格：1920×1080，H.264，8–15 秒，无声循环，< 8MB。

## 换成真实人像

把照片命名为 `portrait.jpg` 放到本目录，然后把 `src/components/Profile.jsx` 里的
`/media/portrait.svg` 改成 `/media/portrait.jpg`。建议 4:5 竖构图，1200×1500 以上。

## 素材来源说明

`_素材/` 目录（不会打包进网站）保留了从 PDF 提取的全部中间产物：

- `_素材/pdf-pages/` — 99 页整页渲染 + `text-export.txt` 文字提取
- `_素材/裁切2/`、`_素材/裁切3/` — 从页面里自动识别并裁出来的图片候选
- `_素材/拼图/` — 我用来挑图的预览拼图

需要别的项目图（比如某个项目的包装、空间、物料细节），告诉我项目名，我从 PDF 对应页码裁。
