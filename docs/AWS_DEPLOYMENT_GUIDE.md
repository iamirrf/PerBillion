# AWS Deployment Guide

## Prerequisites

- AWS Account with appropriate permissions
- AWS CLI installed and configured
- Domain name (optional, but recommended)
- SSH key pair for EC2 instances

---

## Architecture Overview

```
Internet
    │
    ▼
Route 53 (DNS)
    │
    ▼
Application Load Balancer (HTTPS)
    │
    ├──▶ EC2 Instance(s) - Docker Compose
    │    ├── Frontend
    │    ├── API Gateway
    │    ├── Spring Orchestrator
    │    └── ML Engine
    │
    ├──▶ RDS PostgreSQL (Users/Auth)
    │
    ├──▶ DocumentDB/MongoDB Atlas (Forecasts)
    │
    └──▶ S3 (Exports, Backups)
```

---

## Step-by-Step Deployment

### 1. Set Up VPC and Security Groups

```bash
# Create VPC
aws ec2 create-vpc \
  --cidr-block 10.0.0.0/16 \
  --tag-specifications 'ResourceType=vpc,Tags=[{Key=Name,Value=PerBillion-VPC}]'

# Note the VPC ID from output
export VPC_ID=vpc-xxxxxxxxx

# Create subnets
aws ec2 create-subnet \
  --vpc-id $VPC_ID \
  --cidr-block 10.0.1.0/24 \
  --availability-zone us-east-1a \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=PerBillion-Public-1a}]'

aws ec2 create-subnet \
  --vpc-id $VPC_ID \
  --cidr-block 10.0.2.0/24 \
  --availability-zone us-east-1b \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=PerBillion-Public-1b}]'

# Create Internet Gateway
aws ec2 create-internet-gateway \
  --tag-specifications 'ResourceType=internet-gateway,Tags=[{Key=Name,Value=PerBillion-IGW}]'

export IGW_ID=igw-xxxxxxxxx

# Attach to VPC
aws ec2 attach-internet-gateway \
  --internet-gateway-id $IGW_ID \
  --vpc-id $VPC_ID

# Create security group for EC2
aws ec2 create-security-group \
  --group-name PerBillion-EC2-SG \
  --description "Security group for PerBillion EC2 instances" \
  --vpc-id $VPC_ID

export EC2_SG_ID=sg-xxxxxxxxx

# Allow HTTP, HTTPS, SSH
aws ec2 authorize-security-group-ingress \
  --group-id $EC2_SG_ID \
  --protocol tcp \
  --port 80 \
  --cidr 0.0.0.0/0

aws ec2 authorize-security-group-ingress \
  --group-id $EC2_SG_ID \
  --protocol tcp \
  --port 443 \
  --cidr 0.0.0.0/0

aws ec2 authorize-security-group-ingress \
  --group-id $EC2_SG_ID \
  --protocol tcp \
  --port 22 \
  --cidr YOUR_IP/32  # Replace with your IP

# Create security group for RDS
aws ec2 create-security-group \
  --group-name PerBillion-RDS-SG \
  --description "Security group for PerBillion RDS" \
  --vpc-id $VPC_ID

export RDS_SG_ID=sg-xxxxxxxxx

# Allow PostgreSQL from EC2 security group
aws ec2 authorize-security-group-ingress \
  --group-id $RDS_SG_ID \
  --protocol tcp \
  --port 5432 \
  --source-group $EC2_SG_ID
```

### 2. Create RDS PostgreSQL Instance

