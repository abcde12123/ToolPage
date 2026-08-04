/**
 * Unit tests for unit converter (unit-convert.js)
 */

var fs = require('fs');
var path = require('path');
var toolPath = path.resolve(__dirname, '..', 'tools', 'unit-convert.js');

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

describe('initUnitConvert', function() {
    it('should render the unit converter UI', function() {
        require(toolPath);
        window.initUnitConvert(container);

        expect(container.querySelector('#ucCategory')).not.toBeNull();
        expect(container.querySelector('#ucFromUnit')).not.toBeNull();
        expect(container.querySelector('#ucToUnit')).not.toBeNull();
        expect(container.querySelector('#ucValue')).not.toBeNull();
        expect(container.querySelector('#ucSwap')).not.toBeNull();
        expect(container.querySelector('#ucResult')).not.toBeNull();
    });

    it('should have 6 category options', function() {
        require(toolPath);
        window.initUnitConvert(container);

        var options = container.querySelectorAll('#ucCategory option');
        expect(options.length).toBe(6);
    });

    it('should convert length: 1 km to 1000 m', function() {
        require(toolPath);
        window.initUnitConvert(container);

        container.querySelector('#ucCategory').value = 'length';
        container.querySelector('#ucCategory').dispatchEvent(new Event('change'));

        container.querySelector('#ucFromUnit').value = 'km';
        container.querySelector('#ucToUnit').value = 'm';
        container.querySelector('#ucValue').value = '1';
        container.querySelector('#ucValue').dispatchEvent(new Event('input'));

        var result = container.querySelector('#ucResult').innerHTML;
        expect(result).toContain('1000');
    });

    it('should convert temperature: 0 C to 32 F', function() {
        require(toolPath);
        window.initUnitConvert(container);

        container.querySelector('#ucCategory').value = 'temperature';
        container.querySelector('#ucCategory').dispatchEvent(new Event('change'));

        container.querySelector('#ucFromUnit').value = 'C';
        container.querySelector('#ucToUnit').value = 'F';
        container.querySelector('#ucValue').value = '0';
        container.querySelector('#ucValue').dispatchEvent(new Event('input'));

        var result = container.querySelector('#ucResult').innerHTML;
        expect(result).toContain('32');
    });

    it('should convert temperature: 100 C to 373.15 K', function() {
        require(toolPath);
        window.initUnitConvert(container);

        container.querySelector('#ucCategory').value = 'temperature';
        container.querySelector('#ucCategory').dispatchEvent(new Event('change'));

        container.querySelector('#ucFromUnit').value = 'C';
        container.querySelector('#ucToUnit').value = 'K';
        container.querySelector('#ucValue').value = '100';
        container.querySelector('#ucValue').dispatchEvent(new Event('input'));

        var result = container.querySelector('#ucResult').innerHTML;
        expect(result).toContain('373');
    });

    it('should swap units on flip button click', function() {
        require(toolPath);
        window.initUnitConvert(container);

        container.querySelector('#ucCategory').value = 'length';
        container.querySelector('#ucCategory').dispatchEvent(new Event('change'));

        container.querySelector('#ucFromUnit').value = 'km';
        container.querySelector('#ucToUnit').value = 'm';
        container.querySelector('#ucSwap').dispatchEvent(new Event('click'));

        expect(container.querySelector('#ucFromUnit').value).toBe('m');
        expect(container.querySelector('#ucToUnit').value).toBe('km');
    });

    it('should show placeholder for empty input', function() {
        require(toolPath);
        window.initUnitConvert(container);

        container.querySelector('#ucValue').value = '';
        container.querySelector('#ucValue').dispatchEvent(new Event('input'));

        var result = container.querySelector('#ucResult').innerHTML;
        expect(result).toContain('--');
    });

    it('should show placeholder for non-numeric input', function() {
        require(toolPath);
        window.initUnitConvert(container);

        container.querySelector('#ucValue').value = 'abc';
        container.querySelector('#ucValue').dispatchEvent(new Event('input'));

        var result = container.querySelector('#ucResult').innerHTML;
        expect(result).toContain('--');
    });

    it('should update unit lists when category changes', function() {
        require(toolPath);
        window.initUnitConvert(container);

        // initial state has length options
        var lengthOptions = container.querySelectorAll('#ucFromUnit option');
        expect(lengthOptions.length).toBeGreaterThan(2);

        container.querySelector('#ucCategory').value = 'speed';
        container.querySelector('#ucCategory').dispatchEvent(new Event('change'));

        var speedOptions = container.querySelectorAll('#ucFromUnit option');
        expect(speedOptions.length).toBeGreaterThan(0);
        // speed has 4 units
        expect(speedOptions.length).toBe(4);
    });

    it('should convert weight: 1 kg approx 2.20462 lb', function() {
        require(toolPath);
        window.initUnitConvert(container);

        container.querySelector('#ucCategory').value = 'weight';
        container.querySelector('#ucCategory').dispatchEvent(new Event('change'));

        container.querySelector('#ucFromUnit').value = 'kg';
        container.querySelector('#ucToUnit').value = 'lb';
        container.querySelector('#ucValue').value = '1';
        container.querySelector('#ucValue').dispatchEvent(new Event('input'));

        var result = container.querySelector('#ucResult').innerHTML;
        expect(result).toContain('2.204');
    });
});
