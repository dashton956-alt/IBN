
#!/bin/bash

echo "🚀 Setting up Ollama Docker container..."

# Build and start the container
docker-compose up -d

echo "⏳ Waiting for Ollama to start..."
sleep 30

# Pull the required model
echo "📥 Pulling llama3.1 model..."
docker exec ollama-ai ollama pull llama3.1

echo "📥 Pulling additional recommended models..."
docker exec ollama-ai ollama pull mistral
docker exec ollama-ai ollama pull codellama

# Test the setup
echo "🧪 Testing Ollama API..."
curl -X POST http://localhost:11434/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "model": "llama3.1",
    "prompt": "Hello, are you working?",
    "stream": false
  }'

echo ""
echo "✅ Ollama setup complete!"
echo "🌐 Ollama is running at: http://localhost:11434"
echo "📊 API health check: http://localhost:11434/api/tags"
