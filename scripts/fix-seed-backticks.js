const fs = require('fs');
const path = require('path');

const seedFiles = [
  path.join(__dirname, '../database/mongodb/seeds/beginner-lessons.js'),
  path.join(__dirname, '../database/mongodb/seeds/intermediate-lessons.js'),
  path.join(__dirname, '../database/mongodb/seeds/expert-lessons.js')
];

seedFiles.forEach((filePath) => {
  let code = fs.readFileSync(filePath, 'utf8');

  // We want to process each lesson object in the file
  // Match content: ` ... ` and escape inner backticks
  const parts = code.split('content: `');
  let newCode = parts[0];

  for (let i = 1; i < parts.length; i++) {
    const part = parts[i];
    // Find where the content template string ends: \`,\n    quiz:
    const endIdx = part.search(/`,\s*quiz:/);
    if (endIdx !== -1) {
      let rawContent = part.substring(0, endIdx);
      const rest = part.substring(endIdx);

      // Escape all inner unescaped backticks
      // Replace any ` that is not preceded by \
      rawContent = rawContent.replace(/(?<!\\)`/g, '\\`');

      newCode += 'content: `' + rawContent + rest;
    } else {
      newCode += 'content: `' + part;
    }
  }

  fs.writeFileSync(filePath, newCode, 'utf8');
  console.log(`✅ Fixed backticks in ${path.basename(filePath)}`);
});
