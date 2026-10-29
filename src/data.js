export const site = {
  name: '林增宇',
  nameEn: 'LIN ZENGYU',
  role: '品牌设计师 / AI 设计师',
  roleEn: 'BRAND DESIGNER & AI DESIGNER',
  base: '广州 · 中国',
  since: '2022',
  email: '3079039811@qq.com',
  phone: '17876892715',
  wechat: 'lzy3079039811',
  availability: '2026 项目档期开放中',
}

export const navLinks = [
  { label: '个人经历', en: 'PROFILE', href: '#profile', idx: '01' },
  { label: '作品一览', en: 'WORK', href: '#orbit', idx: '02' },
  { label: '个人优势', en: 'CAPABILITY', href: '#capability', idx: '03' },
  { label: '联系方式', en: 'CONTACT', href: '#contact', idx: '04' },
]

export const heroStats = [
  { value: '3', unit: '年', cap: '品牌设计经验' },
  { value: '200', unit: '+', cap: '连锁门店主创' },
  { value: '500', unit: '+', cap: '门店年度运营' },
  { value: '6', unit: '个', cap: '全案品牌项目' },
]

export const marqueeWords = [
  '品牌策略',
  '视觉识别 VI',
  '全案包装',
  '空间软装',
  '超级口号',
  '单店模型',
  '年度运营',
  'AIGC 工作流',
]

export const profile = {
  introTitle: '理性思考，感性设计。',
  hometown: '广东揭阳',
  livingIn: '广州',
  meta: [
    { label: '姓名', value: '林增宇' },
    { label: '邮箱', value: '3079039811@qq.com', href: 'mailto:3079039811@qq.com' },
    { label: '生日', value: '2002.02.24' },
    { label: '专业', value: '视觉传播设计与制作' },
    { label: '电话', value: '17876892715', href: 'tel:17876892715' },
  ],
  portraitNote: {
    name: '林增宇',
    role: '3 年品牌设计师',
    line: '熟悉品牌从 0 到 1 的全链路系统建设',
    city: '广州',
  },
  bio: [
    '3 年品牌设计经验，200+ 连锁门店品牌主创设计师，擅长独立完成品牌从 0 到 1 的全链路系统建设。',
    '熟悉品牌前期的市场调研、竞品分析与品类机会判断，能把商业策略翻译为可持续积累的视觉语言；也习惯把每一个设计决策，提前对齐到落地成本与门店执行。',
    '追求设计感与落地性是我的准则。我坚信好的设计不是自嗨式的，而是一个共创的过程。',
  ],
  contacts: [
    { label: 'EMAIL', value: '3079039811@qq.com', href: 'mailto:3079039811@qq.com' },
    { label: 'PHONE', value: '17876892715', href: 'tel:17876892715' },
    { label: 'WECHAT', value: 'lzy3079039811' },
    { label: 'BASE', value: '广州 · 中国' },
  ],
  stats: [
    { value: '3', unit: '年', cap: '品牌设计经验' },
    { value: '200', unit: '+', cap: '连锁门店主创' },
    { value: '500', unit: '+', cap: '门店年度运营' },
    { value: '6', unit: '个', cap: '全案品牌项目' },
  ],
  experience: [
    {
      period: '2024/5-2026/9',
      org: '广州智汇创意产业发展有限公司',
      role: '品牌资深设计师',
      note: '负责品牌视觉系统（VI）全案搭建\n独立完成方案提报并推动客户决策',
    },
    {
      period: '2023/3-2024/3',
      org: '广州蓝企生物医药科技有限公司',
      role: '包装设计师',
      note: '包装设计、产品视觉落地',
    },
  ],
  education: [],
}

// 面老爹详情长图：_素材\作品\面老爹小笼包 里的 24 张 16:9 图，
// 已转成 webp 存在 public/media/projects/miandieye/01…24.webp
const miandieyeGallery = Array.from(
  { length: 24 },
  (_, i) => `/media/projects/miandieye/${String(i + 1).padStart(2, '0')}.webp`,
)

// 农五爷详情长图：_素材\作品\农五爷 里的 15 张（首图是竖版封面），
// 已转成 webp 存在 public/media/projects/nongwuye/01…15.webp
const nongwuyeGallery = Array.from(
  { length: 15 },
  (_, i) => `/media/projects/nongwuye/${String(i + 1).padStart(2, '0')}.webp`,
)

// 帅茶详情长图：_素材\作品\帅茶 里的 12 张（首图是竖版封面），
// 已转成 webp 存在 public/media/projects/shuaicha/01…12.webp
const shuaichaGallery = Array.from(
  { length: 12 },
  (_, i) => `/media/projects/shuaicha/${String(i + 1).padStart(2, '0')}.webp`,
)

