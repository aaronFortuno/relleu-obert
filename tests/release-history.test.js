import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import {releasesAfter} from '../src/release-history.js';

test('the footer includes all published notes after the translated history',async()=>{
  const changelog=await readFile(new URL('../CHANGELOG.md',import.meta.url),'utf8');
  const {version}=JSON.parse(await readFile(new URL('../package.json',import.meta.url),'utf8'));
  const releases=releasesAfter(changelog,'0.23.14');
  const numbers=releases.map(release=>release.number);
  assert.equal(numbers[0],version);
  assert.equal(numbers.at(-1),'0.23.15');
  for(let patch=15;patch<=42;patch++)assert.equal(numbers.filter(number=>number===`0.23.${patch}`).length,1);
  assert(!numbers.includes('0.23.14'));
  assert.equal(releases.find(release=>release.number==='0.23.35').notes.length,3);
  assert(releases.find(release=>release.number==='0.23.15').notes[0].includes('?paviment=rasant'));
});
