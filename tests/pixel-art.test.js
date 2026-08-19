// 像素画编辑器单元测试
// 测试覆盖：数据结构、工具切换、画布操作、导入导出、色彩简化

(function() {
    'use strict';

    var testResults = [];
    var testContainer;

    // 测试辅助函数
    function assert(condition, message) {
        if (!condition) {
            throw new Error('断言失败: ' + message);
        }
    }

    function assertEquals(actual, expected, message) {
        if (actual !== expected) {
            throw new Error(message + ' - 期望: ' + expected + ', 实际: ' + actual);
        }
    }

    function assertTrue(condition, message) {
        assert(condition === true, message);
    }

    function assertFalse(condition, message) {
        assert(condition === false, message);
    }

    function assertNotNull(value, message) {
        assert(value !== null && value !== undefined, message);
    }

    function runTest(name, testFn) {
        console.log('运行测试: ' + name);
        try {
            testFn();
            testResults.push({ name: name, passed: true });
            console.log('✓ ' + name);
        } catch (e) {
            testResults.push({ name: name, passed: false, error: e.message });
            console.error('✗ ' + name + ': ' + e.message);
        }
    }

    function setupTestEnvironment() {
        // 创建测试容器
        testContainer = document.createElement('div');
        testContainer.id = 'test-container';
        testContainer.style.cssText = 'position:absolute;left:-9999px;';
        document.body.appendChild(testContainer);

        // 模拟 showToast
        window.showToast = function(msg) {
            console.log('Toast: ' + msg);
        };
    }

    function teardownTestEnvironment() {
        if (testContainer && testContainer.parentNode) {
            testContainer.parentNode.removeChild(testContainer);
        }
    }

    function getPixelArtInstance() {
        testContainer.innerHTML = '';
        window.initPixelArt(testContainer);

        return {
            container: testContainer,
            grid: document.getElementById('pxGrid'),
            sizeInput: document.getElementById('pxSizeInput'),
            size16Btn: document.getElementById('pxSize16'),
            size32Btn: document.getElementById('pxSize32'),
            size48Btn: document.getElementById('pxSize48'),
            penBtn: document.getElementById('pxToolPen'),
            eraserBtn: document.getElementById('pxToolEraser'),
            clearBtn: document.getElementById('pxClear'),
            undoBtn: document.getElementById('pxUndo'),
            exportBtn: document.getElementById('pxExport'),
            importBtn: document.getElementById('pxImport'),
            fileInput: document.getElementById('pxFileInput'),
            simplifyCheck: document.getElementById('pxSimplify'),
            colorCountInput: document.getElementById('pxColorCount'),
            color4Btn: document.getElementById('pxColor4'),
            color8Btn: document.getElementById('pxColor8'),
            color16Btn: document.getElementById('pxColor16'),
            color32Btn: document.getElementById('pxColor32'),
            currentColor: document.getElementById('pxCurrent'),
            colorPicker: document.getElementById('pxColorPick'),
            status: document.getElementById('pxStatus')
        };
    }

    // ===== 测试套件 =====
    function defineTests() {
        // 1. 初始化测试
        runTest('初始化 - 默认画布为16x16', function() {
        var px = getPixelArtInstance();
        assertNotNull(px.grid, '画布网格应存在');
        assertEquals(px.sizeInput.value, '16', '默认尺寸应为16');
        assertTrue(px.size16Btn.classList.contains('active'), '16x16按钮应激活');
        assertTrue(px.status.textContent.includes('16×16'), '状态应显示16×16');
    });

    runTest('初始化 - 默认工具为铅笔', function() {
        var px = getPixelArtInstance();
        assertTrue(px.penBtn.classList.contains('active'), '铅笔按钮应激活');
        assertFalse(px.eraserBtn.classList.contains('active'), '橡皮按钮不应激活');
    });

    runTest('初始化 - 色彩简化默认开启且为16色', function() {
        var px = getPixelArtInstance();
        assertTrue(px.simplifyCheck.checked, '色彩简化应默认勾选');
        assertEquals(px.colorCountInput.value, '16', '默认颜色数应为16');
        assertTrue(px.color16Btn.classList.contains('active'), '16色按钮应激活');
    });

    // 2. 工具切换测试
    runTest('工具切换 - 切换到橡皮', function() {
        var px = getPixelArtInstance();
        px.eraserBtn.click();
        assertTrue(px.eraserBtn.classList.contains('active'), '橡皮按钮应激活');
        assertFalse(px.penBtn.classList.contains('active'), '铅笔按钮不应激活');
    });

    runTest('工具切换 - 切换回铅笔', function() {
        var px = getPixelArtInstance();
        px.eraserBtn.click();
        px.penBtn.click();
        assertTrue(px.penBtn.classList.contains('active'), '铅笔按钮应激活');
        assertFalse(px.eraserBtn.classList.contains('active'), '橡皮按钮不应激活');
    });

    // 3. 画布尺寸测试
    runTest('画布尺寸 - 切换到32x32', function() {
        var px = getPixelArtInstance();
        px.size32Btn.click();
        assertEquals(px.sizeInput.value, '32', '尺寸应为32');
        assertTrue(px.size32Btn.classList.contains('active'), '32x32按钮应激活');
        assertFalse(px.size16Btn.classList.contains('active'), '16x16按钮不应激活');
        assertTrue(px.status.textContent.includes('32×32'), '状态应显示32×32');
    });

    runTest('画布尺寸 - 输入框设置自定义尺寸24', function() {
        var px = getPixelArtInstance();
        px.sizeInput.value = '24';
        px.sizeInput.dispatchEvent(new Event('change'));
        assertEquals(px.sizeInput.value, '24', '尺寸应为24');
        assertTrue(px.status.textContent.includes('24×24'), '状态应显示24×24');
    });

    runTest('画布尺寸 - 边界测试：最小值8', function() {
        var px = getPixelArtInstance();
        px.sizeInput.value = '5';
        px.sizeInput.dispatchEvent(new Event('change'));
        assertEquals(px.sizeInput.value, '8', '尺寸应被限制为8');
    });

    runTest('画布尺寸 - 边界测试：最大值64', function() {
        var px = getPixelArtInstance();
        px.sizeInput.value = '100';
        px.sizeInput.dispatchEvent(new Event('change'));
        assertEquals(px.sizeInput.value, '64', '尺寸应被限制为64');
    });

    runTest('画布尺寸 - 无效输入处理', function() {
        var px = getPixelArtInstance();
        var originalSize = px.sizeInput.value;
        px.sizeInput.value = 'abc';
        px.sizeInput.dispatchEvent(new Event('change'));
        // 无效输入应恢复原值或默认为16
        var newSize = px.sizeInput.value;
        assertTrue(newSize === originalSize || newSize === '16', '无效输入应恢复');
    });

    // 4. 颜色选择测试
    runTest('颜色选择 - 使用颜色选择器', function() {
        var px = getPixelArtInstance();
        px.colorPicker.value = '#FF5733';
        px.colorPicker.dispatchEvent(new Event('input'));
        var currentBg = px.currentColor.style.background;
        assertTrue(currentBg.includes('FF5733') || currentBg.includes('ff5733'),
                   '当前颜色应更新为选择的颜色');
    });

    runTest('颜色选择 - 点击预设色板', function() {
        var px = getPixelArtInstance();
        var paletteButtons = px.container.querySelectorAll('.px-pal');
        assertTrue(paletteButtons.length > 0, '应有预设色板按钮');

        if (paletteButtons.length > 0) {
            paletteButtons[0].click();
            var expectedColor = paletteButtons[0].getAttribute('data-color');
            var currentBg = px.currentColor.style.background;
            assertTrue(currentBg.includes(expectedColor.substring(1).toLowerCase()),
                       '当前颜色应更新为色板颜色');
        }
    });

    // 5. 清空和撤销测试
    runTest('清空画布 - 空画布清空提示', function() {
        var px = getPixelArtInstance();
        var toastCalled = false;
        var originalToast = window.showToast;
        window.showToast = function(msg) {
            if (msg.includes('空')) toastCalled = true;
        };
        px.clearBtn.click();
        window.showToast = originalToast;
        assertTrue(toastCalled, '空画布清空应有提示');
    });

    runTest('撤销 - 空历史撤销提示', function() {
        var px = getPixelArtInstance();
        var toastCalled = false;
        var originalToast = window.showToast;
        window.showToast = function(msg) {
            if (msg.includes('撤销')) toastCalled = true;
        };
        px.undoBtn.click();
        window.showToast = originalToast;
        assertTrue(toastCalled, '空历史撤销应有提示');
    });

    // 6. 色彩简化设置测试
    runTest('色彩简化 - 切换到4色', function() {
        var px = getPixelArtInstance();
        px.color4Btn.click();
        assertEquals(px.colorCountInput.value, '4', '颜色数应为4');
        assertTrue(px.color4Btn.classList.contains('active'), '4色按钮应激活');
        assertFalse(px.color16Btn.classList.contains('active'), '16色按钮不应激活');
    });

    runTest('色彩简化 - 切换到32色', function() {
        var px = getPixelArtInstance();
        px.color32Btn.click();
        assertEquals(px.colorCountInput.value, '32', '颜色数应为32');
        assertTrue(px.color32Btn.classList.contains('active'), '32色按钮应激活');
    });

    runTest('色彩简化 - 自定义颜色数', function() {
        var px = getPixelArtInstance();
        px.colorCountInput.value = '20';
        px.colorCountInput.dispatchEvent(new Event('change'));
        assertEquals(px.colorCountInput.value, '20', '颜色数应为20');
        // 所有快捷按钮都不应激活
        assertFalse(px.color4Btn.classList.contains('active'), '4色按钮不应激活');
        assertFalse(px.color8Btn.classList.contains('active'), '8色按钮不应激活');
        assertFalse(px.color16Btn.classList.contains('active'), '16色按钮不应激活');
        assertFalse(px.color32Btn.classList.contains('active'), '32色按钮不应激活');
    });

    runTest('色彩简化 - 边界测试：最小值2', function() {
        var px = getPixelArtInstance();
        px.colorCountInput.value = '1';
        px.colorCountInput.dispatchEvent(new Event('change'));
        assertEquals(px.colorCountInput.value, '2', '颜色数应被限制为2');
    });

    runTest('色彩简化 - 边界测试：最大值256', function() {
        var px = getPixelArtInstance();
        px.colorCountInput.value = '300';
        px.colorCountInput.dispatchEvent(new Event('change'));
        assertEquals(px.colorCountInput.value, '256', '颜色数应被限制为256');
    });

    runTest('色彩简化 - 取消勾选', function() {
        var px = getPixelArtInstance();
        assertTrue(px.simplifyCheck.checked, '初始应勾选');
        px.simplifyCheck.checked = false;
        px.simplifyCheck.dispatchEvent(new Event('change'));
        assertFalse(px.simplifyCheck.checked, '应取消勾选');
    });

    // 7. 导出测试
    runTest('导出 - 空画布导出提示', function() {
        var px = getPixelArtInstance();
        var toastCalled = false;
        var originalToast = window.showToast;
        window.showToast = function(msg) {
            if (msg.includes('空')) toastCalled = true;
        };
        px.exportBtn.click();
        window.showToast = originalToast;
        assertTrue(toastCalled, '空画布导出应有提示');
    });

    // 8. DOM结构完整性测试
    runTest('DOM完整性 - 所有必需元素存在', function() {
        var px = getPixelArtInstance();
        assertNotNull(px.grid, '画布网格应存在');
        assertNotNull(px.sizeInput, '尺寸输入框应存在');
        assertNotNull(px.penBtn, '铅笔按钮应存在');
        assertNotNull(px.eraserBtn, '橡皮按钮应存在');
        assertNotNull(px.clearBtn, '清空按钮应存在');
        assertNotNull(px.undoBtn, '撤销按钮应存在');
        assertNotNull(px.exportBtn, '导出按钮应存在');
        assertNotNull(px.importBtn, '导入按钮应存在');
        assertNotNull(px.fileInput, '文件输入应存在');
        assertNotNull(px.simplifyCheck, '色彩简化复选框应存在');
        assertNotNull(px.colorCountInput, '颜色数输入框应存在');
        assertNotNull(px.currentColor, '当前颜色显示应存在');
        assertNotNull(px.colorPicker, '颜色选择器应存在');
        assertNotNull(px.status, '状态显示应存在');
    });

    runTest('DOM完整性 - 画布网格初始渲染', function() {
        var px = getPixelArtInstance();
        var cells = px.grid.querySelectorAll('.px-cell');
        assertEquals(cells.length, 16 * 16, '应渲染256个格子（16x16）');
    });

    runTest('DOM完整性 - 预设色板渲染', function() {
        var px = getPixelArtInstance();
        var palButtons = px.container.querySelectorAll('.px-pal');
        assertTrue(palButtons.length >= 16, '应至少有16个预设颜色按钮');
    });

    // 9. 状态显示测试
    runTest('状态显示 - 初始显示空白画布', function() {
        var px = getPixelArtInstance();
        assertTrue(px.status.textContent.includes('空白画布'), '应显示空白画布');
    });

    // 10. 按钮状态一致性测试
    runTest('按钮状态 - 尺寸按钮互斥', function() {
        var px = getPixelArtInstance();
        px.size32Btn.click();
        var activeCount = 0;
        if (px.size16Btn.classList.contains('active')) activeCount++;
        if (px.size32Btn.classList.contains('active')) activeCount++;
        if (px.size48Btn.classList.contains('active')) activeCount++;
        assertEquals(activeCount, 1, '应只有一个尺寸按钮激活');
    });

    runTest('按钮状态 - 工具按钮互斥', function() {
        var px = getPixelArtInstance();
        px.eraserBtn.click();
        var penActive = px.penBtn.classList.contains('active');
        var eraserActive = px.eraserBtn.classList.contains('active');
        assertTrue((penActive && !eraserActive) || (!penActive && eraserActive),
                   '铅笔和橡皮应互斥');
    });

    // 11. 输入验证测试
    runTest('输入验证 - 尺寸输入框只接受数字', function() {
        var px = getPixelArtInstance();
        assertEquals(px.sizeInput.type, 'number', '尺寸输入框应为数字类型');
        assertEquals(px.sizeInput.min, '8', '最小值应为8');
        assertEquals(px.sizeInput.max, '64', '最大值应为64');
    });

    runTest('输入验证 - 颜色数输入框只接受数字', function() {
        var px = getPixelArtInstance();
        assertEquals(px.colorCountInput.type, 'number', '颜色数输入框应为数字类型');
        assertEquals(px.colorCountInput.min, '2', '最小值应为2');
        assertEquals(px.colorCountInput.max, '256', '最大值应为256');
    });

    // 12. 事件监听器测试
    runTest('事件监听 - 导入按钮点击触发文件选择', function() {
        var px = getPixelArtInstance();
        var clickCalled = false;
        var originalClick = px.fileInput.click;
        px.fileInput.click = function() {
            clickCalled = true;
        };
        px.importBtn.click();
        px.fileInput.click = originalClick;
        assertTrue(clickCalled, '导入按钮应触发文件输入点击');
    });
    } // end of defineTests

    // ===== 生成测试报告 =====
    function generateReport() {
        console.log('\n========== 测试报告 ==========');
        var passed = 0;
        var failed = 0;

        testResults.forEach(function(result) {
            if (result.passed) {
                passed++;
            } else {
                failed++;
                console.error('失败: ' + result.name + ' - ' + result.error);
            }
        });

        console.log('\n总计: ' + testResults.length + ' 个测试');
        console.log('通过: ' + passed + ' 个 (' + (passed / testResults.length * 100).toFixed(1) + '%)');
        console.log('失败: ' + failed + ' 个 (' + (failed / testResults.length * 100).toFixed(1) + '%)');
        console.log('=============================\n');

        return {
            total: testResults.length,
            passed: passed,
            failed: failed,
            results: testResults
        };
    }

    // 导出测试运行器
    window.runPixelArtTests = function() {
        testResults = [];
        setupTestEnvironment();

        // 运行所有测试
        defineTests();

        var report = generateReport();
        teardownTestEnvironment();

        return report;
    };

    console.log('像素画编辑器测试套件已加载。运行 runPixelArtTests() 开始测试。');
})();
