const fs = require('fs');
const path = require('path');

// Mock a JSDOM-like environment
global.window = {
    currentActiveApp: null
};

let alertedMessage = null;
global.alert = (msg) => {
    alertedMessage = msg;
};

// Clipboard Mocking
let copiedText = null;
let useSecureClipboardMock = true;

// Correctly define global.navigator to bypass Node's read-only navigator restriction
Object.defineProperty(global, 'navigator', {
    value: {
        get clipboard() {
            if (!useSecureClipboardMock) return undefined;
            return {
                writeText: (text) => {
                    copiedText = text;
                    return Promise.resolve();
                }
            };
        }
    },
    configurable: true,
    writable: true
});

let lastTextAreaValue = null;
const domElements = {};
global.document = {
    createElement: (tag) => {
        const el = {
            tag,
            value: '',
            style: {},
            focus: () => {},
            select: () => {},
            appendChild: () => {},
            removeChild: () => {}
        };
        if (tag === 'textarea') {
            el.select = () => {
                lastTextAreaValue = el.value;
            };
        }
        return el;
    },
    body: {
        appendChild: () => {},
        removeChild: () => {}
    },
    getElementById: (id) => {
        if (!domElements[id]) {
            domElements[id] = {
                id,
                innerHTML: '',
                textContent: '',
                style: {},
                querySelectorAll: () => []
            };
        }
        return domElements[id];
    },
    execCommand: (cmd) => {
        if (cmd === 'copy') {
            copiedText = lastTextAreaValue;
            return true;
        }
        return false;
    }
};

// Load factories.js code
const factoriesPath = path.join(__dirname, '../modules/factories.js');
let code = fs.readFileSync(factoriesPath, 'utf8');
code = code.replace(/export function/g, 'function');
eval(code);

// Assert copyTextToClipboard exists
if (typeof window.copyTextToClipboard !== 'function') {
    console.error("❌ Test Failed: window.copyTextToClipboard is not a function.");
    process.exit(1);
}
console.log("✅ Test Passed: window.copyTextToClipboard is defined.");

// Assert copyBOMToClipboard exists
if (typeof window.copyBOMToClipboard !== 'function') {
    console.error("❌ Test Failed: window.copyBOMToClipboard is not a function.");
    process.exit(1);
}
console.log("✅ Test Passed: window.copyBOMToClipboard is defined.");

// Test Case 1: copyBOMToClipboard with no active app / no selected tray
window.currentActiveApp = { selectedTray: null };
alertedMessage = null;
window.copyBOMToClipboard();
if (alertedMessage !== "Bitte wählen Sie zuerst ein Produkt aus.") {
    console.error(`❌ Test Failed: Expected selection warning alert, but got "${alertedMessage}".`);
    process.exit(1);
}
console.log("✅ Test Passed: Alert shown correctly when no tray is selected.");

// Test Case 2: copyBOMToClipboard with a selected tray and empty BOM table
window.currentActiveApp = { selectedTray: { artNr: '123' } };
const bomTable = document.getElementById("bomTableBody");
bomTable.querySelectorAll = () => [];
alertedMessage = null;
window.copyBOMToClipboard();
if (alertedMessage !== "Keine kopierbaren Produkte gefunden.") {
    console.error(`❌ Test Failed: Expected 'no products found' alert, but got "${alertedMessage}".`);
    process.exit(1);
}
console.log("✅ Test Passed: Alert shown correctly when BOM table is empty.");

// Test Case 3: copyBOMToClipboard with populated BOM table, including placeholders (Secure Clipboard path)
window.currentActiveApp = { selectedTray: { artNr: '123' } };
const mockRows = [
    {
        style: {},
        querySelector: (sel) => {
            if (sel === '.bom-code') return { textContent: '1111 222.100.000' };
            if (sel === 'strong') return { textContent: '2' };
            return null;
        }
    },
    {
        style: {},
        querySelector: (sel) => {
            if (sel === '.bom-code') return { textContent: 'Ausstehend' }; // Should be skipped
            if (sel === 'strong') return { textContent: '-' };
            return null;
        }
    },
    {
        style: {},
        querySelector: (sel) => {
            if (sel === '.bom-code') return { textContent: 'ohne Ablauf' }; // Should be skipped
            if (sel === 'strong') return { textContent: '1' };
            return null;
        }
    },
    {
        style: {},
        querySelector: (sel) => {
            if (sel === '.bom-code') return { textContent: '3333 444.100.000' };
            if (sel === 'strong') return null; // Default qty = 1
            return null;
        }
    }
];

bomTable.querySelectorAll = (sel) => {
    if (sel === 'tr') return mockRows;
    return [];
};
global.window.getComputedStyle = () => ({ display: 'table-row' });

copiedText = null;
alertedMessage = null;
useSecureClipboardMock = true;
window.copyBOMToClipboard();

// We expect:
// 1111 222.100.000\t2
// 3333 444.100.000\t1
const expectedText = "1111 222.100.000\t2\n3333 444.100.000\t1";

setTimeout(() => {
    if (copiedText !== expectedText) {
        console.error(`❌ Test Failed: Copied text mismatch (Secure Clipboard)!\nExpected:\n${expectedText}\n\nGot:\n${copiedText}`);
        process.exit(1);
    }
    console.log("✅ Test Passed: copyBOMToClipboard parses table correctly and copies using secure Clipboard API.");

    // Test Case 4: copyBOMToClipboard with fallback Clipboard path (insecure contexts like file://)
    copiedText = null;
    alertedMessage = null;
    useSecureClipboardMock = false; // Disable navigator.clipboard
    lastTextAreaValue = null;

    window.copyBOMToClipboard();

    setTimeout(() => {
        if (copiedText !== expectedText) {
            console.error(`❌ Test Failed: Copied text mismatch (Fallback Clipboard)!\nExpected:\n${expectedText}\n\nGot:\n${copiedText}`);
            process.exit(1);
        }
        console.log("✅ Test Passed: copyBOMToClipboard parses table correctly and copies using fallback execCommand API.");

        // Test Case 5: copyBOMToClipboard with a static app (has parts, no selectedTray)
        window.currentActiveApp = { parts: [ { artNr: '123' } ] }; // static set, no selectedTray
        copiedText = null;
        alertedMessage = null;
        useSecureClipboardMock = true;
        
        window.copyBOMToClipboard();
        
        setTimeout(() => {
            if (copiedText !== expectedText) {
                console.error(`❌ Test Failed: Static set copy failed!\nExpected:\n${expectedText}\n\nGot:\n${copiedText}`);
                process.exit(1);
            }
            if (alertedMessage && alertedMessage.includes("Bitte wählen Sie zuerst ein Produkt aus")) {
                console.error(`❌ Test Failed: Static set triggered selection warning alert: ${alertedMessage}`);
                process.exit(1);
            }
            console.log("✅ Test Passed: Static sets (apps with parts, no selectedTray) bypass the selection check and copy successfully.");
            console.log("All clipboard tests passed! 🎉");
            process.exit(0);
        }, 50);
    }, 50);
});

