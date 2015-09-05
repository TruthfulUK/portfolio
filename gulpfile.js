var gulp = require('gulp')
var plugins = require('gulp-load-plugins')()
var del = require('del')
var run_sequence = require('run-sequence')
var util = require('util')
var path = require('path')
var ghpages = require('gh-pages')
var postcss_url = require('postcss-url')({
  url: function (url, decl, from, dirname, to, options, result) {
    /*if (url.slice(0, 1) === '/') {
      return url
    }

    return '../images/' + url */
    return '../' + url
  }
})

var sequence_error = function (callback, error) {
  if (error) {
    plugins.util.log(plugins.util.colors.red('There was an error running the sequence!'))
    process.exit(1)
  }

  callback()
}

var paths = {
  html: [
    'src/html/**/*.html'
  ],

  js: [
    'src/js/**/*.js'
  ],

  sass: [
    'src/sass/**/*.scss'
  ],

  images: [
    'src/images/**/*'
  ],

  /*vendor: [
    'bower_components/angular/angular.js',
  ],*/

  vendor_css: [
    'bower_components/skeleton/css/normalize.css',
    'bower_components/skeleton/css/skeleton.css'
  ],

  misc: [
    'src/misc/**/*'
  ]
}

gulp.task('pre-build', function (callback) {
  return run_sequence('clean', function (error) {
    sequence_error(callback, error)
  })
})

gulp.task('build', function (callback) {
  return run_sequence(Object.keys(paths), function (error) {
    sequence_error(callback, error)
  })
})

gulp.task('clean', function (callback) {
  del(['public'], callback)
})

gulp.task('html', function () {
   return gulp.src(paths.html)
        .pipe(gulp.dest('public'))
})

var watch

gulp.task('js', function () {
  return gulp.src(paths.js)
        .pipe(plugins.plumber(function (error) {
          if (!watch) {
            throw new plugins.util.PluginError(error.plugin, error)
          } else {
            plugins.util.log(plugins.util.colors.red('Error (' + error.plugin + '): ' + error.message))
          }

          this.emit('end')
        }))
        .pipe(plugins.jshint())
        .pipe(plugins.jshint.reporter('jshint-stylish'))
        .pipe(watch ? plugins.util.noop() : plugins.jshint.reporter('fail'))
        .pipe(plugins.sourcemaps.init())
        .pipe(plugins.concat('script.js'))
        .pipe(plugins.uglify())
        .pipe(plugins.sourcemaps.write('maps'))
        .pipe(gulp.dest('public/assets/js'))
})

gulp.task('vendor', function () {
  return gulp.src(paths.vendor)
        .pipe(plugins.sourcemaps.init())
        .pipe(plugins.concat('vendor.js'))
        .pipe(plugins.uglify())
        .pipe(plugins.sourcemaps.write('maps'))
        .pipe(gulp.dest('public/assets/js'))
})

gulp.task('vendor_css', function () {
  return gulp.src(paths.vendor_css)
        .pipe(plugins.plumber(function (error) {
          if (!watch) {
            throw new plugins.util.PluginError(error.plugin, error)
          } else {
            plugins.util.log(plugins.util.colors.red('Error (' + error.plugin + '): ' + error.message))
          }

          this.emit('end')
        }))
        .pipe(plugins.sourcemaps.init())
        .pipe(plugins.concat('vendor.css'))
        .pipe(plugins.minifyCss())
        .pipe(plugins.sourcemaps.write('maps'))
        .pipe(gulp.dest('public/assets/css'))
})

gulp.task('sass', function () {
  return gulp.src(paths.sass)
        .pipe(plugins.plumber(function (error) {
          if (!watch) {
            throw new plugins.util.PluginError(error.plugin, error)
          } else {
            plugins.util.log(plugins.util.colors.red('Error (' + error.plugin + '): ' + error.message))
          }

          this.emit('end')
        }))
        .pipe(plugins.sourcemaps.init())
        .pipe(plugins.sass())
        .pipe(plugins.postcss([
          postcss_url
        ]))
        .pipe(plugins.concat('style.css'))
        .pipe(plugins.minifyCss())
        .pipe(plugins.sourcemaps.write('maps'))
        .pipe(gulp.dest('public/assets/css'))
})

gulp.task('images', function () {
  return gulp.src(paths.images)
        .pipe(gulp.dest('public/assets/images'))
})

gulp.task('misc', function () {
  return gulp.src(paths.misc)
        .pipe(gulp.dest('public'))
})

gulp.task('watch', function () {
  for (var task in paths) {
    gulp.watch(paths[task], [task])
  }
})

gulp.task('connect', function () {
  return gulp.src('public')
      .pipe(plugins.webserver({
        root: 'public',
        livereload: true,
        open: true
      }))
})

gulp.task('default', function (callback) {
  watch = true
  return run_sequence('pre-build', 'build', 'connect', 'watch', function (error) {
    sequence_error(callback, error)
  })
})

gulp.task('prod', function (callback) {
  return run_sequence('pre-build', 'build', function (error) {
    sequence_error(callback, error)
  })
})

gulp.task('deploy', ['prod'], function (callback) {
  var options = {
    dotfiles: true,
    silent: true
  }

  if (process.env.TRAVIS) {
    options.user = {
      name: process.env.GIT_NAME,
      email: process.env.GIT_EMAIL
    }

    options.repo = util.format('https://%s:%s@github.com/%s.git', process.env.GIT_NAME, process.env.GIT_TOKEN, process.env.TRAVIS_REPO_SLUG)
  }

  require('child_process').exec('git rev-parse HEAD', function (error, stdout, stderr) {
    options.message = 'Updating to ' + process.env.TRAVIS_REPO_SLUG + '@' + stdout.replace('\n', '')
    ghpages.publish(path.join(process.cwd(), 'public'), options, callback)
  })
})