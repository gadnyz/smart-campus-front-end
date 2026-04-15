// @ts-check
const eslint = require('@eslint/js');
const { defineConfig } = require('eslint/config');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');

module.exports = defineConfig([
    {
        ignores: ['.angular/**', 'dist/**', 'node_modules/**']
    },
    {
        files: ['**/*.ts'],
        extends: [eslint.configs.recommended, ...tseslint.configs.recommended, angular.configs.tsRecommended],
        processor: angular.processInlineTemplates,
        rules: {
            '@angular-eslint/directive-selector': [
                'error',
                {
                    type: 'attribute',
                    prefix: 'app',
                    style: 'camelCase'
                }
            ],
            '@angular-eslint/component-selector': 'off',
            '@angular-eslint/prefer-inject': 'off',
            '@angular-eslint/use-lifecycle-interface': 'off',
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-inferrable-types': 'off',
            '@typescript-eslint/consistent-type-definitions': 'off',
            '@typescript-eslint/no-unused-expressions': 'off',
            '@typescript-eslint/prefer-for-of': 'off',
            '@typescript-eslint/consistent-indexed-object-style': 'off',
            '@typescript-eslint/ban-ts-comment': 'off',
            'no-var': 'off',
            'prefer-const': 'off'
        }
    },
    {
        files: ['**/*.html'],
        extends: [angular.configs.templateRecommended],
        rules: {
            '@angular-eslint/template/prefer-control-flow': 'off',
            '@angular-eslint/template/elements-content': 'off',
            '@angular-eslint/template/click-events-have-key-events': 'off',
            '@angular-eslint/template/interactive-supports-focus': 'off',
            '@angular-eslint/template/no-autofocus': 'off',
            '@angular-eslint/template/alt-text': 'off'
        }
    }
]);
