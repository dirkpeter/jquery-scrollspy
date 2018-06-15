'use strict';

/* global require */
/* eslint arrow-body-style: ["off"] */

// require modules
const gulp = require('gulp');
const runSequence = require('run-sequence');
const browserSync = require('browser-sync')
    .create();
const modernizr = require('gulp-modernizr');
const eslint = require('gulp-eslint');
const uglify = require('gulp-uglify');
const rename = require('gulp-rename');
const babel = require('gulp-babel');
const clean = require('gulp-clean');
const sass = require('gulp-sass');
const sassLint = require('gulp-sass-lint');
const postcss = require('gulp-postcss');
const autoprefixer = require('autoprefixer');
const sourcemaps = require('gulp-sourcemaps');


// load config from file
const config = {
  js: {
    src: [
      "src/**/*.js"
    ]
  },
  css: {
    src: [
      "src/**/*.scss"
    ],
    dest: "dist",
    lintIgnore: [],
    autoprefix: [
      "last 2 version"
    ]
  }
};


//
gulp.task('modernizr', () => {
  // drupal 8 defaults
  gulp.src(config.js.src)
      .pipe(modernizr(
          'modernizr.custom.js',
          {
            options: [
              'setClasses',
              'addTest',
              'prefixes',
              'testStyles'
            ],
            tests: [
              'touchevents'
            ]
          }
      ))
      .pipe(gulp.dest('lib'));
});


// De-lint the custom js files
gulp.task('js:lint', () => {
  return gulp.src(config.js.src)
      .pipe(eslint({
        globals: [
          'Drupal',
          'Modernizr',
          'jQuery'
        ]
      }))
      .pipe(eslint.format('stylish'));
});


// uglify
gulp.task('js:uglify', () => {
  return gulp.src([
    'src/**/*.js'
  ])
      .pipe(babel({ 'presets': [ 'env' ] }))
      .pipe(uglify())
      .on('error', function (err) {
        /* eslint-disable no-console */
        console.error('Error in compress task', err.toString());
        /* eslint-enable no-console */
      })
      .pipe(rename({ suffix: '.min' }))
      .pipe(gulp.dest('dist'));
});


//
gulp.task('css:lint', () => {
  return gulp.src(config.css.src)
      .pipe(sassLint({
        options: {
          formatter: 'stylish'
        },
        files: {
          ignore: config.css.lintIgnore
        },
        configFile: '.sass-lint.yml'
      }))
      .pipe(sassLint.format())
      .pipe(sassLint.failOnError())
});


//
gulp.task('css:custom', () => {
  return gulp
      .src(config.css.src)
      .pipe(sourcemaps.init())
      .pipe(sass({
        outputStyle: config.css.style,
        includePaths: config.css.includes,
        errLogToConsole: true
      })
          .on('error', sass.logError))
      .pipe(postcss([
        autoprefixer({ browsers: config.css.autoprefix })
      ]))
      .pipe(sourcemaps.write())
      .pipe(gulp.dest(config.css.dest))
      .pipe(browserSync.stream());
});


//
gulp.task('test', [ 'js:lint', 'css:lint' ]);



// clean
gulp.task('clean', () => {
  return gulp.src([
    'dist/**/*.min.js',
    'dist/**/*.css'
  ], { read: false })
      .pipe(clean());
});


// general build task
gulp.task('build', (callback) => {
  runSequence('clean', 'test', [ 'modernizr', 'js:uglify', 'css:custom' ], callback);
});


// Static Server + watching js files
gulp.task('default', [ 'build' ], () => {
  // use proxy to work in a theme
  browserSync.init({
    server: {
      baseDir: "./"
    },
    open: false,
    notify: false
  });

  gulp.watch(config.js.src, [ 'modernizr' ])
      .on('change', function (e) {
        gulp.src(e.path)
            .pipe(eslint({
              globals: [
                'Drupal',
                'Modernizr',
                'jQuery'
              ]
            }))
            .pipe(eslint.format('stylish'));
      });

  gulp.watch(config.css.src, [ 'modernizr' ])
      .on('change', function (e) {
        // fix dest path
        const dir = '/plugins/',
            index = e.path.indexOf(dir);
        let dest = e.path;

        if (index) {
          dest = e.path.substr(e.path.indexOf(dir) + 1)
              .split('/')
              .slice(0, -1)
              .join('/');
        }

        gulp.src(e.path)
            .pipe(sassLint({
              options: {
                formatter: 'stylish'
              },
              files: {
                ignore: config.css.lintIgnore
              },
              configFile: '.sass-lint.yml'
            }))
            .pipe(sassLint.format())
            .pipe(sourcemaps.init())
            .pipe(sass({
              outputStyle: config.css.style,
              includePaths: config.css.includes,
              errLogToConsole: true
            })
                .on('error', sass.logError))
            .pipe(postcss([
              autoprefixer({ browsers: config.css.autoprefix })
            ]))
            .pipe(sourcemaps.write())
            .pipe(gulp.dest(dest))
            .pipe(browserSync.stream());
      });

  gulp.watch([ config.js.src, '**/*.html' ])
      .on('change', browserSync.reload);
});