```bash
# Create DB subnet group
aws rds create-db-subnet-group \
  --db-subnet-group-name perbillion-db-subnet \
  --db-subnet-group-description "PerBillion DB Subnet Group" \
  --subnet-ids subnet-xxxxx subnet-yyyyy

# Create RDS instance
aws rds create-db-instance \
  --db-instance-identifier perbillion-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version 15.4 \
  --master-username perbillion \
  --master-user-password 'CHANGE_THIS_SECURE_PASSWORD' \
  --allocated-storage 20 \
  --storage-type gp3 \
  --vpc-security-group-ids $RDS_SG_ID \
  --db-subnet-group-name perbillion-db-subnet \
  --backup-retention-period 7 \
  --preferred-backup-window "03:00-04:00" \
  --preferred-maintenance-window "sun:04:00-sun:05:00" \
  --enable-iam-database-authentication \
  --tags Key=Name,Value=PerBillion-PostgreSQL

# Wait for instance to be available (takes ~10 minutes)
aws rds wait db-instance-available \
  --db-instance-identifier perbillion-db

# Get endpoint
aws rds describe-db-instances \
  --db-instance-identifier perbillion-db \
  --query 'DBInstances[0].Endpoint.Address' \
  --output text
```

### 3. Set Up S3 Bucket

```bash
# Create S3 bucket for exports
aws s3 mb s3://perbillion-forecasts-prod

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket perbillion-forecasts-prod \
  --versioning-configuration Status=Enabled

# Set lifecycle policy
cat > lifecycle.json <<EOF
{
  "Rules": [
    {
      "Id": "DeleteOldVersions",
      "Status": "Enabled",
      "NoncurrentVersionExpiration": {
        "NoncurrentDays": 30
      }
    }
  ]
}
EOF

aws s3api put-bucket-lifecycle-configuration \
  --bucket perbillion-forecasts-prod \
  --lifecycle-configuration file://lifecycle.json
```

### 4. Launch EC2 Instance

```bash
# Create key pair if you don't have one
aws ec2 create-key-pair \
  --key-name perbillion-key \
  --query 'KeyMaterial' \
  --output text > perbillion-key.pem

chmod 400 perbillion-key.pem

# Launch EC2 instance
aws ec2 run-instances \
  --image-id ami-0c55b159cbfafe1f0 \  # Amazon Linux 2023
  --instance-type t3.medium \
  --key-name perbillion-key \
  --security-group-ids $EC2_SG_ID \
  --subnet-id subnet-xxxxx \
  --associate-public-ip-address \
  --block-device-mappings '[{"DeviceName":"/dev/xvda","Ebs":{"VolumeSize":30,"VolumeType":"gp3"}}]' \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=PerBillion-App}]' \
  --user-data file://ec2-user-data.sh

# Get instance ID and public IP
export INSTANCE_ID=i-xxxxxxxxx
export PUBLIC_IP=$(aws ec2 describe-instances \
  --instance-ids $INSTANCE_ID \
  --query 'Reservations[0].Instances[0].PublicIpAddress' \
  --output text)

echo "Instance IP: $PUBLIC_IP"
```

**ec2-user-data.sh:**
```bash
#!/bin/bash
yum update -y

# Install Docker
yum install -y docker
systemctl start docker
systemctl enable docker
usermod -a -G docker ec2-user

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/download/v2.23.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Install Git
yum install -y git

# Install CloudWatch agent
wget https://s3.amazonaws.com/amazoncloudwatch-agent/amazon_linux/amd64/latest/amazon-cloudwatch-agent.rpm
rpm -U ./amazon-cloudwatch-agent.rpm
```

### 5. Deploy Application to EC2

```bash
# SSH into instance
ssh -i perbillion-key.pem ec2-user@$PUBLIC_IP

# Clone repository
git clone https://github.com/your-org/PerBillion.git
cd PerBillion

# Create production .env file
cat > .env <<EOF
# Database
POSTGRES_HOST=your-rds-endpoint.rds.amazonaws.com
POSTGRES_PORT=5432
POSTGRES_DB=perbillion
POSTGRES_USER=perbillion
POSTGRES_PASSWORD=CHANGE_THIS_SECURE_PASSWORD

# MongoDB - Use MongoDB Atlas or DocumentDB
MONGODB_HOST=your-mongodb-endpoint
MONGODB_PORT=27017
MONGODB_DATABASE=perbillion
MONGODB_USER=perbillion
MONGODB_PASSWORD=CHANGE_THIS_SECURE_PASSWORD

# JWT
JWT_SECRET=$(openssl rand -base64 32)
JWT_EXPIRY=7d

# AWS
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
S3_BUCKET_NAME=perbillion-forecasts-prod

# Environment
NODE_ENV=production
SPRING_PROFILES_ACTIVE=prod

# URLs
FRONTEND_URL=https://yourdomain.com
API_URL=https://yourdomain.com/api
EOF

# Initialize database
docker-compose run --rm api-gateway npm run migrate

# Start services
docker-compose up -d --build

# Check status
docker-compose ps
docker-compose logs -f
```

