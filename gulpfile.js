var path = require('path');

var logSymbols = require('log-symbols');
var gulp = require('gulp');
var less = require('gulp-less');
var autoprefixer = require('gulp-autoprefixer');
var notify = require('gulp-notify');
var stripCssComments = require('gulp-strip-css-comments');
var plumber = require('gulp-plumber');
var gutil = require('gulp-util');
var cssbeautify = require('cssbeautify');
var mapStream = require('map-stream');
var colors = require('colors');
var minimatch = require('minimatch');
var connect = require('gulp-connect');

//var execSync = require('child_process').execSync;
//var projectPath = execSync('git rev-parse --show-toplevel').toString().trim().replace(/\\n/g);

// 指定要编译的目录
var watchFilesPath = ['./APP/*.{scss,sass,less}'];
var fPath='./APP';
// 编译成功通知开关
var successNotify = true;


// 将.scss/.sass文件实时转变为.css文件
gulp.task('styles', function() {
    return gulp.src(watchFilesPath)
        .pipe(plumber({
            errorHandler: reportError
        }))
        .pipe(mapStream(function(file, cb) {
            logPath(file);
            cb(null, file);
        }))
        .pipe(less())
        // 去掉css注释
        .pipe(stripCssComments())
        // auto prefix
        .pipe(autoprefixer({
            browsers: ['last 10 versions'],cascade:true //配置项
        }))
        // css格式化、美化（因为有f2ehint，故在此不再做语法等的检查与修复）
        .pipe(mapStream(function(file, cb) {
            // 添加css代码的格式化
            var cssContent = file.contents.toString();

            if (/\.(css|sass|scss|less)/.test(path.extname(file.path))) {
                file.contents = new Buffer(cssbeautify(cssContent, {
                    indent: '    ',
                    openbrace: 'end-of-line',
                    autosemicolon: true
                }));
            }

            cb(null, file);
        }))
        // 将编译后的.css文件存放在.scss文件所在目录下
        .pipe(gulp.dest(function(file) {
            return fPath;
        }))
        // 编译成功后的提示（频繁提示会有点烦人，可将successNotify设置为：false关闭掉）
        .pipe(notify(function(file) {
            return successNotify && 'scss/sass编译成功！';
        }));
});


gulp.task('connect', function() {
    connect.server({
       //host: '192.168.2.100', //地址，可不写，不写的话，默认localhost
        port: 8080, //端口号，可不写，默认8000
        root: fPath, //当前项目主目录
        livereload: true,//自动刷新
    });
});
gulp.task('html', function() {
    gulp.src(fPath + '/*.html')
        .pipe(connect.reload());
});

gulp.task('watch', function() {
    // Watch .scss files
    gulp.watch(watchFilesPath, ['styles']);
        gulp.watch([fPath +'/*.{html,css,js,less}'], ['html']); //监控html文件
});

// 监听任务时先执行一次编译
gulp.task('default', function() {
    gulp.start('styles', 'connect','watch');
});

/**
    ########### helpers ###########
*/

function logPath(file) {
    console.log(logSymbols.info + ' 正在编译：' + file.path.gray);
}

function reportError(error) {
    var lineNumber = (error.lineNumber) ? 'LINE ' + error.lineNumber + ' -- ' : '';

    notify({
        title: '编译失败 [' + error.plugin + ']',
        message: lineNumber + '具体错误请看控制台！',
        sound: 'Sosumi' // See: https://github.com/mikaelbr/node-notifier#all-notification-options-with-their-defaults
    }).write(error);

    gutil.beep();

    // Pretty error reporting
    var report = '';
    var chalk = gutil.colors.white.bgRed;

    report += chalk('TASK:') + ' [' + error.plugin + ']\n';
    report += chalk('PROB:') + ' ' + error.message + '\n';
    if (error.lineNumber) {
        report += chalk('LINE:') + ' ' + error.lineNumber + '\n';
    }
    if (error.fileName) {
        report += chalk('FILE:') + ' ' + error.fileName + '\n';
    }
    console.error(report);

    // Prevent the 'watch' task from stopping
    this.emit('end');
}