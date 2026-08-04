// 夏夜工具集 - 单位换算器 (ES5)

window.initUnitConvert = function(container) {

    // --- 单位数据: 每类有基准单位，所有单位通过基准转换 ---
    var categories = {
        length: {
            label: '长度',
            base: 'm',
            units: {
                mm: { label: '毫米 (mm)', toBase: 0.001 },
                cm: { label: '厘米 (cm)', toBase: 0.01 },
                m:  { label: '米 (m)',    toBase: 1 },
                km: { label: '千米 (km)', toBase: 1000 },
                inch: { label: '英寸 (in)', toBase: 0.0254 },
                ft:   { label: '英尺 (ft)', toBase: 0.3048 },
                yd:   { label: '码 (yd)',   toBase: 0.9144 },
                mile: { label: '英里 (mi)', toBase: 1609.344 }
            }
        },
        weight: {
            label: '重量',
            base: 'kg',
            units: {
                mg: { label: '毫克 (mg)', toBase: 0.000001 },
                g:  { label: '克 (g)',    toBase: 0.001 },
                kg: { label: '千克 (kg)', toBase: 1 },
                t:  { label: '吨 (t)',    toBase: 1000 },
                oz: { label: '盎司 (oz)', toBase: 0.0283495 },
                lb: { label: '磅 (lb)',   toBase: 0.453592 }
            }
        },
        temperature: {
            label: '温度',
            base: 'C',
            units: {
                C: { label: '摄氏度 (°C)', toBase: null },  // 温度特殊处理
                F: { label: '华氏度 (°F)', toBase: null },
                K: { label: '开尔文 (K)',  toBase: null }
            }
        },
        area: {
            label: '面积',
            base: 'm2',
            units: {
                mm2: { label: '平方毫米 (mm²)', toBase: 0.000001 },
                cm2: { label: '平方厘米 (cm²)', toBase: 0.0001 },
                m2:  { label: '平方米 (m²)',   toBase: 1 },
                km2: { label: '平方千米 (km²)', toBase: 1000000 },
                ha:  { label: '公顷 (ha)',      toBase: 10000 },
                acre: { label: '英亩',          toBase: 4046.86 }
            }
        },
        volume: {
            label: '体积',
            base: 'L',
            units: {
                ml:  { label: '毫升 (mL)', toBase: 0.001 },
                L:   { label: '升 (L)',    toBase: 1 },
                m3:  { label: '立方米 (m³)', toBase: 1000 },
                gal: { label: '加仑 (gal)', toBase: 3.78541 },
                qt:  { label: '夸脱 (qt)',  toBase: 0.946353 },
                cup: { label: '杯 (cup)',   toBase: 0.236588 }
            }
        },
        speed: {
            label: '速度',
            base: 'ms',
            units: {
                ms:  { label: '米/秒 (m/s)',   toBase: 1 },
                kmh: { label: '千米/时 (km/h)', toBase: 0.277778 },
                mph: { label: '英里/时 (mph)',  toBase: 0.44704 },
                knot: { label: '节 (kn)',       toBase: 0.514444 }
            }
        }
    };

    // --- 温度转换特殊处理 ---
    function convertTemperature(value, fromUnit, toUnit) {
        // 先转到摄氏度
        var celsius;
        if (fromUnit === 'C') {
            celsius = value;
        } else if (fromUnit === 'F') {
            celsius = (value - 32) * 5 / 9;
        } else if (fromUnit === 'K') {
            celsius = value - 273.15;
        } else {
            return null;
        }
        // 从摄氏度转到目标
        if (toUnit === 'C') return celsius;
        if (toUnit === 'F') return celsius * 9 / 5 + 32;
        if (toUnit === 'K') return celsius + 273.15;
        return null;
    }

    // --- 构建 UI ---
    var catKeys = ['length', 'weight', 'temperature', 'area', 'volume', 'speed'];
    var catOptions = '';
    for (var i = 0; i < catKeys.length; i++) {
        catOptions += '<option value="' + catKeys[i] + '">' + categories[catKeys[i]].label + '</option>';
    }

    container.innerHTML =
        '<div class="uc-container">' +
            '<div class="uc-select-row">' +
                '<label for="ucCategory">分类</label>' +
                '<select class="uc-select" id="ucCategory">' + catOptions + '</select>' +
            '</div>' +
            '<div class="uc-convert-row">' +
                '<input type="text" class="uc-input" id="ucValue" placeholder="输入数值..." />' +
                '<select class="uc-select" id="ucFromUnit"></select>' +
                '<button class="uc-swap-btn" id="ucSwap" title="翻转单位">⇄</button>' +
                '<select class="uc-select" id="ucToUnit"></select>' +
            '</div>' +
            '<div class="uc-result" id="ucResult"><span class="uc-result-placeholder">--</span></div>' +
        '</div>';

    var catSelect = document.getElementById('ucCategory');
    var fromSelect = document.getElementById('ucFromUnit');
    var toSelect = document.getElementById('ucToUnit');
    var valueInput = document.getElementById('ucValue');
    var btnSwap = document.getElementById('ucSwap');
    var resultEl = document.getElementById('ucResult');

    // --- 更新单位选项 ---
    function updateUnitOptions() {
        var catKey = catSelect.value;
        var cat = categories[catKey];
        var unitKeys = Object.keys(cat.units);
        var fromVal = fromSelect.value;
        var toVal = toSelect.value;

        var opts = '';
        for (var i = 0; i < unitKeys.length; i++) {
            var uk = unitKeys[i];
            var sel = uk === fromVal ? ' selected' : '';
            opts += '<option value="' + uk + '"' + sel + '>' + cat.units[uk].label + '</option>';
        }
        fromSelect.innerHTML = opts;

        opts = '';
        for (var j = 0; j < unitKeys.length; j++) {
            var uk2 = unitKeys[j];
            var sel2 = uk2 === toVal ? ' selected' : '';
            opts += '<option value="' + uk2 + '"' + sel2 + '>' + cat.units[uk2].label + '</option>';
        }
        toSelect.innerHTML = opts;

        // 默认 from 选第一个, to 选第二个（避免相同）
        if (fromSelect.options.length >= 2) {
            if (fromSelect.value === toSelect.value) {
                toSelect.selectedIndex = 1;
            }
        }

        doConvert();
    }

    // --- 执行转换 ---
    function doConvert() {
        var catKey = catSelect.value;
        var cat = categories[catKey];
        var fromUnit = fromSelect.value;
        var toUnit = toSelect.value;
        var rawValue = valueInput.value.trim();

        if (!rawValue) {
            resultEl.innerHTML = '<span class="uc-result-placeholder">--</span>';
            return;
        }

        var value = parseFloat(rawValue);
        if (isNaN(value)) {
            resultEl.innerHTML = '<span class="uc-result-placeholder">--</span>';
            return;
        }

        var result;

        if (catKey === 'temperature') {
            result = convertTemperature(value, fromUnit, toUnit);
        } else {
            // 通过基准单位转换: value -> base -> target
            var fromInfo = cat.units[fromUnit];
            var toInfo = cat.units[toUnit];
            var baseValue = value * fromInfo.toBase;
            result = baseValue / toInfo.toBase;
        }

        if (result === null || result === undefined || isNaN(result)) {
            resultEl.innerHTML = '<span class="uc-result-placeholder">--</span>';
            return;
        }

        // 保留6位有效数字
        var formatted = formatSignificantDigits(result, 6);
        var fromLabel = cat.units[fromUnit].label;
        var toLabel = cat.units[toUnit].label;
        resultEl.innerHTML = value + ' ' + fromLabel + ' = <strong>' + formatted + '</strong> ' + toLabel;
    }

    function formatSignificantDigits(num, digits) {
        if (num === 0) return '0';
        var absNum = Math.abs(num);
        // Use toPrecision for significant digits
        var str = num.toPrecision(digits);
        // If there's no decimal point and e notation, we're fine
        // Remove trailing zeros after decimal but keep at least one if needed
        return str;
    }

    // --- 翻转单位 ---
    function swapUnits() {
        var fromVal = fromSelect.value;
        var toVal = toSelect.value;
        fromSelect.value = toVal;
        toSelect.value = fromVal;
        doConvert();
    }

    // --- 事件绑定 ---
    catSelect.addEventListener('change', updateUnitOptions);
    fromSelect.addEventListener('change', doConvert);
    toSelect.addEventListener('change', doConvert);
    valueInput.addEventListener('input', doConvert);
    btnSwap.addEventListener('click', swapUnits);

    // 初始化单位选项
    updateUnitOptions();
};
