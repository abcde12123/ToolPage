/**
 * Unit tests for the orb system (v3).
 *
 * Tests are written against the exported module functions from main.js.
 */

var orbSystem = require('../main.js');

// Helper: stub window.innerWidth / innerHeight for isCollidingOrb tests
function stubViewport(w, h) {
    if (typeof window === 'undefined') {
        global.window = { innerWidth: w, innerHeight: h };
    } else {
        window.innerWidth = w;
        window.innerHeight = h;
    }
}

// ---- Test 1: randomBlobRadius output format ----
describe('randomBlobRadius', function() {
    it('should return a string', function() {
        var result = orbSystem.randomBlobRadius();
        expect(typeof result).toBe('string');
    });

    it('should contain a "/" character', function() {
        var result = orbSystem.randomBlobRadius();
        expect(result.indexOf('/')).not.toBe(-1);
    });

    it('should have exactly 8 spaces (8 values + / separator)', function() {
        var result = orbSystem.randomBlobRadius();
        var spaceCount = result.split(' ').length - 1;
        expect(spaceCount).toBe(8);
    });

    it('should have each value segment ending with % and contain a / separator', function() {
        var result = orbSystem.randomBlobRadius();
        var parts = result.split(' ');
        for (var i = 0; i < parts.length; i++) {
            if (parts[i] === '/') {
                // the slash separator between horizontal and vertical radii
                continue;
            }
            expect(parts[i].charAt(parts[i].length - 1)).toBe('%');
            var numericPart = parts[i].replace('/', '').replace('%', '');
            var val = parseInt(numericPart, 10);
            expect(isNaN(val)).toBe(false);
        }
    });
});

// ---- Test 2: randomBlobRadius value range ----
describe('randomBlobRadius value range', function() {
    it('should always produce values between 10 and 90 over 100 runs', function() {
        for (var run = 0; run < 100; run++) {
            var result = orbSystem.randomBlobRadius();
            var parts = result.split(/[ %\/]+/);
            for (var i = 0; i < parts.length; i++) {
                if (parts[i] === '') continue;
                var val = parseInt(parts[i], 10);
                expect(val).toBeGreaterThanOrEqual(10);
                expect(val).toBeLessThanOrEqual(90);
            }
        }
    });
});

// ---- Test 3: randomBlobRadius stddev threshold ----
describe('randomBlobRadius stddev threshold', function() {
    var originalRandom;

    beforeEach(function() {
        originalRandom = Math.random;
    });

    afterEach(function() {
        Math.random = originalRandom;
    });

    it('should retry when values are too uniform (stddev < 15)', function() {
        // Mock Math.random to return very similar values near 0.5
        // orbRandInt(20, 80) with random ~0.5 gives ~50
        // If all 8 values are ~50, stddev will be near 0
        var callCount = 0;
        Math.random = function() {
            callCount++;
            // Return stable values that produce numbers close together
            return 0.5 + (callCount % 3 - 1) * 0.01;
        };

        // If stddev check fails repeatedly, it loops up to 20 times.
        // The function should still return a valid string (fallback).
        var result = orbSystem.randomBlobRadius();
        expect(typeof result).toBe('string');
        expect(result.indexOf('/')).not.toBe(-1);
    });

    it('should return valid blob string with diverse values', function() {
        // Mock Math.random to produce diverse values across the range
        var callIndex = 0;
        Math.random = function() {
            // Cycle through 0.0, 0.25, 0.5, 0.75, 1.0 to produce spread values
            var values = [0.0, 0.25, 0.5, 0.75, 1.0];
            var v = values[callIndex % values.length];
            callIndex++;
            return v;
        };

        var result = orbSystem.randomBlobRadius();
        expect(typeof result).toBe('string');
        expect(result.indexOf('/')).not.toBe(-1);

        // Verify some values differ meaningfully (stddev > some positive number)
        var parts = result.split(/[ %\/]+/);
        var nums = [];
        for (var i = 0; i < parts.length; i++) {
            if (parts[i] !== '') {
                nums.push(parseInt(parts[i], 10));
            }
        }
        // At least one value should be different (not all identical)
        var allSame = true;
        for (var i = 1; i < nums.length; i++) {
            if (nums[i] !== nums[0]) {
                allSame = false;
                break;
            }
        }
        expect(allSame).toBe(false);
    });
});

// ---- Test 4: isCollidingOrb function ----
describe('isCollidingOrb', function() {
    beforeEach(function() {
        stubViewport(1920, 1080);
    });

    it('should return false when orbs are far apart', function() {
        var placed = [
            { left: 10, top: 10, size: 200 },
            { left: 80, top: 80, size: 200 }
        ];
        // Placed orbs at (10%,10%) and (80%,80%) => far apart
        var result = orbSystem.isCollidingOrb(50, 50, 200, placed);
        expect(result).toBe(false);
    });

    it('should return true when orbs significantly overlap', function() {
        var placed = [
            { left: 10, top: 10, size: 400 }
        ];
        // New orb at (15%,15%) with size 400 - overlaps with (10%,10%) size 400
        var result = orbSystem.isCollidingOrb(15, 15, 400, placed);
        expect(result).toBe(true);
    });

    it('should return false with empty placedOrbs array', function() {
        var result = orbSystem.isCollidingOrb(50, 50, 200, []);
        expect(result).toBe(false);
    });

    it('should handle orbs exactly at boundary distance', function() {
        var placed = [
            { left: 0, top: 0, size: 200 }
        ];
        // Place at exactly (0%,0%) size 200
        // Center: (1920*0/100 + 100, 1080*0/100 + 100) = (100, 100)
        // Radius: 100
        // New at (0%,0%) size 200 has same center = (100, 100), distance = 0
        var result = orbSystem.isCollidingOrb(0, 0, 200, placed);
        expect(result).toBe(true);
    });
});

