/*
 * grunt-loc-json
 * https://github.com/ricard/grunt-loc-json
 *
 * Copyright (c) 2017 Ricard
 * Licensed under the MIT license.
 */

'use strict';

module.exports = function(grunt) {

  grunt.loadNpmTasks('grunt-http');
  grunt.loadNpmTasks('grunt-file-tree');
  grunt.loadNpmTasks('grunt-zip');
  grunt.loadNpmTasks('grunt-curl');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks("grunt-then");

  function copyObject(dest){
    var object = {};
    
    grunt.file.expand(dest + "tmp/*").forEach(function (translationsDir) {
      if (!translationsDir.endsWith('.zip')){
        grunt.file.expand(translationsDir + "/locales/*/*").forEach(function (dir) {
          var filename = dir.split('/').reverse()[1] + '.json';
          object = {
            src: dir,
            dest: dest + filename
          };
        });
      }
    });

    return object;
  }

  function localeGetText(key, dest) {
    return{
      options: {
        url: 'https://localise.biz/api/export/all.js/?index=id&fallback=en&key=' + key
      },
      dest: dest + 'translations.js'
    };
  }

  function localeZip(key, dest, method, data) {
      data[dest + 'tmp/translations.zip'] = 'https://localise.biz/api/export/archive/' + method + '.zip?index=id&fallback=en&key=' + key;
  }

  function copyFilesIfNeeded(grunt, options) {
    var copyOptions = {};

      for (var j = 0; j < options.projects.length; ++j) {
        var proj = options.projects[j];
        if (proj.method === 'json') {
          var dest = proj.dest + (proj.dest.endsWith('/') ? '' : '/');
          copyOptions[proj.dest] = copyObject(dest);
        }
      }

      grunt.config.set('copy', copyOptions);
      grunt.task.run('copy');
      grunt.task.run('clean'); 
  }

  grunt.registerMultiTask('loc_json', 'Grunt plugin used to download translations from localise.biz', function() {
    var options = this.options({
      json_dest: './',
      projects: [
        {
          key:'',
          method:'js',
          dest: './'
        }
      ]
    });

    var httpData = {};
    var curlData = {};
    var unzipData = {};
    var cleanData = [];

    for (var i = 0; i < options.projects.length; ++i) {
      var project = options.projects[i];
      var cleanDest = project.dest + (project.dest.endsWith('/') ? '' : '/');

      if (project.method === "json") {
        localeZip(project.key, cleanDest, project.method, curlData);  
      } else {
        httpData[project.dest] = localeGetText(project.key, cleanDest);  
      }

      unzipData[cleanDest + 'tmp/'] = cleanDest + 'tmp/translations.zip';
      cleanData.push(cleanDest + 'tmp/');
    }

    grunt.config.set('unzip',unzipData);
    grunt.config.set('curl', curlData);
    grunt.config.set('http', httpData);
    grunt.config.set('clean', cleanData);

    grunt.task.run('http');
    grunt.task.run('curl');
    grunt.task.run('unzip').then(function() {
      copyFilesIfNeeded(grunt, options);
    });

  });
};
