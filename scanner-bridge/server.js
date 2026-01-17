/**
 * Scanner Bridge Server
 * 
 * WebSocket server that interfaces with SANE scanners
 * and sends scanned images to connected web clients.
 */

const WebSocket = require('ws');
const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const PORT = process.env.WS_PORT || 8765;
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:*').split(',');
const SCANS_DIR = path.join(__dirname, 'scans');

// Ensure scans directory exists
if (!fs.existsSync(SCANS_DIR)) {
  fs.mkdirSync(SCANS_DIR, { recursive: true });
}

// WebSocket server
const wss = new WebSocket.Server({ 
  port: PORT,
  verifyClient: (info) => {
    const origin = info.origin || info.req.headers.origin;
    return isOriginAllowed(origin);
  }
});

function isOriginAllowed(origin) {
  if (!origin) return true; // Allow connections without origin (e.g., from CLI tools)
  
  return ALLOWED_ORIGINS.some(pattern => {
    if (pattern.includes('*')) {
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
      return regex.test(origin);
    }
    return pattern === origin;
  });
}

console.log(`🖨️  Scanner Bridge starting on port ${PORT}`);

// Store active scan processes
const activeScans = new Map();

// Handle WebSocket connections
wss.on('connection', (ws, req) => {
  const clientId = uuidv4();
  console.log(`📱 Client connected: ${clientId}`);
  
  // Send welcome message
  ws.send(JSON.stringify({
    type: 'connected',
    clientId,
    message: 'Scanner Bridge connected successfully'
  }));

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message.toString());
      console.log(`📨 Received: ${data.type}`);
      
      switch (data.type) {
        case 'discover':
          await discoverScanners(ws);
          break;
          
        case 'scan':
          await startScan(ws, clientId, data.settings);
          break;
          
        case 'cancel':
          cancelScan(clientId);
          ws.send(JSON.stringify({ type: 'cancelled' }));
          break;
          
        case 'ping':
          ws.send(JSON.stringify({ type: 'pong' }));
          break;
          
        default:
          ws.send(JSON.stringify({ 
            type: 'error', 
            message: `Unknown command: ${data.type}` 
          }));
      }
    } catch (error) {
      console.error('Error processing message:', error);
      ws.send(JSON.stringify({ 
        type: 'error', 
        message: error.message 
      }));
    }
  });

  ws.on('close', () => {
    console.log(`👋 Client disconnected: ${clientId}`);
    cancelScan(clientId);
  });

  ws.on('error', (error) => {
    console.error(`❌ WebSocket error for ${clientId}:`, error);
    cancelScan(clientId);
  });
});

/**
 * Discover available SANE scanners
 */
