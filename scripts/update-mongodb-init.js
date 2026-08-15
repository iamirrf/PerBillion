const fs = require('fs');
const path = require('path');

const beginnerLessons = require('../database/mongodb/seeds/beginner-lessons');
const intermediateLessons = require('../database/mongodb/seeds/intermediate-lessons');
const expertLessons = require('../database/mongodb/seeds/expert-lessons');

const allLessons = [...beginnerLessons, ...intermediateLessons, ...expertLessons];

const initHeader = `// PerBillion MongoDB Initialization Script
// Forecasts, Experiments, and Time Series Data

db = db.getSiblingDB('perbillion');

// Create collections
db.createCollection('forecasts');
db.createCollection('experiments');
db.createCollection('diagnostics');
db.createCollection('model_artifacts');
db.createCollection('users');
db.createCollection('user_preferences');
db.createCollection('lessons');
db.createCollection('education_progress');

// Forecasts collection indexes
db.forecasts.createIndex({ "user_id": 1 });
db.forecasts.createIndex({ "ticker": 1 });
db.forecasts.createIndex({ "created_at": -1 });
db.forecasts.createIndex({ "user_id": 1, "ticker": 1, "created_at": -1 });
db.forecasts.createIndex({ "status": 1 });
db.forecasts.createIndex({ "model_type": 1 });

// Users collection indexes
db.users.createIndex({ "email": 1 }, { unique: true });
db.users.createIndex({ "createdAt": -1 });
db.users.createIndex({ "username": 1 }, { unique: true, sparse: true });

// User preferences collection indexes
db.user_preferences.createIndex({ "userId": 1 }, { unique: true });

// Education progress collection indexes
db.education_progress.createIndex({ "userId": 1 }, { unique: true });
db.education_progress.createIndex({ "lastAccessedAt": -1 });

// Lessons collection indexes
db.lessons.createIndex({ "level": 1, "order": 1 });
db.lessons.createIndex({ "lessonId": 1 }, { unique: true });

// Experiments collection indexes (for hyperparameter tuning tracking)
db.experiments.createIndex({ "forecast_id": 1 });
db.experiments.createIndex({ "created_at": -1 });
db.experiments.createIndex({ "model_type": 1 });
db.experiments.createIndex({ "score": -1 });

// Diagnostics collection indexes
db.diagnostics.createIndex({ "forecast_id": 1 });
db.diagnostics.createIndex({ "ticker": 1 });
db.diagnostics.createIndex({ "test_type": 1 });

// Model artifacts collection indexes
db.model_artifacts.createIndex({ "forecast_id": 1 });
db.model_artifacts.createIndex({ "created_at": -1 });

// Clear existing lessons before seeding
db.lessons.deleteMany({});

// Seed 30 Super-Comprehensive Lessons (1,000+ words each)
db.lessons.insertMany(${JSON.stringify(allLessons, null, 2)});

print("✅ MongoDB Initialization Complete! Loaded 30 Super-Comprehensive Education Lessons.");
`;

fs.writeFileSync(path.join(__dirname, '../database/mongodb/init.js'), initHeader, 'utf8');
console.log('✅ Updated database/mongodb/init.js with all 30 expanded lessons!');
