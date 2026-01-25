# Deployment Guide - Net Worth Tracking Application

This guide covers various options for hosting your Net Worth application online.

## Architecture Overview

Your application consists of:
- **Frontend**: Next.js (React) - Port 3000
- **Backend**: NestJS (Node.js) API - Port 3001
- **Database**: MariaDB/MySQL

---

## 🚀 Deployment Options

### Option 1: Vercel + Railway (Recommended for Beginners)

**Best for**: Quick deployment, minimal configuration, free tier available

#### Frontend (Vercel)
Vercel is perfect for Next.js applications and offers free hosting.

1. **Prepare your frontend**:
   ```bash
   cd networth-frontend
   # Ensure your .env.local has the production API URL
   echo "NEXT_PUBLIC_API_URL=https://your-backend-url.railway.app/api" > .env.local
   ```

2. **Deploy to Vercel**:
   - Sign up at [vercel.com](https://vercel.com)
   - Install Vercel CLI: `npm i -g vercel`
   - Deploy:
     ```bash
     cd networth-frontend
     vercel
     ```
   - Follow prompts and link to your GitHub repo (recommended)

3. **Configure environment variables** in Vercel dashboard:
   - `NEXT_PUBLIC_API_URL` = Your Railway backend URL

#### Backend + Database (Railway)
Railway provides easy deployment with managed databases.

1. **Sign up at [railway.app](https://railway.app)**

2. **Create a new project**:
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository

3. **Add MariaDB/MySQL database**:
   - In your Railway project, click "+ New"
   - Select "Database" → "MySQL"
   - Railway will provision a database and provide connection details

4. **Configure backend service**:
   - Add another service for your backend
   - Set root directory to `networth-backend`
   - Configure environment variables:
     ```
     DATABASE_URL=<from Railway MySQL service>
     JWT_SECRET=<generate strong secret>
     JWT_REFRESH_SECRET=<generate strong secret>
     PORT=3001
     NODE_ENV=production
     ```

5. **Run migrations**:
   ```bash
   railway run npx prisma migrate deploy
   ```

**Cost**: Free tier available, ~$5-20/month for production use

---

### Option 2: DigitalOcean App Platform (Balanced)

**Best for**: Managed services, simple scaling, reasonable pricing

#### Steps:

1. **Prepare your repository**:
   - Ensure your code is in a Git repository (GitHub, GitLab)
   - Add a `Dockerfile` (already exists in your project)

2. **Create DigitalOcean account** at [digitalocean.com](https://digitalocean.com)

3. **Create an App**:
   - Go to "Apps" → "Create App"
   - Connect your GitHub repository
   - DigitalOcean will auto-detect your components

4. **Configure components**:
   - **Frontend**: Next.js web service
     - Build command: `npm run build`
     - Run command: `npm start`
     - HTTP port: 3000
   
   - **Backend**: NestJS API service
     - Build command: `npm run build`
     - Run command: `npm run start:prod`
     - HTTP port: 3001
   
   - **Database**: Add MySQL managed database

5. **Environment variables**:
   - Set all `.env` variables in the App Platform dashboard
   - Use the managed database connection string

6. **Deploy**:
   - Click "Deploy"
   - DigitalOcean handles everything automatically

**Cost**: ~$12-25/month (includes database)

---

### Option 3: AWS (EC2 + RDS) - Full Control

**Best for**: Production apps, custom configuration, enterprise needs

#### Requirements:
- AWS Account
- Basic AWS knowledge
- Domain name (optional but recommended)

#### Steps:

1. **Set up RDS (Database)**:
   - Go to AWS RDS Console
   - Create MySQL database
   - Choose instance type (t3.micro for testing)
   - Configure security groups
   - Note the endpoint URL

2. **Set up EC2 Instance**:
   - Launch Ubuntu instance (t3.small or larger)
   - Configure security groups (allow ports 80, 443, 3000, 3001)
   - SSH into instance

3. **Install dependencies on EC2**:
   ```bash
   # Update system
   sudo apt update && sudo apt upgrade -y
   
   # Install Node.js
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt install -y nodejs
   
   # Install PM2 (process manager)
   sudo npm install -g pm2
   
   # Install Nginx
   sudo apt install nginx -y
   ```

4. **Deploy your application**:
   ```bash
   # Clone your repo
   git clone <your-repo-url>
   cd networth-app
   
   # Set up backend
   cd networth-backend
   npm install
   cp .env.example .env
   # Edit .env with RDS database URL and secrets
   npx prisma migrate deploy
   pm2 start npm --name "networth-api" -- run start:prod
   
   # Set up frontend
   cd ../networth-frontend
   npm install
   cp .env.local.example .env.local
   # Edit .env.local with backend API URL
   npm run build
   pm2 start npm --name "networth-web" -- start
   
   # Save PM2 processes
   pm2 save
   pm2 startup
   ```

5. **Configure Nginx as reverse proxy**:
   ```nginx
   # /etc/nginx/sites-available/networth
   server {
       listen 80;
       server_name your-domain.com;
   
       # Frontend
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   
       # Backend API
       location /api {
           proxy_pass http://localhost:3001;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

6. **Enable site and restart Nginx**:
   ```bash
   sudo ln -s /etc/nginx/sites-available/networth /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

7. **Set up SSL with Let's Encrypt** (optional but recommended):
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d your-domain.com
   ```

**Cost**: ~$15-50/month (EC2 + RDS + data transfer)

---

### Option 4: Docker + Any VPS (Flexible)

**Best for**: Docker enthusiasts, portable deployments

#### Platforms:
- DigitalOcean Droplets
- Linode
- Hetzner
- AWS EC2
- Google Cloud Compute Engine

#### Steps:

1. **Update docker-compose for production**:
   ```yaml
   # docker-compose.prod.yml
   version: '3.8'
   
   services:
     db:
       image: mariadb:latest
       environment:
         MYSQL_ROOT_PASSWORD: ${DB_ROOT_PASSWORD}
         MYSQL_DATABASE: networth
         MYSQL_USER: networth_user
         MYSQL_PASSWORD: ${DB_PASSWORD}
       volumes:
         - db_data:/var/lib/mysql
       restart: always
   
     backend:
       build:
         context: ./networth-backend
       environment:
         DATABASE_URL: mysql://networth_user:${DB_PASSWORD}@db:3306/networth
         JWT_SECRET: ${JWT_SECRET}
         JWT_REFRESH_SECRET: ${JWT_REFRESH_SECRET}
       depends_on:
         - db
       restart: always
   
     frontend:
       build:
         context: ./networth-frontend
       environment:
         NEXT_PUBLIC_API_URL: ${API_URL}
       ports:
         - "80:3000"
       depends_on:
         - backend
       restart: always
   
     nginx:
       image: nginx:alpine
       ports:
         - "80:80"
         - "443:443"
       volumes:
         - ./nginx.conf:/etc/nginx/nginx.conf
       depends_on:
         - frontend
         - backend
       restart: always
   
   volumes:
     db_data:
   ```

2. **Deploy to VPS**:
   ```bash
   # SSH into your VPS
   ssh user@your-vps-ip
   
   # Install Docker
   curl -fsSL https://get.docker.com -o get-docker.sh
   sudo sh get-docker.sh
   
   # Clone your repo
   git clone <your-repo-url>
   cd networth-app
   
   # Set up environment variables
   cp .env.example .env
   # Edit .env with production values
   
   # Deploy
   docker-compose -f docker-compose.prod.yml up -d
   
   # Run migrations
   docker-compose exec backend npx prisma migrate deploy
   ```

**Cost**: ~$5-20/month (VPS only)

---

## 📋 Pre-Deployment Checklist

Before deploying to production:

- [ ] **Environment Variables**:
  - [ ] Generate strong JWT secrets (32+ characters)
  - [ ] Update database credentials
  - [ ] Set NODE_ENV=production
  - [ ] Configure CORS allowed origins

- [ ] **Security**:
  - [ ] Enable HTTPS/SSL
  - [ ] Use strong passwords for database
  - [ ] Implement rate limiting
  - [ ] Set up database backups
  - [ ] Review authentication logic

- [ ] **Database**:
  - [ ] Run all migrations: `npx prisma migrate deploy`
  - [ ] Create initial admin user
  - [ ] Set up automated backups

- [ ] **Frontend**:
  - [ ] Update API URL to production backend
  - [ ] Build for production: `npm run build`
  - [ ] Test PWA functionality

- [ ] **Backend**:
  - [ ] Test all API endpoints
  - [ ] Verify database connections
  - [ ] Set up logging/monitoring

- [ ] **Domain & DNS** (if applicable):
  - [ ] Purchase domain name
  - [ ] Point DNS A record to your server IP
  - [ ] Configure SSL certificate

---

## 🔧 Post-Deployment Tasks

### Create Initial User

Since you don't have a signup page, create your admin user directly in the database:

```bash
# Connect to your production database
# Then run in a Node.js script or use Prisma Studio

# Using Prisma:
npx prisma studio

# Or create a seed script
```

Create a seed file at `networth-backend/prisma/seed.ts`:

```typescript
import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await argon2.hash('YourSecurePassword123!');
  
  const user = await prisma.user.create({
    data: {
      email: 'admin@yourdomain.com',
      passwordHash: hashedPassword,
      role: 'SUPER_ADMIN',
      firstName: 'Super',
      lastName: 'Admin',
      currency: 'AED',
    },
  });
  
  console.log('Created user:', user.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

Run: `npx prisma db seed`

### Monitoring & Maintenance

- **Logs**: Use PM2 logs, Docker logs, or cloud platform logs
- **Monitoring**: Consider services like:
  - Railway (built-in)
  - Sentry.io (error tracking)
  - DataDog (comprehensive)
  - UptimeRobot (uptime monitoring)

- **Backups**: Set up automated database backups
- **Updates**: Regularly update dependencies and apply security patches

---

## 💰 Cost Comparison

| Platform | Monthly Cost | Ease | Best For |
|----------|-------------|------|----------|
| Vercel + Railway | $0-$20 | ⭐⭐⭐⭐⭐ | Beginners, MVPs |
| DigitalOcean App | $12-$25 | ⭐⭐⭐⭐ | Small-medium apps |
| AWS EC2 + RDS | $15-$50+ | ⭐⭐⭐ | Scalable production |
| VPS + Docker | $5-$20 | ⭐⭐⭐ | DIY enthusiasts |

---

## 🆘 Get Help

If you encounter issues:
1. Check logs first
2. Verify environment variables
3. Test database connectivity
4. Check firewall/security group rules
5. Consult platform-specific documentation

## Next Steps

1. Choose your preferred deployment platform
2. Prepare your repository (push to GitHub if not already)
3. Follow the steps for your chosen platform
4. Test thoroughly before sharing with users

Good luck with your deployment! 🚀
