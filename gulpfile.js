/* eslint-disable */
/* jshint esversion: 6 */

// Include gulp and plugins
var
    gulp = require('gulp'),
    del = require('del'),
    pkg = require('./package.json'),
    $ = require('gulp-load-plugins')({
        lazy: true
    }),
    htmlInjector = require('bs-html-injector'),
    styleflux = require('styleflux'),
    webpack = require('webpack'),
    browserSync = require('browser-sync').create(),
    reload = browserSync.reload;

// file locations
var
    devBuild = ((process.env.NODE_ENV || 'development').trim().toLowerCase() !== 'production'),

    source = './assets/',
    dest = devBuild ? 'dist/development/' : 'dist/production/',

    html = {
        partials: [source + '_partials/**/*'],
        in : [source + '*.html'],
        watch: ['./assets/*.html', './assets/_partials/**/*'],
        out: dest,
        context: {
            devBuild: devBuild,
            author: pkg.author,
            version: pkg.version
        }
    },

    images = { in : source + 'images/**/*',
            out: dest + 'assets/images/'
    },

    css = { in : [source + 'css/**/*'],
        out: dest + 'assets/css/',
            sassOpts: {
                outputStyle: devBuild ? 'compact' : 'compact',
                precision: 3,
                errLogToConsole: true
            }
    },

    less = { in : [source + 'less/xenon*.less', source + 'less/bootstrap.scss'],
        watch : [source + 'less/**/*.less', source + 'less/bootstrap.scss', source + 'less/bootstrap/**/*.scss'],
        out: dest + 'assets/css/'
    },

    fonts = { in : [source + 'css/fonts/**/*', '!' + source + 'css/fonts/**/*.html'],
            out: dest + 'assets/css/fonts/'
    },
    data = { in : [source + 'data/**/*'],
            out: dest + 'assets/data/'
    },

    js = { in : source + 'js/**/*',
            out: dest + 'assets/js/'
    },

    jsLibs = { in : source + 'lib/**/*',
            out: dest + 'assets/lib/'
    },

    imageFilter = $.filter(['**/*.+(jpg|png|gif|svg)'], { restore: true }),
    imageFilter2 = $.filter(['**/*.+(jpg|png|tiff|webp)'], { restore: true }),

    syncOpts = {
        server: {
            baseDir: dest,
            index: 'index.html'
        },
        open: false,
        injectChanges: true,
        reloadDelay: 0,
        notify: true
    };

// show build type
console.log(pkg.name + ' ' + pkg.version + ', ' + (devBuild ? 'development' : 'production') + ' build');

// Clean tasks
gulp.task('clean', function (cb) {
  del([dest + '**/*'], cb());
});

gulp.task('clean-images', function(cb) {
  del([
    dest + 'assets/images/**/*'
  ], cb());
});

gulp.task('clean-html', function() {
  return del([
    dest + '**/*.html'
  ]);
});

gulp.task('clean-css', function(cb) {
  del([
    dest + 'assets/css/**/*'
  ], cb());
});

gulp.task('clean-js', function(cb) {
  del([
    dest + 'assets/js/**/*'
  ], cb());
});

gulp.task('clean-jslib', function(cb) {
  del([
    dest + 'assets/lib/**/*'
  ], cb());
});

gulp.task("reload", (done) => { browserSync.reload(); done(); });

// build HTML files
gulp.task('html', function() {
    var page = gulp.src(html.in)
        .pipe($.newer(html.out))
        .pipe($.preprocess({
            context: html.context
        }))
        /*.pipe($.replace(/.\jpg|\.png|\.tiff/g, '.webp'))*/
    ;
    if (!devBuild) {
        page = page
            .pipe($.size({
                title: 'HTML in'
            }))
            .pipe($.htmlclean())
            .pipe($.size({
                title: 'HTML out'
            }));
    }
    return page
        .pipe(gulp.dest(html.out));
});

// manage images
gulp.task('images', function() {
    return gulp.src(images.in)
        .pipe($.size({
            title: 'images in '
        }))
        .pipe($.newer(images.out))
        .pipe($.imagemin())
        .pipe($.size({
            title: 'images out '
        }))
        .pipe(gulp.dest(images.out));
});

// copy fonts
gulp.task('fonts', function() {
  return gulp.src(fonts.in)
    .pipe($.newer(dest+ 'assets/css/fonts/'))
    .pipe(gulp.dest(dest + 'assets/css/fonts/'));
});

gulp.task('css', gulp.series('fonts', function pluginCss() {
    var pluginsFilter = $.filter(['**/*.css', '!**/*.min*'], { restore: true }),
        imageFilter = $.filter(['**/*.+(jpg|png|gif|svg)'], { restore: true }),
        imageFilter2 = $.filter(['**/*.+(jpg|png|tiff|webp)'], { restore: true });
    return gulp.src([source + 'css/**/*.css'])
        .pipe($.newer(css.out))
        .pipe(pluginsFilter)
        .pipe($.rename(function(path) {
            path.extname = ".scss";
        }))
        .pipe($.plumber())
        .pipe($.sass(css.sassOpts))
        .pipe(pluginsFilter.restore)
        .pipe($.size({
            title: 'CSS in '
        }))
        .pipe($.size({
            title: 'CSS out '
        }))
        .pipe(gulp.dest(css.out))
        .pipe(browserSync.stream({
            match: '**/*.css'
        }));
}));