async function discoverScanners(ws) {
  ws.send(JSON.stringify({ type: 'discovering' }));
  
  exec('scanimage -L', (error, stdout, stderr) => {
    const scanners = [];
    
    if (error) {
      console.error('Scanner discovery error:', stderr);
      // Still try to parse any output
    }
    
    // Parse SANE scanner list output
    // Format: device `epson2:libusb:001:004' is a Epson GT-1500 flatbed scanner
    const lines = stdout.split('\n');
    const deviceRegex = /device `([^']+)' is a (.+)/;
    
    for (const line of lines) {
      const match = line.match(deviceRegex);
      if (match) {
        scanners.push({
          id: match[1],
          name: match[2].trim(),
          driver: match[1].split(':')[0]
        });
      }
    }
    
    // Add test scanner for development
    if (scanners.length === 0 && process.env.NODE_ENV !== 'production') {
      scanners.push({
        id: 'test:scanner',
        name: 'Test Scanner (Development)',
        driver: 'test'
      });
    }
    
    console.log(`🔍 Found ${scanners.length} scanner(s)`);
    
    ws.send(JSON.stringify({
      type: 'scanners',
      scanners
    }));
  });
}

/**
 * Start a scan operation
 */
async function startScan(ws, clientId, settings = {}) {
  const {
    scannerId = '',
    colorMode = 'color',
    resolution = 300,
    paperSize = 'letter',
    duplex = false
  } = settings;
  
  // Get paper dimensions in mm
  const paperDimensions = {
    letter: { x: 215.9, y: 279.4 },
    legal: { x: 215.9, y: 355.6 },
    a4: { x: 210, y: 297 },
    a3: { x: 297, y: 420 }
  };
  
  const dimensions = paperDimensions[paperSize] || paperDimensions.letter;
  
  // Build scanimage command
  const outputFile = path.join(SCANS_DIR, `scan_${clientId}_${Date.now()}.png`);
  
  const args = [
    '--format=png',
    `--resolution=${resolution}`,
    `-x`, `${dimensions.x}`,
    `-y`, `${dimensions.y}`,
    `--output-file=${outputFile}`
  ];
  
  // Add scanner device if specified
  if (scannerId && scannerId !== 'test:scanner') {
    args.unshift(`--device=${scannerId}`);
  }
  
  // Add color mode
  const modeMap = { color: 'Color', grayscale: 'Gray', bw: 'Lineart' };
  args.push(`--mode=${modeMap[colorMode] || 'Color'}`);
  
  console.log(`🖨️  Starting scan: scanimage ${args.join(' ')}`);
  
  ws.send(JSON.stringify({ 
    type: 'scanning',
    message: 'Scan started...'
  }));
  
  // Handle test scanner
  if (scannerId === 'test:scanner') {
    await simulateTestScan(ws, outputFile);
    return;
  }
  
  const scanProcess = spawn('scanimage', args);
  activeScans.set(clientId, scanProcess);
  
  let progressSent = 0;
  
  scanProcess.stdout.on('data', (data) => {
    // Send progress updates
    progressSent += 10;
    if (progressSent <= 90) {
      ws.send(JSON.stringify({
        type: 'progress',
        progress: Math.min(progressSent, 90)
      }));
    }
  });
  
  scanProcess.stderr.on('data', (data) => {
    const message = data.toString();
    console.log(`Scanner output: ${message}`);
    
    // Parse progress from SANE output if available
    const progressMatch = message.match(/Progress: (\d+)%/);
    if (progressMatch) {
      ws.send(JSON.stringify({
        type: 'progress',
        progress: parseInt(progressMatch[1])
      }));
    }
  });
  
  scanProcess.on('close', async (code) => {
    activeScans.delete(clientId);
    
    if (code === 0 && fs.existsSync(outputFile)) {
      // Read the scanned image and send as base64
      const imageData = fs.readFileSync(outputFile);
      const base64 = imageData.toString('base64');
      
      ws.send(JSON.stringify({
        type: 'progress',
        progress: 100
      }));
      
      ws.send(JSON.stringify({
        type: 'scanned',
        image: `data:image/png;base64,${base64}`,
        filename: path.basename(outputFile)
      }));
      
      console.log(`✅ Scan complete: ${outputFile}`);
      
      // Clean up file after sending
      setTimeout(() => {
        if (fs.existsSync(outputFile)) {
          fs.unlinkSync(outputFile);
        }
      }, 5000);
      
    } else {
      ws.send(JSON.stringify({
        type: 'error',
        message: `Scan failed with exit code ${code}`
      }));
    }
  });
  
  scanProcess.on('error', (error) => {
    activeScans.delete(clientId);
    console.error('Scan process error:', error);
    ws.send(JSON.stringify({
      type: 'error',
      message: `Scanner error: ${error.message}`
    }));
  });
}

/**
 * Simulate a test scan for development
 */
async function simulateTestScan(ws, outputFile) {
  // Simulate scanning progress
  for (let i = 0; i <= 100; i += 10) {
    await new Promise(resolve => setTimeout(resolve, 200));
    ws.send(JSON.stringify({
      type: 'progress',
      progress: i
    }));
  }
  
  // Generate a test image (gray gradient with text)
  const testImageBase64 = generateTestImage();
  
  ws.send(JSON.stringify({
    type: 'scanned',
    image: testImageBase64,
    filename: 'test_scan.png'
  }));
  
  console.log('✅ Test scan complete');
}

/**
 * Generate a simple test image as base64
 */
function generateTestImage() {
  // This is a minimal 100x100 gray PNG for testing
  // In production, you might want to generate a more realistic test image
  const pngHeader = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
    0x00, 0x00, 0x00, 0x0D, // IHDR length
    0x49, 0x48, 0x44, 0x52, // IHDR
    0x00, 0x00, 0x00, 0x64, // width: 100
    0x00, 0x00, 0x00, 0x64, // height: 100
    0x08, 0x02, // bit depth: 8, color type: RGB
    0x00, 0x00, 0x00, // compression, filter, interlace
    0x84, 0xA0, 0x86, 0xA5, // CRC
  ]);
  
  // For simplicity, return a placeholder
  // Real implementation would generate proper PNG data
  return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAACXBIWXMAAAsTAAALEwEAmpwYAAAF8WlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPD94cGFja2V0IGJlZ2luPSLvu78iIGlkPSJXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQiPz4gPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iQWRvYmUgWE1QIENvcmUgNS42LWMxNDUgNzkuMTYzNDk5LCAyMDE4LzA4LzEzLTE2OjQwOjIyICAgICAgICAiPiA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPiA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtbG5zOnhtcE1NPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvbW0vIiB4bWxuczpzdEV2dD0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL3NUeXBlL1Jlc291cmNlRXZlbnQjIiB4bWxuczpkYz0iaHR0cDovL3B1cmwub3JnL2RjL2VsZW1lbnRzLzEuMS8iIHhtbG5zOnBob3Rvc2hvcD0iaHR0cDovL25zLmFkb2JlLmNvbS9waG90b3Nob3AvMS4wLyIgeG1wOkNyZWF0b3JUb29sPSJBZG9iZSBQaG90b3Nob3AgQ0MgMjAxOSAoV2luZG93cykiIHhtcDpDcmVhdGVEYXRlPSIyMDI0LTAxLTE1VDEwOjAwOjAwLTA1OjAwIiB4bXA6TWV0YWRhdGFEYXRlPSIyMDI0LTAxLTE1VDEwOjAwOjAwLTA1OjAwIiB4bXA6TW9kaWZ5RGF0ZT0iMjAyNC0wMS0xNVQxMDowMDowMC0wNTowMCIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDo4YzQ4YzQ4Yi04YzQ4LTQ4YzQtOGM0OC1jNDhjNDhjNDhjNDgiIHhtcE1NOkRvY3VtZW50SUQ9ImFkb2JlOmRvY2lkOnBob3Rvc2hvcDo4YzQ4YzQ4Yi04YzQ4LTQ4YzQtOGM0OC1jNDhjNDhjNDhjNDgiIHhtcE1NOk9yaWdpbmFsRG9jdW1lbnRJRD0ieG1wLmRpZDo4YzQ4YzQ4Yi04YzQ4LTQ4YzQtOGM0OC1jNDhjNDhjNDhjNDgiIGRjOmZvcm1hdD0iaW1hZ2UvcG5nIiBwaG90b3Nob3A6Q29sb3JNb2RlPSIzIj4gPHhtcE1NOkhpc3Rvcnk+IDxyZGY6U2VxPiA8cmRmOmxpIHN0RXZ0OmFjdGlvbj0iY3JlYXRlZCIgc3RFdnQ6aW5zdGFuY2VJRD0ieG1wLmlpZDo4YzQ4YzQ4Yi04YzQ4LTQ4YzQtOGM0OC1jNDhjNDhjNDhjNDgiIHN0RXZ0OndoZW49IjIwMjQtMDEtMTVUMTA6MDA6MDAtMDU6MDAiIHN0RXZ0OnNvZnR3YXJlQWdlbnQ9IkFkb2JlIFBob3Rvc2hvcCBDQyAyMDE5IChXaW5kb3dzKSIvPiA8L3JkZjpTZXE+IDwveG1wTU06SGlzdG9yeT4gPC9yZGY6RGVzY3JpcHRpb24+IDwvcmRmOlJERj4gPC94OnhtcG1ldGE+IDw/eHBhY2tldCBlbmQ9InIiPz7vJvJjAAABhElEQVR4nO3csQ3CQBAE0D8RJYATKIESSKAEKqAC94BBFEAFFOCSyO7MnNjC+yJZsr3r3Z3t1dgAAAAAAAAAAAAAAAAAAAAAAIDZW1Y/wEI8V74+VD/AQpxVv/6++gEAAAAAAAAAAAAAAAAAAAAAAJiL5eoHmKHr6gdYgLPq11+AAAA4aVX9ADO0rH6AGbisfv11dQ0AAOCkVfUDzNCy+gFm4LL69dfVNQAAgJNW1Q8wQ8vqB5iBy+rXX1fXAAAATlpVP8AMLasfYAYuq19/XV0DAAA4aVX9ADO0rH6AGbisfv11dQ0AAOCkVfUDzNCy+gFm4LL69df/r64BAABm67b6AWbotvoBZuC2+vXX1TUAAICTAAAA+FdN9QPM0LTy9ePqGgAAwEnT6geYoWnl68fVNQAAgJOm1Q8wQ9PK14+rawAAACdNqx9ghqaVrx9X1wAAAE4CAADgX02rH2CGppWvH1fXAAAATppWP8AMTStfP66uAQAAnDStfoAZmla+flxdAwAAAE7xC3ZYIUq93+u5AAAAAElFTkSuQmCC';
}

/**
 * Cancel an active scan
 */
function cancelScan(clientId) {
  const process = activeScans.get(clientId);
  if (process) {
    process.kill('SIGTERM');
    activeScans.delete(clientId);
    console.log(`🛑 Scan cancelled for client: ${clientId}`);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Shutting down Scanner Bridge...');
  
  // Cancel all active scans
  for (const [clientId, process] of activeScans) {
    process.kill('SIGTERM');
  }
  activeScans.clear();
  
  wss.close(() => {
    console.log('👋 Scanner Bridge stopped');
    process.exit(0);
  });
});

console.log(`✅ Scanner Bridge ready on ws://localhost:${PORT}`);
