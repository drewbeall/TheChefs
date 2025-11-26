# Node.js Project

## Prerequisites
- Node.js (v14 or higher)
- npm (Node Package Manager)

## Installation

1. Install dependencies:
```bash
npm install
```

## Running the Project

### Local Development
```bash
npm start
```

The application will start on the configured port (check `index.js` for port details).

### Using Docker

1. Build the Docker image:
```bash
docker build -t nodeproject .
```

2. Run the container:
```bash
docker run -p 8000:8000 --name express-todo-api nodeproject
```

### Using Docker Compose
```bash
# From the nodeproject folder
docker compose up -d --build

# View logs
docker compose logs -f

# Stop and remove containers
docker compose down
```

### Access the App
- UI: `http://localhost:8000/`
- API: `http://localhost:8000/api/todo`, `http://localhost:8000/api/todoaxios`, `http://localhost:8000/api/users`

## Project Structure
- `index.js` - Main application file
- `package.json` - Node.js dependencies and scripts
- `Dockerfile` - Docker configuration
- `docker-compose.yml` - Docker Compose configuration
- `MOCK_DATA.json` - Sample data file