// copy data
gulp.task('copydata', function(){
    return gulp.src([source + 'data/**/*'])
        .pipe($.newer(data.out))
        .pipe($.size({
            title: 'Data in '
        }))
        .pipe($.size({
            title: 'Data out '
        }))
        .pipe(gulp.dest(dest + 'data'));
});

// compile Less
gulp.task('less', gulp.series('fonts', function compileLess() {
    var sassFilter = $.filter(['**/*.scss'], { restore: true }),
        lessFilter = $.filter(['**/*.less'], { restore: true });
    return gulp.src(less.in)
        .pipe($.newer(less.out))
        .pipe(lessFilter)
        .pipe($.sourcemaps.init())
        .pipe($.plumber())
        .pipe($.less({
            javascriptEnabled: true
        }))
        .pipe($.cleanCss({
            rebase: false
        }))
        .pipe(lessFilter.restore)
        .pipe(sassFilter)
        .pipe($.sourcemaps.init())
        .pipe($.plumber())
        .pipe($.sass({
            outputStyle: devBuild ? 'compressed' : 'compressed',
            precision: 3,
            errLogToConsole: true
        }))
        .pipe(sassFilter.restore)
        // .pipe($.sourcemaps.write('./maps'))
        .pipe($.size({
            title: 'Less in '
        }))
        .pipe($.sourcemaps.write('./maps'))
        .pipe($.size({
            title: 'Less out '
        }))
        .pipe(gulp.dest(less.out))
        .pipe(browserSync.stream({
            match: '**/*.css'
        }));
}));

// js tasks
gulp.task('js', function() {
    var jsFilter = $.filter(['**/*.js'], { restore: true }),
        imageFilter = imageFilter = $.filter(['**/*.+(jpg|png|gif)'], { restore: true });
    if (devBuild) {
        return gulp.src(js.in)
            .pipe($.size({
                title: 'JS in '
            }))
            .pipe($.newer(js.out))
            .pipe(imageFilter)
            .pipe($.imagemin())
            .pipe(imageFilter.restore)
            .pipe($.size({
                title: 'JS out '
            }))
            .pipe(gulp.dest(js.out));
    } else {
        del([
            dest + 'dest/js/*'
        ]);
        return gulp.src(js.in)
            .pipe($.newer(js.out))
            // .pipe($.jshint())
            // .pipe($.jshint.reporter('default'))
            // .pipe($.jshint.reporter('fail'))
            .pipe(gulp.dest(js.out));
    }
});


// copy js libraries
gulp.task('jslib', function() {
    var htmlFilter = $.filter(['**/*.html', '**/*.md'], { restore: true }),
        cssFilter = $.filter(['**/*.css'], { restore: true }),
        imageFilter = $.filter(['**/*.+(jpg|png|gif|svg)'], { restore: true }),
        imageFilter2 = $.filter(['**/*.+(jpg|png|tiff|webp)'], { restore: true }),
        jsonFilter = $.filter(['**/*.json'], { restore: true }),
        jsFilter = $.filter(['**/*.js'], { restore: true });

    return gulp.src(jsLibs.in)
        .pipe($.size({
            title: 'jsLibs in '
        }))
        .pipe($.newer(jsLibs.out))
        .pipe($.size({
            title: 'jsLibs out '
        }))
        .pipe(gulp.dest(jsLibs.out));
});

// browser sync
gulp.task('serve', function() {
    browserSync.init({
        server: {
            baseDir: dest,
            index: 'index.html'
        },
        // files: [dest + 'assets/css/light-bootstrap-dashboard.css', dest + 'assets/js/custom.js'],
        open: false,
        // port: 3000,
        injectChanges: true,
        notify: true

    });

    $.watch([dest + '**/*.css'], $.batch(function(events, done) {
        gulp.start(browserSync.stream(), done);
    }));

});


var exec = require('child_process').exec;

gulp.task('watch', gulp.parallel('serve', function watchingChanges() {

    // html changes
    gulp.watch([source + '**/*.html'], gulp.series('html','reload'));

    // image changes
    gulp.watch(images.in, gulp.series('images'));

    // font changes
    gulp.watch(fonts.in, gulp.series('fonts'));

    // font changes
    gulp.watch(data.in, gulp.series('copydata'));

    // css changes
    gulp.watch([css.in], gulp.series('css'));
    /*$.watch(css.watch, $.batch(function (events, done) {
      gulp.start(['sass'], done);
    }));*/

    // less changes
    gulp.watch([less.watch], gulp.series('less'));
    // $.watch('assets/css/**/*.css', $.batch(function (events, done) {
    //   gulp.start(['css'], done);
    // }));

    // javascript changes
    gulp.watch(js.in, gulp.series('js', 'reload'));

    // javascript libraries changes
    gulp.watch(jsLibs.in, gulp.series('jslib', 'reload'));
}));

// default task
// gulp.task('default', ['html', 'images', 'copydata', 'css', 'jslib', 'js', 'watch', 'serve']);
gulp.task('default', gulp.parallel('html', 'images', 'copydata', 'css', 'jslib', 'js', gulp.series('watch')));

// gulp.task('bundle', ['css', 'js', 'jslib']);

// gulp.task('default', ['serve']);