### 6. Configure MongoDB (Using MongoDB Atlas)

```bash
# Option 1: MongoDB Atlas (Recommended)
# 1. Go to https://www.mongodb.com/cloud/atlas
# 2. Create a cluster
# 3. Whitelist EC2 IP address
# 4. Create database user
# 5. Get connection string
# 6. Update .env with connection string

# Option 2: AWS DocumentDB
aws docdb create-db-cluster \
  --db-cluster-identifier perbillion-docdb \
  --engine docdb \
  --master-username perbillion \
  --master-user-password 'CHANGE_THIS_SECURE_PASSWORD' \
  --vpc-security-group-ids $RDS_SG_ID \
  --db-subnet-group-name perbillion-db-subnet

aws docdb create-db-instance \
  --db-instance-identifier perbillion-docdb-instance \
  --db-instance-class db.t3.medium \
  --engine docdb \
  --db-cluster-identifier perbillion-docdb
```

### 7. Set Up SSL with Let's Encrypt

```bash
# SSH into EC2 instance
ssh -i perbillion-key.pem ec2-user@$PUBLIC_IP

# Install Certbot
sudo yum install -y certbot

# Stop Nginx temporarily
docker-compose stop nginx

# Get certificate
sudo certbot certonly --standalone \
  -d yourdomain.com \
  -d www.yourdomain.com \
  --non-interactive \
  --agree-tos \
  --email admin@yourdomain.com

# Copy certificates to Nginx directory
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem nginx/ssl/
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem nginx/ssl/

# Update nginx configuration to use SSL
# Edit nginx/conf.d/default.conf and uncomment HTTPS server block

# Restart Nginx
docker-compose up -d nginx

# Set up auto-renewal
echo "0 0 1 * * root certbot renew --quiet && docker-compose restart nginx" | sudo tee -a /etc/crontab
```

### 8. Configure Route 53 DNS

```bash
# Get hosted zone ID
export HOSTED_ZONE_ID=$(aws route53 list-hosted-zones \
  --query "HostedZones[?Name=='yourdomain.com.'].Id" \
  --output text)

# Create A record
cat > change-batch.json <<EOF
{
  "Changes": [
    {
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "yourdomain.com",
        "Type": "A",
        "TTL": 300,
        "ResourceRecords": [
          {
            "Value": "$PUBLIC_IP"
          }
        ]
      }
    },
    {
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "www.yourdomain.com",
        "Type": "A",
        "TTL": 300,
        "ResourceRecords": [
          {
            "Value": "$PUBLIC_IP"
          }
        ]
      }
    }
  ]
}
EOF

aws route53 change-resource-record-sets \
  --hosted-zone-id $HOSTED_ZONE_ID \
  --change-batch file://change-batch.json
```

### 9. Set Up CloudWatch Monitoring

```bash
# Create CloudWatch log group
aws logs create-log-group --log-group-name /perbillion/application

# Create IAM role for CloudWatch
cat > trust-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "ec2.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

aws iam create-role \
  --role-name PerBillion-CloudWatch-Role \
  --assume-role-policy-document file://trust-policy.json

# Attach CloudWatch policy
aws iam attach-role-policy \
  --role-name PerBillion-CloudWatch-Role \
  --policy-arn arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy

# Create instance profile
aws iam create-instance-profile \
  --instance-profile-name PerBillion-CloudWatch-Profile

aws iam add-role-to-instance-profile \
  --instance-profile-name PerBillion-CloudWatch-Profile \
  --role-name PerBillion-CloudWatch-Role

# Attach to EC2 instance
aws ec2 associate-iam-instance-profile \
  --instance-id $INSTANCE_ID \
  --iam-instance-profile Name=PerBillion-CloudWatch-Profile
```

