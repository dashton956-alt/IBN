
# Ollama Docker Setup

This directory contains the Docker configuration for running Ollama AI locally.

## Quick Start

1. **Navigate to the ollama directory:**
   ```bash
   cd docker/ollama
   ```

2. **Run the setup script:**
   ```bash
   chmod +x setup.sh
   ./setup.sh
   ```

3. **Verify the installation:**
   ```bash
   curl http://localhost:11434/api/tags
   ```

## Manual Setup

If you prefer to set up manually:

```bash
# Build and start
docker-compose up -d

# Wait for startup
sleep 30

# Pull models
docker exec ollama-ai ollama pull llama3.1
docker exec ollama-ai ollama pull mistral
docker exec ollama-ai ollama pull codellama
```

## Available Models

- **llama3.1** - Main model for network configuration generation
- **mistral** - Alternative general-purpose model
- **codellama** - Specialized for code generation

## Management Commands

```bash
# View logs
docker-compose logs -f

# Stop Ollama
docker-compose down

# Restart Ollama
docker-compose restart

# Pull additional models
docker exec ollama-ai ollama pull <model-name>

# List installed models
docker exec ollama-ai ollama list
```

## Integration with Monitoring Stack

To integrate with your existing Docker monitoring stack, you can:

1. **Add to existing docker-compose.yml:**
   ```yaml
   # Add this service to your existing docker-compose.yml
   ollama:
     build: ./docker/ollama
     container_name: ollama-ai
     ports:
       - "11434:11434"
     volumes:
       - ollama_data:/root/.ollama
     networks:
       - your-existing-network
   ```

2. **Use external network:**
   ```bash
   # Connect to existing network
   docker network connect your-monitoring-network ollama-ai
   ```

## API Endpoints

- **Health Check:** `GET http://localhost:11434/api/tags`
- **Generate:** `POST http://localhost:11434/api/generate`
- **Chat:** `POST http://localhost:11434/api/chat`

## Troubleshooting

- **Container won't start:** Check if port 11434 is available
- **Models not downloading:** Ensure internet connection and sufficient disk space
- **API not responding:** Wait a few minutes for initial startup, check logs with `docker-compose logs`

## Resource Requirements

- **Minimum RAM:** 8GB (for llama3.1)
- **Recommended RAM:** 16GB+
- **Disk Space:** 10GB+ for models
- **CPU:** Modern multi-core processor
