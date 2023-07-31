// gulp

import gulp from 'gulp'
import gulpIf from 'gulp-if'
import browserSync from 'browser-sync'
import plumber from 'gulp-plumber'
import del from 'del'
import rename from 'gulp-rename'

//html
import htmlMin from 'gulp-htmlmin'
import htmlInclude from 'gulp-file-include'

// css
import sass from 'sass'
import gulpSass from 'gulp-sass'
import sourcemaps from 'gulp-sourcemaps'
import autoprefixer from 'gulp-autoprefixer'
import cleanCSS from 'gulp-clean-css'
import gcmq from 'gulp-group-css-media-queries'

// js
import webpack from 'webpack-stream'
import terser from 'gulp-terser'

// image
import gulpImage from 'gulp-image'
import gulpWebp from 'gulp-webp'
import gulpAvif from 'gulp-avif'
import svgSprite from 'gulp-svg-sprite'
import cheerio from 'gulp-cheerio'
import replace from 'gulp-replace'

const scssToCss = gulpSass(sass)

let dev = false

const path = {
  src: {
    base: 'src/',
    html: 'src/*.html',
    scss: 'src/scss/**/*.scss',
    js: 'src/js/index.js',
    img: 'src/img/**/*.{jpg,svg,jpeg,png,gif}',
    imgF: 'src/img/**/*.{jpg,jpeg,png}',
    srcSvg: 'src/assets/icons/*.svg',
    fonts: 'src/assets/fonts/*.*',
    libs: 'src/libs/*.*'
  },
  dist: {
    base: 'docs/',
    html: 'docs/',
    css: 'docs/css/',
    js: 'docs/js/',
    img: 'docs/img/',
    buildSvg: 'docs/assets/icons/',
    fonts: 'docs/assets/fonts/',
    libs: 'docs/libs/'
  },
  watch: {
    html: 'src/**/*.html',
    scss: 'src/scss/**/*.scss',
    js: 'src/js/**/*.*',
    img: 'src/img/**/*.{jpg,svg,jpeg,png,gif}',
    imgF: 'src/img/**/*.{jpg,jpeg,png}',
    srcSvg: 'src/assets/icons/*.svg',
  },
}

//TASKS

//html
export const html = () =>
  gulp.src(path.src.html).pipe(
    htmlInclude({
      prefix: '@',
      basepath: '@file',
    }),
  ).pipe(
    gulpIf(
      !dev,
      htmlMin({
        removeComments: true,
        collapseWhitespace: true,
      }),
    ),
  )
  .pipe(gulp.dest(path.dist.html))
  .pipe(browserSync.stream())

//css
export const scss = () =>
  gulp.src(path.src.scss)
  .pipe(gulpIf(dev, sourcemaps.init()))
  .pipe(scssToCss().on('error', scssToCss.logError))
  .pipe(gulp.dest(path.dist.css))
  .pipe(
    gulpIf(
      !dev,
      autoprefixer({
        cascade: false,
      }),
    ),
  )
  .pipe(gulpIf(!dev, gcmq()))
  .pipe(gulpIf(!dev, gulp.dest(path.dist.css)))
  .pipe(
    gulpIf(
      !dev,
      cleanCSS({
        2: {
          specialComments: 0,
        },
      }),
    ),
  )
  .pipe(rename({ suffix: '.min' }))
  .pipe(gulpIf(dev, sourcemaps.write()))
  .pipe(gulp.dest(path.dist.css))
  .pipe(browserSync.stream())

//webpack
const configWebpack = {
  mode: dev ? 'development' : 'production',
  devtool: dev ? 'eval-source-map' : false,
  optimization: {
    minimize: false,
  },
  output: {
    filename: 'index.js',
  },
  module: {
    rules: [],
  },
}

if (!dev) {
  configWebpack.module.rules.push({
    test: /\.(js)$/,
    exclude: /(node_modules)/,
    loader: 'babel-loader',
    options: {
      presets: ['@babel/preset-env'],
      plugins: ['@babel/plugin-transform-runtime'],
    },
  })
}