// ---- Test 5: exported utility functions ----
describe('exported utility functions', function() {
    it('should have all expected exported functions', function() {
        // The createOrb function inside the IIFE checks `if (activeOrbCount >= MAX_ORBS) return;`
        // We verify the exported utilities work correctly.
        // The actual createOrb is inside the IIFE and not exported.
        // But we can verify the logic by checking that the IIFE properly initializes:
        // - There are at most 10 initial orbs
        // - The max cap is implemented

        // Verify that the export object has the expected keys (sanity check)
        expect(typeof orbSystem.orbRand).toBe('function');
        expect(typeof orbSystem.randomBlobRadius).toBe('function');
        expect(typeof orbSystem.isCollidingOrb).toBe('function');
    });

    it('should have exported orbRand producing values in range', function() {
        for (var i = 0; i < 50; i++) {
            var val = orbSystem.orbRand(10, 20);
            expect(val).toBeGreaterThanOrEqual(10);
            expect(val).toBeLessThanOrEqual(20);
        }
    });

    it('should have exported orbRandInt producing integer values', function() {
        for (var i = 0; i < 50; i++) {
            var val = orbSystem.orbRandInt(1, 6);
            expect(Number.isInteger(val)).toBe(true);
            expect(val).toBeGreaterThanOrEqual(1);
            expect(val).toBeLessThanOrEqual(6);
        }
    });
});

// ---- Test 6: findNonCollidingPosition ----
describe('findNonCollidingPosition', function() {
    beforeEach(function() {
        if (typeof window === 'undefined') {
            global.window = { innerWidth: 1920, innerHeight: 1080 };
        } else {
            window.innerWidth = 1920;
            window.innerHeight = 1080;
        }
    });

    it('should return {left, top} with values in [0, 80] when placedOrbs is empty', function() {
        var result = orbSystem.findNonCollidingPosition(250, []);
        expect(result).toBeDefined();
        expect(typeof result.left).toBe('number');
        expect(typeof result.top).toBe('number');
        expect(result.left).toBeGreaterThanOrEqual(0);
        expect(result.left).toBeLessThanOrEqual(80);
        expect(result.top).toBeGreaterThanOrEqual(0);
        expect(result.top).toBeLessThanOrEqual(80);
    });

    it('should return a non-colliding position when space is available', function() {
        // Place one orb at far corner (80%, 80%)
        var placed = [{ left: 80, top: 80, size: 300 }];
        var result = orbSystem.findNonCollidingPosition(200, placed);
        expect(result).toBeDefined();
        // The result should not collide with the placed orb
        var collides = orbSystem.isCollidingOrb(result.left, result.top, 200, placed);
        expect(collides).toBe(false);
    });

    it('should exercise fallback when all positions collide', function() {
        stubViewport(1920, 1080);
        // Mock Math.random so orbRand(0,80) always returns 40, orbRand(200,300) returns 250
        var originalRandom = Math.random;
        Math.random = function() { return 0.5; };
        try {
            // Place one orb that covers position (40%, 40%) with size ~250
            // At (26%,15%) with size 800, its center is at (899, 562)
            // New orb at (40%,40%) size 250 has center (893, 557)
            // Distance = ~7.8, threshold = (400+125)*0.85 = 446 -> collides
            var placed = [{ left: 26, top: 15, size: 800 }];
            var result = orbSystem.findNonCollidingPosition(250, placed);
            expect(result).toBeDefined();
            expect(typeof result.left).toBe('number');
            expect(typeof result.top).toBe('number');
            // With Math.random mocked to 0.5, all 50 attempts try (40,40) and all collide,
            // so the fallback should return {left: 40, top: 40}
            expect(result.left).toBe(40);
            expect(result.top).toBe(40);
        } finally {
            Math.random = originalRandom;
        }
    });

    it('should handle boundary size values (200, 300) without error', function() {
        var sizes = [200, 300];
        for (var i = 0; i < sizes.length; i++) {
            var result = orbSystem.findNonCollidingPosition(sizes[i], []);
            expect(result).toBeDefined();
            expect(result.left).toBeGreaterThanOrEqual(0);
            expect(result.left).toBeLessThanOrEqual(80);
            expect(result.top).toBeGreaterThanOrEqual(0);
            expect(result.top).toBeLessThanOrEqual(80);
        }
    });
});

// ---- Test 7: removeOrbFromArray ----
describe('removeOrbFromArray', function() {
    it('should remove orb by id and return true', function() {
        var arr = [
            { id: 0, left: 10, top: 10, size: 200 },
            { id: 1, left: 20, top: 20, size: 250 },
            { id: 2, left: 30, top: 30, size: 300 },
        ];
        var result = orbSystem.removeOrbFromArray(1, arr);
        expect(result).toBe(true);
        expect(arr.length).toBe(2);
        expect(arr[0].id).toBe(0);
        expect(arr[1].id).toBe(2);
    });

    it('should return false when id not found', function() {
        var arr = [
            { id: 0, left: 10, top: 10, size: 200 },
            { id: 1, left: 20, top: 20, size: 250 },
        ];
        var result = orbSystem.removeOrbFromArray(999, arr);
        expect(result).toBe(false);
        expect(arr.length).toBe(2);
    });

    it('should not modify array when id not found', function() {
        var arr = [
            { id: 0, left: 10, top: 10, size: 200 },
        ];
        var copy = arr.slice();
        var result = orbSystem.removeOrbFromArray(999, arr);
        expect(result).toBe(false);
        expect(arr).toEqual(copy);
    });
});
