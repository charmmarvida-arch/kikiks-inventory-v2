
const fs = require('fs');
try {
    const content = fs.readFileSync('build_debug_v2.log', 'utf8');
    const lines = content.split('\n');
    lines.forEach((line, index) => {
        if (line.toLowerCase().includes('error')) {
            console.log('--- ERROR FOUND AT LINE ' + (index + 1) + ' ---');
            // Print 5 lines before and 20 lines after
            const start = Math.max(0, index - 5);
            const end = Math.min(lines.length, index + 20);
            console.log(lines.slice(start, end).join('\n'));
            console.log('-------------------------------------------');
        }
    });
} catch (e) {
    console.log('Error reading file:', e);
}
