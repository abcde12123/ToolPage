// 夏夜工具集 - 亲戚称呼计算器 (ES5)
// 关系链 → 称呼（含反向「他/她叫我什么」）
// 规则表全部网络查证（百度百科/维基百科/教育部辞典等），只放查证过的真实叫法；地域差异已标注
// 架构：同义词表 SYN → 基础词表 KIN（称谓展示）→ 两两组合规则 RULES（逐步归约，支持 3 级+链）→ 反向表 REVERSE

window.initKinCalc = function(container) {

    // --- 称谓展示表：key → 显示信息 ---
    var KIN = {
        '丈夫':   { name: '丈夫',   aliases: ['老公', '先生'], sex: '男', desc: '自己的配偶（男性）' },
        '妻子':   { name: '妻子',   aliases: ['老婆', '太太'], sex: '女', desc: '自己的配偶（女性）' },
        '爸爸':   { name: '爸爸',   aliases: ['父亲', '爹', '老爸'], sex: '男', desc: '直系长辈' },
        '妈妈':   { name: '妈妈',   aliases: ['母亲', '娘', '老妈'], sex: '女', desc: '直系长辈' },
        '爷爷':   { name: '爷爷',   aliases: ['祖父', '阿公'], sex: '男', desc: '爸爸的爸爸' },
        '奶奶':   { name: '奶奶',   aliases: ['祖母', '阿婆'], sex: '女', desc: '爸爸的妈妈' },
        '外公':   { name: '外公',   aliases: ['外祖父', '姥爷'], sex: '男', desc: '妈妈的爸爸（北方也叫姥爷）' },
        '外婆':   { name: '外婆',   aliases: ['外祖母', '姥姥'], sex: '女', desc: '妈妈的妈妈（北方也叫姥姥）' },
        '曾祖父': { name: '曾祖父', aliases: ['太爷爷', '太公'], sex: '男', desc: '爷爷的爸爸' },
        '曾祖母': { name: '曾祖母', aliases: ['太奶奶', '太婆'], sex: '女', desc: '爷爷的妈妈' },
        '高祖父': { name: '高祖父', aliases: ['太祖父'], sex: '男', desc: '曾祖父的爸爸' },
        '高祖母': { name: '高祖母', aliases: ['太祖母'], sex: '女', desc: '曾祖父的妈妈' },
        '外曾祖父': { name: '外曾祖父', aliases: ['太外公'], sex: '男', desc: '外公的爸爸' },
        '外曾祖母': { name: '外曾祖母', aliases: ['太外婆'], sex: '女', desc: '外婆的妈妈' },
        '伯父':   { name: '伯父',   aliases: ['伯伯', '大伯'], sex: '男', desc: '爸爸的哥哥' },
        '叔叔':   { name: '叔叔',   aliases: ['叔父', '叔'], sex: '男', desc: '爸爸的弟弟' },
        '姑妈':   { name: '姑妈',   aliases: ['姑姑', '姑母'], sex: '女', desc: '爸爸的姐妹（年长称姑妈/大姑，年幼称姑姑/小姑）' },
        '伯祖父': { name: '伯祖父', aliases: ['伯公', '伯爷爷'], sex: '男', desc: '爷爷的哥哥' },
        '叔祖父': { name: '叔祖父', aliases: ['叔公', '叔爷爷'], sex: '男', desc: '爷爷的弟弟' },
        '姑祖母': { name: '姑祖母', aliases: ['姑奶奶', '姑婆'], sex: '女', desc: '爷爷的姐妹' },
        '伯祖母': { name: '伯祖母', aliases: ['伯婆'], sex: '女', desc: '伯祖父的妻子' },
        '叔祖母': { name: '叔祖母', aliases: ['叔婆'], sex: '女', desc: '叔祖父的妻子' },
        '姑祖父': { name: '姑祖父', aliases: ['姑公'], sex: '男', desc: '姑祖母的丈夫' },
        '舅舅':   { name: '舅舅',   aliases: ['舅父', '舅'], sex: '男', desc: '妈妈的兄弟' },
        '姨妈':   { name: '姨妈',   aliases: ['姨母', '大姨', '小姨'], sex: '女', desc: '妈妈的姐妹（年长称大姨，年幼称小姨）' },
        '哥哥':   { name: '哥哥',   aliases: ['兄', '大哥'], sex: '男', desc: '同辈年长男性' },
        '姐姐':   { name: '姐姐',   aliases: ['姐', '大姐'], sex: '女', desc: '同辈年长女性' },
        '弟弟':   { name: '弟弟',   aliases: ['弟'], sex: '男', desc: '同辈年幼男性' },
        '妹妹':   { name: '妹妹',   aliases: ['妹'], sex: '女', desc: '同辈年幼女性' },
        '嫂子':   { name: '嫂子',   aliases: ['嫂'], sex: '女', desc: '哥哥的妻子' },
        '弟媳':   { name: '弟媳',   aliases: ['弟妹'], sex: '女', desc: '弟弟的妻子' },
        '姐夫':   { name: '姐夫',   aliases: [], sex: '男', desc: '姐姐的丈夫' },
        '妹夫':   { name: '妹夫',   aliases: [], sex: '男', desc: '妹妹的丈夫' },
        '伯母':   { name: '伯母',   aliases: ['伯娘'], sex: '女', desc: '伯父的妻子' },
        '婶婶':   { name: '婶婶',   aliases: ['婶母', '婶子'], sex: '女', desc: '叔叔的妻子' },
        '姑父':   { name: '姑父',   aliases: ['姑丈'], sex: '男', desc: '姑妈的丈夫' },
        '舅妈':   { name: '舅妈',   aliases: ['舅母'], sex: '女', desc: '舅舅的妻子' },
        '姨父':   { name: '姨父',   aliases: ['姨夫', '姨丈'], sex: '男', desc: '姨妈的丈夫' },
        '公公':   { name: '公公',   aliases: ['家公'], sex: '男', desc: '丈夫的爸爸' },
        '婆婆':   { name: '婆婆',   aliases: ['家婆'], sex: '女', desc: '丈夫的妈妈' },
        '岳父':   { name: '岳父',   aliases: ['丈人', '老丈人'], sex: '男', desc: '妻子的爸爸' },
        '岳母':   { name: '岳母',   aliases: ['丈母娘'], sex: '女', desc: '妻子的妈妈' },
        '大伯子': { name: '大伯子', aliases: [], sex: '男', desc: '丈夫的哥哥' },
        '小叔子': { name: '小叔子', aliases: [], sex: '男', desc: '丈夫的弟弟' },
        '大姑子': { name: '大姑子', aliases: ['大姑姐'], sex: '女', desc: '丈夫的姐姐' },
        '小姑子': { name: '小姑子', aliases: [], sex: '女', desc: '丈夫的妹妹' },
        '大舅子': { name: '大舅子', aliases: ['内兄'], sex: '男', desc: '妻子的哥哥' },
        '小舅子': { name: '小舅子', aliases: ['内弟'], sex: '男', desc: '妻子的弟弟' },
        '大姨子': { name: '大姨子', aliases: [], sex: '女', desc: '妻子的姐姐' },
        '小姨子': { name: '小姨子', aliases: [], sex: '女', desc: '妻子的妹妹' },
        '连襟':   { name: '连襟',   aliases: [], sex: '男', desc: '妻子的姐妹的丈夫' },
        '亲家':   { name: '亲家',   aliases: [], sex: '男', desc: '子女配偶的爸爸' },
        '亲家母': { name: '亲家母', aliases: [], sex: '女', desc: '子女配偶的妈妈' },
        '儿子':   { name: '儿子',   aliases: ['儿'], sex: '男', desc: '直系晚辈' },
        '女儿':   { name: '女儿',   aliases: ['闺女'], sex: '女', desc: '直系晚辈' },
        '侄子':   { name: '侄子',   aliases: ['侄儿'], sex: '男', desc: '哥哥/弟弟的儿子' },
        '侄女':   { name: '侄女',   aliases: [], sex: '女', desc: '哥哥/弟弟的女儿' },
        '外甥':   { name: '外甥',   aliases: [], sex: '男', desc: '姐姐/妹妹的儿子' },
        '外甥女': { name: '外甥女', aliases: [], sex: '女', desc: '姐姐/妹妹的女儿' },
        '孙子':   { name: '孙子',   aliases: ['孙儿'], sex: '男', desc: '儿子的儿子' },
        '孙女':   { name: '孙女',   aliases: [], sex: '女', desc: '儿子的女儿' },
        '外孙':   { name: '外孙',   aliases: [], sex: '男', desc: '女儿的儿子' },
        '外孙女': { name: '外孙女', aliases: [], sex: '女', desc: '女儿的女儿' },
        '曾孙':   { name: '曾孙',   aliases: ['重孙'], sex: '男', desc: '孙子的儿子' },
        '曾孙女': { name: '曾孙女', aliases: ['重孙女'], sex: '女', desc: '孙子的女儿' },
        '外曾孙': { name: '外曾孙', aliases: [], sex: '男', desc: '外孙的儿子' },
        '外曾孙女': { name: '外曾孙女', aliases: [], sex: '女', desc: '外孙的女儿' },
        '儿媳':   { name: '儿媳',   aliases: ['儿媳妇'], sex: '女', desc: '儿子的妻子' },
        '女婿':   { name: '女婿',   aliases: [], sex: '男', desc: '女儿的丈夫' },
        '孙媳':   { name: '孙媳',   aliases: ['孙媳妇'], sex: '女', desc: '孙子的妻子' },
        '孙女婿': { name: '孙女婿', aliases: [], sex: '男', desc: '孙女的丈夫' },
        '侄媳':   { name: '侄媳',   aliases: ['侄媳妇'], sex: '女', desc: '侄子的妻子' },
        '堂兄弟': { name: '堂兄弟', aliases: ['堂哥 / 堂弟'], sex: '男', desc: '伯父/叔叔的儿子，同姓为堂（比你大称堂哥，比你小称堂弟）' },
        '堂姐妹': { name: '堂姐妹', aliases: ['堂姐 / 堂妹'], sex: '女', desc: '伯父/叔叔的女儿，同姓为堂（比你大称堂姐，比你小称堂妹）' },
        '表兄弟': { name: '表兄弟', aliases: ['表哥 / 表弟'], sex: '男', desc: '姑妈/舅舅/姨妈的儿子，异姓为表（比你大称表哥，比你小称表弟）' },
        '表姐妹': { name: '表姐妹', aliases: ['表姐 / 表妹'], sex: '女', desc: '姑妈/舅舅/姨妈的女儿，异姓为表（比你大称表姐，比你小称表妹）' }
    };

    // --- 同义词表：输入词 → 标准词 ---
    var SYN = {
        '父亲': '爸爸', '爹': '爸爸', '老爸': '爸爸', '爸': '爸爸',
        '母亲': '妈妈', '娘': '妈妈', '老妈': '妈妈', '妈': '妈妈',
        '祖父': '爷爷', '阿公': '爷爷',
        '祖母': '奶奶', '阿婆': '奶奶',
        '外祖父': '外公', '姥爷': '外公',
        '外祖母': '外婆', '姥姥': '外婆',
        '太爷爷': '曾祖父', '太公': '曾祖父',
        '太奶奶': '曾祖母', '太婆': '曾祖母',
        '兄': '哥哥', '大哥': '哥哥',
        '姐': '姐姐', '大姐': '姐姐',
        '弟': '弟弟',
        '妹': '妹妹',
        '伯伯': '伯父', '大伯': '伯父',
        '叔父': '叔叔', '叔': '叔叔',
        '姑姑': '姑妈', '姑母': '姑妈',
        '舅父': '舅舅', '舅': '舅舅',
        '姨母': '姨妈', '大姨': '姨妈', '小姨': '姨妈',
        '伯娘': '伯母',
        '婶母': '婶婶', '婶子': '婶婶',
        '姑丈': '姑父',
        '舅母': '舅妈',
        '姨夫': '姨父', '姨丈': '姨父',
        '家公': '公公',
        '家婆': '婆婆',
        '丈人': '岳父', '老丈人': '岳父',
        '丈母娘': '岳母',
        '内兄': '大舅子',
        '内弟': '小舅子',
        '儿': '儿子',
        '闺女': '女儿',
        '侄儿': '侄子',
        '孙儿': '孙子',
        '重孙': '曾孙',
        '重孙女': '曾孙女',
        '儿媳妇': '儿媳',
        '孙媳妇': '孙媳',
        '老公': '丈夫',
        '老婆': '妻子',
        '先生': '丈夫',
        '夫人': '妻子',
        '大伯哥': '大伯子',
        '大姑姐': '大姑子'
    };

    // --- 两两组合规则：'A>B' → 称谓 key（逐步归约，链可逐级组合）---
    var RULES = {
        // 父系祖辈
        '爸爸>爸爸': '爷爷', '爸爸>妈妈': '奶奶',
        '爸爸>哥哥': '伯父', '爸爸>弟弟': '叔叔',
        '爸爸>姐姐': '姑妈', '爸爸>妹妹': '姑妈',
        '爷爷>爸爸': '曾祖父', '爷爷>妈妈': '曾祖母',
        '爷爷>哥哥': '伯祖父', '爷爷>弟弟': '叔祖父',
        '爷爷>姐姐': '姑祖母', '爷爷>妹妹': '姑祖母',
        '爷爷>妻子': '奶奶', '奶奶>丈夫': '爷爷',
        '奶奶>爸爸': '曾祖父', '奶奶>妈妈': '曾祖母',
        '曾祖父>爸爸': '高祖父', '曾祖父>妈妈': '高祖母',
        '曾祖父>妻子': '曾祖母', '曾祖母>丈夫': '曾祖父',
        '曾祖母>爸爸': '高祖父', '曾祖母>妈妈': '高祖母',
        '高祖父>妻子': '高祖母', '高祖母>丈夫': '高祖父',
        // 父系旁系（伯/叔/姑）
        '伯父>妻子': '伯母', '叔叔>妻子': '婶婶',
        '伯父>爸爸': '爷爷', '伯父>妈妈': '奶奶',
        '叔叔>爸爸': '爷爷', '叔叔>妈妈': '奶奶',
        '伯父>儿子': '堂兄弟', '伯父>女儿': '堂姐妹',
        '叔叔>儿子': '堂兄弟', '叔叔>女儿': '堂姐妹',
        '姑妈>丈夫': '姑父',
        '姑妈>爸爸': '爷爷', '姑妈>妈妈': '奶奶',
        '姑妈>儿子': '表兄弟', '姑妈>女儿': '表姐妹',
        '伯祖父>妻子': '伯祖母', '叔祖父>妻子': '叔祖母', '姑祖母>丈夫': '姑祖父',
        '伯祖父>爸爸': '高祖父', '伯祖父>妈妈': '高祖母',
        '叔祖父>爸爸': '高祖父', '叔祖父>妈妈': '高祖母',
        // 同辈互推（无歧义才收录）
        '叔叔>哥哥': '伯父', '姑妈>哥哥': '爸爸', '姑妈>弟弟': '叔叔',
        '伯父>哥哥': '伯祖父', '叔叔>弟弟': '叔祖父',
        // 母系
        '妈妈>爸爸': '外公', '妈妈>妈妈': '外婆',
        '妈妈>哥哥': '舅舅', '妈妈>弟弟': '舅舅',
        '妈妈>姐姐': '姨妈', '妈妈>妹妹': '姨妈',
        '外公>爸爸': '外曾祖父', '外公>妈妈': '外曾祖母',
        '外婆>爸爸': '外曾祖父', '外婆>妈妈': '外曾祖母',
        '外公>妻子': '外婆', '外婆>丈夫': '外公',
        '舅舅>妻子': '舅妈',
        '舅舅>爸爸': '外公', '舅舅>妈妈': '外婆',
        '舅舅>儿子': '表兄弟', '舅舅>女儿': '表姐妹',
        '姨妈>丈夫': '姨父',
        '姨妈>爸爸': '外公', '姨妈>妈妈': '外婆',
        '姨妈>儿子': '表兄弟', '姨妈>女儿': '表姐妹',
        // 同辈
        '哥哥>妻子': '嫂子', '姐姐>丈夫': '姐夫',
        '弟弟>妻子': '弟媳', '妹妹>丈夫': '妹夫',
        '哥哥>爸爸': '爸爸', '哥哥>妈妈': '妈妈',
        '姐姐>爸爸': '爸爸', '姐姐>妈妈': '妈妈',
        '弟弟>爸爸': '爸爸', '弟弟>妈妈': '妈妈',
        '妹妹>爸爸': '爸爸', '妹妹>妈妈': '妈妈',
        '哥哥>儿子': '侄子', '哥哥>女儿': '侄女',
        '弟弟>儿子': '侄子', '弟弟>女儿': '侄女',
        '姐姐>儿子': '外甥', '姐姐>女儿': '外甥女',
        '妹妹>儿子': '外甥', '妹妹>女儿': '外甥女',
        // 子辈
        '儿子>妻子': '儿媳', '女儿>丈夫': '女婿',
        '儿子>儿子': '孙子', '儿子>女儿': '孙女',
        '女儿>儿子': '外孙', '女儿>女儿': '外孙女',
        '孙子>妻子': '孙媳', '孙女>丈夫': '孙女婿',
        '孙子>儿子': '曾孙', '孙子>女儿': '曾孙女',
        '孙女>儿子': '曾孙', '孙女>女儿': '曾孙女',
        '外孙>儿子': '外曾孙', '外孙>女儿': '外曾孙女',
        '外孙女>儿子': '外曾孙', '外孙女>女儿': '外曾孙女',
        '侄子>妻子': '侄媳',
        '孙子>爸爸': '儿子', '孙子>妈妈': '儿媳',
        '孙女>爸爸': '儿子', '孙女>妈妈': '儿媳',
        '外孙>爸爸': '女儿', '外孙>妈妈': '女婿',
        '外孙女>爸爸': '女儿', '外孙女>妈妈': '女婿',
        // 配偶系
        '丈夫>爸爸': '公公', '丈夫>妈妈': '婆婆',
        '丈夫>哥哥': '大伯子', '丈夫>弟弟': '小叔子',
        '丈夫>姐姐': '大姑子', '丈夫>妹妹': '小姑子',
        '丈夫>儿子': '儿子', '丈夫>女儿': '女儿',
        '妻子>爸爸': '岳父', '妻子>妈妈': '岳母',
        '妻子>哥哥': '大舅子', '妻子>弟弟': '小舅子',
        '妻子>姐姐': '大姨子', '妻子>妹妹': '小姨子',
        '妻子>儿子': '儿子', '妻子>女儿': '女儿',
        '婆婆>丈夫': '公公', '岳母>丈夫': '岳父',
        '大舅子>妻子': '舅妈', '小舅子>妻子': '舅妈',
        '大姨子>丈夫': '连襟', '小姨子>丈夫': '连襟',
        '儿媳>爸爸': '亲家', '儿媳>妈妈': '亲家母',
        '女婿>爸爸': '亲家', '女婿>妈妈': '亲家母'
    };

    // --- 反向表：对方 key → 对方称呼我（按我的性别）---
    var REVERSE = {
        '爸爸': { m: '儿子', f: '女儿' },
        '妈妈': { m: '儿子', f: '女儿' },
        '爷爷': { m: '孙子', f: '孙女' },
        '奶奶': { m: '孙子', f: '孙女' },
        '外公': { m: '外孙', f: '外孙女' },
        '外婆': { m: '外孙', f: '外孙女' },
        '曾祖父': { m: '曾孙', f: '曾孙女' },
        '曾祖母': { m: '曾孙', f: '曾孙女' },
        '高祖父': { m: '玄孙', f: '玄孙女' },
        '高祖母': { m: '玄孙', f: '玄孙女' },
        '外曾祖父': { m: '外曾孙', f: '外曾孙女' },
        '外曾祖母': { m: '外曾孙', f: '外曾孙女' },
        '伯父': { m: '侄子', f: '侄女' },
        '叔叔': { m: '侄子', f: '侄女' },
        '姑妈': { m: '侄子', f: '侄女' },
        '伯祖父': { m: '侄孙', f: '侄孙女' },
        '叔祖父': { m: '侄孙', f: '侄孙女' },
        '姑祖母': { m: '侄孙', f: '侄孙女' },
        '舅舅': { m: '外甥', f: '外甥女' },
        '姨妈': { m: '外甥', f: '外甥女' },
        '舅妈': { m: '外甥', f: '外甥女' },
        '姨父': { m: '外甥', f: '外甥女' },
        '伯母': { m: '侄子', f: '侄女' },
        '婶婶': { m: '侄子', f: '侄女' },
        '姑父': { m: '内侄', f: '内侄女' },
        '哥哥': { m: '弟弟', f: '妹妹' },
        '姐姐': { m: '弟弟', f: '妹妹' },
        '弟弟': { m: '哥哥', f: '姐姐' },
        '妹妹': { m: '哥哥', f: '姐姐' },
        '嫂子': { m: '小叔子', f: '小姑子' },
        '姐夫': { m: '内弟', f: '内妹' },
        '弟媳': { m: '大伯子', f: '大姑子' },
        '妹夫': { m: '大舅子', f: '大姨子' },
        '儿子': { m: '爸爸', f: '妈妈' },
        '女儿': { m: '爸爸', f: '妈妈' },
        '儿媳': { both: '公公 / 婆婆' },
        '女婿': { both: '岳父 / 岳母' },
        '侄子': { m: '伯父 / 叔叔', f: '姑妈' },
        '侄女': { m: '伯父 / 叔叔', f: '姑妈' },
        '外甥': { m: '舅舅', f: '姨妈' },
        '外甥女': { m: '舅舅', f: '姨妈' },
        '孙子': { m: '爷爷', f: '奶奶' },
        '孙女': { m: '爷爷', f: '奶奶' },
        '外孙': { m: '外公', f: '外婆' },
        '外孙女': { m: '外公', f: '外婆' },
        '曾孙': { m: '曾祖父', f: '曾祖母' },
        '曾孙女': { m: '曾祖父', f: '曾祖母' },
        '外曾孙': { m: '外曾祖父', f: '外曾祖母' },
        '外曾孙女': { m: '外曾祖父', f: '外曾祖母' },
        '丈夫': { both: '妻子' },
        '妻子': { both: '丈夫' },
        '公公': { both: '儿媳妇' },
        '婆婆': { both: '儿媳妇' },
        '岳父': { both: '女婿' },
        '岳母': { both: '女婿' },
        '大伯子': { both: '弟媳' },
        '小叔子': { both: '嫂子' },
        '大姑子': { both: '弟媳' },
        '小姑子': { both: '嫂子' },
        '大舅子': { both: '妹夫' },
        '小舅子': { both: '姐夫' },
        '大姨子': { both: '妹夫' },
        '小姨子': { both: '姐夫' },
        '连襟': { both: '连襟' },
        '堂兄弟': { m: '堂哥 / 堂弟', f: '堂姐 / 堂妹' },
        '堂姐妹': { m: '堂哥 / 堂弟', f: '堂姐 / 堂妹' },
        '表兄弟': { m: '表哥 / 表弟', f: '表姐 / 表妹' },
        '表姐妹': { m: '表哥 / 表弟', f: '表姐 / 表妹' }
    };

    // --- 常见称呼速查表（点击填入关系链）---
    var QUICK = [
        { title: '直系', items: [
            { chain: '爸爸', name: '爸爸' }, { chain: '妈妈', name: '妈妈' },
            { chain: '爸爸的爸爸', name: '爷爷' }, { chain: '爸爸的妈妈', name: '奶奶' },
            { chain: '妈妈的爸爸', name: '外公（姥爷）' }, { chain: '妈妈的妈妈', name: '外婆（姥姥）' },
            { chain: '爷爷的爸爸', name: '曾祖父' }, { chain: '曾祖父的爸爸', name: '高祖父' }
        ]},
        { title: '父系旁系', items: [
            { chain: '爸爸的哥哥', name: '伯父（大伯）' }, { chain: '爸爸的弟弟', name: '叔叔' },
            { chain: '爸爸的姐姐', name: '姑妈' }, { chain: '爸爸的妹妹', name: '姑姑' },
            { chain: '爸爸的哥哥的妻子', name: '伯母' }, { chain: '爸爸的弟弟的妻子', name: '婶婶' },
            { chain: '爸爸的姐姐的丈夫', name: '姑父' },
            { chain: '爷爷的哥哥', name: '伯祖父' }, { chain: '爷爷的弟弟', name: '叔祖父' },
            { chain: '爸爸的哥哥的儿子', name: '堂兄弟' }, { chain: '爸爸的哥哥的女儿', name: '堂姐妹' }
        ]},
        { title: '母系', items: [
            { chain: '妈妈的哥哥', name: '舅舅' }, { chain: '妈妈的弟弟', name: '舅舅' },
            { chain: '妈妈的姐姐', name: '姨妈（大姨）' }, { chain: '妈妈的妹妹', name: '姨妈（小姨）' },
            { chain: '妈妈的哥哥的妻子', name: '舅妈' }, { chain: '妈妈的姐姐的丈夫', name: '姨父' },
            { chain: '舅舅的儿子', name: '表兄弟' }, { chain: '姨妈的女儿', name: '表姐妹' }
        ]},
        { title: '同辈 & 晚辈', items: [
            { chain: '哥哥', name: '哥哥' }, { chain: '哥哥的妻子', name: '嫂子' },
            { chain: '姐姐的丈夫', name: '姐夫' }, { chain: '弟弟的妻子', name: '弟媳' },
            { chain: '妹妹的丈夫', name: '妹夫' },
            { chain: '哥哥的儿子', name: '侄子' }, { chain: '姐姐的女儿', name: '外甥女' },
            { chain: '儿子', name: '儿子' }, { chain: '女儿', name: '女儿' },
            { chain: '儿子的儿子', name: '孙子' }, { chain: '女儿的女儿', name: '外孙女' }
        ]},
        { title: '配偶亲戚', items: [
            { chain: '丈夫的爸爸', name: '公公' }, { chain: '丈夫的妈妈', name: '婆婆' },
            { chain: '妻子的爸爸', name: '岳父' }, { chain: '妻子的妈妈', name: '岳母' },
            { chain: '妻子的哥哥', name: '大舅子' }, { chain: '妻子的弟弟', name: '小舅子' },
            { chain: '妻子的姐姐', name: '大姨子' }, { chain: '妻子的妹妹', name: '小姨子' },
            { chain: '丈夫的弟弟', name: '小叔子' }, { chain: '丈夫的妹妹', name: '小姑子' },
            { chain: '儿子的妻子', name: '儿媳' }, { chain: '女儿的丈夫', name: '女婿' }
        ]}
    ];

    // --- UI ---
    var currentMode = 1; // 1 = 我叫他/她什么，2 = 他/她叫我什么
    var mySex = '男';
    var relationChain = []; // 累积的关系链

    container.innerHTML =
        '<div class="rk-wrap">' +
            '<div class="rk-toggle">' +
                '<button class="rk-toggle-btn active" id="rkMode1">&#x1F4AC; 我叫他/她什么</button>' +
                '<button class="rk-toggle-btn" id="rkMode2">&#x1F504; 他/她叫我什么</button>' +
            '</div>' +
            '<div class="rk-sex" id="rkSexRow">' +
                '<span class="rk-sex-label">&#x2640;&#xFE0F;&#x200D;&#x2642;&#xFE0F; 我的性别（反向模式需要）：</span>' +
                '<label class="rk-seg"><input type="radio" name="rkSex" value="男" checked /> 男</label>' +
                '<label class="rk-seg"><input type="radio" name="rkSex" value="女" /> 女</label>' +
            '</div>' +
            '<div class="rk-path-display" id="rkPath"></div>' +
            '<div class="rk-buttons-panel" id="rkButtons"></div>' +
            '<div class="rk-actions">' +
                '<button class="rk-action-btn" id="rkUndo" disabled>&#x21A9;&#xFE0F; 撤销</button>' +
                '<button class="rk-action-btn" id="rkReset" disabled>&#x1F504; 重置</button>' +
            '</div>' +
            '<div class="rk-result" id="rkResult"></div>' +
            '<div class="rk-note">⚠️ 方言差异：外公/外婆在北方常称「姥爷/姥姥」，姑妈/姑姑、姨妈叫法各地有差；首版收录普通话通用叫法，反向「他叫我」多为背称，当面一般叫名字。</div>' +
            '<div class="rk-quick-title">常见称呼速查（点击自动构建）</div>' +
            '<div class="rk-quick" id="rkQuick"></div>' +
        '</div>';

    var mode1 = document.getElementById('rkMode1');
    var mode2 = document.getElementById('rkMode2');
    var pathEl = document.getElementById('rkPath');
    var buttonsEl = document.getElementById('rkButtons');
    var resultEl = document.getElementById('rkResult');
    var quickEl = document.getElementById('rkQuick');
    var undoBtn = document.getElementById('rkUndo');
    var resetBtn = document.getElementById('rkReset');

    // 常用关系按钮数据（仅包含基础关系词，不包含需要组合计算的复合关系）
    var COMMON_RELATIONS = [
        { title: '直系', items: ['爸爸', '妈妈', '儿子', '女儿'] },
        { title: '同辈', items: ['哥哥', '姐姐', '弟弟', '妹妹'] },
        { title: '配偶', items: ['丈夫', '妻子'] },
        { title: '父系', items: ['伯父', '叔叔', '姑妈'] },
        { title: '母系', items: ['舅舅', '姨妈'] }
    ];

    // 渲染关系按钮
    function renderButtons() {
        var html = '';
        for (var i = 0; i < COMMON_RELATIONS.length; i++) {
            var group = COMMON_RELATIONS[i];
            html += '<div class="rk-button-group">';
            html += '<div class="rk-group-title">' + group.title + '</div>';
            html += '<div class="rk-group-items">';
            for (var j = 0; j < group.items.length; j++) {
                html += '<button class="rk-rel-btn" data-word="' + group.items[j] + '">' + group.items[j] + '</button>';
            }
            html += '</div></div>';
        }
        buttonsEl.innerHTML = html;
        var btns = buttonsEl.querySelectorAll('.rk-rel-btn');
        for (var k = 0; k < btns.length; k++) {
            btns[k].addEventListener('click', function() {
                addRelation(this.getAttribute('data-word'));
            });
        }
    }

    // 添加关系
    function addRelation(word) {
        relationChain.push(word);
        updateDisplay();
    }

    // 撤销关系
    function undoRelation() {
        if (relationChain.length > 0) {
            relationChain.pop();
            updateDisplay();
        }
    }

    // 重置关系
    function resetRelation() {
        relationChain = [];
        updateDisplay();
    }

    // 更新显示
    function updateDisplay() {
        // 更新撤销/重置按钮状态
        var hasChain = relationChain.length > 0;
        undoBtn.disabled = !hasChain;
        resetBtn.disabled = !hasChain;

        // 空链提示
        if (!hasChain) {
            pathEl.innerHTML = '<div class="rk-path-empty">点击下方按钮开始累积关系链 ↓</div>';
            resultEl.innerHTML = '<div class="rk-card"><div class="rk-answer rk-answer-dim">等待输入...</div></div>';
            return;
        }

        // 检查关系链过长
        if (relationChain.length > 10) {
            pathEl.innerHTML = '<div class="rk-path-empty">⚠️ 关系链过长（超过10步），建议重置后简化</div>';
            resultEl.innerHTML = '<div class="rk-card"><div class="rk-err">关系链太复杂了，试试简化一下～</div></div>';
            return;
        }

        // 计算关系
        var res = resolveChain(relationChain);

        // 构建路径显示
        var pathHtml = '<span class="rk-path-item rk-path-start">我</span>';
        for (var i = 0; i < relationChain.length; i++) {
            pathHtml += '<span class="rk-path-arrow">→</span>';
            pathHtml += '<span class="rk-path-item">' + relationChain[i] + '</span>';
        }

        if (res.error) {
            pathHtml += '<span class="rk-path-arrow">→</span>';
            pathHtml += '<span class="rk-path-item rk-path-error">❌</span>';
            pathEl.innerHTML = pathHtml;
            resultEl.innerHTML = '<div class="rk-card"><div class="rk-err">' + res.error + '</div></div>';
            return;
        }

        var key = res.key;
        var kin = KIN[key];
        pathHtml += '<span class="rk-path-arrow">=</span>';
        pathHtml += '<span class="rk-path-item rk-path-result">' + displayName(key) + '</span>';
        pathEl.innerHTML = pathHtml;

        // 显示结果
        if (currentMode === 1) {
            // 我叫他/她什么
            var aliasHtml = kin.aliases.length ? '，也叫 <span class="rk-aliases">' + kin.aliases.join('、') + '</span>' : '';
            var branchNote = '';
            if (key === '堂兄弟' || key === '堂姐妹' || key === '表兄弟' || key === '表姐妹') {
                branchNote = '<div class="rk-note">' + kin.desc + ' —— 对方比你大还是小，要用年龄来定。' + '</div>';
            }
            resultEl.innerHTML =
                '<div class="rk-card rk-ok">' +
                    '<div class="rk-answer">' + displayName(key) + '</div>' +
                    '<div class="rk-sub">' + relationChain.join('的') + ' = ' + kin.name + aliasHtml + '</div>' +
                    (kin.desc ? '<div class="rk-desc">&#x1F4CC; ' + kin.desc + '</div>' : '') +
                    branchNote +
                '</div>';
        } else {
            // 他/她叫我什么
            var rev = REVERSE[key];
            if (!rev) {
                resultEl.innerHTML = '<div class="rk-card"><div class="rk-err">「' + kin.name + '」叫我什么这条暂时没收录，可以反馈给我～</div></div>';
                return;
            }
            var you;
            if (rev.both) {
                you = rev.both;
                resultEl.innerHTML =
                    '<div class="rk-card rk-ok">' +
                        '<div class="rk-answer">' + kin.name + ' 叫你：' + you + '</div>' +
                        '<div class="rk-sub">' + relationChain.join('的') + ' → 对方称呼你的背称</div>' +
                        (kin.desc ? '<div class="rk-desc">&#x1F4CC; ' + kin.desc + '</div>' : '') +
                    '</div>';
            } else {
                var mAns = rev.m, fAns = rev.f;
                var ans = mySex === '男' ? mAns : fAns;
                resultEl.innerHTML =
                    '<div class="rk-card rk-ok">' +
                        '<div class="rk-answer">' + kin.name + ' 叫你：' + ans + '</div>' +
                        '<div class="rk-sub">' + relationChain.join('的') + ' → 对方称呼你' + (mySex === '男' ? '（你为男性）' : '（你为女性）') + '</div>' +
                        '<div class="rk-desc">&#x1F4CC; 若你是' + (mySex === '男' ? '女性则为 ' + fAns : '男性则为 ' + mAns) + '。' + '</div>' +
                        (kin.desc ? '<div class="rk-desc">关系：' + kin.desc + '</div>' : '') +
                    '</div>';
            }
        }
    }

    // 速查表
    var quickHtml = '';
    for (var qi = 0; qi < QUICK.length; qi++) {
        var grp = QUICK[qi];
        quickHtml += '<div class="rk-qgroup"><div class="rk-qtitle">' + grp.title + '</div><div class="rk-qitems">';
        for (var gk = 0; gk < grp.items.length; gk++) {
            var it = grp.items[gk];
            quickHtml += '<button class="rk-chip" data-chain="' + it.chain + '" title="' + it.chain + '">' + it.name + '</button>';
        }
        quickHtml += '</div></div>';
    }
    quickEl.innerHTML = quickHtml;
    var chips = quickEl.querySelectorAll('[data-chain]');
    for (var ci = 0; ci < chips.length; ci++) {
        chips[ci].addEventListener('click', function() {
            var chain = this.getAttribute('data-chain');
            var parts = chain.split('的').filter(function(p) { return p !== ''; });
            relationChain = parts;
            updateDisplay();
        });
    }

    // --- 解析核心 ---
    function normWord(w) { return SYN[w] || w; }

    function parseParts(str) {
        var clean = str.replace(/\s+/g, '');
        if (!clean) return { empty: true };
        var parts = clean.split('的').filter(function(p) { return p !== ''; });
        if (!parts.length) return { empty: true };
        return { parts: parts };
    }

    // 关系链逐步归约 → { key } 或 { error }
    function resolveChain(parts) {
        var cur = normWord(parts[0]);
        if (!KIN[cur]) return { error: '不认识「' + parts[0] + '」这个词，换个说法试试？' };
        for (var i = 1; i < parts.length; i++) {
            var next = normWord(parts[i]);
            if (!KIN[next]) return { error: '不认识「' + parts[i] + '」这个词，换个说法试试？' };
            var key = cur + '>' + next;
            if (!RULES[key]) return { error: '「' + KIN[cur].name + '的' + KIN[next].name + '」这个关系暂未收录，可以反馈给我加上～' };
            cur = RULES[key];
        }
        return { key: cur };
    }

    // 年龄/排行分支的称谓展示（堂/表等无法仅由关系确定）
    function displayName(key) {
        var kin = KIN[key];
        if (!kin) return '';
        if (key === '堂兄弟' || key === '表兄弟') return kin.aliases[0]; // 堂哥/堂弟
        if (key === '堂姐妹' || key === '表姐妹') return kin.aliases[0];
        return kin.name;
    }

    // --- 事件 ---
    function switchMode(mode) {
        currentMode = mode;
        mode1.classList.toggle('active', mode === 1);
        mode2.classList.toggle('active', mode === 2);
        if (relationChain.length > 0) {
            updateDisplay();
        } else {
            pathEl.innerHTML = '<div class="rk-path-empty">点击下方按钮开始累积关系链 ↓</div>';
            resultEl.innerHTML = '<div class="rk-card"><div class="rk-answer rk-answer-dim">等待输入...</div></div>';
        }
    }
    mode1.addEventListener('click', function() { switchMode(1); });
    mode2.addEventListener('click', function() { switchMode(2); });
    undoBtn.addEventListener('click', undoRelation);
    resetBtn.addEventListener('click', resetRelation);

    var sexBtns = container.querySelectorAll('input[name="rkSex"]');
    for (var si = 0; si < sexBtns.length; si++) {
        sexBtns[si].addEventListener('change', function() {
            mySex = this.value;
            if (currentMode === 2 && relationChain.length > 0) {
                updateDisplay();
            }
        });
    }

    // 初始化
    renderButtons();
    updateDisplay();
};
