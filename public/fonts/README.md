# 字体文件 / Fonts

全部为 **SIL Open Font License (OFL)** 字体，可免费自托管与商用。来源：Google Fonts。

| 文件 | 字体 | 气质 | 体积 |
| --- | --- | --- | --- |
| `schibsted-grotesk.woff2` | Schibsted Grotesk | 北欧报业感，中性克制（**当前使用**） | 46KB |
| `archivo.woff2` | Archivo | 硬朗工业感，字面更宽 | 34KB |
| `space-grotesk.woff2` | Space Grotesk | 科技感，字母有古怪细节 | 22KB |
| `outfit.woff2` | Outfit | 几何圆润，最接近参考封面 | 32KB |
| `syne.woff2` | Syne | 时装感，主张性强 | 34KB |
| `inter-tight.woff2` | Inter Tight | 瑞士中性，最稳 | 44KB |
| `jetbrains-mono.woff2` | JetBrains Mono | 标签 / 数据等宽字 | 31KB |

浏览器只会下载**实际用到**的那一个，所以留着全部候选不会拖慢网站。

## 换字体（30 秒）

打开 `src/styles/base.css`，把这两行的第一个字体名换掉：

```css
--font-display: 'Schibsted Grotesk', ...;  /* 大标题、封面 Portfolio */
--font-sans:    'Schibsted Grotesk', ...;  /* 正文拉丁字母 */
```

候选名：`'Schibsted Grotesk'` `'Archivo'` `'Space Grotesk'` `'Outfit'` `'Syne'` `'Inter Tight'`

换完刷新页面即可，不用重新下载任何东西。字体不同，大标题的字距通常也要微调，
改 `--tracking-display`（目前 `-0.045em`）即可。

## 想加一个全新的字体

1. 把 `.woff2` 文件放进本目录；
2. 在 `src/styles/fonts.css` 里照着已有格式加一段 `@font-face`（`font-family` 取个名字）；
3. 在 `base.css` 的 `--font-display` 里用这个名字。

## 中文

中文没有自托管字体，走系统黑体栈（苹果→苹方，Windows→微软雅黑，鸿蒙→HarmonyOS Sans），
这样文件最轻、打开最快。如果希望所有访客看到完全一致的中文字形，可以改成自托管的
思源黑体 / Noto Sans SC，但完整字重有 10MB 以上——通常做法是按网站实际用到的字做子集化，
能把体积压到 200KB 左右。需要的话告诉我，我来切。
