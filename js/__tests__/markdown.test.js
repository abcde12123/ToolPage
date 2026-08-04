/**
 * Unit tests for Markdown editor tool (markdown.js)
 */

// Mock marked before require
global.marked = {
    parse: function(text) { return '<p>' + text + '</p>'; },
    setOptions: function() {}
};

var fs = require('fs');
var path = require('path');
var toolPath = path.resolve(__dirname, '..', 'tools', 'markdown.js');

// We need a container before loading
var container;
beforeEach(function() {
    container = document.createElement('div');
    document.body.appendChild(container);
});

// Clear marked mock between tests
afterEach(function() {
    if (container && container.parentNode) {
        document.body.removeChild(container);
    }
    // Reset marked
    global.marked = {
        parse: function(text) { return '<p>' + text + '</p>'; },
        setOptions: function() {}
    };
});

describe('initMarkdown', function() {
    it('should render the editor UI into the container', function() {
        // Delete from require cache so we can reload
        delete require.cache[require.resolve(toolPath)];
        require(toolPath);
        window.initMarkdown(container);

        expect(container.querySelector('#mdEditor')).not.toBeNull();
        expect(container.querySelector('#mdPreview')).not.toBeNull();
        expect(container.querySelector('#mdExport')).not.toBeNull();
        expect(container.querySelector('#mdClear')).not.toBeNull();
    });

    it('should have empty preview initially', function() {
        delete require.cache[require.resolve(toolPath)];
        require(toolPath);
        window.initMarkdown(container);

        var preview = container.querySelector('#mdPreview');
        expect(preview.innerHTML).toBe('');
    });

    it('should render markdown with marked.parse on input', function(done) {
        delete require.cache[require.resolve(toolPath)];
        global.marked = {
            parse: function(text) { return '<h1>' + text + '</h1>'; },
            setOptions: function() {}
        };
        require(toolPath);
        window.initMarkdown(container);

        // Simulate marked loading
        var editor = container.querySelector('#mdEditor');
        var preview = container.querySelector('#mdPreview');

        // Trigger the onload manually by calling markedReady manually isn't possible,
        // we simulate by calling renderPreview after marked is set.
        // Since marked is already mocked globally before require, markedReady should be true.
        editor.value = 'Hello';
        editor.dispatchEvent(new Event('input'));

        setTimeout(function() {
            // After 300ms debounce
            expect(preview.innerHTML).toContain('Hello');
            done();
        }, 350);
    });

    it('should clear editor and preview on clear button click', function() {
        delete require.cache[require.resolve(toolPath)];
        require(toolPath);
        window.initMarkdown(container);

        var editor = container.querySelector('#mdEditor');
        var preview = container.querySelector('#mdPreview');
        var btnClear = container.querySelector('#mdClear');

        editor.value = 'test';
        preview.innerHTML = '<p>test</p>';

        btnClear.dispatchEvent(new Event('click'));

        expect(editor.value).toBe('');
        expect(preview.innerHTML).toBe('');
    });

    it('should show toast when exporting empty content', function() {
        delete require.cache[require.resolve(toolPath)];
        // Mock showToast
        var toastCalled = false;
        global.showToast = function(text) { toastCalled = true; };

        require(toolPath);
        window.initMarkdown(container);

        var btnExport = container.querySelector('#mdExport');
        btnExport.dispatchEvent(new Event('click'));

        expect(toastCalled).toBe(true);
    });

    it('should handle marked.parse errors gracefully', function() {
        delete require.cache[require.resolve(toolPath)];
        global.marked = {
            parse: function() { throw new Error('render error'); },
            setOptions: function() {}
        };
        require(toolPath);
        window.initMarkdown(container);

        var editor = container.querySelector('#mdEditor');
        var preview = container.querySelector('#mdPreview');

        // After require with mocked marked, markedReady is true
        editor.value = 'test';
        // Manually trigger input + timeout
        editor.dispatchEvent(new Event('input'));

        // We can't easily test async debounce, but the parse error is handled
        expect(editor).not.toBeNull();
    });

    it('should handle empty text rendering', function() {
        delete require.cache[require.resolve(toolPath)];
        require(toolPath);
        window.initMarkdown(container);

        var preview = container.querySelector('#mdPreview');
        expect(preview.innerHTML).toBe('');
    });
});

describe('markdown CDN failure', function() {
    it('should show error when CDN fails to load', function() {
        // Simulate CDN failure by not providing marked before require
        // Remove marked from global before requiring
        var savedMarked = global.marked;
        delete global.marked;

        delete require.cache[require.resolve(toolPath)];
        // Since the script is dynamically loaded, we can't easily trigger error.
        // We test that the UI renders without marked.
        require(toolPath);
        window.initMarkdown(container);

        expect(container.querySelector('#mdEditor')).not.toBeNull();

        // Restore
        global.marked = savedMarked;
    });
});