// 木生方舟详情长图：_素材\作品\木生方舟 里的 13 张（源文件名从 -02 开始，全 16:9），
// 已转成 webp 存在 public/media/projects/musheng/01…13.webp
const mushengGallery = Array.from(
  { length: 13 },
  (_, i) => `/media/projects/musheng/${String(i + 1).padStart(2, '0')}.webp`,
)

// 百老号详情长图：_素材\作品\百老号 里的 16 张（首图是竖版封面），
// 已转成 webp 存在 public/media/projects/bailaohao/01…16.webp
const bailaohaoGallery = Array.from(
  { length: 16 },
  (_, i) => `/media/projects/bailaohao/${String(i + 1).padStart(2, '0')}.webp`,
)

// 财神（黎耀阳）详情长图：_素材\作品\财神 里的 18 张（首图略高），
// 已转成 webp 存在 public/media/projects/caishen/01…18.webp
const caishenGallery = Array.from(
  { length: 18 },
  (_, i) => `/media/projects/caishen/${String(i + 1).padStart(2, '0')}.webp`,
)

// image：详情浮层用的大图；orbitImage：作品轨道上的透明底「作品环绕」图（已裁掉透明留白）
// gallery：详情浮层里往下滚的一串长图（有就优先用，没有就只显示 image）
export const projects = [  {
    id: 'miandieye',
    idx: '01',
    title: '面老爹 · 手作小笼包',
    titleEn: 'MIAN LAO DIE',
    year: '2026.03',
    category: '连锁餐饮 / 全案品牌系统',
    role: '项目主导 · 主创设计师',
    desc: '以「中国手作小笼包＝面老爹」的品类代表者战略抢占消费者心智，提炼超级口号「中国小笼包，面老爹现包」；用小笼包大单品打破「只做早餐」的时段限制，再把单店模型成本压到极致，让品牌强识别、易传播、好落地。',
    tags: ['品类代表者战略', '超级口号', 'VI 全案', '单店模型', '空间软装'],
    metric: { value: '200', unit: '+', cap: '半年拓店 200+ 家 · 广 / 沪 / 杭' },
    image: '/media/projects/miandieye.jpg',
    orbitImage: '/media/projects/orbit-miandieye.webp',
    gallery: miandieyeGallery,
    layout: 'wide',
  },
  {
    id: 'nongwuye',
    idx: '02',
    title: '农五爷 · 鲜货烧烤',
    titleEn: 'NONG WU YE',
    year: '2026.06',
    category: '鲜货烧烤 / 全案品牌系统',
    role: '项目主导 · 主创设计师',
    desc: '抓住客户自有鲜肉厂这一卖点，把「厂」当作文化母体：用「厂在身边，肉更新鲜」把新鲜可视化，构建松弛的工厂场景体验，传递可靠、有标准、高性价比的品牌价值。',
    tags: ['文化母体', '广告语', '场景体验', '包装物料'],
    metric: { value: '2.8', unit: '万', cap: '开业一个月平均日营业额' },
    image: '/media/projects/nongwuye.jpg',
    orbitImage: '/media/projects/orbit-nongwuye.webp',
    gallery: nongwuyeGallery,
    layout: 'split',
  },
  {
    id: 'caishen',
    idx: '03',
    title: '黎耀阳 · 财神糖水铺',
    titleEn: 'CAISHEN TANG SHUI',
    year: '2024 — 2026',
    category: '糖水连锁 / 年度运营设计',
    role: '年度运营主负责人',
    desc: '挖掘「财神」这一国民级文化符号，转化为品牌核心资产，确立「财神糖水」的品类心智占位；以财神形象为视觉锚点，长期统一、重复积累，让品牌资产逐年复利。',
    tags: ['文化符号资产化', '年度运营', '心智占位', '节庆海报'],
    metric: { value: '500', unit: '+', cap: '全国门店（200 → 500+）' },
    image: '/media/projects/caishen.jpg',
    orbitImage: '/media/projects/orbit-caishen.webp',
    gallery: caishenGallery,
    layout: 'split-reverse',
  },
  {
    id: 'shuaicha',
    idx: '04',
    title: '帅茶 · 鲜制茶',
    titleEn: 'SHUAI CHA',
    year: '2025.01',
    category: '茶饮连锁 / 品牌升级',
    role: '视觉主导',
    desc: '围绕「帅」这一态度符号升级品牌：把「帅」解构成可走近的空间装置，配齐杯贴、纸袋与包装系统，用高饱和黄色抢下货架第一眼识别。',
    tags: ['品牌升级', '态度符号', '包装系统', '空间装置'],
    metric: { value: '30', unit: '+', cap: '品牌升级后门店' },
    image: '/media/projects/shuaicha.jpg',
    orbitImage: '/media/projects/orbit-shuaicha.webp',
    gallery: shuaichaGallery,
    layout: 'compact',
  },
  {
    id: 'bailaohao',
    idx: '05',
    title: '百老号 · 干挑面',
    titleEn: 'BAI LAO HAO',
    year: '2025.07',
    category: '面食连锁 / 品牌全案',
    role: '视觉主导',
    desc: '以「中华南北美食文化的大运河画卷」串联广州、安庆、湖州、郴州、杭州、上海、哈尔滨七座城市，用统一红金体系与门店叙事营造「百年老店」体验。',
    tags: ['品牌全案', '文化叙事', '门店体验', '物料延展'],
    metric: { value: '7', unit: '城', cap: '七城门店联动' },
    image: '/media/projects/bailaohao.jpg',
    orbitImage: '/media/projects/orbit-bailaohao.webp',
    gallery: bailaohaoGallery,
    layout: 'compact',
  },
  {
    id: 'musheng',
    idx: '06',
    title: '木生方舟',
    titleEn: 'MŌSHEN',
    year: '2026.01',
    category: '健康东方 / 品牌视觉',
    role: '视觉主导',
    desc: '以「木生万物，方舟载祥」为原点，把树木肌理融入字体与品牌纹理；门店以石、原木与绿植与自然对话，兼顾科学性与东方美学。',
    tags: ['概念构建', '字体设计', '品牌纹理', '空间叙事'],
    metric: { value: '0→1', unit: '', cap: '品牌视觉从概念到落地' },
    image: '/media/projects/musheng.jpg',
    orbitImage: '/media/projects/orbit-musheng.webp',
    gallery: mushengGallery,
    layout: 'compact',
  },
]

