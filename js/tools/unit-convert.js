// 夏夜工具集 - 单位换算器 (ES5)

window.initUnitConvert = function(container) {

    // --- 汇率缓存 ---
    var exchangeRates = null;
    var ratesUpdateTime = null;

    // --- 单位数据: 每类有基准单位，所有单位通过基准转换 ---
    var categories = {
        currency: {
            label: '货币',
            base: 'CNY',
            units: {
                CNY: { label: '人民币 (¥)', toBase: 1 },
                USD: { label: '美元 ($)', toBase: null },
                EUR: { label: '欧元 (€)', toBase: null },
                GBP: { label: '英镑 (£)', toBase: null },
                JPY: { label: '日元 (¥)', toBase: null },
                HKD: { label: '港币 (HK$)', toBase: null },
                KRW: { label: '韩元 (₩)', toBase: null },
                SGD: { label: '新加坡元 (S$)', toBase: null }
            }
        },
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

    // --- 获取汇率数据 ---
    function fetchExchangeRates(callback) {
        // 检查缓存（每天北京时间早上9点更新）
        var cached = localStorage.getItem('exchangeRates');
        var cacheTime = localStorage.getItem('exchangeRatesTime');
        var now = new Date();

        // 计算今天北京时间9:00的时间戳
        var today9am = new Date(now);
        today9am.setHours(9, 0, 0, 0);

        if (cached && cacheTime) {
            var cacheDate = new Date(parseInt(cacheTime));

            // 如果缓存时间 >= 今天9:00，使用缓存
            // 或者当前时间还没到今天9:00（今天的数据还没到更新时间），也使用缓存
            if (cacheDate >= today9am || now < today9am) {
                exchangeRates = JSON.parse(cached);
                ratesUpdateTime = cacheDate;
                updateCurrencyRates();
                if (callback) callback(true);
                return;
            }
        }

        // 请求新数据 (使用 CNY 作基准)
        fetch('https://api.exchangerate-api.com/v4/latest/CNY')
            .then(function(response) {
                if (!response.ok) throw new Error('Network response was not ok');
                return response.json();
            })
            .then(function(data) {
                exchangeRates = data.rates;
                ratesUpdateTime = new Date();
                localStorage.setItem('exchangeRates', JSON.stringify(exchangeRates));
                localStorage.setItem('exchangeRatesTime', Date.now().toString());
                updateCurrencyRates();
                if (callback) callback(true);
            })
            .catch(function(error) {
                console.error('汇率获取失败:', error);
                // 使用近似汇率作为降级方案
                exchangeRates = {
                    CNY: 1,
                    USD: 0.14,
                    EUR: 0.13,
                    GBP: 0.11,
                    JPY: 20.5,
                    HKD: 1.09,
                    KRW: 189,
                    SGD: 0.19
                };
                ratesUpdateTime = new Date('2026-08-01'); // 标记为降级数据
                updateCurrencyRates();
                if (callback) callback(false);
            });
    }

    // --- 更新货币汇率到 categories ---
    function updateCurrencyRates() {
        if (!exchangeRates) return;
        var currencyUnits = categories.currency.units;
        for (var code in currencyUnits) {
            if (exchangeRates[code]) {
                currencyUnits[code].toBase = 1 / exchangeRates[code];
            }
        }
    }

    // --- 构建 UI ---
    var catKeys = ['currency', 'length', 'weight', 'temperature', 'area', 'volume', 'speed'];
    var catOptions = '';
    for (var i = 0; i < catKeys.length; i++) {
        catOptions += '<option value="' + catKeys[i] + '">' + categories[catKeys[i]].label + '</option>';
    }

    container.innerHTML =
        '<div class="uc-container">' +
            '<div class="uc-select-row">' +
                '<label>分类</label>' +
                '<div class="uc-custom-select" id="ucCategory" data-value="currency">' +
                    '<div class="uc-custom-select__trigger">' +
                        '<span class="uc-custom-select__label">货币</span>' +
                    '</div>' +
                    '<div class="uc-custom-select__dropdown"></div>' +
                '</div>' +
            '</div>' +
            '<div class="uc-convert-row">' +
                '<input type="text" class="uc-input" id="ucValue" placeholder="输入数值..." />' +
                '<div class="uc-custom-select" id="ucFromUnit" data-value="">' +
                    '<div class="uc-custom-select__trigger">' +
                        '<span class="uc-custom-select__label"></span>' +
                    '</div>' +
                    '<div class="uc-custom-select__dropdown"></div>' +
                '</div>' +
                '<button class="uc-swap-btn" id="ucSwap" title="翻转单位">⇄</button>' +
                '<div class="uc-custom-select" id="ucToUnit" data-value="">' +
                    '<div class="uc-custom-select__trigger">' +
                        '<span class="uc-custom-select__label"></span>' +
                    '</div>' +
                    '<div class="uc-custom-select__dropdown"></div>' +
                '</div>' +
            '</div>' +
            '<div class="uc-result" id="ucResult"><span class="uc-result-placeholder">--</span></div>' +
            '<div class="uc-rate-info" id="ucRateInfo" style="display:none;"></div>' +
        '</div>';

    var catSelect = document.getElementById('ucCategory');
    var fromSelect = document.getElementById('ucFromUnit');
    var toSelect = document.getElementById('ucToUnit');
    var valueInput = document.getElementById('ucValue');
    var btnSwap = document.getElementById('ucSwap');
    var resultEl = document.getElementById('ucResult');
    var rateInfoEl = document.getElementById('ucRateInfo');

    // --- CustomSelect 自定义下拉框 ---
    function CustomSelect(element, options, onChangeCallback) {
        this.element = element;
        this.trigger = element.querySelector('.uc-custom-select__trigger');
        this.label = element.querySelector('.uc-custom-select__label');
        this.dropdown = element.querySelector('.uc-custom-select__dropdown');
        this.options = options;
        this.onChangeCallback = onChangeCallback;
        this.isOpen = false;
        this.currentValue = element.getAttribute('data-value') || '';
        this.init();
    }

    CustomSelect.prototype.init = function() {
        var self = this;

        // 渲染选项
        this.renderOptions();

        // 更新初始标签
        if (this.currentValue) {
            var opt = this.options.find(function(o) { return o.value === self.currentValue; });
            if (opt) this.label.textContent = opt.label;
        }

        // 点击触发器切换开关
        this.trigger.addEventListener('click', function(e) {
            e.stopPropagation();
            self.toggle();
        });

        // 点击外部关闭
        document.addEventListener('click', function() {
            if (self.isOpen) self.close();
        });
    };

    CustomSelect.prototype.renderOptions = function() {
        var self = this;
        this.dropdown.innerHTML = '';

        this.options.forEach(function(opt) {
            var div = document.createElement('div');
            div.className = 'uc-custom-select__option';
            div.textContent = opt.label;
            div.setAttribute('data-value', opt.value);

            if (opt.value === self.currentValue) {
                div.classList.add('selected');
            }

            div.addEventListener('click', function(e) {
                e.stopPropagation();
                self.selectOption(opt.value);
            });

            self.dropdown.appendChild(div);
        });
    };

    CustomSelect.prototype.toggle = function() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    };

    CustomSelect.prototype.open = function() {
        // 关闭其他所有下拉框
        var allSelects = document.querySelectorAll('.uc-custom-select');
        for (var i = 0; i < allSelects.length; i++) {
            allSelects[i].classList.remove('open');
        }

        // 打开当前
        this.element.classList.add('open');
        this.isOpen = true;
    };

    CustomSelect.prototype.close = function() {
        this.element.classList.remove('open');
        this.isOpen = false;
    };

    CustomSelect.prototype.selectOption = function(value) {
        var self = this;
        this.currentValue = value;
        this.element.setAttribute('data-value', value);

        var opt = this.options.find(function(o) { return o.value === value; });
        if (opt) this.label.textContent = opt.label;

        // 更新选中状态
        var optionDivs = this.dropdown.querySelectorAll('.uc-custom-select__option');
        for (var i = 0; i < optionDivs.length; i++) {
            optionDivs[i].classList.remove('selected');
            if (optionDivs[i].getAttribute('data-value') === value) {
                optionDivs[i].classList.add('selected');
            }
        }

        this.close();

        if (this.onChangeCallback) {
            this.onChangeCallback(value);
        }
    };

    CustomSelect.prototype.getValue = function() {
        return this.currentValue;
    };

    CustomSelect.prototype.setValue = function(value) {
        this.selectOption(value);
    };

    CustomSelect.prototype.updateOptions = function(newOptions) {
        this.options = newOptions;
        this.renderOptions();
    };

    // --- 初始化三个自定义下拉框 ---
    var categoryOptions = Object.keys(categories).map(function(key) {
        return { value: key, label: categories[key].label };
    });

    var categorySelect = new CustomSelect(catSelect, categoryOptions, function(value) {
        updateUnitOptions();
    });

    var fromUnitSelect = new CustomSelect(fromSelect, [], function(value) {
        doConvert();
    });

    var toUnitSelect = new CustomSelect(toSelect, [], function(value) {
        doConvert();
    });

    // --- 更新单位选项 ---
    function updateUnitOptions() {
        var catKey = categorySelect.getValue();
        var cat = categories[catKey];

        // 如果切换到货币分类，显示汇率信息
        if (catKey === 'currency') {
            if (ratesUpdateTime) {
                var timeStr = ratesUpdateTime.toLocaleString('zh-CN', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                });
                var isCache = localStorage.getItem('exchangeRates') ? '（缓存）' : '';
                rateInfoEl.innerHTML = '💱 汇率更新时间：' + timeStr + ' ' + isCache;
                rateInfoEl.style.display = 'block';
            } else {
                rateInfoEl.innerHTML = '⏳ 汇率加载中...';
                rateInfoEl.style.display = 'block';
            }
        } else {
            rateInfoEl.style.display = 'none';
        }

        var unitKeys = Object.keys(cat.units);
        var fromVal = fromUnitSelect.getValue();
        var toVal = toUnitSelect.getValue();

        var unitOptions = unitKeys.map(function(key) {
            return { value: key, label: cat.units[key].label };
        });

        fromUnitSelect.updateOptions(unitOptions);
        toUnitSelect.updateOptions(unitOptions);

        // 恢复之前的选中值（如果存在）
        if (unitKeys.indexOf(fromVal) !== -1) {
            fromUnitSelect.setValue(fromVal);
        } else {
            fromUnitSelect.setValue(unitKeys[0]);
        }

        if (unitKeys.indexOf(toVal) !== -1) {
            toUnitSelect.setValue(toVal);
        } else {
            toUnitSelect.setValue(unitKeys[1] || unitKeys[0]);
        }

        // 避免相同单位
        if (fromUnitSelect.getValue() === toUnitSelect.getValue() && unitKeys.length >= 2) {
            toUnitSelect.setValue(unitKeys[1]);
        }

        doConvert();
    }

    // --- 执行转换 ---
    function doConvert() {
        var catKey = categorySelect.getValue();
        var cat = categories[catKey];
        var fromUnit = fromUnitSelect.getValue();
        var toUnit = toUnitSelect.getValue();
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
        } else if (catKey === 'currency') {
            // 货币转换：检查汇率是否加载
            var fromInfo = cat.units[fromUnit];
            var toInfo = cat.units[toUnit];
            if (!fromInfo.toBase || !toInfo.toBase) {
                resultEl.innerHTML = '<span class="uc-result-placeholder">汇率加载中...</span>';
                return;
            }
            var baseValue = value * fromInfo.toBase;
            result = baseValue / toInfo.toBase;
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

        // 货币类别显示汇率详情
        updateRateInfo();
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
        var fromVal = fromUnitSelect.getValue();
        var toVal = toUnitSelect.getValue();
        fromUnitSelect.setValue(toVal);
        toUnitSelect.setValue(fromVal);
        doConvert();
    }

    // --- 更新汇率信息显示 ---
    function updateRateInfo() {
        var catKey = categorySelect.getValue();
        var rateInfoEl = document.getElementById('ucRateInfo');

        if (catKey !== 'currency') {
            rateInfoEl.style.display = 'none';
            return;
        }

        if (!exchangeRates || !ratesUpdateTime) {
            rateInfoEl.style.display = 'none';
            return;
        }

        // 显示汇率详情
        var fromUnit = fromUnitSelect.getValue();
        var toUnit = toUnitSelect.getValue();
        var fromInfo = categories.currency.units[fromUnit];
        var toInfo = categories.currency.units[toUnit];

        if (!fromInfo || !toInfo || !fromInfo.toBase || !toInfo.toBase) {
            rateInfoEl.style.display = 'none';
            return;
        }

        // 计算汇率：1 fromUnit = ? toUnit
        var rate = (1 / fromInfo.toBase) / (1 / toInfo.toBase);
        var rateStr = formatSignificantDigits(rate, 6);

        // 计算反向汇率：1 toUnit = ? fromUnit
        var reverseRate = 1 / rate;
        var reverseRateStr = formatSignificantDigits(reverseRate, 6);

        // 格式化更新时间
        var timeStr = ratesUpdateTime.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });

        var html = '<div style="margin-top: 8px; padding: 8px; background: rgba(59, 130, 246, 0.1); border-radius: 4px; font-size: 12px; color: #64748b;">';
        html += '💱 <strong>汇率参考</strong>：';
        html += '1 ' + fromInfo.label + ' = ' + rateStr + ' ' + toInfo.label;
        html += ' &nbsp;|&nbsp; ';
        html += '1 ' + toInfo.label + ' = ' + reverseRateStr + ' ' + fromInfo.label;
        html += '<br>';
        html += '📅 更新时间：' + timeStr + ' （每日9:00更新）';
        html += '</div>';

        rateInfoEl.innerHTML = html;
        rateInfoEl.style.display = 'block';
    }

    // --- 事件绑定 ---
    catSelect.addEventListener('change', updateUnitOptions);
    fromSelect.addEventListener('change', doConvert);
    toSelect.addEventListener('change', doConvert);
    valueInput.addEventListener('input', doConvert);
    btnSwap.addEventListener('click', swapUnits);

    // 初始化：先获取汇率，再更新单位选项
    fetchExchangeRates(function(success) {
        updateUnitOptions();
        if (!success) {
            console.warn('使用降级汇率数据');
        }
    });
};