### 10. Set Up Backups

```bash
# RDS automated backups are already configured (7 days retention)

# Create backup script for Docker volumes
ssh -i perbillion-key.pem ec2-user@$PUBLIC_IP

cat > /home/ec2-user/backup.sh <<'EOF'
#!/bin/bash
DATE=$(date +%Y-%m-%d)
BACKUP_DIR=/home/ec2-user/backups/$DATE
S3_BUCKET=perbillion-forecasts-prod

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup Docker volumes
docker run --rm \
  -v perbillion_postgres_data:/data \
  -v $BACKUP_DIR:/backup \
  alpine tar czf /backup/postgres-$DATE.tar.gz -C /data .

docker run --rm \
  -v perbillion_mongodb_data:/data \
  -v $BACKUP_DIR:/backup \
  alpine tar czf /backup/mongodb-$DATE.tar.gz -C /data .

# Upload to S3
aws s3 sync $BACKUP_DIR s3://$S3_BUCKET/backups/$DATE/

# Clean up old local backups (keep 7 days)
find /home/ec2-user/backups -type d -mtime +7 -exec rm -rf {} +
EOF

chmod +x /home/ec2-user/backup.sh

# Add to crontab (daily at 2 AM)
echo "0 2 * * * /home/ec2-user/backup.sh" | crontab -
```

---

## Production Checklist

- [ ] Change all default passwords
- [ ] Configure SSL certificates
- [ ] Set up database backups
- [ ] Configure CloudWatch monitoring
- [ ] Set up CloudWatch alarms
- [ ] Configure log rotation
- [ ] Test disaster recovery procedure
- [ ] Set up staging environment
- [ ] Configure auto-scaling (optional)
- [ ] Load test the application
- [ ] Security audit
- [ ] Penetration testing
- [ ] Update documentation with production URLs

---

## Monitoring and Maintenance

### Health Checks
```bash
# Application health
curl https://yourdomain.com/health

# Database connection
docker-compose exec api-gateway npm run health-check

# View logs
docker-compose logs -f --tail=100
```

### Common Issues

**Issue: Cannot connect to RDS**
- Check security group allows traffic from EC2
- Verify RDS endpoint in .env
- Check VPC networking

**Issue: High memory usage**
- Scale EC2 instance type
- Review Docker resource limits
- Check for memory leaks in logs

**Issue: SSL certificate renewal fails**
- Ensure port 80 is accessible
- Check Certbot logs
- Manually renew: `sudo certbot renew`

---

## Scaling

### Vertical Scaling
```bash
# Stop instance
aws ec2 stop-instances --instance-ids $INSTANCE_ID

# Change instance type
aws ec2 modify-instance-attribute \
  --instance-id $INSTANCE_ID \
  --instance-type t3.large

# Start instance
aws ec2 start-instances --instance-ids $INSTANCE_ID
```

### Horizontal Scaling (Advanced)
1. Create Application Load Balancer
2. Launch multiple EC2 instances
3. Use Auto Scaling Group
4. Configure session persistence
5. Consider RDS read replicas

---

## Cost Optimization

**Estimated Monthly Costs (us-east-1):**
- EC2 t3.medium: ~$30
- RDS db.t3.micro: ~$15
- S3 storage (100GB): ~$2
- Data transfer: ~$10
- Total: ~$57/month

**Cost Reduction Tips:**
- Use Reserved Instances for 40% savings
- Enable RDS auto-scaling storage
- Use S3 Intelligent-Tiering
- Delete unused snapshots
- Schedule EC2 stop/start for dev environments

---

## Support

For deployment issues:
- AWS Support: https://console.aws.amazon.com/support
- Documentation: https://docs.aws.amazon.com
- PerBillion Support: support@perbillion.com
