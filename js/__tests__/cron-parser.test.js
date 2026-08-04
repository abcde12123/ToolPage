/**
 * Unit tests for cron expression parser (cron-parser.js)
 */

// Mock cronstrue globally
global.cronstrue = {
    toString: function(expr) {
        // Simple mock: return expression as-is in a format string
        return '解析结果: ' + expr;
    }
};

var fs = require('fs');
var path = require('path');
var toolPath = path.resolve(__dirname, '..', 'tools', 'cron-parser.js');

var container;
beforeEach(function() {
    container = document.createElement('div');
    document.body.appendChild(container);
});

afterEach(function() {
    if (container && container.parentNode) {
        document.body.removeChild(container);
    }
    delete require.cache[require.resolve(toolPath)];
});

describe('initCronParser', function() {
    it('should render the cron parser UI', function() {
        require(toolPath);
        window.initCronParser(container);

        expect(container.querySelector('#crInput')).not.toBeNull();
        expect(container.querySelector('#crDescription')).not.toBeNull();
        expect(container.querySelector('#crSchedule')).not.toBeNull();
        expect(container.querySelector('#crError')).not.toBeNull();
    });

    it('should have 6 preset buttons', function() {
        require(toolPath);
        window.initCronParser(container);

        var presets = container.querySelectorAll('.cr-preset');
        expect(presets.length).toBe(6);
    });

    it('should set input value when preset button clicked', function() {
        require(toolPath);
        window.initCronParser(container);

        var presets = container.querySelectorAll('.cr-preset');
        presets[0].dispatchEvent(new Event('click'));

        expect(container.querySelector('#crInput').value).toBe('* * * * *');
    });

    it('should show error for invalid cron expression', function(done) {
        require(toolPath);
        window.initCronParser(container);

        var input = container.querySelector('#crInput');
        input.value = 'invalid cron';
        input.dispatchEvent(new Event('input'));

        setTimeout(function() {
            var errorEl = container.querySelector('#crError');
            expect(errorEl.style.display).toBe('block');
            expect(errorEl.textContent).toContain('无效');
            done();
        }, 350);
    });

    it('should parse valid cron: */5 * * * *', function(done) {
        require(toolPath);
        window.initCronParser(container);

        var input = container.querySelector('#crInput');
        input.value = '*/5 * * * *';
        input.dispatchEvent(new Event('input'));

        setTimeout(function() {
            var schedule = container.querySelector('#crSchedule');
            expect(schedule.innerHTML).not.toBe('');
            expect(schedule.innerHTML).toContain('cr-schedule-item');
            done();
        }, 350);
    });

    it('should parse valid cron: 0 9 * * 1-5', function(done) {
        require(toolPath);
        window.initCronParser(container);

        var input = container.querySelector('#crInput');
        input.value = '0 9 * * 1-5';
        input.dispatchEvent(new Event('input'));

        setTimeout(function() {
            var schedule = container.querySelector('#crSchedule');
            expect(schedule.innerHTML).not.toBe('');
            done();
        }, 350);
    });
});
