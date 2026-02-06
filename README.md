# Proxy Scraper - Nexus Edition

A professional, standalone proxy scraper that searches multiple free proxy websites, scrapes them, and optionally tests each one for reliability.

## Features

- **Standalone execution**: No cloud platform dependencies. Runs entirely on your local machine.
- **Enterprise-grade architecture**: Modular design with dedicated services for configuration, storage, and crawling.
- **Multithreaded testing**: Uses a worker pool to test thousands of proxies in true concurrency.
- **Security hardened**: Safe evaluation of dynamic scripts and native Node.js implementations for core utilities.
- **Reliable output**: Returns only deduplicated, working proxies (if testing enabled).

## Getting Started

### Prerequisites

- Node.js (v18 or later recommended)
- npm or yarn

### Installation

1. Clone the repository or extract the files.
2. Install dependencies:

```bash
npm install
```

> [!NOTE]
> If you encounter `EPERM` errors on macOS during installation, run:
> `sudo chown -R $(whoami) ~/.npm`

### Configuration

The application is configured via `input.json` in the project root.

```json
{
    "runTests": true,
    "testWorkers": 10,
    "debug": false,
    "concurrency": 10,
    "kvStoreName": "default",
    "proxy": {
        "useCloudProxy": false,
        "proxyUrls": []
    }
}
```

- `runTests`: Set to `true` to verify each proxy before saving.
- `debug`: Enable detailed logging.
- `proxy`: Optional upstream proxies to use during scraping.

### Usage

Start the scraper with:

```bash
npm run start
```

## Results

Scraped data is stored in the `storage/` directory:

- **Full Dataset**: `storage/datasets/default.json` (JSON list of all proxies)
- **Verified List**: `storage/current-proxies.txt` (Plain text list of working proxies, one per line)

## Project Structure

- `src/agents/`: Individual scrapers categorized by mechanism (`api/`, `html/`).
- `src/core/`: Core crawler engine logic.
- `src/services/`: Business logic for storage, configuration, and proxy management.
- `src/types/`: TypeScript definitions and Zod validation schemas.

## Limitations

Free proxy sources vary in quality. Expect anywhere from 20-100 highly reliable proxies per run out of thousands scraped.

## License

MIT
