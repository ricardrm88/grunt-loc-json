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
  grunt.loadNpmTasks('grunt-zip');
  grunt.loadNpmTasks('grunt-curl');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks("grunt-then");
  grunt.loadNpmTasks('grunt-files-to-javascript-variables');

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

  function addOptionsToModule(grunt, module, options) {
    var config = grunt.config.get(module);
    if (config) {
      for (var key in options) {
        config[key] = options[key];
      }
      grunt.config.set(module, config);
    } else {
      grunt.config.set(module, options);  
    }
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

      addOptionsToModule(grunt, 'copy', copyOptions);
      grunt.task.run('copy');
  }

  function addJsonLocales(position, isFirst, options, callback) {
    if (options.projects.length > position) {
      var currentProj = options.projects[position];
      if (currentProj.method === 'json') {
         addOptionsToModule(grunt,'filesToJavascript', {
            default_options: {
              options: {
                inputFilesFolder : currentProj.dest,
                outputBaseFile : isFirst ? 'grunt_loc_json_tmp/empty.js' : options.localizationsFile,
                outputBaseFileVariable : 'localizationsJson.' + currentProj.name,
                outputFile : options.localizationsFile,
              }
            }
          });
         grunt.task.run('filesToJavascript').then(function(){
            addJsonLocales(position+1, false, options, callback);
         });
      } else {
        addJsonLocales(position+1, isFirst, options, callback);
      }
    } else {
      if (callback) {
        callback();
      }
    }
  }

  grunt.registerMultiTask('loc_json', 'Grunt plugin used to download translations from localise.biz', function() {
    var options = this.options({
      localizationsFile: './result.js',
      projects: [
        {
          name:'default',
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
      addOptionsToModule(grunt, 'unzip', unzipData);
      addOptionsToModule(grunt, 'curl', curlData);
      addOptionsToModule(grunt, 'clean', cleanData);

      grunt.task.run('curl');  
      grunt.task.run('unzip').then(function() {
        copyFilesIfNeeded(grunt, options);
        grunt.file.write('grunt_loc_json_tmp/empty.js', '');
        grunt.task.run('clean'); 

        addJsonLocales(0, true, options, function(){
          cleanData.push('grunt_loc_json_tmp/');
          grunt.task.run('clean'); 
        });
      });
    }
  });
};
