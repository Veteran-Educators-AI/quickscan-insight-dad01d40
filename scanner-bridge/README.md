# Scanner Bridge Companion App

A Docker-based scanner bridge that enables SANE/TWAIN scanner access from the ScanGenius web application.

## Quick Start

### Prerequisites
- Docker and Docker Compose installed
- USB scanner connected to your computer

### Run with Docker Compose

```bash
# Clone or download this folder
cd scanner-bridge

# Start the scanner bridge
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the scanner bridge
docker-compose down
```

### Run with Docker directly

```bash
# Build the image
docker build -t scanner-bridge .

# Run the container
docker run -d \
  --name scanner-bridge \
  --privileged \
  -p 8765:8765 \
  -v /dev/bus/usb:/dev/bus/usb \
  scanner-bridge
```

### Run without Docker (Node.js)

```bash
# Install SANE utilities
# Ubuntu/Debian:
sudo apt-get install sane sane-utils

# macOS (with Homebrew):
brew install sane-backends

# Install dependencies
npm install

# Start the server
npm start
```

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `WS_PORT` | `8765` | WebSocket server port |
| `ALLOWED_ORIGINS` | `http://localhost:*` | Comma-separated list of allowed origins |
| `NODE_ENV` | `development` | Set to `production` for production mode |

### Custom Scanner Configuration

To add custom SANE scanner configurations, mount your config files:

```yaml
volumes:
  - ./my-sane.conf:/etc/sane.d/dll.conf:ro
```

## Usage

1. Start the Scanner Bridge using one of the methods above
2. Open ScanGenius in Chrome or Edge
3. Go to the Scan page and click "Scanner Bridge"
4. Click "Connect to Bridge" 
5. Select your scanner and configure settings
6. Click "Start Scan"

## Troubleshooting

### Scanner not detected

1. Check if the scanner is connected:
   ```bash
   lsusb
   ```

2. Check if SANE can see it:
   ```bash
   scanimage -L
   ```

3. Make sure the container has USB access (use `--privileged` flag)

### Permission issues

On Linux, you may need to add udev rules for your scanner:

```bash
# Create udev rule
echo 'SUBSYSTEM=="usb", ATTR{idVendor}=="XXXX", ATTR{idProduct}=="YYYY", MODE="0666"' | \
  sudo tee /etc/udev/rules.d/99-scanner.rules

# Reload udev rules
sudo udevadm control --reload-rules
sudo udevadm trigger
```

Replace `XXXX` and `YYYY` with your scanner's vendor and product IDs from `lsusb`.

### WebSocket connection issues

1. Check the bridge is running:
   ```bash
   docker-compose ps
   ```

2. Check the logs for errors:
   ```bash
   docker-compose logs
   ```

3. Verify the port is accessible:
   ```bash
   curl http://localhost:8765
   ```

## Supported Scanners

This bridge uses SANE (Scanner Access Now Easy), which supports hundreds of scanners including:

- Epson (most models)
- Canon (CanoScan series)
- HP (ScanJet series)
- Brother (most MFC models)
- Fujitsu (ScanSnap series)
- And many more...

Check the [SANE supported devices list](http://www.sane-project.org/sane-backends.html) for your specific model.

## Security

- The WebSocket server only accepts connections from whitelisted origins
- USB access is scoped to scanner devices
- No data is stored permanently (scanned images are deleted after transmission)

## License

MIT License - See LICENSE file for details.
