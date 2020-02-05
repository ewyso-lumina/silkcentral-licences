// load dependencies
var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const cors = require('cors');
var favicon = require('serve-favicon');

var indexRouter = require('./routes/index');
var aboutRouter = require('./routes/about');

var app = express();

// configuracion deploy
// 3000 > puerto dev
// 8080 > puerto produccion
// deployado en produccion se puede acceder desde cualquier pc que este en arlumina
const PORT = 8080;
const HOSTNAME = '172.16.2.5';


app.use(favicon(path.join(__dirname + '/public/images/favicon.ico')))

// set the view engine to ejs
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
// use cors
app.use(cors());

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/about', aboutRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});


//ejecutar el app con pm2 para no depender de la consola
//Inicio de la aplicacion
app.listen(PORT, HOSTNAME, function () {
  console.log( 'Listening on: ' + HOSTNAME + ":" + PORT);
});

//exports app
module.exports = app;
