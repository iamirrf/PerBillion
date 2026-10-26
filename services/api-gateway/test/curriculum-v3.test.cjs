const { test } = require('node:test');
const assert = require('node:assert/strict');
const { assessmentFor, curriculum, CURRICULUM_VERSION, PREVIEW_LESSONS, publicCatalog } = require('../dist/data/curriculum-v3');

test('v3 keeps 24 stable lessons and exactly three public previews', () => {
  assert.equal(CURRICULUM_VERSION, '2026.1');
  assert.equal(curriculum.length, 24);
  assert.equal(new Set(curriculum.map(lesson => lesson.id)).size, 24);
  assert.deepEqual([...PREVIEW_LESSONS].sort(), ['compound-interest', 'diversification', 'money-to-investing']);
  assert.equal(curriculum.filter(lesson => lesson.checkpoint).length, 4);
});

test('every v3 lesson has five server-scored questions and an 80 percent mastery boundary', () => {
  for (const lesson of curriculum) {
    const assessment = assessmentFor(lesson);
    assert.equal(assessment.questions.length, 5);
    assert.equal(assessment.correct.length, 5);
    assert.ok(assessment.questions.every(question => question.options.length === 3));
    assert.ok(assessment.correct.every(answer => Number.isInteger(answer) && answer >= 0 && answer <= 2));
    const fourCorrectScore = assessment.correct.map((answer, index) => index === 4 ? (answer + 1) % 3 : answer)
      .filter((answer, index) => answer === assessment.correct[index]).length * 20;
    assert.equal(fourCorrectScore, 80);
  }
});

test('public catalog contains metadata but no lesson bodies or answer keys', () => {
  const catalog = publicCatalog();
  assert.equal(catalog.length, 24);
  for (const lesson of catalog) {
    assert.equal(typeof lesson.title, 'string');
    for (const protectedField of ['sections', 'takeaway', 'exercisePrompt', 'questions', 'correct', 'answers']) {
      assert.equal(Object.hasOwn(lesson, protectedField), false, `${lesson.id} leaked ${protectedField}`);
    }
  }
});