export const aiWorkflow = {
  title: 'AIGC 辅助工作流',
  intro:
    '把大语言模型与图像生成模型接进设计流程，从主题、文案到成图形成可复制、可交付的 AI 工作流 —— 效率交给工具，判断留给自己。',
  steps: [
    { num: '01', title: '需求拆解', desc: '明确新品卖点、目标人群与投放场景，先想清楚要卖什么。' },
    { num: '02', title: '确定风格', desc: '夏日海边度假风，休闲松弛感，突出夏日解暑。' },
    {
      num: '03',
      title: '确定主题',
      desc: '用大语言模型快速出主题与文案：清补凉一下 · 好运清凉一夏。',
    },
    { num: '04', title: '画面构思', desc: '用色块快速概括画面内容与比例，先定构图再谈细节。' },
    {
      num: '05',
      title: 'AI 生图',
      desc: '垫图确定比例与框架，再用提示词精确元素、色彩、风格与光影。',
    },
    {
      num: '06',
      title: '后期处理',
      desc: '不断优化关键词抽卡定稿，再做产品替换、调色与局部修饰，最后加字成图。',
    },
  ],
  quote:
    '在这个 AI 盛行的时代，设计正在发生一场深刻的变化。未来设计师的核心壁垒，不再只是会不会做图、掌握多少工具，而是能否在复杂的信息中依然做出准确的判断与选择。',
}

export const capabilities = [
  {
    num: '01',
    title: '品牌策略思维',
    en: 'Brand Positioning',
    desc: '市场调研、竞品分析、客群洞察、品牌自身；完成品牌定位、命名、广告语、信任状、具备策划>设计>落地的完整转化能力。',
    // 断句严格按参考图（每行一个数组元素，渲染时按行输出）
    descLines: [
      '市场调研、竞品分析、客群洞察、品牌自身；',
      '完成品牌定位、命名、广告语、信任状、具备',
      '策划>设计>落地的完整转化能力。',
    ],
  },
  {
    num: '02',
    title: '视觉体系搭建',
    en: 'Brand Visual Identity',
    desc: '品牌视觉识别系统（VI）全案构建与升级，LOGO / 字体 / 包装 / 菜单 / 空间软装 / 延展物料品牌视觉全系设计。',
    descLines: [
      '品牌视觉识别系统(VI)全案构建与升级，LOGO/',
      '字体/包装/菜单/空间软装/延展物料品牌视觉全',
      '系设计。',
    ],
  },
  {
    num: '03',
    title: '项目管理与协同',
    en: 'Project Management',
    desc: '项目全流程统筹与出品把控；跨部门（策划 / 视觉 / 空间）协同推动；项目时间节点管理，独立提案汇报与预期管理。',
    descLines: [
      '项目全流程统筹与出品把控；跨部门（策划/视',
      '觉/空间）协同推动；项目时间节点管理，独立',
      '提案汇报与预期管理。',
    ],
  },
  {
    num: '04',
    title: 'AIGC 辅助工具',
    en: 'AIGC Tools',
    desc: '运用大语言模型快速出灵感方案，通过图形生成 AI 模型将创意实现，形成可复制可交付的 AI 工作流。',
    descLines: [
      '运用大语言模型快速出灵感方案，通过图形生',
      '成AI模型将创意实现，形成可复制可交付的AI',
      '工作流。',
    ],
  },
]
