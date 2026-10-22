import { describe, it, expect } from 'vitest';
import { ARTICLES, getAllArticles, getArticlesByOrgan, getArticleById } from '../src/data.js';

describe('Constitution Data Set', () => {
  it('contains all 26 articles with at least 3 questions per article', () => {
    expect(ARTICLES.length).toBe(26);

    for (const article of ARTICLES) {
      expect(article.id).toBeDefined();
      expect(article.article).toBeDefined();
      expect(article.title).toBeDefined();
      expect(article.simple).toBeDefined();
      expect(['Legislature', 'Executive', 'Judiciary']).toContain(article.organ);
      expect(['V', 'VI']).toContain(article.part);
      expect(article.questions.length).toBeGreaterThanOrEqual(3);

      for (const q of article.questions) {
        expect(q.id).toBeDefined();
        expect(q.q.length).toBeGreaterThan(5);
        expect(q.options.length).toBeGreaterThanOrEqual(2);
        expect(q.answer).toBeGreaterThanOrEqual(0);
        expect(q.answer).toBeLessThan(q.options.length);
      }
    }
  });

  it('filters articles by organ correctly', () => {
    const leg = getArticlesByOrgan('Legislature');
    const exe = getArticlesByOrgan('Executive');
    const jud = getArticlesByOrgan('Judiciary');

    expect(leg.length).toBeGreaterThan(0);
    expect(exe.length).toBeGreaterThan(0);
    expect(jud.length).toBeGreaterThan(0);
    expect(leg.length + exe.length + jud.length).toBe(26);
  });

  it('retrieves article by id correctly', () => {
    const art52 = getArticleById('art-52');
    expect(art52).toBeDefined();
    expect(art52?.article).toBe('52');
    expect(art52?.title).toBe('The President of India');
  });
});
