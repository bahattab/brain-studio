(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.BrainCore = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const items = [
    ['thinking', 'When starting an unfamiliar project, what helps you begin?', 'A sequence of clear steps', 'A rough direction that I can explore'],
    ['thinking', 'How do you usually compare two possible solutions?', 'Check the evidence against explicit criteria', 'Notice which possibility feels more promising'],
    ['thinking', 'When a plan stops working, what is your first impulse?', 'Find the particular assumption that failed', 'Try a different approach and see where it leads'],
    ['thinking', 'What kind of explanation do you prefer for a complex idea?', 'A careful chain of reasons', 'An analogy that reveals the overall idea'],
    ['thinking', 'How do you tend to organize a busy day?', 'Set priorities and follow a schedule', 'Keep room to respond to opportunities'],
    ['thinking', 'When reviewing your own work, what draws your attention first?', 'Details that need checking', 'Whether the whole piece achieves its purpose'],
    ['thinking', 'How do you approach a disagreement about a practical decision?', 'Separate the claims and compare supporting facts', 'Explore the perspectives and imagine another possibility'],
    ['thinking', 'Which part of solving a puzzle do you enjoy more?', 'Applying constraints until an answer follows', 'Making an unexpected connection'],
    ['thinking', 'How do you prefer to refine a new idea?', 'Test one element at a time', 'Sketch several variations before choosing'],
    ['thinking', 'When choosing a next step with limited information, what guides you?', 'The most defensible available reasoning', 'A hunch informed by the overall situation'],
    ['perception', 'When following directions to a new place, what helps most?', 'A map showing the route', 'Someone describing the route aloud'],
    ['perception', 'When you revisit a meeting, which reminder is more useful?', 'A diagram or written outline', 'A recording or spoken recap'],
    ['perception', 'How would you first explore a new tool?', 'Look at screenshots and labeled controls', 'Listen to someone walk through its use'],
    ['perception', 'When comparing several ideas, what helps you keep track?', 'Arrange notes where I can see them together', 'Talk through the ideas and hear the differences'],
    ['perception', 'Which cue helps you recall a recent conversation?', 'The scene and people’s expressions', 'The voices and phrases I heard'],
    ['perception', 'When preparing to explain a process, what do you reach for?', 'A flowchart or illustrated example', 'A spoken rehearsal or verbal example'],
    ['perception', 'When an instruction is confusing, what clarification would you request?', 'Show me an example', 'Explain it aloud in another way'],
    ['perception', 'How do you prefer to capture a fresh thought?', 'Write or draw a quick note', 'Record a voice note or say it aloud'],
    ['perception', 'Which presentation detail most often catches your attention?', 'The arrangement of images and text', 'The speaker’s pacing and tone'],
    ['perception', 'For an initial overview of an unfamiliar subject, what would you choose?', 'An illustrated summary', 'An audio conversation about the topic']
  ];
  const questions = Object.freeze(items.map((item, index) => Object.freeze({
    id: 'q' + String(index + 1).padStart(2, '0'), dimension: item[0], prompt: item[1],
    options: Object.freeze([
      Object.freeze({ label: item[2], value: -1 }),
      Object.freeze({ label: 'Both equally / depends on the situation', value: 0 }),
      Object.freeze({ label: item[3], value: 1 })
    ])
  })));
  function validateAnswers(answers) {
    const cleaned = Object.create(null);
    if (!answers || typeof answers !== 'object' || Array.isArray(answers)) return cleaned;
    questions.forEach(function (question) {
      const descriptor = Object.getOwnPropertyDescriptor(answers, question.id);
      if (!descriptor || !Object.prototype.hasOwnProperty.call(descriptor, 'value')) return;
      const value = descriptor.value;
      if (Number.isInteger(value) && value >= 0 && value < question.options.length) cleaned[question.id] = value;
    });
    return cleaned;
  }
  function band(percent) {
    return percent < 20 ? 0 : percent < 40 ? 1 : percent <= 60 ? 2 : percent <= 80 ? 3 : 4;
  }
  function score(answers) {
    const cleaned = validateAnswers(answers);
    if (Object.keys(cleaned).length !== questions.length) throw new TypeError('Answer all 20 questions with valid option indexes before scoring.');
    const totals = { thinking: 0, perception: 0 };
    questions.forEach(function (question) { totals[question.dimension] += question.options[cleaned[question.id]].value; });
    const intuitive = Math.round((totals.thinking + 10) * 5);
    const auditory = Math.round((totals.perception + 10) * 5);
    return { analytical: 100 - intuitive, intuitive: intuitive, visual: 100 - auditory, auditory: auditory, thinkingBand: band(intuitive), perceptionBand: band(auditory) };
  }
  const thinking = [
    ['Analytical emphasis', 'Your answers currently lean toward explicit criteria, checking details, and working through reasons.', 'Try a small open-ended experiment before settling on a detailed plan.'],
    ['Analytical leaning', 'Your answers suggest a modest preference for structure and evidence, with room for exploratory approaches.', 'Combine a short checklist with time to explore alternatives.'],
    ['Mixed thinking preferences', 'Your answers mix structured reasoning and exploratory judgment. The situation may influence which you choose.', 'Compare a step-by-step approach with a quick sketch of possibilities.'],
    ['Intuitive leaning', 'Your answers suggest a modest preference for connections, possibilities, and the overall picture.', 'Check a promising idea against a few explicit criteria.'],
    ['Intuitive emphasis', 'Your answers currently lean toward exploration, unexpected connections, and the overall picture.', 'Write down the assumptions behind a hunch and test one of them.']
  ];
  const perception = [
    ['Visual emphasis', 'Your answers currently favor visible examples, spatial arrangements, and written or illustrated reminders.', 'Pair a visual outline with a brief spoken explanation.'],
    ['Visual leaning', 'Your answers suggest a modest preference for visible information, while spoken explanations can also help.', 'Use a simple diagram, then talk through what it means.'],
    ['Mixed presentation preferences', 'Your answers mix visible and spoken formats. Neither preference determines how well you can learn.', 'Try both a visual summary and a spoken recap of the same material.'],
    ['Auditory leaning', 'Your answers suggest a modest preference for spoken explanations, voices, and talking ideas through.', 'Add a written outline to a spoken recap so you can compare both.'],
    ['Auditory emphasis', 'Your answers currently favor spoken explanations, verbal rehearsal, and sound-based reminders.', 'Turn a spoken explanation into a quick diagram or written outline.']
  ];
  function profile(result) {
    if (!result || !Number.isInteger(result.thinkingBand) || !Number.isInteger(result.perceptionBand) || result.thinkingBand < 0 || result.thinkingBand > 4 || result.perceptionBand < 0 || result.perceptionBand > 4) throw new TypeError('A result with bands from 0 to 4 is required.');
    const t = thinking[result.thinkingBand], p = perception[result.perceptionBand];
    return { title: t[0] + ' · ' + p[0], thinkingText: t[1], perceptionText: p[1], tips: [t[2], p[2], 'Treat this snapshot as a conversation starter. Try different approaches and judge them by the results in your current task.'] };
  }
  return Object.freeze({ questions: questions, score: score, validateAnswers: validateAnswers, profile: profile });
});
