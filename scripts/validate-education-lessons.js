const beginnerLessons = require('../database/mongodb/seeds/beginner-lessons');
const intermediateLessons = require('../database/mongodb/seeds/intermediate-lessons');
const expertLessons = require('../database/mongodb/seeds/expert-lessons');

const allLessons = [...beginnerLessons, ...intermediateLessons, ...expertLessons];

console.log('🔍 Validating 30 Education Platform Lessons...\n');

let totalWords = 0;
let errors = [];

if (allLessons.length !== 30) {
  errors.push(`Expected 30 total lessons, but found ${allLessons.length}`);
}

allLessons.forEach((lesson, index) => {
  const wordCount = lesson.content ? lesson.content.split(/\s+/).filter(Boolean).length : 0;
  totalWords += wordCount;

  console.log(`[${index + 1}/30] ${lesson.lessonId} (${lesson.level.toUpperCase()} #${lesson.order}): "${lesson.title}"`);
  console.log(`       - Words: ${wordCount} ${wordCount >= 1000 ? '✅' : '❌ (Under 1,000 words!)'}`);
  console.log(`       - Quiz Qs: ${lesson.quiz ? lesson.quiz.length : 0} ${lesson.quiz && lesson.quiz.length >= 5 ? '✅' : '❌'}`);

  if (wordCount < 1000) {
    errors.push(`Lesson ${lesson.lessonId} has ${wordCount} words (minimum required is 1,000).`);
  }

  if (!lesson.quiz || lesson.quiz.length < 5) {
    errors.push(`Lesson ${lesson.lessonId} has fewer than 5 quiz questions.`);
  }

  if (lesson.quiz) {
    lesson.quiz.forEach((q, qIdx) => {
      if (!q.question || !Array.isArray(q.options) || q.options.length < 3) {
        errors.push(`Lesson ${lesson.lessonId} Quiz Q#${qIdx + 1} has invalid options format.`);
      }
      if (typeof q.correctAnswer !== 'number' || q.correctAnswer < 0 || q.correctAnswer >= q.options.length) {
        errors.push(`Lesson ${lesson.lessonId} Quiz Q#${qIdx + 1} has invalid correctAnswer index (${q.correctAnswer}).`);
      }
    });
  }
});

console.log('\n========================================');
console.log(`📊 TOTAL LESSONS: ${allLessons.length}`);
console.log(`📚 TOTAL WORDS: ${totalWords.toLocaleString()}`);
console.log(`📐 AVERAGE WORDS PER LESSON: ${Math.round(totalWords / allLessons.length)}`);
console.log('========================================');

if (errors.length > 0) {
  console.error('\n❌ VALIDATION FAILED WITH ERRORS:');
  errors.forEach((err) => console.error(`  - ${err}`));
  process.exit(1);
} else {
  console.log('\n🎉 ALL 30 LESSONS PASSED VALIDATION PERFECTLY! EVERY LESSON EXCEEDS 1,000 WORDS WITH FULL QUIZZES.');
}
