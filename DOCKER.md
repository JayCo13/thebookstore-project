# Bookstore Docker Deployment

## Quick Start (Development)

```bash
# 1. Copy environment file
cp .env.example .env

# 2. Edit .env with your values
nano .env

# 3. Build and start
docker-compose up --build

# 4. Access
# Frontend: http://localhost:3000
# Backend API: http://localhost:8000/docs
```

## Production Deployment

### Step 1: Prepare VPS

```bash
# Install Docker
curl -fsSL https://get.docker.com | sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### Step 2: Copy Project to VPS

```bash
# From local machine
rsync -avz --exclude 'node_modules' --exclude '__pycache__' --exclude '.git' \
  /path/to/bookstore-main/ user@your-vps:/home/user/bookstore/
```

### Step 3: Configure Environment

```bash
cd /home/user/bookstore
cp .env.example .env
nano .env
# Fill in all values (especially domain, secrets, API keys)
```

### Step 4: Point Domain to VPS

1. In your domain registrar (e.g., Namecheap, GoDaddy):
2. Add A record: `@` → Your VPS IP
3. Add A record: `www` → Your VPS IP
4. Wait for DNS propagation (5-30 minutes)

### Step 5: Deploy

```bash
# Build and start (production mode)
docker-compose -f docker-compose.prod.yml up --build -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f
```

### Step 6: Setup SSL

```bash
# Edit setup-ssl.sh with your domain and email
nano scripts/setup-ssl.sh

# Make executable and run
chmod +x scripts/setup-ssl.sh
./scripts/setup-ssl.sh

# Update nginx config with your domain
nano nginx/nginx.conf
# Uncomment HTTPS server block and replace yourdomain.com

# Reload nginx
docker-compose -f docker-compose.prod.yml exec nginx nginx -s reload
```

## Common Commands

```bash
# View all logs
docker-compose -f docker-compose.prod.yml logs -f

# View specific service logs
docker-compose -f docker-compose.prod.yml logs -f backend

# Restart a service
docker-compose -f docker-compose.prod.yml restart backend

# Stop all
docker-compose -f docker-compose.prod.yml down

# Stop and remove volumes (WARNING: deletes data)
docker-compose -f docker-compose.prod.yml down -v

# Rebuild specific service
docker-compose -f docker-compose.prod.yml build backend
docker-compose -f docker-compose.prod.yml up -d backend
```

## Troubleshooting

### Backend won't start
```bash
docker-compose -f docker-compose.prod.yml logs backend
# Check for database connection issues
```

### Frontend shows blank page
```bash
docker-compose -f docker-compose.prod.yml logs frontend
# Check nginx logs
docker-compose -f docker-compose.prod.yml logs nginx
```

### Database issues
```bash
# Connect to MySQL
docker-compose -f docker-compose.prod.yml exec mysql mysql -u root -p
```
