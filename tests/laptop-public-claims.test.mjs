// Regression guard for public laptop category claims (synthetic, no network or commerce data).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/pages/LaptopPrice.tsx', import.meta.url), 'utf8');

test('laptop page does not make blanket warranty or best-price promises', () => {
  assert.doesNotMatch(source, /official warranty and best price guarantee/i);
  assert.doesNotMatch(source, /best price guarantee/i);
  assert.match(source, /Check warranty and pricing terms with the seller before purchasing\./);
});

test('laptop catalog heading, search and filter controls remain present', () => {
  assert.match(source, /Laptop Price in Nepal/);
  assert.match(source, /useProductsByCategoryQuery\("Laptops"/);
  assert.match(source, /handleSearchSubmit/);
  assert.match(source, /FilterSidebar/);
});
