/*
 * grunt-loc-json
 * https://github.com/ricard/grunt-loc-json
 *
 * Copyright (c) 2017 Ricard
 * Licensed under the MIT license.
 */

'use strict';

module.exports = function(grunt) {

  grunt.initConfig({
    jshint: {
      all: [
        'Gruntfile.js',
        'tasks/loc_json.js'
      ],
      options: {
        jshintrc: '.jshintrc',
        reporterOutput: ''
      }
    },
    loc_json: {
        options: {
          localizationsFile: './localizations/results.js',
          projects: [
            {
              key: 'your-key-here',
              dest: './localizations',
              method: 'ng-gettext'
            },
            {
              name: 'XLF',
              key: 'your-key-here',
              dest: './localizations/XLF/',
              method: 'json'
            }
          ],
        },
        files: {}
    }
  });

  grunt.loadTasks('tasks');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.registerTask('default', ['loc_json', 'jshint']);
};
