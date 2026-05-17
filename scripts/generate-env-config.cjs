const fs = require('fs');
const path = require('path');

const envConfigPath = path.resolve(__dirname, '../public/env-config.js');

const content = `// Environment configuration for static HTML files
window.ENV_CONFIG = {
    VITE_PLANTID_API_KEY: "${process.env.VITE_PLANTID_API_KEY || ''}"
};
`;

fs.writeFileSync(envConfigPath, content);
console.log('✅ Generated public/env-config.js');
