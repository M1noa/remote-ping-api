const express = require('express');
const net = require('net');
const dns = require('dns').promises;

const app = express();
const PORT = process.env.PORT || 3000;

// Route for API usage information
app.get('/', (req, res) => {
    const instructions = `
    Welcome to the Ping API!

    Usage:
    To ping a target (IP address or domain), send a GET request to:
    http://ping.minoa.cat/{IP to ping}
    
    Replace {IP to ping} with the IP address or domain you want to ping.

    Example Requests:
    - GET http://ping.minoa.cat/minoa.cat
    - GET http://ping.minoa.cat/1.1.1.1

    Possible Responses:
    1. Successful Ping to a Domain:
    {
        "target": "minoa.cat",
        "ping": {
            "ip": "192.0.2.1",
            "time": 24.5,
            "alive": true,
            "host": "minoa.cat"
        }
    }

    2. Successful Ping to an IP Address:
    {
        "target": "1.1.1.1",
        "ping": {
            "ip": "1.1.1.1",
            "time": 20.3,
            "alive": true,
            "host": "1.1.1.1"
        }
    }

    3. Unsuccessful Ping:
    {
        "target": "invalid.domain",
        "ping": {
            "error": "Ping failed: invalid.domain is not reachable"
        }
    }
    `;
    res.type('text/plain');
    res.send(instructions);
});

// Route for pinging a target
app.get('/:target', async (req, res) => {
    const target = req.params.target; // Get the target from the URL parameter
    const results = {
        target,
        ping: {}
    };

    try {
        // Resolve the numeric IP address using DNS
        const ipAddress = await dns.lookup(target);

        const ports = [80, 443]; // Common HTTP/HTTPS ports
        let isAlive = false;
        let timeTaken = null;

        for (const port of ports) {
            const startTime = Date.now();
            const socket = new net.Socket();
            socket.setTimeout(5000); // Set timeout for the connection attempt

            socket.connect(port, ipAddress.address, () => {
                isAlive = true;
                timeTaken = Date.now() - startTime; // Calculate time taken for the connection
                socket.destroy(); // Close the connection
            });

            socket.on('error', (error) => {
                // Handle connection errors but continue checking other ports
                socket.destroy();
            });

            socket.on('timeout', () => {
                socket.destroy(); // Close the connection on timeout
            });
        }

        // Wait for a moment to allow the connection attempts to finish
        setTimeout(() => {
            results.ping.ip = ipAddress.address; // Resolved IP address
            results.ping.time = timeTaken !== null ? timeTaken : 'N/A'; // Ping response time in ms
            results.ping.alive = isAlive; // Is the host alive?
            results.ping.host = target; // The host that was pinged

            if (!isAlive) {
                results.ping.error = 'Ping failed: No response from the target on common ports';
            }
            res.json(results);
        }, 2000); // Wait for 2 seconds to allow port checks to complete
    } catch (error) {
        results.ping.error = `Ping failed: ${error.message}`; // Error message if ping fails
        res.json(results);
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://ping.minoa.cat:${PORT}`);
});