//js
export const js = () =>
  gulp.src(path.src.js)
  .pipe(plumber())
  .pipe(webpack(configWebpack))
  .pipe(gulpIf(dev, gulp.dest(path.dist.js)))
  .pipe(gulpIf(!dev, terser()))
  .pipe(
    rename({
      suffix: '.min',
    }),
  )
  .pipe(gulpIf(!dev, gulp.dest(path.dist.js)))
  .pipe(gulp.dest(path.dist.js))
  .pipe(browserSync.stream())

//image
const image = () =>
  gulp.src(path.src.img).pipe(
    gulpIf(
      !dev,
      gulpImage({
        optipng: ['-i 1', '-strip all', '-fix', '-o7', '-force'],
        pngquant: ['--speed=1', '--force', 256],
        zopflipng: ['-y', '--lossy_8bit', '--lossy_transparent'],
        jpegRecompress: [
          '--strip',
          '--quality',
          'medium',
          '--min',
          40,
          '--max',
          80,
        ],
        mozjpeg: ['-optimize', '-progressive'],
        gifsicle: ['--optimize'],
        svgo: ['--enable', 'cleanupIDs', '--disable', 'convertColors'],
      }),
    ),
  )
  .pipe(gulp.dest(path.dist.img))
  .pipe(
    browserSync.stream({
      once: true,
    }),
  )

const webp = () =>
  gulp.src(path.src.imgF).pipe(
    gulpWebp({
      quality: dev ? 100 : 70,
    }),
  )
  .pipe(gulp.dest(path.dist.img))
  .pipe(
    browserSync.stream({
      once: true,
    }),
  )

export const avif = () =>
  gulp.src(path.src.imgF).pipe(
    gulpAvif({
      quality: dev ? 100 : 50,
    }),
  )
  .pipe(gulp.dest(path.dist.img))
  .pipe(
    browserSync.stream({
      once: true,
    }),
  )

//SVG
export const svgSprites = () =>
  gulp.src(path.src.srcSvg).pipe(
    cheerio({
      run: function($) {
        $('[fill]').removeAttr('fill')
        $('[stroke]').removeAttr('stroke')
        $('[style]').removeAttr('style')
      },
      parserOptions: {
        xmlMode: true,
      },
    }),
  )
  .pipe(replace('&gt;', '>'))
  .pipe(
    svgSprite({
      mode: {
        stack: {
          sprite: '../sprite.svg',
        },
      },
    }),
  )
  .pipe(gulp.dest(path.dist.buildSvg))

export const copyFonts = () =>
  gulp
  .src(path.src.fonts)
  .pipe(gulp.dest(path.dist.fonts))
  .pipe(
    browserSync.stream({
      once: true,
    }),
  )

export const copyLibs = () =>
  gulp
  .src(path.src.libs)
  .pipe(gulp.dest(path.dist.libs))
  .pipe(
    browserSync.stream({
      once: true,
    }),
  )

//server
export const server = () => {
  browserSync.init({
    ui: false,
    notify: true,
    host: 'localhost',
    // browser: 'D:\\SOFT\\Portable\\chrome-win\\chrome.exe',
    // tunnel: true,
    server: {
      baseDir: path.dist.base,
    },
  })

  gulp.watch(path.watch.html, html)
  gulp.watch(path.watch.scss, scss)
  gulp.watch(path.watch.js, js)
  gulp.watch(path.watch.img, image)
  gulp.watch(path.watch.imgF, gulp.parallel(webp, avif))
  gulp.watch(path.watch.srcSvg, svgSprites)
}

export const clear = () =>
  del(path.dist.base, {
    force: true,
  })

const develop = (ready) => {
  dev = true
  ready()
}

export const base = gulp.series(
  clear,
  html,
  scss,
  js,
  image,
  avif,
  webp,
  svgSprites,
  copyFonts,
  copyLibs,
  server,
)

export const build = gulp.series(base)

export default gulp.series(develop, base, server)
