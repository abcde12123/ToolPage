/**
 * Unit tests for password generator (password.js)
 */

// Mock crypto.getRandomValues
var mockRandomValues = null;
global.crypto = {
    getRandomValues: function(arr) {
        if (mockRandomValues) {
            for (var i = 0; i < arr.length && i < mockRandomValues.length; i++) {
                arr[i] = mockRandomValues[i];
            }
        } else {
            for (var i = 0; i < arr.length; i++) {
                arr[i] = Math.floor(Math.random() * 256);
            }
        }
        return arr;
    }
};

var fs = require('fs');
var path = require('path');
var toolPath = path.resolve(__dirname, '..', 'tools', 'password.js');

var container;
beforeEach(function() {
    container = document.createElement('div');
    document.body.appendChild(container);
    mockRandomValues = null;
});

afterEach(function() {
    if (container && container.parentNode) {
        document.body.removeChild(container);
    }
    delete require.cache[require.resolve(toolPath)];
});

describe('initPassword', function() {
    it('should render the password generator UI', function() {
        global.showToast = function() {};
        require(toolPath);
        window.initPassword(container);

        expect(container.querySelector('#pwDisplay')).not.toBeNull();
        expect(container.querySelector('#pwLength')).not.toBeNull();
        expect(container.querySelector('#pwGenerate')).not.toBeNull();
        expect(container.querySelector('#pwCopy')).not.toBeNull();
    });

    it('should generate a password of specified length', function() {
        global.showToast = function() {};
        require(toolPath);
        window.initPassword(container);

        var slider = container.querySelector('#pwLength');
        var btn = container.querySelector('#pwGenerate');
        var display = container.querySelector('#pwDisplay');

        slider.value = '20';
        btn.dispatchEvent(new Event('click'));

        expect(display.textContent.length).toBe(20);
    });

    it('should generate only uppercase when only upper is checked', function() {
        global.showToast = function() {};
        require(toolPath);
        window.initPassword(container);

        var upperCb = container.querySelector('#pwUpper');
        upperCb.checked = true;
        container.querySelector('#pwLower').checked = false;
        container.querySelector('#pwDigits').checked = false;
        container.querySelector('#pwSymbols').checked = false;

        container.querySelector('#pwGenerate').dispatchEvent(new Event('click'));

        var pwd = container.querySelector('#pwDisplay').textContent;
        expect(/^[A-Z]+$/.test(pwd)).toBe(true);
    });

    it('should show toast when no character type is selected', function() {
        var toastMsg = '';
        global.showToast = function(msg) { toastMsg = msg; };
        require(toolPath);
        window.initPassword(container);

        container.querySelector('#pwUpper').checked = false;
        container.querySelector('#pwLower').checked = false;
        container.querySelector('#pwDigits').checked = false;
        container.querySelector('#pwSymbols').checked = false;

        container.querySelector('#pwGenerate').dispatchEvent(new Event('click'));

        expect(toastMsg).toBe('请至少选择一种字符类型');
    });

    it('should update slider value display on input', function() {
        global.showToast = function() {};
        require(toolPath);
        window.initPassword(container);

        var slider = container.querySelector('#pwLength');
        var valEl = container.querySelector('#pwLengthVal');

        slider.value = '32';
        slider.dispatchEvent(new Event('input'));

        expect(valEl.textContent).toBe('32');
    });

    it('should calculate password strength as very strong with all types and len=20', function() {
        global.showToast = function() {};
        require(toolPath);
        window.initPassword(container);

        var slider = container.querySelector('#pwLength');
        slider.value = '20';
        container.querySelector('#pwUpper').checked = true;
        container.querySelector('#pwLower').checked = true;
        container.querySelector('#pwDigits').checked = true;
        container.querySelector('#pwSymbols').checked = true;
        slider.dispatchEvent(new Event('input'));

        var strengthEl = container.querySelector('#pwStrength');
        expect(strengthEl.className).toContain('pw-very-strong');
    });

    it('should calculate weak strength for short single-type password', function() {
        global.showToast = function() {};
        require(toolPath);
        window.initPassword(container);

        var slider = container.querySelector('#pwLength');
        slider.value = '6';
        container.querySelector('#pwUpper').checked = true;
        container.querySelector('#pwLower').checked = false;
        container.querySelector('#pwDigits').checked = false;
        container.querySelector('#pwSymbols').checked = false;
        slider.dispatchEvent(new Event('input'));

        var strengthEl = container.querySelector('#pwStrength');
        expect(strengthEl.className).toContain('pw-weak');
    });

    it('should handle length 4 (minimum)', function() {
        global.showToast = function() {};
        require(toolPath);
        window.initPassword(container);

        container.querySelector('#pwLength').value = '4';
        container.querySelector('#pwGenerate').dispatchEvent(new Event('click'));

        expect(container.querySelector('#pwDisplay').textContent.length).toBe(4);
    });
});
