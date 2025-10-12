// Azure App Service startup script
const { spawn } = require('child_process');
const path = require('path');

console.log('Starting DevOps Portfolio...');

// Start the server
const server = spawn('node', ['server.js'], {
    cwd: __dirname,
    stdio: 'inherit',
    env: {
        ...process.env,
        NODE_ENV: 'production',
        PORT: process.env.PORT || 3001
    }
});

server.on('error', (err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
});

server.on('exit', (code) => {
    console.log(`Server exited with code ${code}`);
    process.exit(code);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
    console.log('Received SIGTERM, shutting down gracefully');
    server.kill('SIGTERM');
});

process.on('SIGINT', () => {
    console.log('Received SIGINT, shutting down gracefully');
    server.kill('SIGINT');
});
