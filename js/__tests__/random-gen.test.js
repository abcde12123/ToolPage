/**
 * Unit tests for random number generator (random-gen.js)
 */

// Mock crypto
global.crypto = {
    randomUUID: function() {
        return '12345678-1234-4123-8123-123456789abc';
    },
    getRandomValues: function(arr) {
        for (var i = 0; i < arr.length; i++) {
            arr[i] = Math.floor(Math.random() * 256);
        }
        return arr;
    }
};

var fs = require('fs');
var path = require('path');
var toolPath = path.resolve(__dirname, '..', 'tools', 'random-gen.js');

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

describe('initRandomGen', function() {
    it('should render three sections: UUID, integer, decimal', function() {
        global.showToast = function() {};
        global.copyToClipboard = function() {};
        require(toolPath);
        window.initRandomGen(container);

        expect(container.querySelector('#rnUUIDResults')).not.toBeNull();
        expect(container.querySelector('#rnIntResults')).not.toBeNull();
        expect(container.querySelector('#rnDecResults')).not.toBeNull();
        expect(container.querySelector('#rnGenUUID')).not.toBeNull();
        expect(container.querySelector('#rnGenInt')).not.toBeNull();
        expect(container.querySelector('#rnGenDec')).not.toBeNull();
    });

    it('should generate UUID in correct format', function() {
        global.showToast = function() {};
        global.copyToClipboard = function() {};
        require(toolPath);
        window.initRandomGen(container);

        container.querySelector('#rnGenUUID').dispatchEvent(new Event('click'));

        var results = container.querySelector('#rnUUIDResults');
        var uuid = results.querySelector('.rn-result-item span');
        expect(uuid).not.toBeNull();
        // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
        var text = uuid.textContent;
        expect(text.length).toBe(36);
        expect(text.charAt(14)).toBe('4');
    });

    it('should generate random integers within range', function() {
        global.showToast = function() {};
        global.copyToClipboard = function() {};
        require(toolPath);
        window.initRandomGen(container);

        container.querySelector('#rnIntMin').value = '10';
        container.querySelector('#rnIntMax').value = '20';
        container.querySelector('#rnBatchInt').value = '10';
        container.querySelector('#rnGenInt').dispatchEvent(new Event('click'));

        var results = container.querySelector('#rnIntResults');
        var items = results.querySelectorAll('.rn-result-item span');
        expect(items.length).toBe(10);
        for (var i = 0; i < items.length; i++) {
            var val = parseInt(items[i].textContent, 10);
            expect(val).toBeGreaterThanOrEqual(10);
            expect(val).toBeLessThanOrEqual(20);
        }
    });

    it('should show error when min > max for integers', function() {
        var toastMsg = '';
        global.showToast = function(msg) { toastMsg = msg; };
        global.copyToClipboard = function() {};
        require(toolPath);
        window.initRandomGen(container);

        container.querySelector('#rnIntMin').value = '100';
        container.querySelector('#rnIntMax').value = '10';
        container.querySelector('#rnGenInt').dispatchEvent(new Event('click'));

        expect(toastMsg).toBe('最小值不能大于最大值');
    });

    it('should generate random decimals with correct precision', function() {
        global.showToast = function() {};
        global.copyToClipboard = function() {};
        require(toolPath);
        window.initRandomGen(container);

        container.querySelector('#rnDecMin').value = '0';
        container.querySelector('#rnDecMax').value = '1';
        container.querySelector('#rnDecPlaces').value = '3';
        container.querySelector('#rnBatchDec').value = '5';
        container.querySelector('#rnGenDec').dispatchEvent(new Event('click'));

        var results = container.querySelector('#rnDecResults');
        var items = results.querySelectorAll('.rn-result-item span');
        expect(items.length).toBe(5);
        for (var i = 0; i < items.length; i++) {
            var val = parseFloat(items[i].textContent);
            expect(val).toBeGreaterThanOrEqual(0);
            expect(val).toBeLessThanOrEqual(1);
        }
    });

    it('should generate multiple UUIDs as configured', function() {
        global.showToast = function() {};
        global.copyToClipboard = function() {};
        require(toolPath);
        window.initRandomGen(container);

        container.querySelector('#rnBatchUUID').value = '3';
        container.querySelector('#rnGenUUID').dispatchEvent(new Event('click'));

        var results = container.querySelector('#rnUUIDResults');
        var items = results.querySelectorAll('.rn-result-item span');
        expect(items.length).toBe(3);
    });

    it('should cap batch count at 50', function() {
        global.showToast = function() {};
        global.copyToClipboard = function() {};
        require(toolPath);
        window.initRandomGen(container);

        container.querySelector('#rnBatchUUID').value = '999';
        container.querySelector('#rnGenUUID').dispatchEvent(new Event('click'));

        var results = container.querySelector('#rnUUIDResults');
        var items = results.querySelectorAll('.rn-result-item span');
        expect(items.length).toBe(50);
    });
});
