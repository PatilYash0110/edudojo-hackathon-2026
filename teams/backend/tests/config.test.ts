import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { parseModelConfig } from '@/lib/server/model-config/openmaic-yml';

describe('DojoLearn openmaic.yml', () => {
  it('parses with OpenMAIC schema', () => {
    const file = path.resolve(__dirname, '../config/openmaic.dojo.yml');
    const config = parseModelConfig(fs.readFileSync(file, 'utf-8'), {
      file,
      env: { DEEPSEEK_API_KEY: 'set', SPEACHES_BASE_URL: 'http://localhost:8000/v1' },
    });
    expect(config.slots?.llm).toBe('deepseek:deepseek-flash');
    expect(config.slots?.tts).toBe('speaches:speaches-ai/piper-de_DE-thorsten-high');
    expect(config.allowUserKeys).toBe(false);
  });
});
