/**
 * 「最终版外观」的数据快照 —— 由用户在浏览器编辑工具栏里调好后导出、固化而来。
 *
 * 这些值原本只活在他那台浏览器的 localStorage 里：换浏览器、清缓存、换电脑就没了，
 * 访客更是从来都看不到。写进这里以后，谁打开这个网站都会看到同一套效果。
 *
 * 生成方式：node make-look-data.mjs <导出的.json>（导出于 2026-10-28）
 * 注意：不要手改数值，要改请在浏览器里调好之后重新导出、重新生成。
 */

// 主题（页面 data-theme，决定配色方案）
export const LOOK_THEME = "abcd"

// 全局 CSS 变量：字体栈、配色、间距、整体缩放 …
export const LOOK_TOKENS = {
  "--font-display": "'Inter Tight', 'Schibsted Grotesk', 'PingFang SC', 'HarmonyOS Sans SC', 'Source Han Sans SC', 'Noto Sans SC', 'Microsoft YaHei', sans-serif",
  "--paper": "#ffffff",
  "--paper-2": "#6e603f",
  "--ink": "#292724",
  "--font-cover": "'FZ HuaSi KeXian', 'Schibsted Grotesk', 'PingFang SC', 'HarmonyOS Sans SC', 'Source Han Sans SC', 'Noto Sans SC', 'Microsoft YaHei', sans-serif",
  "--max": "1900px",
  "--img-saturation": "0.7",
  "--img-scale": "1",
  "--col-gap": "13px",
  "--tracking-display": "-0.055em",
  "--page-zoom": "1.15",
  "--section-space": "0.9"
}

// 每个模块自己的微调：底色 / 文字色 / 强调色 / 缩放 / 隐藏 / 上下留白
export const LOOK_SECTIONS = {
  "profile": {
    "zoom": 0.99,
    "bg": "#000000",
    "ink": "#d6d6d6",
    "accent": "#ffffff"
  },
  "marquee": {
    "bg": "#ffd70f",
    "ink": "#000000"
  },
  "orbit": {
    "zoom": 1.06,
    "space": 0.95
  },
  "aigc": {
    "hidden": 1
  },
  "statement": {
    "hidden": 1
  }
}

// 单块文字的字号 / 字距 / 行高 / 字体 / 颜色 / 位移，键是「模块|片段」
export const LOOK_TEXT_STYLES = {
  "orbit|6 个全案项目的实拍 —— 拖动可转，点任意一张": {
    "ls": -0.025
  },
  "capability|03 / CAPABILITY": {
    "size": 157,
    "weight": "500",
    "ls": -0.005,
    "lh": 0.95,
    "dx": 0
  },
  "capability|个人优势": {
    "size": 93,
    "ls": -0.005,
    "lh": 1
  },
  "profile|工作经验": {
    "dy": -27
  },
  "profile|M": {
    "ls": 0.07
  },
  "contact|Let's work together to c": {
    "size": 14,
    "weight": "300",
    "family": "Schibsted Grotesk"
  },
  "contact|2026/portfolio": {
    "family": "Schibsted Grotesk",
    "size": 23,
    "dy": -56,
    "dx": -9
  },
  "contact|作品集设计来自 林增宇": {
    "family": "Schibsted Grotesk",
    "size": 15,
    "dy": -53,
    "dx": -11
  },
  "project-experience|BRAND": {
    "size": 88
  },
  "project-experience|品牌": {
    "size": 87
  },
  "project-experience|项目经历": {
    "size": 87
  },
  "project-experience|PROJECT": {
    "size": 87
  },
  "project-experience|EXPERIENCE": {
    "size": 87
  },
  "project-experience|作品集收录了自 2024–2026 工作期间的部": {
    "family": "Archivo"
  },
  "orbit|WORK INDEX": {
    "size": 139,
    "color": "#030303"
  },
  "orbit|作品一览": {
    "size": 90
  },
  "top|LIN ZENGYU IS A BRAND DE": {
    "family": "Outfit"
  },
  "profile|我": {
    "family": "Archivo"
  },
  "profile|于": {
    "family": "Archivo"
  },
  "profile|关": {
    "family": "Archivo"
  },
  "profile|揭": {
    "family": "Archivo"
  },
  "profile|阳": {
    "family": "Archivo"
  },
  "profile|广": {
    "family": "Archivo"
  },
  "profile|东": {
    "family": "Archivo"
  },
  "profile|来": {
    "family": "Archivo"
  },
  "profile|自": {
    "family": "Archivo"
  },
  "profile|u": {
    "family": "Schibsted Grotesk"
  }
}

// 改过文案的文字：键是原文，值是改后的样子（空串 = 删掉这段文字）
export const LOOK_TEXT_EDITS = {
  "03 / CAPABILITY": " CAPABILITY",
  "LIN ZENGYU IS A BRAND DESIGNER BASED IN GUANGZHOU, WORKING FROM STRATEGY AND NAMING TO VISUAL IDENTITY, PACKAGING AND STORE SPACE — 3 YEARS, 200+ CHAIN STORES DELIVERED.": "THIS PORTFOLIO SHOWCASES A SELECTION OF COMMERCIAL\nDESIGN PROJECTS FROM 2024–2026, WITH A FOCUS ON\nRESTAURANT BRAND DESIGN. ",
  "让品牌被记住，让设计能落地。": "",
  "单店模型": ""
}

