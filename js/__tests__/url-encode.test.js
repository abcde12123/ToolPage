/**
 * Unit tests for URL encode/decode tool (url-encode.js)
 */

var fs = require('fs');
var path = require('path');
var toolPath = path.resolve(__dirname, '..', 'tools', 'url-encode.js');

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

describe('initUrlEncode', function() {
    it('should render the URL codec UI', function() {
        global.showToast = function() {};
        global.copyToClipboard = function() {};
        require(toolPath);
        window.initUrlEncode(container);

        expect(container.querySelector('#ueInput')).not.toBeNull();
        expect(container.querySelector('#ueOutput')).not.toBeNull();
        expect(container.querySelector('#ueEncode')).not.toBeNull();
        expect(container.querySelector('#ueDecode')).not.toBeNull();
        expect(container.querySelector('#ueCopy')).not.toBeNull();
        expect(container.querySelector('#ueClear')).not.toBeNull();
    });

    it('should encode Chinese characters to percent-encoded format', function() {
        global.showToast = function() {};
        global.copyToClipboard = function() {};
        require(toolPath);
        window.initUrlEncode(container);

        container.querySelector('#ueInput').value = '你好';
        container.querySelector('#ueEncode').dispatchEvent(new Event('click'));

        var output = container.querySelector('#ueOutput').value;
        expect(output).toBe(encodeURIComponent('你好'));
        expect(output).toContain('%');
    });

    it('should decode percent-encoded string back to original', function() {
        global.showToast = function() {};
        global.copyToClipboard = function() {};
        require(toolPath);
        window.initUrlEncode(container);

        container.querySelector('#ueInput').value = '%E4%BD%A0%E5%A5%BD';
        container.querySelector('#ueDecode').dispatchEvent(new Event('click'));

        var output = container.querySelector('#ueOutput').value;
        expect(output).toBe('你好');
    });

    it('should handle encode-decode roundtrip', function() {
        global.showToast = function() {};
        global.copyToClipboard = function() {};
        require(toolPath);
        window.initUrlEncode(container);

        var input = 'hello world! 你好';
        container.querySelector('#ueInput').value = input;
        container.querySelector('#ueEncode').dispatchEvent(new Event('click'));
        var encoded = container.querySelector('#ueOutput').value;

        container.querySelector('#ueInput').value = encoded;
        container.querySelector('#ueDecode').dispatchEvent(new Event('click'));
        var decoded = container.querySelector('#ueOutput').value;

        expect(decoded).toBe(input);
    });

    it('should show error for invalid encoded string', function() {
        global.showToast = function() {};
        global.copyToClipboard = function() {};
        require(toolPath);
        window.initUrlEncode(container);

        container.querySelector('#ueInput').value = '%ZZ'; // invalid hex
        container.querySelector('#ueDecode').dispatchEvent(new Event('click'));

        var errorEl = container.querySelector('#ueError');
        expect(errorEl.style.display).toBe('block');
    });

    it('should handle empty input without error', function() {
        global.showToast = function() {};
        global.copyToClipboard = function() {};
        require(toolPath);
        window.initUrlEncode(container);

        container.querySelector('#ueInput').value = '';
        container.querySelector('#ueEncode').dispatchEvent(new Event('click'));
        expect(container.querySelector('#ueOutput').value).toBe('');

        container.querySelector('#ueDecode').dispatchEvent(new Event('click'));
        expect(container.querySelector('#ueOutput').value).toBe('');
    });

    it('should encode special chars: space, ampersand, equals', function() {
        global.showToast = function() {};
        global.copyToClipboard = function() {};
        require(toolPath);
        window.initUrlEncode(container);

        container.querySelector('#ueInput').value = 'a=1&b=2';
        container.querySelector('#ueEncode').dispatchEvent(new Event('click'));

        var output = container.querySelector('#ueOutput').value;
        expect(output).toContain('%3D');
        expect(output).toContain('%26');
    });

    it('should clear both input and output', function() {
        global.showToast = function() {};
        global.copyToClipboard = function() {};
        require(toolPath);
        window.initUrlEncode(container);

        container.querySelector('#ueInput').value = 'test';
        container.querySelector('#ueOutput').value = 'result';
        container.querySelector('#ueClear').dispatchEvent(new Event('click'));

        expect(container.querySelector('#ueInput').value).toBe('');
        expect(container.querySelector('#ueOutput').value).toBe('');
    });
});
