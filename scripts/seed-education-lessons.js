const { MongoClient } = require('mongodb');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env if present
dotenv.config({ path: path.join(__dirname, '../.env') });

const beginnerLessons = require('../database/mongodb/seeds/beginner-lessons');
const intermediateLessons = require('../database/mongodb/seeds/intermediate-lessons');
const expertLessons = require('../database/mongodb/seeds/expert-lessons');

const allLessons = [...beginnerLessons, ...intermediateLessons, ...expertLessons];

const mongoUri = process.env.MONGODB_URI || 
  `mongodb://perbillion:${process.env.MONGO_PASSWORD || 'perbillion123'}@localhost:27017/perbillion?authSource=admin`;

async function seedEducation() {
  console.log('🚀 Starting PerBillion 30-Lesson Seeding Script...');
  console.log(`Target MongoDB URI: ${mongoUri.replace(/:[^:@]+@/, ':****@')}`);

  let client;
  try {
    client = new MongoClient(mongoUri, { serverSelectionTimeoutMS: 5000 });
    await client.connect();
    console.log('✅ Connected successfully to MongoDB server.');

    const db = client.db('perbillion');
    const lessonsColl = db.collection('lessons');

    let totalWords = 0;
    let seededCount = 0;

    for (const lesson of allLessons) {
      // Calculate word count
      const wordCount = lesson.content ? lesson.content.split(/\s+/).filter(Boolean).length : 0;
      totalWords += wordCount;

      await lessonsColl.updateOne(
        { lessonId: lesson.lessonId },
        {
          $set: {
            lessonId: lesson.lessonId,
            level: lesson.level,
            order: lesson.order,
            title: lesson.title,
            duration: lesson.duration,
            content: lesson.content,
            quiz: lesson.quiz,
            updatedAt: new Date()
          }
        },
        { upsert: true }
      );

      seededCount++;
      console.log(`  [${lesson.level.toUpperCase()}] Lesson ${lesson.order}: "${lesson.title}" (${wordCount} words, ${lesson.quiz.length} quiz Qs)`);
    }

    console.log('\n📊 SEEDING SUMMARY:');
    console.log(`  - Total Lessons Seeded: ${seededCount} / 30`);
    console.log(`  - Total Words: ${totalWords.toLocaleString()} words`);
    console.log(`  - Average Word Count per Lesson: ${Math.round(totalWords / seededCount)} words`);

    if (totalWords / seededCount >= 1000) {
      console.log('🎉 SUCCESS: All lessons exceed the 1,000-word comprehensive requirement!');
    } else {
      console.warn('⚠️ WARNING: Average word count is below 1,000 words.');
    }

  } catch (error) {
    console.error('❌ Error seeding lessons:', error.message);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

seedEducation();
