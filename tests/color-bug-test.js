// 图片工坊调色bug压力测试
(function() {

    function testColorAdjustBug() {
        console.log('开始调色bug压力测试...');

        // 上传纯灰色图片
        const canvas = document.createElement('canvas');
        canvas.width = 100;
        canvas.height = 100;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#808080'; // RGB(128,128,128)
        ctx.fillRect(0, 0, 100, 100);

        canvas.toBlob((blob) => {
            const file = new File([blob], 'test.png', { type: 'image/png' });
            const dt = new DataTransfer();
            dt.items.add(file);
            document.getElementById('iwFile').files = dt.files;
            document.getElementById('iwFile').dispatchEvent(new Event('change', { bubbles: true }));

            setTimeout(() => {
                // 点击调色工具
                document.querySelector('[data-tool="color"]').click();

                setTimeout(() => {
                    runStressTest();
                }, 300);
            }, 1000);
        });
    }

    function runStressTest() {
        const contrastSlider = document.getElementById('iwColorC');
        const displayCanvas = document.getElementById('iwCanvas');
        const displayCtx = displayCanvas.getContext('2d');

        // 获取原始像素
        let originalPixel = displayCtx.getImageData(50, 50, 1, 1).data;
        console.log('原始像素:', Array.from(originalPixel));

        let testIndex = 0;
        const tests = [
            // 测试1: 快速拖动并立即松手
            () => {
                console.log('\n测试1: 快速拖动到100并立即松手');
                contrastSlider.value = 100;
                contrastSlider.dispatchEvent(new Event('input', { bubbles: true }));
                // 不等待，立即触发change
                contrastSlider.dispatchEvent(new Event('change', { bubbles: true }));
            },

            // 测试2: 拖动后立即改值再松手
            () => {
                console.log('\n测试2: 拖到100后立即改0再松手');
                contrastSlider.value = 100;
                contrastSlider.dispatchEvent(new Event('input', { bubbles: true }));
                contrastSlider.value = 0;
                contrastSlider.dispatchEvent(new Event('input', { bubbles: true }));
                contrastSlider.dispatchEvent(new Event('change', { bubbles: true }));
            },

            // 测试3: 疯狂抖动
            () => {
                console.log('\n测试3: 疯狂正负抖动');
                for (let i = 0; i < 20; i++) {
                    contrastSlider.value = i % 2 === 0 ? 100 : -100;
                    contrastSlider.dispatchEvent(new Event('input', { bubbles: true }));
                }
                contrastSlider.value = 0;
                contrastSlider.dispatchEvent(new Event('input', { bubbles: true }));
                contrastSlider.dispatchEvent(new Event('change', { bubbles: true }));
            },

            // 测试4: 连续多次提交
            () => {
                console.log('\n测试4: 连续多次change事件');
                contrastSlider.value = 50;
                contrastSlider.dispatchEvent(new Event('input', { bubbles: true }));
                contrastSlider.dispatchEvent(new Event('change', { bubbles: true }));
                contrastSlider.dispatchEvent(new Event('change', { bubbles: true }));
                contrastSlider.dispatchEvent(new Event('change', { bubbles: true }));
            }
        ];

        function runNextTest() {
            if (testIndex >= tests.length) {
                console.log('\n所有测试完成');
                return;
            }

            tests[testIndex]();
            testIndex++;

            // 等待足够时间让异步任务完成
            setTimeout(() => {
                let currentPixel = displayCtx.getImageData(50, 50, 1, 1).data;
                console.log('当前像素:', Array.from(currentPixel));
                console.log('滑块值:', contrastSlider.value);

                // 检查是否和原始像素一致
                let isDifferent = false;
                for (let i = 0; i < 3; i++) {
                    if (Math.abs(currentPixel[i] - originalPixel[i]) > 1) {
                        isDifferent = true;
                        break;
                    }
                }

                if (isDifferent && contrastSlider.value === '0') {
                    console.error('❌ BUG发现！滑块为0但像素已改变！');
                    console.error('预期:', Array.from(originalPixel));
                    console.error('实际:', Array.from(currentPixel));
                } else {
                    console.log('✓ 测试通过');
                }

                // 重置状态
                document.getElementById('iwUndo').click();

                setTimeout(runNextTest, 200);
            }, 200);
        }

        runNextTest();
    }

    window.testColorAdjustBug = testColorAdjustBug;
    console.log('压力测试已加载，运行 testColorAdjustBug() 开始测试');
})();
