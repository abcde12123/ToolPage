/**
 * Unit tests for text diff tool (text-diff.js)
 */

// Mock diff library
global.diff = {
    diffWords: function(text1, text2) {
        // Simple mock for testing
        if (text1 === text2) return [{ value: text1 }];
        if (!text1) return [{ added: true, value: text2 }];
        if (!text2) return [{ removed: true, value: text1 }];
        // Find common prefix
        if (text1 === 'Hello World' && text2 === 'Hello Claude') {
            return [
                { value: 'Hello ' },
                { removed: true, value: 'World' },
                { added: true, value: 'Claude' }
            ];
        }
        if (text1 === 'same text' && text2 === 'same text') {
            return [{ value: 'same text' }];
        }
        return [
            { removed: true, value: text1 },
            { added: true, value: text2 }
        ];
    }
};

var fs = require('fs');
var path = require('path');
var toolPath = path.resolve(__dirname, '..', 'tools', 'text-diff.js');

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

describe('initTextDiff', function() {
    it('should render the diff UI', function() {
        require(toolPath);
        window.initTextDiff(container);

        expect(container.querySelector('#dfOriginal')).not.toBeNull();
        expect(container.querySelector('#dfModified')).not.toBeNull();
        expect(container.querySelector('#dfCompare')).not.toBeNull();
        expect(container.querySelector('#dfClear')).not.toBeNull();
        expect(container.querySelector('#dfResult')).not.toBeNull();
    });

    it('should show identical message for same text', function() {
        require(toolPath);
        window.initTextDiff(container);

        container.querySelector('#dfOriginal').value = 'same text';
        container.querySelector('#dfModified').value = 'same text';
        container.querySelector('#dfCompare').dispatchEvent(new Event('click'));

        var result = container.querySelector('#dfResult');
        expect(result.innerHTML).toContain('文本内容完全一致');
    });

    it('should highlight added text with df-added class', function() {
        require(toolPath);
        window.initTextDiff(container);

        container.querySelector('#dfOriginal').value = '';
        container.querySelector('#dfModified').value = 'new content';
        container.querySelector('#dfCompare').dispatchEvent(new Event('click'));

        var result = container.querySelector('#dfResult');
        expect(result.innerHTML).toContain('df-added');
    });

    it('should highlight removed text with df-removed class', function() {
        require(toolPath);
        window.initTextDiff(container);

        container.querySelector('#dfOriginal').value = 'old content';
        container.querySelector('#dfModified').value = '';
        container.querySelector('#dfCompare').dispatchEvent(new Event('click'));

        var result = container.querySelector('#dfResult');
        expect(result.innerHTML).toContain('df-removed');
    });

    it('should handle both added and removed parts', function() {
        require(toolPath);
        window.initTextDiff(container);

        container.querySelector('#dfOriginal').value = 'Hello World';
        container.querySelector('#dfModified').value = 'Hello Claude';
        container.querySelector('#dfCompare').dispatchEvent(new Event('click'));

        var result = container.querySelector('#dfResult');
        expect(result.innerHTML).toContain('df-added');
        expect(result.innerHTML).toContain('df-removed');
        expect(result.innerHTML).toContain('Claude');
        expect(result.innerHTML).toContain('World');
    });

    it('should clear all fields', function() {
        require(toolPath);
        window.initTextDiff(container);

        container.querySelector('#dfOriginal').value = 'text1';
        container.querySelector('#dfModified').value = 'text2';
        container.querySelector('#dfClear').dispatchEvent(new Event('click'));

        expect(container.querySelector('#dfOriginal').value).toBe('');
        expect(container.querySelector('#dfModified').value).toBe('');
    });

    it('should show placeholder when both inputs empty', function() {
        require(toolPath);
        window.initTextDiff(container);

        container.querySelector('#dfOriginal').value = '';
        container.querySelector('#dfModified').value = '';
        container.querySelector('#dfCompare').dispatchEvent(new Event('click'));

        var result = container.querySelector('#dfResult');
        expect(result.innerHTML).toContain('请至少输入一段文本');
    });
});
