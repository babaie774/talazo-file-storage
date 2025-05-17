# File Storage System

A Dockerized Node.js file storage system that can be deployed on Parspack's Linux servers.

## Features

- File upload and download
- File listing
- File deletion
- File metadata management
- Advanced file search
- Health check endpoint
- Logging with Winston
- Docker support
- CORS enabled

## Prerequisites

- Node.js 20 or later
- Docker and Docker Compose
- Linux server (e.g., Parspack VPS)

## Local Development

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

## Docker Deployment

### Local Testing

1. Build and run with Docker Compose:
   ```bash
   docker-compose up --build
   ```

### Deploying to Parspack

1. SSH into your Parspack server
2. Install Docker and Docker Compose if not already installed:
   ```bash
   # For Ubuntu
   sudo apt-get update
   sudo apt-get install docker.io docker-compose
   ```
3. Clone this repository to your server
4. Build and run the container:
   ```bash
   docker-compose up -d --build
   ```

## API Endpoints

### File Operations

- `POST /upload` - Upload a file (with optional metadata)
- `GET /files` - List all files with metadata
- `GET /download/:filename` - Download a specific file
- `DELETE /files/:filename` - Delete a specific file

### Metadata Operations

- `GET /files/:filename/metadata` - Get file metadata
- `PATCH /files/:filename/metadata` - Update file metadata

### Search

- `GET /files/search` - Search files with filters:
  - `query`: Search in filename and metadata
  - `type`: Filter by file type
  - `minSize`: Minimum file size
  - `maxSize`: Maximum file size
  - `dateFrom`: Files created after date
  - `dateTo`: Files created before date

### System

- `GET /health` - Health check endpoint

## Environment Variables

- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (development/production)

## Security Considerations

1. Configure your firewall to only allow necessary ports
2. Use HTTPS in production
3. Implement authentication if needed
4. Set up proper file size limits

## Monitoring

- Logs are stored in `error.log` and `combined.log`
- Use the health check endpoint for monitoring
- Consider setting up additional monitoring tools

## Support

For issues or questions, please contact the development team.
