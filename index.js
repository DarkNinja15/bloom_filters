const redis = require("redis");

async function init() {
    const client = redis.createClient({
        url: 'redis://localhost:6379'
    });

    try {
        await client.connect();
        console.log('Connected to Redis');

        // Check if bloom filter exists by trying to check a random key
        try {
            await client.sendCommand(['BF.EXISTS', 'mybloom', 'test_key']);
            console.log('Using existing bloom filter');
        } catch (err) {
            // If we get here, the bloom filter doesn't exist
            await client.sendCommand(['BF.RESERVE', 'mybloom', '0.01', '1000']);
            console.log('Created new bloom filter');
        }

        // Function to safely add items
        async function safeAdd(items) {
            if (!Array.isArray(items)) {
                items = [items];
            }
            try {
                const results = await client.sendCommand(['BF.MADD', 'mybloom', ...items]);
                console.log(`Added items: ${items.join(', ')}`);
                return results;
            } catch (err) {
                console.error(`Error adding items: ${err.message}`);
                return null;
            }
        }

        // Function to safely check items
        async function safeCheck(items) {
            if (!Array.isArray(items)) {
                items = [items];
            }
            try {
                const results = await client.sendCommand(['BF.MEXISTS', 'mybloom', ...items]);
                return results.map((result, index) => ({
                    item: items[index],
                    exists: Boolean(result)
                }));
            } catch (err) {
                console.error(`Error checking items: ${err.message}`);
                return null;
            }
        }

        // Add and check items
        await safeAdd('dog');
        await safeAdd(['cat', 'horse']);
        
        const singleCheck = await safeCheck('dog');
        console.log('Single check result:', singleCheck);
        
        const multiCheck = await safeCheck(['cat', 'mouse']);
        console.log('Multi check results:', multiCheck);

    } catch (error) {
        console.error('Fatal error:', error);
    } finally {
        await client.quit();
    }
}

init().catch(console.error);