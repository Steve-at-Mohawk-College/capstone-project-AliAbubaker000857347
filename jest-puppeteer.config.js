module.exports = {
    launch: {
        headless: true,
        slowMo: process.env.SLOWMO ? parseInt(process.env.SLOWMO) : 0,
        devtools: false,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu'
        ]
    },
    server: {
        command: 'npm start',
        port: 3000,
        launchTimeout: 10000
    }
};