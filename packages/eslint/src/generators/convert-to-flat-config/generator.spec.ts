import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import {
  NxJsonConfiguration,
  Tree,
  addProjectConfiguration,
  readJson,
  updateJson,
} from '@nx/devkit';

import { convertToFlatConfigGenerator } from './generator';
import { ConvertToFlatConfigGeneratorSchema } from './schema';
import { lintProjectGenerator } from '../lint-project/lint-project';
import { Linter } from '../utils/linter';
import { eslintrcVersion } from '../../utils/versions';
import { dump } from 'js-yaml';

describe('convert-to-flat-config generator', () => {
  let tree: Tree;
  const options: ConvertToFlatConfigGeneratorSchema = { skipFormat: false };

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
    addProjectConfiguration(tree, 'test-lib', {
      root: 'libs/test-lib',
      targets: {},
    });
    updateJson(tree, 'nx.json', (json: NxJsonConfiguration) => {
      json.targetDefaults = {
        lint: {
          inputs: ['default'],
        },
      };
      json.namedInputs = {
        default: ['{projectRoot}/**/*', 'sharedGlobals'],
        production: [
          'default',
          '!{projectRoot}/**/?(*.)+(spec|test).[jt]s?(x)?(.snap)',
        ],
        sharedGlobals: [],
      };
      return json;
    });
  });

  it('should convert json successfully', async () => {
    await lintProjectGenerator(tree, {
      skipFormat: false,
      linter: Linter.EsLint,
      project: 'test-lib',
      setParserOptionsProject: false,
    });
    await convertToFlatConfigGenerator(tree, options);

    expect(tree.exists('eslint.config.js')).toBeTruthy();
    expect(tree.read('eslint.config.js', 'utf-8')).toMatchSnapshot();
    expect(tree.exists('libs/test-lib/eslint.config.js')).toBeTruthy();
    expect(
      tree.read('libs/test-lib/eslint.config.js', 'utf-8')
    ).toMatchSnapshot();
    // check nx.json changes
    const nxJson = readJson(tree, 'nx.json');
    expect(nxJson.targetDefaults.lint.inputs).toContain(
      '{workspaceRoot}/eslint.config.js'
    );
    expect(nxJson.namedInputs.production).toContain(
      '!{projectRoot}/eslint.config.js'
    );
  });

  it('should convert yaml successfully', async () => {
    await lintProjectGenerator(tree, {
      skipFormat: false,
      linter: Linter.EsLint,
      eslintFilePatterns: ['**/*.ts'],
      project: 'test-lib',
      setParserOptionsProject: false,
    });
    const yamlContent = dump(readJson(tree, 'libs/test-lib/.eslintrc.json'));
    tree.delete('libs/test-lib/.eslintrc.json');
    tree.write('libs/test-lib/.eslintrc.yaml', yamlContent);

    await convertToFlatConfigGenerator(tree, options);

    expect(tree.exists('eslint.config.js')).toBeTruthy();
    expect(tree.read('eslint.config.js', 'utf-8')).toMatchSnapshot();
    expect(tree.exists('libs/test-lib/eslint.config.js')).toBeTruthy();
    expect(
      tree.read('libs/test-lib/eslint.config.js', 'utf-8')
    ).toMatchSnapshot();
    // check nx.json changes
    const nxJson = readJson(tree, 'nx.json');
    expect(nxJson.targetDefaults.lint.inputs).toContain(
      '{workspaceRoot}/eslint.config.js'
    );
    expect(nxJson.namedInputs.production).toContain(
      '!{projectRoot}/eslint.config.js'
    );
  });

  it('should convert yml successfully', async () => {
    await lintProjectGenerator(tree, {
      skipFormat: false,
      linter: Linter.EsLint,
      eslintFilePatterns: ['**/*.ts'],
      project: 'test-lib',
      setParserOptionsProject: false,
    });
    const yamlContent = dump(readJson(tree, 'libs/test-lib/.eslintrc.json'));
    tree.delete('libs/test-lib/.eslintrc.json');
    tree.write('libs/test-lib/.eslintrc.yml', yamlContent);

    await convertToFlatConfigGenerator(tree, options);

    expect(tree.exists('eslint.config.js')).toBeTruthy();
    expect(tree.read('eslint.config.js', 'utf-8')).toMatchSnapshot();
    expect(tree.exists('libs/test-lib/eslint.config.js')).toBeTruthy();
    expect(
      tree.read('libs/test-lib/eslint.config.js', 'utf-8')
    ).toMatchSnapshot();
    // check nx.json changes
    const nxJson = readJson(tree, 'nx.json');
    expect(nxJson.targetDefaults.lint.inputs).toContain(
      '{workspaceRoot}/eslint.config.js'
    );
    expect(nxJson.namedInputs.production).toContain(
      '!{projectRoot}/eslint.config.js'
    );
  });

  it('should add plugin extends', async () => {
    await lintProjectGenerator(tree, {
      skipFormat: false,
      linter: Linter.EsLint,
      project: 'test-lib',
      setParserOptionsProject: false,
    });
    updateJson(tree, '.eslintrc.json', (json) => {
      json.extends = ['plugin:storybook/recommended'];
      return json;
    });
    await convertToFlatConfigGenerator(tree, options);

    expect(tree.read('eslint.config.js', 'utf-8')).toMatchInlineSnapshot(`
      "const { FlatCompat } = require('@eslint/eslintrc');
      const nxEslintPlugin = require('@nx/eslint-plugin');
      const js = require('@eslint/js');

      const compat = new FlatCompat({
        baseDirectory: __dirname,
        recommendedConfig: js.configs.recommended,
      });

      module.exports = [
        ...compat.extends('plugin:storybook/recommended'),
        { plugins: { '@nx': nxEslintPlugin } },
        {
          files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
          rules: {
            '@nx/enforce-module-boundaries': [
              'error',
              {
                enforceBuildableLibDependency: true,
                allow: [],
                depConstraints: [
                  {
                    sourceTag: '*',
                    onlyDependOnLibsWithTags: ['*'],
                  },
                ],
              },
            ],
          },
        },
        ...compat.config({ extends: ['plugin:@nx/typescript'] }).map((config) => ({
          ...config,
          files: ['**/*.ts', '**/*.tsx'],
          rules: {},
        })),
        ...compat.config({ extends: ['plugin:@nx/javascript'] }).map((config) => ({
          ...config,
          files: ['**/*.js', '**/*.jsx'],
          rules: {},
        })),
      ];
      "
    `);
    expect(tree.read('libs/test-lib/eslint.config.js', 'utf-8'))
      .toMatchInlineSnapshot(`
      "const baseConfig = require('../../eslint.config.js');

      module.exports = [
        ...baseConfig,
        {
          files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
          rules: {},
        },
        {
          files: ['**/*.ts', '**/*.tsx'],
          rules: {},
        },
        {
          files: ['**/*.js', '**/*.jsx'],
          rules: {},
        },
      ];
      "
    `);
    expect(
      readJson(tree, 'package.json').devDependencies['@eslint/eslintrc']
    ).toEqual(eslintrcVersion);
  });

  it('should add global eslintignores', async () => {
    await lintProjectGenerator(tree, {
      skipFormat: false,
      linter: Linter.EsLint,
      project: 'test-lib',
      setParserOptionsProject: false,
    });
    tree.write('.eslintignore', 'ignore/me');
    await convertToFlatConfigGenerator(tree, options);

    const config = tree.read('eslint.config.js', 'utf-8');
    expect(config).toContain('ignore/me');
    expect(config).toMatchSnapshot();
    expect(tree.exists('.eslintignore')).toBeFalsy();
  });

  it('should handle custom eslintignores', async () => {
    await lintProjectGenerator(tree, {
      skipFormat: false,
      linter: Linter.EsLint,
      project: 'test-lib',
      setParserOptionsProject: false,
    });
    tree.write('another-folder/.myeslintignore', 'ignore/me');
    updateJson(tree, 'libs/test-lib/project.json', (json) => {
      json.targets.lint.options = json.targets.lint.options || {};
      json.targets.lint.options.ignorePath = 'another-folder/.myeslintignore';
      return json;
    });
    tree.write('libs/test-lib/.eslintignore', 'ignore/me/as/well');

    await convertToFlatConfigGenerator(tree, options);

    expect(
      tree.read('libs/test-lib/eslint.config.js', 'utf-8')
    ).toMatchSnapshot();
    expect(tree.exists('another-folder/.myeslintignore')).toBeFalsy();
    expect(tree.exists('libs/test-lib/.eslintignore')).toBeFalsy();

    expect(
      readJson(tree, 'libs/test-lib/project.json').targets.lint.options
        .ignorePath
    ).toBeUndefined();
  });

  it('should add settings', async () => {
    await lintProjectGenerator(tree, {
      skipFormat: false,
      linter: Linter.EsLint,
      project: 'test-lib',
      setParserOptionsProject: false,
    });
    updateJson(tree, '.eslintrc.json', (json) => {
      json.settings = {
        sharedData: 'Hello',
      };
      return json;
    });
    await convertToFlatConfigGenerator(tree, options);

    expect(tree.read('eslint.config.js', 'utf-8')).toMatchSnapshot();
  });

  it('should add env configuration', async () => {
    await lintProjectGenerator(tree, {
      skipFormat: false,
      linter: Linter.EsLint,
      project: 'test-lib',
      setParserOptionsProject: false,
    });
    updateJson(tree, '.eslintrc.json', (json) => {
      json.env = {
        browser: true,
        node: true,
      };
      return json;
    });
    await convertToFlatConfigGenerator(tree, options);

    expect(tree.read('eslint.config.js', 'utf-8')).toMatchSnapshot();
  });

  it('should add global configuration', async () => {
    await lintProjectGenerator(tree, {
      skipFormat: false,
      linter: Linter.EsLint,
      project: 'test-lib',
      setParserOptionsProject: false,
    });
    updateJson(tree, '.eslintrc.json', (json) => {
      json.globals = {
        myCustomGlobal: 'readonly',
      };
      return json;
    });
    await convertToFlatConfigGenerator(tree, options);

    expect(tree.read('eslint.config.js', 'utf-8')).toMatchSnapshot();
  });

  it('should add global and env configuration', async () => {
    await lintProjectGenerator(tree, {
      skipFormat: false,
      linter: Linter.EsLint,
      project: 'test-lib',
      setParserOptionsProject: false,
    });
    updateJson(tree, '.eslintrc.json', (json) => {
      json.globals = {
        myCustomGlobal: 'readonly',
      };
      json.env = {
        browser: true,
      };
      return json;
    });
    await convertToFlatConfigGenerator(tree, options);

    expect(tree.read('eslint.config.js', 'utf-8')).toMatchSnapshot();
  });

  it('should add plugins', async () => {
    await lintProjectGenerator(tree, {
      skipFormat: false,
      linter: Linter.EsLint,
      project: 'test-lib',
      setParserOptionsProject: false,
    });
    updateJson(tree, '.eslintrc.json', (json) => {
      json.plugins = [
        'eslint-plugin-import',
        'single-name',
        '@scope/with-name',
        '@just-scope',
      ];
      return json;
    });
    await convertToFlatConfigGenerator(tree, options);

    expect(tree.read('eslint.config.js', 'utf-8')).toMatchSnapshot();
  });

  it('should add parser', async () => {
    await lintProjectGenerator(tree, {
      skipFormat: false,
      linter: Linter.EsLint,
      project: 'test-lib',
      setParserOptionsProject: false,
    });
    updateJson(tree, '.eslintrc.json', (json) => {
      json.parser = '@typescript-eslint/parser';
      return json;
    });
    await convertToFlatConfigGenerator(tree, options);

    expect(tree.read('eslint.config.js', 'utf-8')).toMatchSnapshot();
  });

  it('should add linter options', async () => {
    await lintProjectGenerator(tree, {
      skipFormat: false,
      linter: Linter.EsLint,
      project: 'test-lib',
      setParserOptionsProject: false,
    });
    updateJson(tree, '.eslintrc.json', (json) => {
      json.noInlineConfig = true;
      return json;
    });
    await convertToFlatConfigGenerator(tree, options);

    expect(tree.read('eslint.config.js', 'utf-8')).toMatchInlineSnapshot(`
      "const { FlatCompat } = require('@eslint/eslintrc');
      const nxEslintPlugin = require('@nx/eslint-plugin');
      const js = require('@eslint/js');

      const compat = new FlatCompat({
        baseDirectory: __dirname,
        recommendedConfig: js.configs.recommended,
      });

      module.exports = [
        { plugins: { '@nx': nxEslintPlugin } },
        {
          linterOptions: {
            noInlineConfig: true,
          },
        },
        {
          files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
          rules: {
            '@nx/enforce-module-boundaries': [
              'error',
              {
                enforceBuildableLibDependency: true,
                allow: [],
                depConstraints: [
                  {
                    sourceTag: '*',
                    onlyDependOnLibsWithTags: ['*'],
                  },
                ],
              },
            ],
          },
        },
        ...compat.config({ extends: ['plugin:@nx/typescript'] }).map((config) => ({
          ...config,
          files: ['**/*.ts', '**/*.tsx'],
          rules: {},
        })),
        ...compat.config({ extends: ['plugin:@nx/javascript'] }).map((config) => ({
          ...config,
          files: ['**/*.js', '**/*.jsx'],
          rules: {},
        })),
      ];
      "
    `);
  });
});
