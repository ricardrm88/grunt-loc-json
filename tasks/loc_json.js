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
    var objects = {};
    
    grunt.file.expand(dest + "tmp/*").forEach(function (translationsDir) {
      if (!translationsDir.endsWith('.zip')){
        grunt.file.expand(translationsDir + "/locales/*/*").forEach(function (dir) {
          var filename = dir.split('/').reverse()[1] + '.json';
          objects[filename] = {
            src: dir,
            dest: dest + filename
          };
        });
      }
    });

    return objects;
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
          copyOptions = copyObject(dest);
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

    if (Object.getOwnPropertyNames(httpData).length > 0) {    
      grunt.config.set('http', httpData);
      grunt.task.run('http');
    }
    
    if (Object.getOwnPropertyNames(curlData).length > 0) {
      grunt.config.set('unzip',unzipData);
      grunt.config.set('curl', curlData);
      grunt.config.set('clean', cleanData);

      grunt.task.run('curl');  
      grunt.task.run('unzip').then(function() {
        copyFilesIfNeeded(grunt, options);

        grunt.config.set('fileTree', {
          your_target: {
            files: [
              {
                src: [options.json_dest],
                dest: options.json_dest + (options.json_dest.endsWith('/') ? '' : '/') + 'localizations.json'
              }
            ]
          }
        });
        grunt.task.run('http');
        grunt.task.run('fileTree');
      });
    }
  });
};