// 各模块自己读写 localStorage 的设置，缺的时候种一次：
// 封面印字 / 文字滚动条 / 个人优势 / 细节放大 / 作品轨道 / 拖动位移
export const LOOK_STORAGES = {
  "lzy-cover-text-v4": {
    "items": [
      {
        "id": "text-0",
        "name": "Brand Designer",
        "t": "Brand Designer",
        "x": 0.13862,
        "y": 0.14886,
        "s": 0.018955,
        "f": "display",
        "w": 400,
        "c": "#171614",
        "ff": "Outfit",
        "ls": -0.015,
        "dx": 0,
        "dy": 0
      },
      {
        "id": "text-1",
        "name": "( INDIVIDUAL/",
        "t": "( INDIVIDUAL/",
        "x": 0.17519,
        "y": 0.24755,
        "s": 0.008841,
        "f": "mono",
        "w": 400,
        "c": "#171614",
        "ff": "Outfit",
        "ls": -0.015,
        "dx": 0,
        "dy": 0
      },
      {
        "id": "text-2",
        "name": "PORTFOLIO )",
        "t": "PORTFOLIO )",
        "x": 0.21642,
        "y": 0.26704,
        "s": 0.008841,
        "f": "mono",
        "w": 400,
        "c": "#171614",
        "ff": "Outfit",
        "ls": -0.025,
        "dx": 8,
        "dy": 0
      },
      {
        "id": "text-3",
        "name": "个",
        "t": "个",
        "x": 0.13473,
        "y": 0.22806,
        "s": 0.035647,
        "f": "cover",
        "w": 500,
        "c": "#171614",
        "ff": "",
        "ls": 0,
        "dx": 0,
        "dy": 0
      },
      {
        "id": "text-4",
        "name": "人",
        "t": "人",
        "x": 0.28929,
        "y": 0.22806,
        "s": 0.035647,
        "f": "cover",
        "w": 500,
        "c": "#171614",
        "ff": "",
        "ls": 0,
        "dx": 0,
        "dy": 0
      },
      {
        "id": "text-5",
        "name": "作品",
        "t": "作品",
        "x": 0.13438,
        "y": 0.28791,
        "s": 0.035647,
        "f": "cover",
        "w": 500,
        "c": "#171614",
        "ff": "",
        "ls": 0,
        "dx": 0,
        "dy": 0
      },
      {
        "id": "text-6",
        "name": "集",
        "t": "集",
        "x": 0.25564,
        "y": 0.28791,
        "s": 0.035647,
        "f": "cover",
        "w": 500,
        "c": "#171614",
        "ff": "",
        "ls": 0,
        "dx": 0,
        "dy": 0
      },
      {
        "id": "text-7",
        "name": "portfolio - 2026",
        "t": "portfolio - 2026",
        "x": 0.13475,
        "y": 0.36186,
        "s": 0.015041,
        "f": "mono",
        "w": 400,
        "c": "#171614",
        "ff": "Archivo",
        "ls": -0.01,
        "dx": 0,
        "dy": 0
      },
      {
        "id": "text-8",
        "name": "LINZENGYU",
        "t": "LINZENGYU",
        "x": 0.77015,
        "y": 0.05847,
        "s": 0.011529,
        "f": "mono",
        "w": 400,
        "c": "#171614",
        "ff": "FZ HuaSi KeXian",
        "ls": 0,
        "dx": 0,
        "dy": 0
      }
    ],
    "big": {
      "id": "big",
      "name": "Portfolio 大字",
      "t": "Portfolio",
      "x": 0.13141,
      "y": 0.599,
      "s": 0.17471,
      "w": 500,
      "c": "#171614",
      "ff": "",
      "ls": -0.01,
      "dx": 0,
      "dy": 0,
      "f": ""
    },
    "tape": {
      "id": "tape",
      "name": "黄色胶带",
      "t": "",
      "x": 0.0832,
      "y": 0.5581,
      "w": 0.0924,
      "h": 0.2206,
      "rot": 0,
      "ff": "",
      "dx": 0,
      "dy": 0
    },
    "falling": {
      "id": "falling",
      "name": "七个能力标签",
      "words": [
        "Brand Positioning",
        "Brand Visual Identity",
        "Brand Chain Spaces",
        "Brand Materials",
        "Annual Operations",
        "Packaging Design",
        "AIGC Tools"
      ],
      "x": 0.562,
      "y": 0.567,
      "w": 0.305,
      "h": 0.3,
      "s": 0.009732,
      "gap": 2.11,
      "lh": 1.75,
      "ff": "Outfit",
      "c": "#4d4d4d",
      "dx": 0,
      "dy": 0
    },
    "savedAt": "2026-10-28T09:19:39.721Z"
  },
  "lzy-marquee-v1": {
    "words": [
      "品牌策略",
      "视觉 VI",
      "超级包装",
      "空间软装",
      "年度运营"
    ],
    "ff": "Outfit",
    "scale": 0.99,
    "ls": 0,
    "gap": 1,
    "speed": 42
  },
  "lzy-cap-v1": {
    "history": [
      {
        "scale": 0.7,
        "at": 1792673271761
      },
      {
        "scale": 0.65,
        "at": 1792673271761
      },
      {
        "scale": 0.7,
        "at": 1792673277652
      },
      {
        "scale": 0.75,
        "at": 1792673318156
      }
    ],
    "index": 3
  },
  "lzy-peek-v1": {
    "meW": 300,
    "workW": 500
  },
  "lzy-orbit-v1": {
    "itemSize": 160,
    "radiusX": 380,
    "radiusY": 180,
    "rotation": -0.5,
    "depth": 0,
    "dim": 0,
    "scales": [
      1.18,
      0.84,
      0.84,
      0.86,
      1.34,
      1.08
    ],
    "centerText": "",
    "centerHint": "",
    "centerSize": 54,
    "centerTracking": 0.06,
    "centerFamily": "",
    "centerHintSize": 9,
    "centerHintTracking": 0.1,
    "centerHintFamily": "",
    "centerX": 0,
    "centerY": 0,
    "noteSize": 12,
    "noteGap": 7,
    "noteLead": 3,
    "noteDx": 0,
    "noteDy": -14,
    "noteOpacity": 0.55,
    "noteOffsets": [
      -61,
      -13,
      0,
      0,
      -27,
      -13
    ]
  },
  "lzy-move-v1": {
    "text|profile|工作经验": {
      "x": 0,
      "y": -25
    },
    "text|profile|广州智汇创意产业发展有限公司": {
      "x": 0,
      "y": 25
    },
    "text|profile|2024/5-2026/9": {
      "x": 0,
      "y": -11
    },
    "text|profile|品牌资深设计师": {
      "x": 0,
      "y": 26
    },
    "text|profile|负责品牌视觉系统（VI）全案搭建 独立完成方案提": {
      "x": 0,
      "y": -10
    },
    "text|profile|广州蓝企生物医药科技有限公司": {
      "x": 0,
      "y": 27
    },
    "text|profile|2023/3-2024/3": {
      "x": 0,
      "y": -11
    },
    "text|profile|包装设计、产品视觉落地": {
      "x": 0,
      "y": -10
    },
    "text|profile|包装设计师": {
      "x": 0,
      "y": 28
    },
    "text|profile|关于我": {
      "x": 36,
      "y": 36
    },
    "text|profile|来自 广东揭阳": {
      "x": 0,
      "y": 36
    },
    "text|profile|A": {
      "x": 97,
      "y": 0
    },
    "text|profile|About MeAbout Me": {
      "x": 34,
      "y": 6
    },
    "text|contact|Let's work together to c": {
      "x": 0,
      "y": 15
    },
    "text|contact|Email：": {
      "x": 0,
      "y": -3
    },
    "text|contact|3079039811@qq.com": {
      "x": 0,
      "y": -5
    },
    "text|contact|2026/portfolio": {
      "x": -6,
      "y": -72
    },
    "text|contact|作品集设计来自 林增宇": {
      "x": -8,
      "y": -70
    },
    "text|contact|尾页圆点": {
      "x": -74,
      "y": -81
    },
    "text|project-experience|项目经历": {
      "x": -17,
      "y": 13
    },
    "text|project-experience|PROJECT": {
      "x": 24,
      "y": 20
    },
    "text|project-experience|品牌": {
      "x": 23,
      "y": 18
    },
    "text|project-experience|BRAND": {
      "x": -89,
      "y": 18
    },
    "text|project-experience|EXPERIENCE": {
      "x": -87,
      "y": 20
    },
    "text|project-experience|对我来说，设计是整体性的：形式和功能并非分离的东": {
      "x": 0,
      "y": 13
    },
    "text|orbit|WORK INDEX": {
      "x": -76,
      "y": -72
    },
    "text|orbit|作品一览": {
      "x": -70,
      "y": -68
    },
    "text|capability|个人优势": {
      "x": 12,
      "y": 0
    },
    "text|top|LIN ZENGYU IS A BRAND DE": {
      "x": 52,
      "y": 0
    },
    "text|profile|于": {
      "x": 0,
      "y": -91
    },
    "text|top|Brand Visual Identity": {
      "x": 90,
      "y": 0
    },
    "text|top|Brand Positioning": {
      "x": 79,
      "y": 0
    },
    "text|top|AIGC Tools": {
      "x": 90,
      "y": 0
    },
    "text|top|Packaging Design": {
      "x": 81,
      "y": 0
    },
    "text|root|01": {
      "x": -1,
      "y": 0
    }
  }
}
